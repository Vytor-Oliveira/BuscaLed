import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { stockService } from "../services/stock/stock.bootstrap";
import { InsufficientStockError, InvalidQuantityError, LedModelNotFoundError } from "../services/stock/types";

export const stockRouter = Router();

const restockSchema = z.object({
  quantity: z.number().int().positive("A quantidade precisa ser um inteiro positivo."),
});

stockRouter.use(requireAuth, requireRole("admin"));

stockRouter.get("/:ledModelId", async (req, res, next) => {
  try {
    const level = await stockService.getStockLevel(req.params.ledModelId);
    if (!level) {
      res.status(404).json({ error: "Produto LED não encontrado." });
      return;
    }
    res.json({ stock: level });
  } catch (error) {
    next(error);
  }
});

stockRouter.post("/:ledModelId/restock", async (req, res, next) => {
  const parsed = restockSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Quantidade inválida." });
    return;
  }

  try {
    const level = await stockService.restock(req.params.ledModelId, parsed.data.quantity);
    res.json({ stock: level });
  } catch (error) {
    if (error instanceof LedModelNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error instanceof InvalidQuantityError || error instanceof InsufficientStockError) {
      res.status(400).json({ error: error.message });
      return;
    }
    next(error);
  }
});
