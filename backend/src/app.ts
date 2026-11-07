import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, NextFunction, Request, Response } from "express";
import { healthRouter } from "./routes/health.route";
import { compatibilityRouter } from "./routes/compatibility.route";
import { plateRouter } from "./routes/plate.route";
import { authRouter } from "./routes/auth.route";
import { vehicleRouter } from "./routes/vehicle.route";
import { stockRouter } from "./routes/stock.route";
import { catalogRouter } from "./routes/catalog.route";
import { analyticsRouter } from "./routes/analytics.route";
import { ticketRouter } from "./routes/ticket.route";
import { DIRETORIO_UPLOADS, PREFIXO_PUBLICO } from "./routes/upload";

export function createApp(): Application {
  const app = express();

  app.use(
    cors({
      origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
      credentials: true, // necessário para os cookies httpOnly de sessão (RFC §6.2)
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  // Imagens de produto enviadas pelo painel. `index: false` para a pasta nunca
  // ser listada, e `dotfiles: deny` para arquivo oculto nao ser servido.
  app.use(
    PREFIXO_PUBLICO,
    express.static(DIRETORIO_UPLOADS, {
      index: false,
      dotfiles: "deny",
      maxAge: "7d",
    })
  );

  app.use("/health", healthRouter);
  app.use("/compatibility", compatibilityRouter);
  app.use("/plate", plateRouter);
  app.use("/auth", authRouter);
  app.use("/garage", vehicleRouter);
  app.use("/stock", stockRouter);
  app.use("/catalog", catalogRouter);
  app.use("/analytics", analyticsRouter);
  app.use("/tickets", ticketRouter);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    // eslint-disable-next-line no-console
    console.error(err); // TODO: substituir por New Relic (RNF08) quando configurado
    res.status(500).json({ error: "Erro interno do servidor." });
  });

  return app;
}
