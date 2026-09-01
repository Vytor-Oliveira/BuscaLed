import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { requireAuth } from "../middleware/auth.middleware";
import { PrismaVehicleRepository } from "../repositories/vehicle.repository";
import { PlateNotFoundError, PlateServiceTimeoutError } from "../services/plate/types";
import { HttpPlateService } from "../services/plate/plate.service.http";
import { GarageVehicleNotFoundError, PlateServiceUnavailableError } from "../services/vehicle/types";
import { VehicleService } from "../services/vehicle/vehicle.service";

export const vehicleRouter = Router();

const apiplacasToken = process.env.APIPLACAS_TOKEN;
const plateService = apiplacasToken ? new HttpPlateService(apiplacasToken) : null;
const vehicleService = new VehicleService(new PrismaVehicleRepository(prisma), plateService);

const currentYear = new Date().getFullYear();

const vehicleByDetailsSchema = z.object({
  make: z.string().min(1, "Informe a marca."),
  model: z.string().min(1, "Informe o modelo."),
  year: z.number().int().min(1900).max(currentYear + 1),
});

const vehicleByPlateSchema = z.object({
  plate: z.string().min(7, "Placa inválida.").max(8, "Placa inválida."),
});

const createVehicleSchema = z.union([vehicleByPlateSchema, vehicleByDetailsSchema]);

const updateVehicleSchema = z.object({
  make: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  year: z.number().int().min(1900).max(currentYear + 1).optional(),
});

vehicleRouter.use(requireAuth);

vehicleRouter.get("/", async (req, res, next) => {
  try {
    const vehicles = await vehicleService.listVehicles(req.user!.id);
    res.json({ vehicles });
  } catch (error) {
    next(error);
  }
});

vehicleRouter.post("/", async (req, res, next) => {
  const parsed = createVehicleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Informe plate, ou make/model/year." });
    return;
  }

  try {
    const vehicle = await vehicleService.addVehicle(req.user!.id, parsed.data);
    res.status(201).json({ vehicle });
  } catch (error) {
    if (error instanceof PlateNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error instanceof PlateServiceTimeoutError) {
      res.status(504).json({ error: error.message });
      return;
    }
    if (error instanceof PlateServiceUnavailableError) {
      res.status(503).json({ error: error.message });
      return;
    }
    next(error);
  }
});

vehicleRouter.patch("/:id", async (req, res, next) => {
  const parsed = updateVehicleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados de atualização inválidos." });
    return;
  }

  try {
    const vehicle = await vehicleService.updateVehicle(req.user!.id, req.params.id, parsed.data);
    res.json({ vehicle });
  } catch (error) {
    if (error instanceof GarageVehicleNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    next(error);
  }
});

vehicleRouter.delete("/:id", async (req, res, next) => {
  try {
    await vehicleService.removeVehicle(req.user!.id, req.params.id);
    res.status(204).send();
  } catch (error) {
    if (error instanceof GarageVehicleNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    next(error);
  }
});
