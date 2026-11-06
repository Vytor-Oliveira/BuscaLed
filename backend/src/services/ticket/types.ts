import { LightingPosition, ReservationStatus } from "@prisma/client";

// RN14 — status em que o ticket ainda aceita cancelamento e edição de item.
export const OPEN_STATUSES: ReservationStatus[] = ["PENDENTE", "CONFIRMADO"];

export interface TicketItemRecord {
  id: string;
  ledModelId: string;
  ledModelSku: string;
  ledModelName: string;
  originalLedModelId: string | null;
  position: LightingPosition;
  quantity: number;
}

// Marca/modelo/ano do veiculo da busca. Nao e a placa: a placa nunca e
// persistida em lugar nenhum (RN02).
export interface TicketVehicle {
  make: string;
  model: string;
  year: number;
}

// Dados opcionais do pedido. Agrupados porque sao dois e viriam como o
// terceiro e quarto parametro posicional de tres funcoes.
export interface CreateTicketExtras {
  customerPhone?: string;
  vehicle?: TicketVehicle;
}

export interface TicketRecord {
  id: string;
  userId: string;
  userEmail: string;
  customerPhone: string | null;
  vehicle: TicketVehicle | null;
  status: ReservationStatus;
  createdAt: Date;
  updatedAt: Date;
  items: TicketItemRecord[];
}

export interface CreateTicketItemInput {
  ledModelId: string;
  position: LightingPosition;
  quantity: number;
}

export interface LedModelSummary {
  id: string;
  sku: string;
  name: string;
  socketCode: string;
}

export interface TicketItemDetail {
  id: string;
  reservationId: string;
  ledModelId: string;
  originalLedModelId: string | null;
  socketCode: string;
  quantity: number;
}

// Candidatos à troca de um item: mesmo encaixe (RN11) e com estoque bastante
// para a quantidade pedida — oferecer menos adia a falha pro Concluir.
export interface TicketItemAlternative {
  id: string;
  sku: string;
  name: string;
  socketCode: string;
  stockQty: number;
}

export interface TicketRepository {
  listByUser(userId: string): Promise<TicketRecord[]>;
  listAll(status?: ReservationStatus): Promise<TicketRecord[]>;
  findById(id: string): Promise<TicketRecord | null>;
  create(
    userId: string,
    items: CreateTicketItemInput[],
    extras?: CreateTicketExtras
  ): Promise<TicketRecord>;
  // Atômica: só efetiva se o status atual estiver em allowedFrom.
  updateStatus(
    id: string,
    allowedFrom: ReservationStatus[],
    to: ReservationStatus
  ): Promise<TicketRecord>;
  findItem(itemId: string): Promise<TicketItemDetail | null>;
  // Atômica: só efetiva se o ticket ainda estiver em OPEN_STATUSES.
  updateItemProduct(
    ticketId: string,
    itemId: string,
    newLedModelId: string,
    originalLedModelId: string | null
  ): Promise<TicketRecord>;
  findLedModel(ledModelId: string): Promise<LedModelSummary | null>;
  findInStockBySocket(socketCode: string, minQty: number): Promise<TicketItemAlternative[]>;
}

export class TicketNotFoundError extends Error {
  constructor(id: string) {
    super(`Ticket não encontrado: ${id}`);
    this.name = "TicketNotFoundError";
  }
}

export class TicketItemNotFoundError extends Error {
  constructor(id: string) {
    super(`Item de ticket não encontrado: ${id}`);
    this.name = "TicketItemNotFoundError";
  }
}

export class EmptyTicketError extends Error {
  constructor() {
    super("O ticket precisa de pelo menos um item.");
    this.name = "EmptyTicketError";
  }
}

export class LedModelNotFoundForTicketError extends Error {
  constructor(id: string) {
    super(`Produto LED não encontrado: ${id}`);
    this.name = "LedModelNotFoundForTicketError";
  }
}

// RN11 — a substituição de produto pelo representante deve respeitar o mesmo
// tipo de encaixe do produto original do item.
export class IncompatibleSocketError extends Error {
  constructor(expectedSocketCode: string, actualSocketCode: string) {
    super(
      `Produto incompatível: o item exige o soquete ${expectedSocketCode}, mas o produto informado é ${actualSocketCode}.`
    );
    this.name = "IncompatibleSocketError";
  }
}

export class InvalidStatusTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidStatusTransitionError";
  }
}

export class TicketOwnershipError extends Error {
  constructor(id: string) {
    super(`Ticket ${id} não pertence a este usuário.`);
    this.name = "TicketOwnershipError";
  }
}
