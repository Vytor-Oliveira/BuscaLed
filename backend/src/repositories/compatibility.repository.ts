import { PrismaClient } from "@prisma/client";
import {
  CompatibilityRepository,
  CompatibleLed,
  VehicleFittingRecord,
  VehicleInfo,
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
