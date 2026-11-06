import { api, ApiError } from "./client";

export interface LedModel {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  socketCode: string;
  imageUrl: string | null;
  /** Centavos. Preço de venda sugerido — o cliente vê. */
  priceCents: number | null;
  /** Centavos. Custo interno — só admin e representante veem. */
  costCents: number | null;
  /** Lâmpadas por kit: 2 é o par, 1 é torpedo avulso. */
  unitsPerKit: number;
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
  description?: string;
  socketCode: string;
  imageUrl?: string | null;
  priceCents?: number | null;
  costCents?: number | null;
  unitsPerKit?: number;
  stockQty?: number;
  stockMin?: number;
}

/** Edição parcial: só os campos enviados mudam. */
export interface EdicaoLedModel {
  name?: string;
  description?: string | null;
  socketCode?: string;
  imageUrl?: string | null;
  priceCents?: number | null;
  costCents?: number | null;
  unitsPerKit?: number;
  stockMin?: number;
}

export function createLedModel(dados: NovoLedModel): Promise<{ ledModel: LedModel }> {
  return api<{ ledModel: LedModel }>("/catalog/led-models", { method: "POST", body: dados });
}

export function updateLedModel(
  id: string,
  dados: EdicaoLedModel
): Promise<{ ledModel: LedModel }> {
  return api<{ ledModel: LedModel }>(`/catalog/led-models/${id}`, {
    method: "PATCH",
    body: dados,
  });
}

/**
 * Envia a imagem e devolve só a URL. Gravar no produto é o PATCH, então um
 * envio interrompido não deixa o catálogo apontando para arquivo inexistente.
 * Usa fetch direto porque o client() serializa JSON, e aqui vai multipart.
 */
export async function enviarImagemProduto(arquivo: File): Promise<string> {
  const corpo = new FormData();
  corpo.append("imagem", arquivo);

  const base = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3000";
  const resposta = await fetch(new URL("/catalog/uploads/imagem", base), {
    method: "POST",
    credentials: "include",
    body: corpo,
  });

  const dados = (await resposta.json().catch(() => null)) as
    | { imageUrl?: string; error?: string }
    | null;

  if (!resposta.ok) {
    throw new ApiError(resposta.status, dados?.error ?? `Erro ${resposta.status}.`);
  }
  if (!dados?.imageUrl) {
    throw new ApiError(resposta.status, "O servidor não devolveu o endereço da imagem.");
  }
  return dados.imageUrl;
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
