import { LedModel, Prisma, PrismaClient } from "@prisma/client";
import {
  CatalogRepository,
  CreateFittingInput,
  CreateLedModelInput,
  DuplicateFittingError,
  DuplicateSkuError,
  LedModelRecord,
} from "../services/catalog/types";

const PRISMA_UNIQUE_CONSTRAINT_ERROR_CODE = "P2002";

function toLedModelRecord(model: LedModel): LedModelRecord {
  return {
    id: model.id,
    sku: model.sku,
    name: model.name,
    socketCode: model.socketCode,
    stockQty: model.stockQty,
    stockMin: model.stockMin,
  };
}

export class PrismaCatalogRepository implements CatalogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createLedModel(input: CreateLedModelInput): Promise<LedModelRecord> {
    try {
      const model = await this.prisma.ledModel.create({
        data: {
          sku: input.sku,
          name: input.name,
          description: input.description,
          socketCode: input.socketCode,
          stockQty: input.stockQty ?? 0,
          stockMin: input.stockMin ?? 5,
        },
      });
      return toLedModelRecord(model);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_UNIQUE_CONSTRAINT_ERROR_CODE
      ) {
        throw new DuplicateSkuError(input.sku);
      }
      throw error;
    }
  }

  async listLedModels(): Promise<LedModelRecord[]> {
    const models = await this.prisma.ledModel.findMany({ orderBy: { sku: "asc" } });
    return models.map(toLedModelRecord);
  }

  async vehicleModelExists(vehicleModelId: string): Promise<boolean> {
    const count = await this.prisma.vehicleModel.count({ where: { id: vehicleModelId } });
    return count > 0;
  }

  async createFitting(input: CreateFittingInput): Promise<void> {
    try {
      await this.prisma.vehicleFitting.create({
        data: {
          vehicleModelId: input.vehicleModelId,
          position: input.position,
          socketCode: input.socketCode,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_UNIQUE_CONSTRAINT_ERROR_CODE
      ) {
        throw new DuplicateFittingError(input.vehicleModelId, input.position, input.socketCode);
      }
      throw error;
    }
  }
}
