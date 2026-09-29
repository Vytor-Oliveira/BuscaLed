import { LightingPosition, ReservationStatus } from "@prisma/client";
import { NextFunction, Response, Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { requireAuth } from "../middleware/auth.middleware";
import { notificationEmailSender } from "../queue/notification.bootstrap";
import { PrismaTicketRepository } from "../repositories/ticket.repository";
import { stockService } from "../services/stock/stock.bootstrap";
import { InsufficientStockError, LedModelNotFoundError } from "../services/stock/types";
import { TicketService } from "../services/ticket/ticket.service";
import {
  EmptyTicketError,
  IncompatibleSocketError,
  InvalidStatusTransitionError,
  LedModelNotFoundForTicketError,
  TicketItemNotFoundError,
  TicketNotFoundError,
  TicketOwnershipError,
} from "../services/ticket/types";

export const ticketRouter = Router();

const REP_ALERT_EMAIL =
  process.env.REP_ALERT_EMAIL ?? process.env.ADMIN_ALERT_EMAIL ?? "admin@buscaled.local";

const ticketService = new TicketService(
  new PrismaTicketRepository(prisma),
  stockService,
  notificationEmailSender,
  REP_ALERT_EMAIL
);

const createTicketSchema = z.object({
  items: z
    .array(
      z.object({
        ledModelId: z.string().min(1),
        position: z.nativeEnum(LightingPosition),
        quantity: z.number().int().positive(),
      })
    )
    .min(1, "O ticket precisa de pelo menos um item."),
});

const editItemSchema = z.object({
  ledModelId: z.string().min(1),
});

const listQuerySchema = z.object({
  status: z.nativeEnum(ReservationStatus).optional(),
});

function handleTicketError(error: unknown, res: Response, next: NextFunction): void {
  if (
    error instanceof TicketNotFoundError ||
    error instanceof TicketItemNotFoundError ||
    error instanceof TicketOwnershipError ||
    error instanceof LedModelNotFoundError
  ) {
    res.status(404).json({ error: error.message });
    return;
  }
  if (error instanceof LedModelNotFoundForTicketError) {
    res.status(404).json({ error: error.message });
    return;
  }
  if (error instanceof EmptyTicketError || error instanceof IncompatibleSocketError) {
    res.status(400).json({ error: error.message });
    return;
  }
  if (error instanceof InsufficientStockError) {
    res.status(400).json({ error: error.message });
    return;
  }
  if (error instanceof InvalidStatusTransitionError) {
    res.status(409).json({ error: error.message });
    return;
  }
  next(error);
}

ticketRouter.use(requireAuth);

ticketRouter.post("/", async (req, res, next) => {
  const parsed = createTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados de ticket inválidos." });
    return;
  }

  try {
    const ticket = await ticketService.createTicket(req.user!.id, parsed.data.items);
    res.status(201).json({ ticket });
  } catch (error) {
    handleTicketError(error, res, next);
  }
});

ticketRouter.get("/", async (req, res, next) => {
  try {
    if (req.user!.role === "user") {
      const tickets = await ticketService.listForUser(req.user!.id);
      res.json({ tickets });
      return;
    }

    const parsedQuery = listQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      res.status(400).json({ error: "Status inválido." });
      return;
    }

    const tickets = await ticketService.listForRep(parsedQuery.data.status);
    res.json({ tickets });
  } catch (error) {
    next(error);
  }
});

ticketRouter.get("/:id", async (req, res, next) => {
  try {
    const ticket =
      req.user!.role === "user"
        ? await ticketService.getForUser(req.user!.id, req.params.id)
        : await ticketService.getForRep(req.params.id);
    res.json({ ticket });
  } catch (error) {
    handleTicketError(error, res, next);
  }
});

ticketRouter.patch("/:id/confirm", async (req, res, next) => {
  if (req.user!.role === "user") {
    res.status(403).json({ error: "Sem permissão para este recurso." });
    return;
  }

  try {
    const ticket = await ticketService.confirmTicket(req.params.id);
    res.json({ ticket });
  } catch (error) {
    handleTicketError(error, res, next);
  }
});

ticketRouter.patch("/:id/items/:itemId", async (req, res, next) => {
  if (req.user!.role === "user") {
    res.status(403).json({ error: "Sem permissão para este recurso." });
    return;
  }

  const parsed = editItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Informe o novo ledModelId." });
    return;
  }

  try {
    const ticket = await ticketService.editItemProduct(
      req.params.id,
      req.params.itemId,
      parsed.data.ledModelId
    );
    res.json({ ticket });
  } catch (error) {
    handleTicketError(error, res, next);
  }
});

ticketRouter.patch("/:id/complete", async (req, res, next) => {
  if (req.user!.role === "user") {
    res.status(403).json({ error: "Sem permissão para este recurso." });
    return;
  }

  try {
    const ticket = await ticketService.completeTicket(req.params.id);
    res.json({ ticket });
  } catch (error) {
    handleTicketError(error, res, next);
  }
});

ticketRouter.patch("/:id/cancel", async (req, res, next) => {
  try {
    const ticket = await ticketService.cancelTicket(req.params.id, req.user!.id);
    res.json({ ticket });
  } catch (error) {
    handleTicketError(error, res, next);
  }
});
