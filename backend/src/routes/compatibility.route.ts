import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { PrismaCompatibilityRepository } from "../repositories/compatibility.repository";
import { PrismaSearchHistoryRepository } from "../repositories/search-history.repository";
import { CompatibilityService } from "../services/compatibility/compatibility.service";
import {
  AmbiguousVehicleModelError,
  VehicleNotFoundError,
} from "../services/compatibility/types";

export const compatibilityRouter = Router();

const service = new CompatibilityService(
  new PrismaCompatibilityRepository(prisma),
  new PrismaSearchHistoryRepository(prisma)
);

// A busca e publica de proposito: o motorista consulta sem criar conta. O que
// faltava era o cinto de seguranca em volta disso — cada chamada grava uma
// linha em SearchHistory, inclusive a sem resultado, entao sem limite da para
// inflar a tabela e distorcer o dashboard de demanda. 60/15min por IP deixa
// folga para quem compara varios carros e corta flood.
const buscaRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas consultas seguidas. Tente novamente em alguns minutos." },
});

const PRIMEIRO_ANO = 1950;

// O ano-modelo seguinte ja e vendido no ano corrente, e e o mesmo teto que o
// seletor do site usa.
function ultimoAno(): number {
  return new Date().getFullYear() + 1;
}

// 60 caracteres cobre o nome mais longo da matriz com folga. Sem teto, texto
// de qualquer tamanho virava linha no banco.
const TEXTO_DE_VEICULO = z.string().trim().min(1).max(60);

const marcaQuerySchema = z.object({ make: TEXTO_DE_VEICULO });

const buscaQuerySchema = z.object({
  make: TEXTO_DE_VEICULO,
  model: TEXTO_DE_VEICULO,
  // `Number(year)` aceitava "abc" como NaN e "1e99" inteiro. Aqui o ano so
  // passa se for inteiro dentro da faixa que a matriz cobre.
  year: z.coerce.number().int().min(PRIMEIRO_ANO).max(ultimoAno()),
});

compatibilityRouter.get("/makes", async (_req, res, next) => {
  try {
    res.json({ makes: await service.listMakes() });
  } catch (error) {
    next(error);
  }
});

compatibilityRouter.get("/models", async (req, res, next) => {
  const parsed = marcaQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Informe a marca." });
    return;
  }

  try {
    res.json({ models: await service.listModels(parsed.data.make) });
  } catch (error) {
    next(error);
  }
});

compatibilityRouter.get("/", buscaRateLimiter, async (req, res, next) => {
  // Fora do try: entrada invalida e 400 de quem chamou, nao 500 do servidor.
  const parsed = buscaQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      error: `Informe marca, modelo e um ano entre ${PRIMEIRO_ANO} e ${ultimoAno()}.`,
    });
    return;
  }

  try {
    const positions = await service.findCompatibleLeds(parsed.data);
    res.json({ positions });
  } catch (error) {
    if (error instanceof VehicleNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    // 409: o veiculo existe, mas as versoes divergem na iluminacao. Devolve os
    // nomes para a tela oferecer a escolha em vez de arriscar o LED errado.
    if (error instanceof AmbiguousVehicleModelError) {
      res.status(409).json({ error: error.message, candidates: error.candidates });
      return;
    }
    next(error);
  }
});
