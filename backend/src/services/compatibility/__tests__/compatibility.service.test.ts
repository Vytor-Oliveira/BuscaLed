import { CompatibilityService } from "../compatibility.service";
import { CompatibilityRepository, VehicleNotFoundError } from "../types";

function buildRepository(
  overrides: Partial<CompatibilityRepository> = {}
): CompatibilityRepository {
  return {
    findVehicleModel: jest.fn().mockResolvedValue({ id: "vehicle-1" }),
    findCompatibleLeds: jest.fn().mockResolvedValue([
      {
        ledModelId: "led-1",
        sku: "SL-H4-6000K",
        name: "Shocklight H4 6000K",
        position: "BAIXO",
        inStock: true,
      },
    ]),
    ...overrides,
  };
}

describe("CompatibilityService", () => {
  it("retorna os LEDs compatíveis quando o veículo é encontrado", async () => {
    const repository = buildRepository();
    const service = new CompatibilityService(repository);

    const result = await service.findCompatibleLeds({
      make: "Fiat",
      model: "Argo",
      year: 2022,
    });

    expect(repository.findVehicleModel).toHaveBeenCalledWith({
      make: "Fiat",
      model: "Argo",
      year: 2022,
    });
    expect(result).toHaveLength(1);
    expect(result[0].sku).toBe("SL-H4-6000K");
  });

  it("lança VehicleNotFoundError quando o veículo não está cadastrado", async () => {
    const repository = buildRepository({
      findVehicleModel: jest.fn().mockResolvedValue(null),
    });
    const service = new CompatibilityService(repository);

    await expect(
      service.findCompatibleLeds({ make: "Fiat", model: "Uno", year: 2010 })
    ).rejects.toThrow(VehicleNotFoundError);
  });
});
