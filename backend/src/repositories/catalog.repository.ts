import { LedModel, Prisma, PrismaClient } from "@prisma/client";
import {
  CatalogRepository,
  CreateFittingInput,
  CreateLedModelInput,
  DuplicateFittingError,
  DuplicateSkuError,
  LedModelNotFoundError,
  LedModelRecord,
  UpdateLedModelInput,
} from "../services/catalog/types";

const PRISMA_UNIQUE_CONSTRAINT_ERROR_CODE = "P2002";
const PRISMA_RECORD_NOT_FOUND_ERROR_CODE = "P2025";

function toLedModelRecord(model: LedModel): LedModelRecord {
  return {
    id: model.id,
    sku: model.sku,
    name: model.name,
    description: model.description,
    socketCode: model.socketCode,
    imageUrl: model.imageUrl,
    priceCents: model.priceCents,
    costCents: model.costCents,
    unitsPerKit: model.unitsPerKit,
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
          imageUrl: input.imageUrl ?? null,
          priceCents: input.priceCents ?? null,
          costCents: input.costCents ?? null,
          unitsPerKit: input.unitsPerKit ?? 2,
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

  async updateLedModel(id: string, input: UpdateLedModelInput): Promise<LedModelRecord> {
    try {
      const model = await this.prisma.ledModel.update({
        where: { id },
        // Campo ausente no corpo fica como esta: `undefined` o Prisma ignora,
        // `null` limpa de proposito.
        data: {
          name: input.name,
          description: input.description,
          socketCode: input.socketCode,
          imageUrl: input.imageUrl,
          priceCents: input.priceCents,
          costCents: input.costCents,
          unitsPerKit: input.unitsPerKit,
          stockMin: input.stockMin,
        },
      });
      return toLedModelRecord(model);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_RECORD_NOT_FOUND_ERROR_CODE
      ) {
        throw new LedModelNotFoundError(id);
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
