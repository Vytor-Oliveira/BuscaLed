import { LightingPosition } from "@prisma/client";
import { Router } from "express";
import { MulterError } from "multer";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { PrismaCatalogRepository } from "../repositories/catalog.repository";
import { CatalogService } from "../services/catalog/catalog.service";
import {
  DuplicateFittingError,
  DuplicateSkuError,
  LedModelNotFoundError,
  VehicleModelNotFoundForFittingError,
} from "../services/catalog/types";
import {
  TipoDeImagemInvalidoError,
  uploadDeImagem,
  urlPublicaDoArquivo,
} from "./upload";

export const catalogRouter = Router();

const catalogService = new CatalogService(new PrismaCatalogRepository(prisma));

// Dinheiro em centavos inteiros: o cliente manda 12990 para R$ 129,90. Teto
// alto mas finito, para um dedo escorregado nao gravar um numero absurdo.
const centavos = z.number().int().nonnegative().max(100_000_000).nullable();

const createLedModelSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  socketCode: z.string().min(1),
  imageUrl: z.string().min(1).nullable().optional(),
  priceCents: centavos.optional(),
  costCents: centavos.optional(),
  unitsPerKit: z.number().int().min(1).max(10).optional(),
  stockQty: z.number().int().nonnegative().optional(),
  stockMin: z.number().int().nonnegative().optional(),
});

// Edicao parcial: `.strict()` recusa campo desconhecido em vez de descartar
// em silencio, e pelo menos um campo precisa vir.
const updateLedModelSchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    socketCode: z.string().min(1).optional(),
    imageUrl: z.string().min(1).nullable().optional(),
    priceCents: centavos.optional(),
    costCents: centavos.optional(),
    unitsPerKit: z.number().int().min(1).max(10).optional(),
    stockMin: z.number().int().nonnegative().optional(),
  })
  .strict()
  .refine((corpo) => Object.keys(corpo).length > 0, {
    message: "Informe ao menos um campo para alterar.",
  });

// Deriva do enum gerado pelo Prisma (fonte única de verdade é schema.prisma)
// em vez de duplicar a lista de posições manualmente — evita as 3 listas
// (schema, aqui, scripts/compat-matrix-parsers.ts) saírem de sincronia.
const createFittingSchema = z.object({
  vehicleModelId: z.string().min(1),
  position: z.nativeEnum(LightingPosition),
  socketCode: z.string().min(1),
});

catalogRouter.use(requireAuth, requireRole("admin"));

catalogRouter.get("/led-models", async (_req, res, next) => {
  try {
    const ledModels = await catalogService.listLedModels();
    res.json({ ledModels });
  } catch (error) {
    next(error);
  }
});

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

catalogRouter.patch("/led-models/:id", async (req, res, next) => {
  const parsed = updateLedModelSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados de produto inválidos." });
    return;
  }

  try {
    const ledModel = await catalogService.updateLedModel(req.params.id, parsed.data);
    res.json({ ledModel });
  } catch (error) {
    if (error instanceof LedModelNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    next(error);
  }
});

/**
 * Upload da foto do produto. Devolve só a URL pública: quem decide gravá-la no
 * produto é o PATCH acima, então um envio interrompido não deixa o catálogo
 * apontando para arquivo que não existe.
 */
catalogRouter.post(
  "/uploads/imagem",
  (req, res, next) => {
    uploadDeImagem.single("imagem")(req, res, (erro) => {
      if (!erro) {
        next();
        return;
      }
      if (erro instanceof TipoDeImagemInvalidoError) {
        res.status(415).json({ error: erro.message });
        return;
      }
      if (erro instanceof MulterError && erro.code === "LIMIT_FILE_SIZE") {
        res.status(413).json({ error: "A imagem precisa ter no máximo 3 MB." });
        return;
      }
      next(erro);
    });
  },
  (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "Nenhuma imagem foi enviada." });
      return;
    }
    res.status(201).json({ imageUrl: urlPublicaDoArquivo(req.file.filename) });
  }
);

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
