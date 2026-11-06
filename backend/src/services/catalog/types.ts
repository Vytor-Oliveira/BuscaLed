import { LightingPosition } from "../compatibility/types";

export interface CreateLedModelInput {
  sku: string;
  name: string;
  description?: string;
  socketCode: string;
  imageUrl?: string | null;
  /** Centavos. priceCents e publico; costCents nunca sai para o cliente. */
  priceCents?: number | null;
  costCents?: number | null;
  /** Lâmpadas dentro de um kit: 2 no par, 1 no torpedo. */
  unitsPerKit?: number;
  stockQty?: number;
  stockMin?: number;
}

/** Tudo opcional: a edicao altera so o que veio no corpo. */
export interface UpdateLedModelInput {
  name?: string;
  description?: string | null;
  socketCode?: string;
  imageUrl?: string | null;
  priceCents?: number | null;
  costCents?: number | null;
  unitsPerKit?: number;
  stockMin?: number;
}

export interface LedModelRecord {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  socketCode: string;
  // Nulo enquanto o produto não tem foto — o painel cai no ícone.
  imageUrl: string | null;
  // Preço de venda sugerido, em centavos. Visível ao cliente.
  priceCents: number | null;
  // Custo interno, em centavos. Só admin e representante enxergam: este
  // campo nunca entra em resposta de rota pública.
  costCents: number | null;
  // Quantas lâmpadas vêm no kit. 2 é o par (o padrão da linha); torpedo é 1.
  unitsPerKit: number;
  stockQty: number;
  stockMin: number;
}

export interface CreateFittingInput {
  vehicleModelId: string;
  position: LightingPosition;
  socketCode: string;
}

export interface CatalogRepository {
  createLedModel(input: CreateLedModelInput): Promise<LedModelRecord>;
  updateLedModel(id: string, input: UpdateLedModelInput): Promise<LedModelRecord>;
  listLedModels(): Promise<LedModelRecord[]>;
  vehicleModelExists(vehicleModelId: string): Promise<boolean>;
  createFitting(input: CreateFittingInput): Promise<void>;
}

export class DuplicateSkuError extends Error {
  constructor(sku: string) {
    super(`Já existe um produto com o SKU: ${sku}`);
    this.name = "DuplicateSkuError";
  }
}

export class LedModelNotFoundError extends Error {
  constructor(id: string) {
    super(`Produto não encontrado: ${id}`);
    this.name = "LedModelNotFoundError";
  }
}

export class VehicleModelNotFoundForFittingError extends Error {
  constructor(vehicleModelId: string) {
    super(`Modelo de veículo não encontrado: ${vehicleModelId}`);
    this.name = "VehicleModelNotFoundForFittingError";
  }
}

export class DuplicateFittingError extends Error {
  constructor(vehicleModelId: string, position: string, socketCode: string) {
    super(
      `Encaixe já cadastrado: veículo ${vehicleModelId}, posição ${position}, soquete ${socketCode}.`
    );
    this.name = "DuplicateFittingError";
  }
}
