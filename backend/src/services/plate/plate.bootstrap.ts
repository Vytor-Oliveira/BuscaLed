import { prisma } from "../../db/prisma";
import { redis } from "../../db/redis";
import { PrismaPlateLookupRepository } from "../../repositories/plate-lookup.repository";
import { PlateLookupService } from "./plate-lookup.service";
import { HttpPlateService } from "./plate.service.http";
import { PlateService } from "./types";

// Montagem única: as rotas /plate e /garage resolvem placa pelo mesmo serviço,
// senão cada uma teria o próprio cache e a própria contagem de cota.
const apiplacasToken = process.env.APIPLACAS_TOKEN;
const realPlateService: PlateService | null = apiplacasToken
  ? new HttpPlateService(apiplacasToken)
  : null;

export const plateLookupService: PlateLookupService | null = realPlateService
  ? new PlateLookupService(realPlateService, redis, new PrismaPlateLookupRepository(prisma))
  : null;
