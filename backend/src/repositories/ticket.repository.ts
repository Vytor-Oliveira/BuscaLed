import { Prisma, PrismaClient, ReservationStatus } from "@prisma/client";
import {
  CreateTicketItemInput,
  InvalidStatusTransitionError,
  LedModelSummary,
  OPEN_STATUSES,
  TicketItemAlternative,
  TicketItemDetail,
  TicketNotFoundError,
  TicketRecord,
  TicketRepository,
} from "../services/ticket/types";

const TICKET_INCLUDE = {
  user: { select: { email: true } },
  items: {
    include: {
      ledModel: { select: { id: true, sku: true, name: true, socketCode: true } },
    },
  },
} satisfies Prisma.ReservationInclude;

type TicketWithRelations = Prisma.ReservationGetPayload<{ include: typeof TICKET_INCLUDE }>;

function toTicketRecord(reservation: TicketWithRelations): TicketRecord {
  return {
    id: reservation.id,
    userId: reservation.userId,
    userEmail: reservation.user.email,
    customerPhone: reservation.customerPhone,
    status: reservation.status,
    createdAt: reservation.createdAt,
    updatedAt: reservation.updatedAt,
    items: reservation.items.map((item) => ({
      id: item.id,
      ledModelId: item.ledModelId,
      ledModelSku: item.ledModel.sku,
      ledModelName: item.ledModel.name,
      originalLedModelId: item.originalLedModelId,
      position: item.position,
      quantity: item.quantity,
    })),
  };
}

export class PrismaTicketRepository implements TicketRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listByUser(userId: string): Promise<TicketRecord[]> {
    const reservations = await this.prisma.reservation.findMany({
      where: { userId },
      include: TICKET_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return reservations.map(toTicketRecord);
  }

  async listAll(status?: ReservationStatus): Promise<TicketRecord[]> {
    const reservations = await this.prisma.reservation.findMany({
      where: status ? { status } : undefined,
      include: TICKET_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return reservations.map(toTicketRecord);
  }

  async findById(id: string): Promise<TicketRecord | null> {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: TICKET_INCLUDE,
    });
    return reservation ? toTicketRecord(reservation) : null;
  }

  async create(
    userId: string,
    items: CreateTicketItemInput[],
    customerPhone?: string
  ): Promise<TicketRecord> {
    const reservation = await this.prisma.reservation.create({
      data: {
        userId,
        customerPhone,
        items: {
          create: items.map((item) => ({
            ledModelId: item.ledModelId,
            position: item.position,
            quantity: item.quantity,
          })),
        },
      },
      include: TICKET_INCLUDE,
    });
    return toTicketRecord(reservation);
  }

  async updateStatus(
    id: string,
    allowedFrom: ReservationStatus[],
    to: ReservationStatus
  ): Promise<TicketRecord> {
    const result = await this.prisma.reservation.updateMany({
      where: { id, status: { in: allowedFrom } },
      data: { status: to },
    });

    if (result.count === 0) {
      const existing = await this.prisma.reservation.findUnique({ where: { id } });
      if (!existing) {
        throw new TicketNotFoundError(id);
      }
      throw new InvalidStatusTransitionError(
        `Não é possível mudar o ticket ${id} de ${existing.status} para ${to}.`
      );
    }

    const updated = await this.findById(id);
    if (!updated) {
      throw new TicketNotFoundError(id);
    }
    return updated;
  }

  async findItem(itemId: string): Promise<TicketItemDetail | null> {
    const item = await this.prisma.reservationItem.findUnique({
      where: { id: itemId },
      include: { ledModel: { select: { socketCode: true } } },
    });
    if (!item) {
      return null;
    }
    return {
      id: item.id,
      reservationId: item.reservationId,
      ledModelId: item.ledModelId,
      originalLedModelId: item.originalLedModelId,
      socketCode: item.ledModel.socketCode,
    };
  }

  async updateItemProduct(
    ticketId: string,
    itemId: string,
    newLedModelId: string,
    originalLedModelId: string | null
  ): Promise<TicketRecord> {
    // O status entra no where (mesma guarda de updateStatus): sem isso, um
    // "concluir" concorrente poderia baixar o estoque do produto antigo e esta
    // escrita entrar depois, deixando o item apontando pro produto errado.
    const result = await this.prisma.reservationItem.updateMany({
      where: { id: itemId, reservation: { status: { in: OPEN_STATUSES } } },
      data: { ledModelId: newLedModelId, originalLedModelId },
    });

    if (result.count === 0) {
      throw new InvalidStatusTransitionError("O ticket não está mais aberto para edição.");
    }

    const updated = await this.findById(ticketId);
    if (!updated) {
      throw new TicketNotFoundError(ticketId);
    }
    return updated;
  }

  async findLedModel(ledModelId: string): Promise<LedModelSummary | null> {
    return this.prisma.ledModel.findUnique({
      where: { id: ledModelId },
      select: { id: true, sku: true, name: true, socketCode: true },
    });
  }

  async findInStockBySocket(socketCode: string): Promise<TicketItemAlternative[]> {
    return this.prisma.ledModel.findMany({
      where: { socketCode, stockQty: { gt: 0 } },
      select: { id: true, sku: true, name: true, socketCode: true, stockQty: true },
      orderBy: { stockQty: "desc" },
    });
  }
}
