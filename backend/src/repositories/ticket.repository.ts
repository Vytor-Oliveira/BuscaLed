import { Prisma, PrismaClient, ReservationStatus } from "@prisma/client";
import {
  CreateTicketItemInput,
  InvalidStatusTransitionError,
  LedModelSummary,
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

  async create(userId: string, items: CreateTicketItemInput[]): Promise<TicketRecord> {
    const reservation = await this.prisma.reservation.create({
      data: {
        userId,
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
    itemId: string,
    newLedModelId: string,
    originalLedModelId: string | null
  ): Promise<TicketRecord> {
    const item = await this.prisma.reservationItem.update({
      where: { id: itemId },
      data: { ledModelId: newLedModelId, originalLedModelId },
    });

    const updated = await this.findById(item.reservationId);
    if (!updated) {
      throw new TicketNotFoundError(item.reservationId);
    }
    return updated;
  }

  async findLedModel(ledModelId: string): Promise<LedModelSummary | null> {
    return this.prisma.ledModel.findUnique({
      where: { id: ledModelId },
      select: { id: true, sku: true, name: true, socketCode: true },
    });
  }
}
