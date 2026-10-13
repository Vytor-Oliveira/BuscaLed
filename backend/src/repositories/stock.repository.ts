import { LedModel, Prisma, PrismaClient } from "@prisma/client";
import { InsufficientStockError, LedModelNotFoundError, StockLevel, StockRepository } from "../services/stock/types";

const PRISMA_RECORD_NOT_FOUND_ERROR_CODE = "P2025";

function toStockLevel(model: LedModel): StockLevel {
  return {
    ledModelId: model.id,
    sku: model.sku,
    name: model.name,
    stockQty: model.stockQty,
    stockMin: model.stockMin,
    belowMinimum: model.stockQty <= model.stockMin,
  };
}

export class PrismaStockRepository implements StockRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(ledModelId: string): Promise<StockLevel | null> {
    const model = await this.prisma.ledModel.findUnique({ where: { id: ledModelId } });
    return model ? toStockLevel(model) : null;
  }

  async incrementStock(ledModelId: string, quantity: number): Promise<StockLevel> {
    try {
      const updated = await this.prisma.ledModel.update({
        where: { id: ledModelId },
        data: { stockQty: { increment: quantity } },
      });
      return toStockLevel(updated);
    } catch (error) {
      // Só "sem linha correspondente" vira LedModelNotFoundError — qualquer
      // outro erro (conexão caída, timeout, etc.) sobe como está, em vez de
      // virar um 404 enganoso escondendo um problema de infraestrutura.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_RECORD_NOT_FOUND_ERROR_CODE
      ) {
        throw new LedModelNotFoundError(ledModelId);
      }
      throw error;
    }
  }

  async decrementStock(ledModelId: string, quantity: number): Promise<StockLevel> {
    // UPDATE...RETURNING via SQL bruto: nem `update` (sem WHERE extra) nem
    // `updateMany` (sem RETURNING) sozinhos dão a guarda atômica (estoque
    // não fica negativo) + a leitura da linha resultante na mesma operação.
    const rows = await this.prisma.$queryRaw<LedModel[]>`
      UPDATE "LedModel"
      SET "stockQty" = "stockQty" - ${quantity}
      WHERE id = ${ledModelId} AND "stockQty" >= ${quantity}
      RETURNING *
    `;

    if (rows.length === 0) {
      const existing = await this.prisma.ledModel.findUnique({ where: { id: ledModelId } });
      if (!existing) {
        throw new LedModelNotFoundError(ledModelId);
      }
      throw new InsufficientStockError(ledModelId);
    }

    return toStockLevel(rows[0]);
  }
}
