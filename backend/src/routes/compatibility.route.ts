import { Router } from "express";
import { prisma } from "../db/prisma";
import { PrismaCompatibilityRepository } from "../repositories/compatibility.repository";
import { CompatibilityService } from "../services/compatibility/compatibility.service";
import { VehicleNotFoundError } from "../services/compatibility/types";

export const compatibilityRouter = Router();

const service = new CompatibilityService(new PrismaCompatibilityRepository(prisma));

compatibilityRouter.get("/", async (req, res, next) => {
  const { make, model, year } = req.query;

  if (typeof make !== "string" || typeof model !== "string" || typeof year !== "string") {
    res.status(400).json({ error: "Informe make, model e year." });
    return;
  }

  try {
    const leds = await service.findCompatibleLeds({
      make,
      model,
      year: Number(year),
    });
    res.json({ leds });
  } catch (error) {
    if (error instanceof VehicleNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    next(error);
  }
});
