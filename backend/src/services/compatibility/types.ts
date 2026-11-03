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

// Alimenta os seletores da busca por Marca/Modelo/Ano: sem isso a pessoa
// precisa acertar a grafia exata de um catálogo de ~1900 modelos.
export interface VehicleModelOption {
  model: string;
  yearStart: number;
  yearEnd: number;
}

// A placa devolve o nome cru da API ("NOVA SAVEIRO RB MBVS"), que raramente
// bate letra a letra com a matriz. A busca volta todos os acabamentos que
// casam pelo nome base, e o service decide o que fazer com eles.
export interface VehicleModelCandidate {
  id: string;
  model: string;
}

export interface CompatibilityRepository {
  findVehicleModelCandidates(vehicle: VehicleInfo): Promise<VehicleModelCandidate[]>;
  findFittings(vehicleModelId: string): Promise<VehicleFittingRecord[]>;
  findLedModelsBySocketCodes(socketCodes: string[]): Promise<CompatibleLed[]>;
  listMakes(): Promise<string[]>;
  listModelsByMake(make: string): Promise<VehicleModelOption[]>;
}

/**
 * Escrita do histórico analítico fica separada do CompatibilityRepository, que
 * é só de leitura. Sem placa e sem userId — ver o comentário do model
 * SearchHistory no schema.
 */
export interface SearchHistoryRepository {
  record(vehicle: VehicleInfo, resultCount: number): Promise<void>;
}

export class VehicleNotFoundError extends Error {
  constructor(vehicle: VehicleInfo) {
    super(
      `Nenhum modelo de veículo compatível cadastrado para ${vehicle.make} ${vehicle.model} ${vehicle.year}`
    );
    this.name = "VehicleNotFoundError";
  }
}

/**
 * Mais de uma versão do mesmo carro casou e a iluminação delas difere. Mostrar
 * qualquer uma arriscaria indicar o LED errado, então o usuário escolhe.
 */
export class AmbiguousVehicleModelError extends Error {
  readonly candidates: string[];

  constructor(vehicle: VehicleInfo, candidates: string[]) {
    super(
      `Mais de uma versão de ${vehicle.make} ${vehicle.model} ${vehicle.year} tem iluminação diferente. Selecione a versão exata.`
    );
    this.name = "AmbiguousVehicleModelError";
    this.candidates = candidates;
  }
}
