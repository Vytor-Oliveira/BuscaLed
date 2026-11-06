import {
  CatalogRepository,
  CreateFittingInput,
  CreateLedModelInput,
  LedModelRecord,
  UpdateLedModelInput,
  VehicleModelNotFoundForFittingError,
} from "./types";

export class CatalogService {
  constructor(private readonly repository: CatalogRepository) {}

  createLedModel(input: CreateLedModelInput): Promise<LedModelRecord> {
    return this.repository.createLedModel(input);
  }

  updateLedModel(id: string, input: UpdateLedModelInput): Promise<LedModelRecord> {
    return this.repository.updateLedModel(id, input);
  }

  listLedModels(): Promise<LedModelRecord[]> {
    return this.repository.listLedModels();
  }

  async createFitting(input: CreateFittingInput): Promise<void> {
    const exists = await this.repository.vehicleModelExists(input.vehicleModelId);
    if (!exists) {
      throw new VehicleModelNotFoundForFittingError(input.vehicleModelId);
    }
    await this.repository.createFitting(input);
  }
}
