import { PrismaClient } from "@prisma/client";
import { PlateInfo } from "../services/plate/types";

export interface PlateCacheRepository {
  buscar(plate: string): Promise<PlateInfo | null>;
  gravar(plate: string, info: PlateInfo, expiresAt: Date): Promise<void>;
}

export class PrismaPlateCacheRepository implements PlateCacheRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Linha vencida é apagada em vez de devolvida: a RN02 pede que a placa suma,
   * e devolver dado velho esconderia mudança de veículo.
   */
  async buscar(plate: string): Promise<PlateInfo | null> {
    const linha = await this.prisma.plateCache.findUnique({ where: { plate } });
    if (!linha) {
      return null;
    }

    if (linha.expiresAt <= new Date()) {
      await this.prisma.plateCache.deleteMany({ where: { plate } });
      return null;
    }

    return {
      make: linha.make,
      model: linha.model,
      year: linha.year,
      color: linha.color ?? "",
    };
  }

  async gravar(plate: string, info: PlateInfo, expiresAt: Date): Promise<void> {
    const dados = {
      make: info.make,
      model: info.model,
      year: info.year,
      color: info.color || null,
      expiresAt,
    };

    await this.prisma.plateCache.upsert({
      where: { plate },
      update: dados,
      create: { plate, ...dados },
    });

    // Varre o vencido junto com a escrita: sem isso, placa que ninguém
    // consulta de novo ficaria guardada para sempre. O índice em expiresAt
    // mantém a varredura barata.
    await this.prisma.plateCache.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  }
}
