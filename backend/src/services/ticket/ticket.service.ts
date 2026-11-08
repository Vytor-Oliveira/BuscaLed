import { ReservationStatus } from "@prisma/client";
import { UserRole } from "../auth/jwt";
import { EmailSender } from "../notification/types";
import { StockService } from "../stock/stock.service";
import { StockLevel } from "../stock/types";
import {
  CreateTicketExtras,
  CreateTicketItemInput,
  EmptyTicketError,
  IncompatibleSocketError,
  InsufficientStockForTicketError,
  InvalidStatusTransitionError,
  LedModelNotFoundForTicketError,
  OPEN_STATUSES,
  PositionDoesNotAcceptSocketError,
  TicketItemAlternative,
  TicketItemNotFoundError,
  TicketNotFoundError,
  TicketOwnershipError,
  TicketRecord,
  TicketRepository,
  TransactionRunner,
} from "./types";

export class TicketService {
  constructor(
    private readonly repository: TicketRepository,
    private readonly stockService: StockService,
    private readonly emailSender: EmailSender,
    private readonly repEmail: string,
    private readonly runInTransaction: TransactionRunner
  ) {}

  async createTicket(
    userId: string,
    items: CreateTicketItemInput[],
    extras?: CreateTicketExtras
  ): Promise<TicketRecord> {
    if (items.length === 0) {
      throw new EmptyTicketError();
    }

    const foundLedModels = await Promise.all(items.map((item) => this.repository.findLedModel(item.ledModelId)));
    const missingIndex = foundLedModels.findIndex((model) => !model);
    if (missingIndex !== -1) {
      throw new LedModelNotFoundForTicketError(items[missingIndex].ledModelId);
    }

    // Issue #13 — antes, só a existência do produto era checada: dava para
    // pedir 500 unidades de uma lâmpada de placa como farol baixo, e o erro
    // só aparecia quando o representante tentava concluir, com o cliente já
    // tendo visto a tela de sucesso.
    await Promise.all(
      items.map(async (item, indice) => {
        const model = foundLedModels[indice]!;

        if (item.quantity > model.stockQty) {
          throw new InsufficientStockForTicketError(
            model.name,
            model.stockQty,
            item.quantity
          );
        }

        // Falha rápida, não reserva: o estoque ainda pode mudar até a
        // conclusão, e é lá que ele é de fato decrementado (RN12).
        const aceita = await this.repository.positionAcceptsSocket(
          item.position,
          model.socketCode
        );
        if (!aceita) {
          throw new PositionDoesNotAcceptSocketError(item.position, model.socketCode);
        }
      })
    );

    const ticket = await this.repository.create(userId, items, extras);
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

  // Alimenta o modal de troca: a mesma regra do editItemProduct, só que
  // listando quem passaria nela, para o representante não tentar e tomar 409.
  async listItemAlternatives(
    ticketId: string,
    itemId: string
  ): Promise<TicketItemAlternative[]> {
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

    const candidatos = await this.repository.findInStockBySocket(
      item.socketCode,
      item.quantity
    );
    return candidatos.filter((candidato) => candidato.id !== item.ledModelId);
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

    const updated = await this.repository.updateItemProduct(
      ticketId,
      itemId,
      newLedModelId,
      originalLedModelId
    );

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
  //
  // Tudo numa transação só (issue #15): antes o status e cada decremento eram
  // escritas separadas, desfeitas à mão no catch. Compensação manual não roda
  // se o processo cair no meio — deploy, reinício, queda — e aí o ticket fica
  // CONCLUIDO com o estoque pela metade, sem ninguém para consertar.
  async completeTicket(id: string): Promise<TicketRecord> {
    const ticket = await this.requireExisting(id);
    if (ticket.status !== "CONFIRMADO") {
      throw new InvalidStatusTransitionError(
        `Só é possível concluir um ticket CONFIRMADO (status atual: ${ticket.status}).`
      );
    }

    const { concluded, niveis } = await this.runInTransaction(async (tx) => {
      const atualizado = await this.repository.updateStatus(
        id,
        ["CONFIRMADO"],
        "CONCLUIDO",
        tx
      );

      const baixados: StockLevel[] = [];
      for (const item of atualizado.items) {
        baixados.push(
          await this.stockService.decrementStock(item.ledModelId, item.quantity, tx)
        );
      }

      return { concluded: atualizado, niveis: baixados };
    });

    // Depois do commit: alerta sobre estoque que poderia ter voltado atrás
    // seria alarme falso, e falha de e-mail não pode desfazer a conclusão.
    await this.stockService.notifyLowStock(niveis);

    return concluded;
  }

  // RF12 — representante e admin gerenciam o status, cancelamento incluso. A
  // posse (RN14) só restringe o cliente, que é dono de um ticket só.
  async cancelTicket(
    id: string,
    requestingUserId: string,
    requestingRole: UserRole
  ): Promise<TicketRecord> {
    const ticket = await this.requireExisting(id);
    const peloCliente = requestingRole === "user";
    if (peloCliente && ticket.userId !== requestingUserId) {
      throw new TicketOwnershipError(id);
    }
    if (!OPEN_STATUSES.includes(ticket.status)) {
      throw new InvalidStatusTransitionError(`Não é possível cancelar um ticket ${ticket.status}.`);
    }

    const updated = await this.repository.updateStatus(id, OPEN_STATUSES, "CANCELADO");
    // RN13 manda avisar o representante quando o cliente cancela; no caminho
    // inverso quem precisa saber é o cliente.
    await this.notify(() =>
      this.emailSender.sendTicketCancelledNotification(
        peloCliente ? this.repEmail : updated.userEmail,
        { ticketId: id }
      )
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
