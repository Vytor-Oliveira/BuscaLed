import { PrismaClient } from "@prisma/client";
import {
  CompatibilityRepository,
  CompatibleLed,
  VehicleFittingRecord,
  VehicleInfo,
  VehicleModelOption,
} from "../services/compatibility/types";

export class PrismaCompatibilityRepository implements CompatibilityRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findVehicleModel(vehicle: VehicleInfo): Promise<{ id: string } | null> {
    return this.prisma.vehicleModel.findFirst({
      where: {
        make: vehicle.make,
        model: vehicle.model,
        yearStart: { lte: vehicle.year },
        yearEnd: { gte: vehicle.year },
      },
      select: { id: true },
    });
  }

  async listMakes(): Promise<string[]> {
    const marcas = await this.prisma.vehicleModel.findMany({
      distinct: ["make"],
      select: { make: true },
      orderBy: { make: "asc" },
    });
    return marcas.map((m) => m.make);
  }

  async listModelsByMake(make: string): Promise<VehicleModelOption[]> {
    // Um mesmo nome de modelo aparece em varias faixas de ano; cada faixa e
    // uma opcao propria, porque o ano decide qual encaixe vale.
    return this.prisma.vehicleModel.findMany({
      where: { make },
      select: { model: true, yearStart: true, yearEnd: true },
      orderBy: [{ model: "asc" }, { yearStart: "asc" }],
    });
  }

  async findFittings(vehicleModelId: string): Promise<VehicleFittingRecord[]> {
    const fittings = await this.prisma.vehicleFitting.findMany({
      where: { vehicleModelId },
      select: { position: true, socketCode: true },
    });

    return fittings.map((fitting) => ({
      position: fitting.position as VehicleFittingRecord["position"],
      socketCode: fitting.socketCode,
    }));
  }

  async findLedModelsBySocketCodes(socketCodes: string[]): Promise<CompatibleLed[]> {
    const models = await this.prisma.ledModel.findMany({
      where: { socketCode: { in: socketCodes } },
    });

    return models.map((model) => ({
      ledModelId: model.id,
      sku: model.sku,
      name: model.name,
      socketCode: model.socketCode,
      inStock: model.stockQty > 0,
    }));
  }
}
