export type HeadlightPosition = "BAIXO" | "ALTO" | "MILHA" | "PISCA" | "DRL";

export interface VehicleInfo {
  make: string;
  model: string;
  year: number;
}

export interface CompatibleLed {
  ledModelId: string;
  sku: string;
  name: string;
  position: HeadlightPosition;
  inStock: boolean;
}

export interface CompatibilityRepository {
  findVehicleModel(vehicle: VehicleInfo): Promise<{ id: string } | null>;
  findCompatibleLeds(vehicleModelId: string): Promise<CompatibleLed[]>;
}

export class VehicleNotFoundError extends Error {
  constructor(vehicle: VehicleInfo) {
    super(
      `Nenhum modelo de veículo compatível cadastrado para ${vehicle.make} ${vehicle.model} ${vehicle.year}`
    );
    this.name = "VehicleNotFoundError";
  }
}
