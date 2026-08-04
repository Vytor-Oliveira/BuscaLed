import {
  CompatibilityRepository,
  CompatibleLed,
  VehicleInfo,
  VehicleNotFoundError,
} from "./types";

export class CompatibilityService {
  constructor(private readonly repository: CompatibilityRepository) {}

  async findCompatibleLeds(vehicle: VehicleInfo): Promise<CompatibleLed[]> {
    const vehicleModel = await this.repository.findVehicleModel(vehicle);

    if (!vehicleModel) {
      throw new VehicleNotFoundError(vehicle);
    }

    return this.repository.findCompatibleLeds(vehicleModel.id);
  }
}
