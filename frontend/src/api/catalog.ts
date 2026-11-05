import { api } from "./client";

export interface LedModel {
  id: string;
  sku: string;
  name: string;
  socketCode: string;
  stockQty: number;
  stockMin: number;
}

export interface StockLevel {
  ledModelId: string;
  sku: string;
  name: string;
  stockQty: number;
  stockMin: number;
  belowMinimum: boolean;
}

export function listLedModels(): Promise<{ ledModels: LedModel[] }> {
  return api<{ ledModels: LedModel[] }>("/catalog/led-models");
}

export function restock(ledModelId: string, quantity: number): Promise<{ stock: StockLevel }> {
  return api<{ stock: StockLevel }>(`/stock/${ledModelId}/restock`, {
    method: "POST",
    body: { quantity },
  });
}
