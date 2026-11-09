import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.middleware";
import { criarRateLimiter } from "../middleware/rate-limit";
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

// A cota por conta já contém o custo; este limite é contra flood de uma conta
// só, que encheria o log e o cache sem gastar cota (placa repetida bate no
// cache antes da cota).
const consultaRateLimiter = criarRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: "Muitas consultas seguidas. Tente novamente em alguns minutos." },
});

// Mercosul (ABC1D23) e o padrão antigo (ABC1234). Sem isso, qualquer string
// ia direto para a API paga.
const FORMATO_DE_PLACA = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;

const consultaSchema = z.object({
  // Hífen e espaço são como a pessoa digita, não parte da placa.
  placa: z
    .string()
    .transform((valor) => valor.toUpperCase().replace(/[^A-Z0-9]/g, ""))
    .refine((valor) => FORMATO_DE_PLACA.test(valor)),
});

/**
 * POST, e não GET com a placa no caminho: caminho de URL entra em log de
 * acesso, log de proxy e histórico do navegador, e a RN02 diz que a placa não
 * aparece em log nenhum. No corpo ela chega ao serviço e morre ali — o que
 * volta é só marca, modelo e ano.
 */
plateRouter.post("/", consultaRateLimiter, async (req, res, next) => {
  const parsed = consultaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Placa inválida. Use o formato ABC1D23 ou ABC1234." });
    return;
  }

  try {
    const vehicle = await plateLookupService.resolveForUser(req.user!.id, parsed.data.placa);
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
