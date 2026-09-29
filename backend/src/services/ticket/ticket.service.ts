import { ReservationStatus } from "@prisma/client";
import { EmailSender } from "../notification/types";
import { StockService } from "../stock/stock.service";
import {
  CreateTicketItemInput,
  EmptyTicketError,
  IncompatibleSocketError,
  InvalidStatusTransitionError,
  LedModelNotFoundForTicketError,
  TicketItemNotFoundError,
  TicketNotFoundError,
  TicketOwnershipError,
  TicketRecord,
  TicketRepository,
} from "./types";

// RN14 — cancelamento e edição só valem com o ticket ainda aberto.
const OPEN_STATUSES: ReservationStatus[] = ["PENDENTE", "CONFIRMADO"];

export class TicketService {
  constructor(
    private readonly repository: TicketRepository,
    private readonly stockService: StockService,
    private readonly emailSender: EmailSender,
    private readonly repEmail: string
  ) {}

  async createTicket(userId: string, items: CreateTicketItemInput[]): Promise<TicketRecord> {
    if (items.length === 0) {
      throw new EmptyTicketError();
    }

    const foundLedModels = await Promise.all(items.map((item) => this.repository.findLedModel(item.ledModelId)));
    const missingIndex = foundLedModels.findIndex((model) => !model);
    if (missingIndex !== -1) {
      throw new LedModelNotFoundForTicketError(items[missingIndex].ledModelId);
    }

    const ticket = await this.repository.create(userId, items);
    await this.notify(() =>
      this.emailSender.sendNewTicketNotification(this.repEmail, {
        ticketId: ticket.id,
        itemCount: ticket.items.length,
      })
    );

    return ticket;
  }

  listForUser(userId: string): Promise<TicketRecord[]> {
    return this.repository.listByUser(userId);
  }

  async getForUser(userId: string, id: string): Promise<TicketRecord> {
    const ticket = await this.requireExisting(id);
    if (ticket.userId !== userId) {
      throw new TicketOwnershipError(id);
    }
    return ticket;
  }

  listForRep(status?: ReservationStatus): Promise<TicketRecord[]> {
    return this.repository.listAll(status);
  }

  getForRep(id: string): Promise<TicketRecord> {
    return this.requireExisting(id);
  }

  async confirmTicket(id: string): Promise<TicketRecord> {
    const ticket = await this.requireExisting(id);
    if (ticket.status !== "PENDENTE") {
      throw new InvalidStatusTransitionError(
        `Só é possível confirmar um ticket PENDENTE (status atual: ${ticket.status}).`
      );
    }
    return this.repository.updateStatus(id, ["PENDENTE"], "CONFIRMADO");
  }

  // RN11 — o produto substituto precisa ser do mesmo encaixe do original.
  async editItemProduct(
    ticketId: string,
    itemId: string,
    newLedModelId: string
  ): Promise<TicketRecord> {
    const ticket = await this.requireExisting(ticketId);
    if (!OPEN_STATUSES.includes(ticket.status)) {
      throw new InvalidStatusTransitionError(
        `Não é possível editar um item de ticket ${ticket.status}.`
      );
    }

    const item = await this.repository.findItem(itemId);
    if (!item || item.reservationId !== ticketId) {
      throw new TicketItemNotFoundError(itemId);
    }

    const newLedModel = await this.repository.findLedModel(newLedModelId);
    if (!newLedModel) {
      throw new LedModelNotFoundForTicketError(newLedModelId);
    }
    if (newLedModel.socketCode !== item.socketCode) {
      throw new IncompatibleSocketError(item.socketCode, newLedModel.socketCode);
    }

    const previousLedModel = await this.repository.findLedModel(item.ledModelId);
    const originalLedModelId = item.originalLedModelId ?? item.ledModelId;

    const updated = await this.repository.updateItemProduct(itemId, newLedModelId, originalLedModelId);

    await this.notify(() =>
      this.emailSender.sendTicketEditedNotification(updated.userEmail, {
        ticketId,
        itemId,
        previousProductName: previousLedModel?.name ?? "produto anterior",
        newProductName: newLedModel.name,
      })
    );

    return updated;
  }

  // RN12 — estoque só decrementa ao concluir. A transição é reivindicada
  // atomicamente antes do decremento (evita dois "concluir" concorrentes
  // decrementando em dobro); concluded.items é um refetch pós-claim, não o
  // snapshot de antes — reflete qualquer edição concorrente que tenha vencido
  // a corrida.
  async completeTicket(id: string): Promise<TicketRecord> {
    const ticket = await this.requireExisting(id);
    if (ticket.status !== "CONFIRMADO") {
      throw new InvalidStatusTransitionError(
        `Só é possível concluir um ticket CONFIRMADO (status atual: ${ticket.status}).`
      );
    }

    const concluded = await this.repository.updateStatus(id, ["CONFIRMADO"], "CONCLUIDO");

    const decremented: Array<{ ledModelId: string; quantity: number }> = [];
    try {
      for (const item of concluded.items) {
        await this.stockService.decrementStock(item.ledModelId, item.quantity);
        decremented.push({ ledModelId: item.ledModelId, quantity: item.quantity });
      }
    } catch (error) {
      for (const rollback of decremented) {
        await this.stockService.restock(rollback.ledModelId, rollback.quantity);
      }
      try {
        await this.repository.updateStatus(id, ["CONCLUIDO"], "CONFIRMADO");
      } catch (rollbackError) {
        // eslint-disable-next-line no-console
        console.error(`Falha ao reverter status do ticket ${id} após rollback de estoque:`, rollbackError);
      }
      throw error;
    }

    return concluded;
  }

  async cancelTicket(id: string, requestingUserId: string): Promise<TicketRecord> {
    const ticket = await this.requireExisting(id);
    if (ticket.userId !== requestingUserId) {
      throw new TicketOwnershipError(id);
    }
    if (!OPEN_STATUSES.includes(ticket.status)) {
      throw new InvalidStatusTransitionError(`Não é possível cancelar um ticket ${ticket.status}.`);
    }

    const updated = await this.repository.updateStatus(id, OPEN_STATUSES, "CANCELADO");
    await this.notify(() =>
      this.emailSender.sendTicketCancelledNotification(this.repEmail, { ticketId: id })
    );

    return updated;
  }

  private async requireExisting(id: string): Promise<TicketRecord> {
    const ticket = await this.repository.findById(id);
    if (!ticket) {
      throw new TicketNotFoundError(id);
    }
    return ticket;
  }

  private async notify(send: () => Promise<void>): Promise<void> {
    try {
      await send();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Falha ao enfileirar notificação de ticket:", error);
    }
  }
}
