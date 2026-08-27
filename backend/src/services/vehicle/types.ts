export interface GarageVehicleRecord {
  id: string;
  userId: string;
  make: string;
  model: string;
  year: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface VehicleDetails {
  make: string;
  model: string;
  year: number;
}

export interface AddVehicleByPlate {
  plate: string;
}

export type AddVehicleInput = VehicleDetails | AddVehicleByPlate;

export type UpdateVehicleInput = Partial<VehicleDetails>;

export interface VehicleRepository {
  listByUser(userId: string): Promise<GarageVehicleRecord[]>;
  findById(userId: string, id: string): Promise<GarageVehicleRecord | null>;
  create(userId: string, data: VehicleDetails): Promise<GarageVehicleRecord>;
  update(userId: string, id: string, patch: UpdateVehicleInput): Promise<GarageVehicleRecord>;
  remove(userId: string, id: string): Promise<void>;
}

export class GarageVehicleNotFoundError extends Error {
  constructor(id: string) {
    super(`Veículo não encontrado na garagem: ${id}`);
    this.name = "GarageVehicleNotFoundError";
  }
}

export class PlateServiceUnavailableError extends Error {
  constructor() {
    super("Consulta de placa indisponível: APIPLACAS_TOKEN não configurado.");
    this.name = "PlateServiceUnavailableError";
  }
}
