import { LightingPosition, Prisma, PrismaClient, ReservationStatus } from "@prisma/client";
import { TransactionClient } from "../db/prisma";
import {
  CreateTicketExtras,
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
    // Os tres campos entram e saem juntos: ou o pedido tem veiculo, ou nao tem.
    vehicle:
      reservation.vehicleMake && reservation.vehicleModel && reservation.vehicleYear
        ? {
            make: reservation.vehicleMake,
            model: reservation.vehicleModel,
            year: reservation.vehicleYear,
          }
        : null,
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
    return this.findByIdCom(this.prisma, id);
  }

  // Dentro de uma transação a leitura precisa ser feita pelo mesmo cliente,
  // senão enxerga o estado de antes das escritas ainda não commitadas.
  private async findByIdCom(
    db: PrismaClient | TransactionClient,
    id: string
  ): Promise<TicketRecord | null> {
    const reservation = await db.reservation.findUnique({
      where: { id },
      include: TICKET_INCLUDE,
    });
    return reservation ? toTicketRecord(reservation) : null;
  }

  async create(
    userId: string,
    items: CreateTicketItemInput[],
    extras?: CreateTicketExtras
  ): Promise<TicketRecord> {
    const reservation = await this.prisma.reservation.create({
      data: {
        userId,
        customerPhone: extras?.customerPhone,
        vehicleMake: extras?.vehicle?.make,
        vehicleModel: extras?.vehicle?.model,
        vehicleYear: extras?.vehicle?.year,
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
    to: ReservationStatus,
    tx?: TransactionClient
  ): Promise<TicketRecord> {
    const db = tx ?? this.prisma;
    const result = await db.reservation.updateMany({
      where: { id, status: { in: allowedFrom } },
      data: { status: to },
    });

    if (result.count === 0) {
      const existing = await db.reservation.findUnique({ where: { id } });
      if (!existing) {
        throw new TicketNotFoundError(id);
      }
      throw new InvalidStatusTransitionError(
        `Não é possível mudar o ticket ${id} de ${existing.status} para ${to}.`
      );
    }

    const updated = await this.findByIdCom(db, id);
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
      quantity: item.quantity,
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
      select: { id: true, sku: true, name: true, socketCode: true, stockQty: true },
    });
  }

  async positionAcceptsSocket(
    position: LightingPosition,
    socketCode: string
  ): Promise<boolean> {
    // count com take: a pergunta é se existe pelo menos um, não quantos.
    const encontrados = await this.prisma.vehicleFitting.count({
      where: { position, socketCode },
      take: 1,
    });
    return encontrados > 0;
  }

  async findInStockBySocket(
    socketCode: string,
    minQty: number
  ): Promise<TicketItemAlternative[]> {
    return this.prisma.ledModel.findMany({
      where: { socketCode, stockQty: { gte: minQty } },
      select: { id: true, sku: true, name: true, socketCode: true, stockQty: true },
      orderBy: { stockQty: "desc" },
    });
  }
}
