import {
  CompatibilityRepository,
  CompatibleLed,
  PositionCompatibility,
  VehicleInfo,
  VehicleNotFoundError,
} from "./types";

export class CompatibilityService {
  constructor(private readonly repository: CompatibilityRepository) {}

  async findCompatibleLeds(vehicle: VehicleInfo): Promise<PositionCompatibility[]> {
    const vehicleModel = await this.repository.findVehicleModel(vehicle);

    if (!vehicleModel) {
      throw new VehicleNotFoundError(vehicle);
    }

    const fittings = await this.repository.findFittings(vehicleModel.id);
    if (fittings.length === 0) {
      return [];
    }

    const distinctSocketCodes = [...new Set(fittings.map((f) => f.socketCode))];
    const ledModels = await this.repository.findLedModelsBySocketCodes(distinctSocketCodes);

    const modelsBySocketCode = new Map<string, CompatibleLed[]>();
    for (const model of ledModels) {
      const existing = modelsBySocketCode.get(model.socketCode) ?? [];
      existing.push(model);
      modelsBySocketCode.set(model.socketCode, existing);
    }

    const bySocketCodes = new Map<string, Set<string>>();
    for (const fitting of fittings) {
      const codes = bySocketCodes.get(fitting.position) ?? new Set<string>();
      codes.add(fitting.socketCode);
      bySocketCodes.set(fitting.position, codes);
    }

    return [...bySocketCodes.entries()].map(([position, socketCodes]) => ({
      position: position as PositionCompatibility["position"],
      socketCodes: [...socketCodes],
      models: [...socketCodes].flatMap((code) => modelsBySocketCode.get(code) ?? []),
    }));
  }
}
