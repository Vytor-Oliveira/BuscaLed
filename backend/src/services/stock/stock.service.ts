import { EmailSender } from "../notification/types";
import { InvalidQuantityError, StockLevel, StockRepository } from "./types";

export class StockService {
  constructor(
    private readonly repository: StockRepository,
    private readonly emailSender: EmailSender,
    private readonly alertRecipient: string
  ) {}

  getStockLevel(ledModelId: string): Promise<StockLevel | null> {
    return this.repository.findById(ledModelId);
  }

  // RF13 — admin adiciona estoque.
  async restock(ledModelId: string, quantity: number): Promise<StockLevel> {
    this.assertValidQuantity(quantity);
    return this.repository.incrementStock(ledModelId, quantity);
  }

  // RN12 — chamado pelo TicketModule (M4) quando um ticket é concluído.
  // Não exposto em nenhuma rota nesta milestone: criar uma rota pública
  // pra isso deixaria o estoque ser decrementado fora do fluxo de ticket,
  // o que violaria a regra.
  async decrementStock(ledModelId: string, quantity: number): Promise<StockLevel> {
    this.assertValidQuantity(quantity);
    const updated = await this.repository.decrementStock(ledModelId, quantity);

    if (updated.belowMinimum) {
      await this.emailSender.sendLowStockAlert(this.alertRecipient, {
        sku: updated.sku,
        name: updated.name,
        stockQty: updated.stockQty,
        stockMin: updated.stockMin,
      });
    }

    return updated;
  }

  private assertValidQuantity(quantity: number): void {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new InvalidQuantityError();
    }
  }
}
