import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, NextFunction, Request, Response } from "express";
import fs from "node:fs";
import path from "node:path";
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

// Tudo que é API. Serve para duas coisas: devolver 404 em JSON no que não
// existe, e impedir que o fallback da SPA engula uma rota de API digitada
// errada — devolver HTML para quem espera JSON esconde o erro de quem chama.
const PREFIXOS_DA_API = [
  "/health",
  "/compatibility",
  "/plate",
  "/auth",
  "/garage",
  "/stock",
  "/catalog",
  "/analytics",
  "/tickets",
  PREFIXO_PUBLICO,
];

function ehRotaDaApi(caminho: string): boolean {
  return PREFIXOS_DA_API.some((p) => caminho === p || caminho.startsWith(`${p}/`));
}

export function createApp(): Application {
  const app = express();

  // Atrás do proxy do App Service todo request chega com o IP do proxy. Sem
  // isto os limitadores de taxa contariam o mundo inteiro como um usuário só,
  // e o primeiro a estourar bloquearia todos os outros.
  app.set("trust proxy", 1);

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

  // Em produção o mesmo processo serve a API e o frontend compilado. Não é
  // economia de recurso: o cookie de sessão é SameSite=Lax, que o navegador
  // não envia entre sites diferentes — e dois App Services são sites
  // diferentes, porque azurewebsites.net está na Public Suffix List. Mesma
  // origem é o que faz o login funcionar.
  const diretorioDoFrontend =
    process.env.FRONTEND_DIST ?? path.join(process.cwd(), "public");
  if (fs.existsSync(path.join(diretorioDoFrontend, "index.html"))) {
    app.use(express.static(diretorioDoFrontend, { index: false }));

    // Fallback da SPA: o roteador é do lado do cliente, então qualquer
    // caminho que não seja API devolve o index.
    app.get("*", (req: Request, res: Response, next: NextFunction) => {
      if (ehRotaDaApi(req.path)) {
        next();
        return;
      }
      res.sendFile(path.join(diretorioDoFrontend, "index.html"));
    });
  }

  // Rota de API inexistente responde JSON. Sem isto o Express devolve o HTML
  // padrão dele ("Cannot GET /x"), que quebra qualquer cliente esperando JSON.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!ehRotaDaApi(req.path)) {
      next();
      return;
    }
    res.status(404).json({ error: "Rota não encontrada." });
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    // eslint-disable-next-line no-console
    console.error(err); // TODO: substituir por New Relic (RNF08) quando configurado
    res.status(500).json({ error: "Erro interno do servidor." });
  });

  return app;
}
