import { PrismaClient } from "@prisma/client";
import { SearchHistoryRepository, VehicleInfo } from "../services/compatibility/types";

export class PrismaSearchHistoryRepository implements SearchHistoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async record(vehicle: VehicleInfo, resultCount: number): Promise<void> {
    await this.prisma.searchHistory.create({
      data: {
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        resultCount,
      },
    });
  }
}
