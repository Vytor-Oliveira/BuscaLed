import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { plateLookupService } from "../services/plate/plate.bootstrap";
import {
  PlateLookupLimitExceededError,
  PlateNotFoundError,
  PlateProviderUnavailableError,
  PlateServiceTimeoutError,
} from "../services/plate/types";

export const plateRouter = Router();

// Consulta paga com cota por conta: sem usuário não há de quem debitar.
plateRouter.use(requireAuth);

plateRouter.get("/:placa", async (req, res, next) => {
  try {
    const vehicle = await plateLookupService.resolveForUser(req.user!.id, req.params.placa);
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
    if (error instanceof PlateLookupLimitExceededError) {
      res.status(403).json({ error: error.message });
      return;
    }
    if (error instanceof PlateProviderUnavailableError) {
      // eslint-disable-next-line no-console
      console.error("Consulta de placa indisponível:", error.motivo);
      res.status(503).json({
        error: "Consulta de placa indisponível no momento. Use a busca por marca/modelo/ano.",
      });
      return;
    }
    next(error);
  }
});
