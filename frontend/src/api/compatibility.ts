import { api } from "./client";

export type LightingPosition =
  | "FAROL_BAIXO"
  | "FAROL_ALTO"
  | "NEBLINA"
  | "LANTERNA_DIANTEIRA"
  | "PISCA_DIANTEIRO"
  | "PISCA_LATERAL"
  | "LANTERNA_TRASEIRA"
  | "PISCA_TRASEIRO"
  | "LUZ_FREIO"
  | "RE"
  | "TETO"
  | "PLACA"
  | "DRL";

export interface CompatibleLed {
  ledModelId: string;
  sku: string;
  name: string;
  socketCode: string;
  imageUrl: string | null;
  /** Centavos. Preço de venda sugerido; o custo interno nunca vem aqui. */
  priceCents: number | null;
  /** 2 = o kit já traz o par; 1 = unidade avulsa (torpedo). */
  unitsPerKit: number;
  inStock: boolean;
}

export interface PositionCompatibility {
  position: LightingPosition;
  socketCodes: string[];
  models: CompatibleLed[];
}

export const ROTULO_POSICAO: Record<LightingPosition, string> = {
  FAROL_BAIXO: "Farol baixo",
  FAROL_ALTO: "Farol alto",
  NEBLINA: "Neblina",
  LANTERNA_DIANTEIRA: "Lanterna dianteira",
  PISCA_DIANTEIRO: "Pisca dianteiro",
  PISCA_LATERAL: "Pisca lateral",
  LANTERNA_TRASEIRA: "Lanterna traseira",
  PISCA_TRASEIRO: "Pisca traseiro",
  LUZ_FREIO: "Luz de freio",
  RE: "Ré",
  TETO: "Teto",
  PLACA: "Placa",
  DRL: "DRL",
};

export interface VehicleModelOption {
  model: string;
  yearStart: number;
  yearEnd: number;
}

export function listarMarcas(): Promise<{ makes: string[] }> {
  return api<{ makes: string[] }>("/compatibility/makes");
}

export function listarModelos(make: string): Promise<{ models: VehicleModelOption[] }> {
  return api<{ models: VehicleModelOption[] }>("/compatibility/models", { query: { make } });
}

export function buscarCompatibilidade(
  make: string,
  model: string,
  year: number
): Promise<{ positions: PositionCompatibility[] }> {
  return api<{ positions: PositionCompatibility[] }>("/compatibility", {
    query: { make, model, year },
  });
}
