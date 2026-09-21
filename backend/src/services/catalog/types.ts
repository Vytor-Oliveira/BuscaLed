import { LightingPosition } from "../compatibility/types";

export interface CreateLedModelInput {
  sku: string;
  name: string;
  description?: string;
  socketCode: string;
  stockQty?: number;
  stockMin?: number;
}

export interface LedModelRecord {
  id: string;
  sku: string;
  name: string;
  socketCode: string;
}

export interface CreateFittingInput {
  vehicleModelId: string;
  position: LightingPosition;
  socketCode: string;
}

export interface CatalogRepository {
  createLedModel(input: CreateLedModelInput): Promise<LedModelRecord>;
  vehicleModelExists(vehicleModelId: string): Promise<boolean>;
  createFitting(input: CreateFittingInput): Promise<void>;
}

export class DuplicateSkuError extends Error {
  constructor(sku: string) {
    super(`Já existe um produto com o SKU: ${sku}`);
    this.name = "DuplicateSkuError";
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
