import { LightingPosition, ReservationStatus } from "@prisma/client";
import { TransactionClient } from "../../db/prisma";

/**
 * Executa um bloco de escritas numa transação só. Quem fornece é a composição
 * da rota, que conhece o Prisma; o serviço só precisa saber que existe tudo-ou-nada.
 */
export type TransactionRunner = <T>(fn: (tx: TransactionClient) => Promise<T>) => Promise<T>;

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
  stockQty: number;
}

// Teto por item na criação do ticket. O fluxo é um veículo, e nenhuma posição
// de farol leva mais que quatro lâmpadas — 10 deixa folga e barra o absurdo.
export const MAX_QUANTIDADE_POR_ITEM = 10;

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
  // Atômica: só efetiva se o status atual estiver em allowedFrom. Recebe tx
  // quando a mudança de status precisa entrar junto com outras escritas.
  updateStatus(
    id: string,
    allowedFrom: ReservationStatus[],
    to: ReservationStatus,
    tx?: TransactionClient
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
  // A matriz diz quais soquetes existem em cada posição. Usado para recusar
  // pedido impossível já na criação, não só na conclusão.
  positionAcceptsSocket(position: LightingPosition, socketCode: string): Promise<boolean>;
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

// Issue #13 — antes, pedir mais do que existe em estoque só falhava quando o
// representante tentava concluir, com o cliente já avisado de que deu certo.
export class InsufficientStockForTicketError extends Error {
  constructor(nome: string, disponivel: number, pedido: number) {
    super(
      `Estoque insuficiente para ${nome}: ${disponivel} em estoque, ${pedido} solicitadas.`
    );
    this.name = "InsufficientStockForTicketError";
  }
}

// Issue #13 — soquete que nenhum veículo da matriz usa naquela posição é
// pedido impossível: uma lâmpada de placa não entra no farol baixo.
export class PositionDoesNotAcceptSocketError extends Error {
  constructor(position: LightingPosition, socketCode: string) {
    super(
      `O soquete ${socketCode} não é usado na posição ${position} por nenhum veículo da matriz.`
    );
    this.name = "PositionDoesNotAcceptSocketError";
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
