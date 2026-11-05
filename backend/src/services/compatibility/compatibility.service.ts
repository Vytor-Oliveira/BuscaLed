import {
  CompatibilityRepository,
  CompatibleLed,
  PositionCompatibility,
  SearchHistoryRepository,
  VehicleInfo,
  VehicleNotFoundError,
} from "./types";

export class CompatibilityService {
  constructor(
    private readonly repository: CompatibilityRepository,
    private readonly searchHistory?: SearchHistoryRepository
  ) {}

  async findCompatibleLeds(vehicle: VehicleInfo): Promise<PositionCompatibility[]> {
    const vehicleModel = await this.repository.findVehicleModel(vehicle);

    if (!vehicleModel) {
      // Registra antes de lançar: busca sem resultado é o dado que mostra
      // lacuna na matriz, justamente o mais acionável pro parceiro.
      await this.recordSearch(vehicle, 0);
      throw new VehicleNotFoundError(vehicle);
    }

    const fittings = await this.repository.findFittings(vehicleModel.id);
    if (fittings.length === 0) {
      await this.recordSearch(vehicle, 0);
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

    await this.recordSearch(vehicle, ledModels.length);

    return [...bySocketCodes.entries()].map(([position, socketCodes]) => ({
      position: position as PositionCompatibility["position"],
      socketCodes: [...socketCodes],
      models: [...socketCodes].flatMap((code) => modelsBySocketCode.get(code) ?? []),
    }));
  }

  // Efeito secundário: falha de histórico não pode derrubar a consulta do
  // usuário (mesmo tratamento que StockService dá ao alerta de estoque).
  private async recordSearch(vehicle: VehicleInfo, resultCount: number): Promise<void> {
    if (!this.searchHistory) {
      return;
    }
    try {
      await this.searchHistory.record(vehicle, resultCount);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Falha ao registrar histórico de busca:", error);
    }
  }
}
