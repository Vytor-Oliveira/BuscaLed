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

  // RN12 — chamado pelo TicketModule ao concluir um ticket, sem rota pública
  // própria (decrementar fora do fluxo de ticket violaria a regra).
  async decrementStock(ledModelId: string, quantity: number): Promise<StockLevel> {
    this.assertValidQuantity(quantity);
    const updated = await this.repository.decrementStock(ledModelId, quantity);

    // Decremento já commitado — falha no alerta não pode derrubar esta chamada.
    if (updated.belowMinimum) {
      try {
        await this.emailSender.sendLowStockAlert(this.alertRecipient, {
          sku: updated.sku,
          name: updated.name,
          stockQty: updated.stockQty,
          stockMin: updated.stockMin,
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Falha ao enviar alerta de estoque mínimo para ${updated.sku}:`, error);
      }
    }

    return updated;
  }

  private assertValidQuantity(quantity: number): void {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new InvalidQuantityError();
    }
  }
}
