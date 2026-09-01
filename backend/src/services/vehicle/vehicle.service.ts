import { PlateService } from "../plate/types";
import {
  AddVehicleInput,
  GarageVehicleNotFoundError,
  GarageVehicleRecord,
  PlateServiceUnavailableError,
  UpdateVehicleInput,
  VehicleDetails,
  VehicleRepository,
} from "./types";

export class VehicleService {
  constructor(
    private readonly vehicleRepository: VehicleRepository,
    private readonly plateService: PlateService | null
  ) {}

  listVehicles(userId: string): Promise<GarageVehicleRecord[]> {
    return this.vehicleRepository.listByUser(userId);
  }

  async addVehicle(userId: string, input: AddVehicleInput): Promise<GarageVehicleRecord> {
    const details = await this.resolveDetails(input);
    return this.vehicleRepository.create(userId, details);
  }

  async updateVehicle(
    userId: string,
    id: string,
    patch: UpdateVehicleInput
  ): Promise<GarageVehicleRecord> {
    await this.requireExisting(userId, id);
    return this.vehicleRepository.update(userId, id, patch);
  }

  async removeVehicle(userId: string, id: string): Promise<void> {
    await this.requireExisting(userId, id);
    await this.vehicleRepository.remove(userId, id);
  }

  private async requireExisting(userId: string, id: string): Promise<void> {
    const existing = await this.vehicleRepository.findById(userId, id);
    if (!existing) {
      throw new GarageVehicleNotFoundError(id);
    }
  }

  // RF05/RN02 — a placa (input.plate) é usada só dentro deste método e nunca
  // sai daqui: o repositório só recebe make/model/year, nunca a placa.
  private async resolveDetails(input: AddVehicleInput): Promise<VehicleDetails> {
    if ("plate" in input) {
      if (!this.plateService) {
        throw new PlateServiceUnavailableError();
      }

      const resolved = await this.plateService.resolvePlate(input.plate);
      return { make: resolved.make, model: resolved.model, year: resolved.year };
    }

    return { make: input.make, model: input.model, year: input.year };
  }
}
