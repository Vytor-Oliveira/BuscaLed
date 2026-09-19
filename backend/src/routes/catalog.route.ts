import { LightingPosition } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { PrismaCatalogRepository } from "../repositories/catalog.repository";
import { CatalogService } from "../services/catalog/catalog.service";
import {
  DuplicateFittingError,
  DuplicateSkuError,
  VehicleModelNotFoundForFittingError,
} from "../services/catalog/types";

export const catalogRouter = Router();

const catalogService = new CatalogService(new PrismaCatalogRepository(prisma));

// Deriva do enum gerado pelo Prisma (fonte única de verdade é schema.prisma)
// em vez de duplicar a lista de posições manualmente — evita as 3 listas
// (schema, aqui, scripts/compat-matrix-parsers.ts) saírem de sincronia.
const createLedModelSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  socketCode: z.string().min(1),
  stockQty: z.number().int().nonnegative().optional(),
  stockMin: z.number().int().nonnegative().optional(),
});

const createFittingSchema = z.object({
  vehicleModelId: z.string().min(1),
  position: z.nativeEnum(LightingPosition),
  socketCode: z.string().min(1),
});

catalogRouter.use(requireAuth, requireRole("admin"));

catalogRouter.post("/led-models", async (req, res, next) => {
  const parsed = createLedModelSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados de produto inválidos." });
    return;
  }

  try {
    const ledModel = await catalogService.createLedModel(parsed.data);
    res.status(201).json({ ledModel });
  } catch (error) {
    if (error instanceof DuplicateSkuError) {
      res.status(409).json({ error: error.message });
      return;
    }
    next(error);
  }
});

catalogRouter.post("/fittings", async (req, res, next) => {
  const parsed = createFittingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados de encaixe inválidos." });
    return;
  }

  try {
    await catalogService.createFitting(parsed.data);
    res.status(201).json({ message: "Encaixe adicionado." });
  } catch (error) {
    if (error instanceof VehicleModelNotFoundForFittingError) {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error instanceof DuplicateFittingError) {
      res.status(409).json({ error: error.message });
      return;
    }
    next(error);
  }
});
