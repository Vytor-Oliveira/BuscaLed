import { TransactionClient } from "../../db/prisma";
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
  // RF13 — o nível mínimo é o que dispara o alerta, então o admin precisa
  // poder ajustá-lo por produto.
  async updateMinimum(ledModelId: string, stockMin: number): Promise<StockLevel> {
    if (!Number.isInteger(stockMin) || stockMin < 0) {
      throw new InvalidQuantityError();
    }
    return this.repository.updateMinimum(ledModelId, stockMin);
  }

  async restock(ledModelId: string, quantity: number): Promise<StockLevel> {
    this.assertValidQuantity(quantity);
    return this.repository.incrementStock(ledModelId, quantity);
  }

  // RN12 — chamado pelo TicketModule ao concluir um ticket, sem rota pública
  // própria (decrementar fora do fluxo de ticket violaria a regra).
  //
  // Não alerta: dentro de uma transação o decremento ainda pode ser desfeito,
  // e avisar sobre estoque que voltou atrás é alarme falso. Quem concluiu
  // chama notifyLowStock depois do commit.
  async decrementStock(
    ledModelId: string,
    quantity: number,
    tx?: TransactionClient
  ): Promise<StockLevel> {
    this.assertValidQuantity(quantity);
    return this.repository.decrementStock(ledModelId, quantity, tx);
  }

  // RF19 — alerta de estoque mínimo, já com o decremento commitado. Cada envio
  // é isolado: um e-mail que falha não impede os outros nem derruba quem chamou.
  async notifyLowStock(levels: StockLevel[]): Promise<void> {
    for (const level of levels) {
      if (!level.belowMinimum) {
        continue;
      }
      try {
        await this.emailSender.sendLowStockAlert(this.alertRecipient, {
          sku: level.sku,
          name: level.name,
          stockQty: level.stockQty,
          stockMin: level.stockMin,
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Falha ao enviar alerta de estoque mínimo para ${level.sku}:`, error);
      }
    }
  }

  private assertValidQuantity(quantity: number): void {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new InvalidQuantityError();
    }
  }
}
