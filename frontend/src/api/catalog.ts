import { api } from "./client";

export interface LedModel {
  id: string;
  sku: string;
  name: string;
  socketCode: string;
  imageUrl: string | null;
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

export interface NovoLedModel {
  sku: string;
  name: string;
  socketCode: string;
  stockQty?: number;
  stockMin?: number;
}

export function createLedModel(dados: NovoLedModel): Promise<{ ledModel: LedModel }> {
  return api<{ ledModel: LedModel }>("/catalog/led-models", { method: "POST", body: dados });
}

export function listLedModels(): Promise<{ ledModels: LedModel[] }> {
  return api<{ ledModels: LedModel[] }>("/catalog/led-models");
}

export function updateMinimum(
  ledModelId: string,
  stockMin: number
): Promise<{ stock: StockLevel }> {
  return api<{ stock: StockLevel }>(`/stock/${ledModelId}/minimum`, {
    method: "PATCH",
    body: { stockMin },
  });
}

export function restock(ledModelId: string, quantity: number): Promise<{ stock: StockLevel }> {
  return api<{ stock: StockLevel }>(`/stock/${ledModelId}/restock`, {
    method: "POST",
    body: { quantity },
  });
}
