import { Router } from "express";
import { HttpPlateService } from "../services/plate/plate.service.http";
import { PlateNotFoundError, PlateServiceTimeoutError } from "../services/plate/types";

export const plateRouter = Router();

const token = process.env.APIPLACAS_TOKEN;
const plateService = token ? new HttpPlateService(token) : null;

plateRouter.get("/:placa", async (req, res, next) => {
  if (!plateService) {
    res.status(503).json({
      error: "Consulta de placa indisponível: APIPLACAS_TOKEN não configurado.",
    });
    return;
  }

  try {
    const vehicle = await plateService.resolvePlate(req.params.placa);
    res.json(vehicle);
  } catch (error) {
    if (error instanceof PlateNotFoundError) {
      res.status(404).json({ error: "Placa não encontrada. Informe os dados manualmente." });
      return;
    }
    if (error instanceof PlateServiceTimeoutError) {
      res.status(504).json({ error: "Timeout na consulta da placa. Use a busca manual." });
      return;
    }
    next(error);
  }
});
