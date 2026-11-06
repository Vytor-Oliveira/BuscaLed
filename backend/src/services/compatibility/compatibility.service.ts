import {
  AmbiguousVehicleModelError,
  CompatibilityRepository,
  CompatibleLed,
  LightingPosition,
  PositionCompatibility,
  SearchHistoryRepository,
  VehicleFittingRecord,
  VehicleInfo,
  VehicleModelCandidate,
  VehicleModelOption,
  VehicleNotFoundError,
} from "./types";

function codesByPosition(fittings: VehicleFittingRecord[]): Map<LightingPosition, string[]> {
  const grouped = new Map<LightingPosition, string[]>();

  for (const fitting of fittings) {
    const codes = grouped.get(fitting.position) ?? [];
    codes.push(fitting.socketCode);
    grouped.set(fitting.position, codes);
  }

  for (const codes of grouped.values()) {
    codes.sort((a, b) => a.localeCompare(b));
  }
  return grouped;
}

export class CompatibilityService {
  constructor(
    private readonly repository: CompatibilityRepository,
    private readonly searchHistory?: SearchHistoryRepository
  ) {}

  listMakes(): Promise<string[]> {
    return this.repository.listMakes();
  }

  listModels(make: string): Promise<VehicleModelOption[]> {
    return this.repository.listModelsByMake(make);
  }

  async findCompatibleLeds(vehicle: VehicleInfo): Promise<PositionCompatibility[]> {
    const candidates = await this.repository.findVehicleModelCandidates(vehicle);

    if (candidates.length === 0) {
      // Registra antes de lançar: busca sem resultado é o dado que mostra
      // lacuna na matriz, justamente o mais acionável pro parceiro.
      await this.recordSearch(vehicle, 0);
      throw new VehicleNotFoundError(vehicle);
    }

    const fittings = await this.resolveFittings(vehicle, candidates);
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
  // Acabamentos do mesmo carro/ano quase sempre compartilham a iluminação.
  // Posição que existe num acabamento e falta no outro é lacuna da planilha,
  // não contradição — só é ambíguo quando dois dão soquetes diferentes pra
  // mesma posição, e aí a escolha volta pro usuário em vez de arriscar.
  private async resolveFittings(
    vehicle: VehicleInfo,
    candidates: VehicleModelCandidate[]
  ): Promise<VehicleFittingRecord[]> {
    if (candidates.length === 1) {
      return this.repository.findFittings(candidates[0].id);
    }

    const perCandidate = await Promise.all(
      candidates.map(async (candidate) => ({
        model: candidate.model,
        fittings: await this.repository.findFittings(candidate.id),
      }))
    );

    const merged = new Map<LightingPosition, string[]>();
    for (const entry of perCandidate) {
      for (const [position, codes] of codesByPosition(entry.fittings)) {
        const seen = merged.get(position);
        if (seen && seen.join(",") !== codes.join(",")) {
          throw new AmbiguousVehicleModelError(
            vehicle,
            perCandidate.map((candidate) => candidate.model)
          );
        }
        merged.set(position, codes);
      }
    }

    return [...merged.entries()].flatMap(([position, codes]) =>
      codes.map((socketCode) => ({ position, socketCode }))
    );
  }

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
