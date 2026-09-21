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

    // O decremento acima já está commitado no banco — é a operação crítica.
    // O alerta é só um aviso: se o envio falhar (rede, SMTP fora do ar), não
    // pode derrubar decrementStock, senão quem chamou (TicketModule, RN12)
    // acha que a operação toda falhou e tenta de novo, decrementando o
    // estoque uma segunda vez pro mesmo ticket.
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
