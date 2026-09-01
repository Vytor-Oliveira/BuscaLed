import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, NextFunction, Request, Response } from "express";
import { healthRouter } from "./routes/health.route";
import { compatibilityRouter } from "./routes/compatibility.route";
import { plateRouter } from "./routes/plate.route";
import { authRouter } from "./routes/auth.route";
import { vehicleRouter } from "./routes/vehicle.route";

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

  app.use("/health", healthRouter);
  app.use("/compatibility", compatibilityRouter);
  app.use("/plate", plateRouter);
  app.use("/auth", authRouter);
  app.use("/garage", vehicleRouter);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    // eslint-disable-next-line no-console
    console.error(err); // TODO: substituir por New Relic (RNF08) quando configurado
    res.status(500).json({ error: "Erro interno do servidor." });
  });

  return app;
}
