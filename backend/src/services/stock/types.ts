export interface StockLevel {
  ledModelId: string;
  sku: string;
  name: string;
  stockQty: number;
  stockMin: number;
  belowMinimum: boolean;
}

export interface StockRepository {
  findById(ledModelId: string): Promise<StockLevel | null>;
  incrementStock(ledModelId: string, quantity: number): Promise<StockLevel>;
  decrementStock(ledModelId: string, quantity: number): Promise<StockLevel>;
}

export class LedModelNotFoundError extends Error {
  constructor(id: string) {
    super(`Produto LED não encontrado: ${id}`);
    this.name = "LedModelNotFoundError";
  }
}

export class InsufficientStockError extends Error {
  constructor(id: string) {
    super(`Estoque insuficiente para o produto ${id}.`);
    this.name = "InsufficientStockError";
  }
}

export class InvalidQuantityError extends Error {
  constructor() {
    super("Quantidade deve ser um número inteiro positivo.");
    this.name = "InvalidQuantityError";
  }
}
