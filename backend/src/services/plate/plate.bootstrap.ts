import { prisma } from "../../db/prisma";
import { redis } from "../../db/redis";
import { PrismaPlateCacheRepository } from "../../repositories/plate-cache.repository";
import { PrismaPlateLookupRepository } from "../../repositories/plate-lookup.repository";
import { PlateLookupService } from "./plate-lookup.service";
import { HttpPlateService } from "./plate.service.http";
import { PlateProviderUnavailableError, PlateService } from "./types";

// Montagem única: as rotas /plate e /garage resolvem placa pelo mesmo serviço,
// senão cada uma teria o próprio cache e a própria contagem de cota.
const apiplacasToken = process.env.APIPLACAS_TOKEN;

// Sem token não há consulta paga — mas cache e cota continuam valendo: placa já
// cacheada responde, e quem estourou a cota recebe 403. Por isso a falta do
// token é um fornecedor que falha, não um módulo que deixa de existir.
const unconfiguredPlateService: PlateService = {
  resolvePlate() {
    return Promise.reject(new PlateProviderUnavailableError("APIPLACAS_TOKEN não configurado"));
  },
};

export const plateLookupService = new PlateLookupService(
  apiplacasToken ? new HttpPlateService(apiplacasToken) : unconfiguredPlateService,
  redis,
  new PrismaPlateLookupRepository(prisma),
  new PrismaPlateCacheRepository(prisma)
);
