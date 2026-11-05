import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { requireAuth } from "../middleware/auth.middleware";
import { PrismaAnalyticsRepository } from "../repositories/analytics.repository";
import { AnalyticsService } from "../services/analytics/analytics.service";

export const analyticsRouter = Router();

const analyticsService = new AnalyticsService(new PrismaAnalyticsRepository(prisma));

// 7/30/90 são os recortes que o seletor do dashboard oferece (Tela 8).
const summaryQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).optional(),
  days: z.coerce.number().int().refine((n) => [7, 30, 90].includes(n)).optional(),
});

analyticsRouter.use(requireAuth);

analyticsRouter.get("/summary", async (req, res, next) => {
  // Mesmo nível de acesso das rotas de ticket: quem monitora demanda é o
  // representante e o admin, não o cliente.
  if (req.user!.role === "user") {
    res.status(403).json({ error: "Sem permissão para este recurso." });
    return;
  }

  const parsed = summaryQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Limite ou período inválido." });
    return;
  }

  try {
    const summary = await analyticsService.getDemandSummary(parsed.data.limit, parsed.data.days);
    res.json({ summary });
  } catch (error) {
    next(error);
  }
});
