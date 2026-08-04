import { PrismaClient } from "@prisma/client";
import {
  CompatibilityRepository,
  CompatibleLed,
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

  async findCompatibleLeds(vehicleModelId: string): Promise<CompatibleLed[]> {
    const compatibilities = await this.prisma.ledCompatibility.findMany({
      where: { vehicleModelId },
      include: { ledModel: true },
    });

    return compatibilities.map((compatibility) => ({
      ledModelId: compatibility.ledModel.id,
      sku: compatibility.ledModel.sku,
      name: compatibility.ledModel.name,
      position: compatibility.position,
      inStock: compatibility.ledModel.stockQty > 0,
    }));
  }
}
