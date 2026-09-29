import { prisma } from "../../db/prisma";
import { notificationEmailSender } from "../../queue/notification.bootstrap";
import { PrismaStockRepository } from "../../repositories/stock.repository";
import { StockService } from "./stock.service";

const ADMIN_ALERT_EMAIL = process.env.ADMIN_ALERT_EMAIL ?? "admin@buscaled.local";

// Compartilhado entre StockModule e TicketModule.
export const stockService = new StockService(
  new PrismaStockRepository(prisma),
  notificationEmailSender,
  ADMIN_ALERT_EMAIL
);
