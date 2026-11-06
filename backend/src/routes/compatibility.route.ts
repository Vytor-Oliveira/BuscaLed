import { Router } from "express";
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

compatibilityRouter.get("/makes", async (_req, res, next) => {
  try {
    res.json({ makes: await service.listMakes() });
  } catch (error) {
    next(error);
  }
});

compatibilityRouter.get("/models", async (req, res, next) => {
  const { make } = req.query;

  if (typeof make !== "string" || make.trim() === "") {
    res.status(400).json({ error: "Informe a marca." });
    return;
  }

  try {
    res.json({ models: await service.listModels(make) });
  } catch (error) {
    next(error);
  }
});

compatibilityRouter.get("/", async (req, res, next) => {
  const { make, model, year } = req.query;

  if (typeof make !== "string" || typeof model !== "string" || typeof year !== "string") {
    res.status(400).json({ error: "Informe make, model e year." });
    return;
  }

  try {
    const positions = await service.findCompatibleLeds({
      make,
      model,
      year: Number(year),
    });
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
