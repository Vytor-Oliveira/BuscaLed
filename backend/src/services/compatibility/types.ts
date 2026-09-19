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

export interface VehicleInfo {
  make: string;
  model: string;
  year: number;
}

export interface VehicleFittingRecord {
  position: LightingPosition;
  socketCode: string;
}

export interface CompatibleLed {
  ledModelId: string;
  sku: string;
  name: string;
  socketCode: string;
  inStock: boolean;
}

/**
 * RF06 — resultado organizado por posição. `models` vem vazio quando o
 * soquete daquela posição ainda não tem nenhum produto LED cadastrado no
 * catálogo (esperado hoje para a maioria dos ~79 soquetes da planilha —
 * só 6 tipos têm produto do Apêndice C por enquanto).
 */
export interface PositionCompatibility {
  position: LightingPosition;
  socketCodes: string[];
  models: CompatibleLed[];
}

export interface CompatibilityRepository {
  findVehicleModel(vehicle: VehicleInfo): Promise<{ id: string } | null>;
  findFittings(vehicleModelId: string): Promise<VehicleFittingRecord[]>;
  findLedModelsBySocketCodes(socketCodes: string[]): Promise<CompatibleLed[]>;
}

export class VehicleNotFoundError extends Error {
  constructor(vehicle: VehicleInfo) {
    super(
      `Nenhum modelo de veículo compatível cadastrado para ${vehicle.make} ${vehicle.model} ${vehicle.year}`
    );
    this.name = "VehicleNotFoundError";
  }
}
