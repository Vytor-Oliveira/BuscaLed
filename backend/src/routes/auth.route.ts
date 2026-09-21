import { Response, Router } from "express";
import rateLimit from "express-rate-limit";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { PrismaUserRepository } from "../repositories/user.repository";
import { AuthService } from "../services/auth/auth.service";
import { ConsoleEmailSender } from "../services/notification/console-email-sender";
import { AuthTokens } from "../services/auth/types";
import {
  EmailAlreadyRegisteredError,
  EmailNotVerifiedError,
  GoogleTokenInvalidError,
  InvalidCredentialsError,
  InvalidOrExpiredTokenError,
} from "../services/auth/types";

export const authRouter = Router();

const googleClientId = process.env.GOOGLE_CLIENT_ID ?? "";
const authService = new AuthService(
  new PrismaUserRepository(prisma),
  new ConsoleEmailSender(),
  new OAuth2Client()
);

const ACCESS_TOKEN_MAX_AGE_MS = 8 * 60 * 60 * 1000; // RFC §6.2
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // RFC §6.2

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

function setAccessCookie(res: Response, accessToken: string): void {
  res.cookie("access_token", accessToken, cookieOptions(ACCESS_TOKEN_MAX_AGE_MS));
}

function setAuthCookies(res: Response, tokens: AuthTokens): void {
  setAccessCookie(res, tokens.accessToken);
  res.cookie("refresh_token", tokens.refreshToken, cookieOptions(REFRESH_TOKEN_MAX_AGE_MS));
}

// RFC — Seção 6.1 (OWASP A07): exatamente 10 tentativas/15min no login.
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas tentativas de login. Tente novamente mais tarde." },
});

// Cadastro e login com Google têm um padrão de uso diferente de login (não
// é algo que a mesma pessoa repete várias vezes seguidas em uso normal) —
// limite mais generoso, mas ainda existe, pra não deixar sem nenhuma
// proteção contra flood/enumeração de e-mail.
const registrationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas tentativas. Tente novamente mais tarde." },
});

const registerSchema = z.object({
  name: z.string().min(1, "Informe o nome."),
  email: z.string().email("E-mail inválido."),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
});

const loginSchema = z.object({
  email: z.string().email("E-mail inválido."),
  password: z.string().min(1, "Informe a senha."),
});

const googleSchema = z.object({
  idToken: z.string().min(1, "idToken ausente."),
});

authRouter.post("/register", registrationRateLimiter, async (req, res, next) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados de cadastro inválidos.", details: parsed.error.flatten() });
    return;
  }

  try {
    await authService.register(parsed.data);
    res.status(201).json({ message: "Cadastro realizado. Confira seu e-mail para confirmar a conta." });
  } catch (error) {
    if (error instanceof EmailAlreadyRegisteredError) {
      res.status(409).json({ error: error.message });
      return;
    }
    next(error);
  }
});

authRouter.get("/confirm", async (req, res, next) => {
  const { token } = req.query;
  if (typeof token !== "string") {
    res.status(400).json({ error: "Token de confirmação ausente." });
    return;
  }

  try {
    await authService.confirmEmail(token);
    res.json({ message: "E-mail confirmado com sucesso." });
  } catch (error) {
    if (error instanceof InvalidOrExpiredTokenError) {
      res.status(400).json({ error: error.message });
      return;
    }
    next(error);
  }
});

authRouter.post("/login", loginRateLimiter, async (req, res, next) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados de login inválidos." });
    return;
  }

  try {
    const tokens = await authService.login(parsed.data);
    setAuthCookies(res, tokens);
    res.json({ message: "Login realizado com sucesso." });
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      res.status(401).json({ error: error.message });
      return;
    }
    if (error instanceof EmailNotVerifiedError) {
      res.status(403).json({ error: error.message });
      return;
    }
    next(error);
  }
});

authRouter.post("/refresh", async (req, res) => {
  const refreshToken = req.cookies?.refresh_token;
  if (typeof refreshToken !== "string") {
    res.status(401).json({ error: "Refresh token ausente." });
    return;
  }

  try {
    const { accessToken } = await authService.refresh(refreshToken);
    setAccessCookie(res, accessToken);
    res.json({ message: "Token renovado." });
  } catch {
    res.status(401).json({ error: "Refresh token inválido ou expirado." });
  }
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie("access_token", { path: "/" });
  res.clearCookie("refresh_token", { path: "/" });
  res.json({ message: "Logout realizado." });
});

authRouter.post("/google", registrationRateLimiter, async (req, res, next) => {
  const parsed = googleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados inválidos." });
    return;
  }

  try {
    const tokens = await authService.loginWithGoogle(parsed.data.idToken, googleClientId);
    setAuthCookies(res, tokens);
    res.json({ message: "Login com Google realizado com sucesso." });
  } catch (error) {
    if (error instanceof GoogleTokenInvalidError) {
      res.status(401).json({ error: error.message });
      return;
    }
    next(error);
  }
});
