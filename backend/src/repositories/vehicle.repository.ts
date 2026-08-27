import { PrismaClient } from "@prisma/client";
import {
  GarageVehicleNotFoundError,
  GarageVehicleRecord,
  UpdateVehicleInput,
  VehicleDetails,
  VehicleRepository,
} from "../services/vehicle/types";

export class PrismaVehicleRepository implements VehicleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listByUser(userId: string): Promise<GarageVehicleRecord[]> {
    return this.prisma.garageVehicle.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  findById(userId: string, id: string): Promise<GarageVehicleRecord | null> {
    return this.prisma.garageVehicle.findFirst({ where: { id, userId } });
  }

  create(userId: string, data: VehicleDetails): Promise<GarageVehicleRecord> {
    return this.prisma.garageVehicle.create({ data: { ...data, userId } });
  }

  async update(
    userId: string,
    id: string,
    patch: UpdateVehicleInput
  ): Promise<GarageVehicleRecord> {
    // Sempre filtrado por userId — mesmo que o service já tenha checado
    // posse antes, isso garante que um usuário nunca edita veículo alheio.
    const result = await this.prisma.garageVehicle.updateMany({
      where: { id, userId },
      data: patch,
    });

    // Corrida: o registro existia quando o service checou, mas sumiu
    // (removido em paralelo) antes deste update rodar. Erro de negócio
    // esperado, não uma falha inesperada do Prisma.
    if (result.count === 0) {
      throw new GarageVehicleNotFoundError(id);
    }

    return this.prisma.garageVehicle.findFirstOrThrow({ where: { id, userId } });
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.prisma.garageVehicle.deleteMany({ where: { id, userId } });
  }
}
