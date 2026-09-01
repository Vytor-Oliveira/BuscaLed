import { NextFunction, Request, Response } from "express";
import { UserRole, verifyAccessToken } from "../services/auth/jwt";

/**
 * Exige que o usuário esteja autenticado (cookie access_token válido).
 * Popula req.user = {id, role} para os handlers seguintes.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.access_token;

  if (typeof token !== "string") {
    res.status(401).json({ error: "Não autenticado." });
    return;
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = { id: decoded.user_id, role: decoded.role };
    next();
  } catch {
    res.status(401).json({ error: "Sessão inválida ou expirada." });
  }
}

/**
 * Exige que req.user (já populado por requireAuth) tenha um dos perfis
 * permitidos — tabela de perfis da RFC, Seção 6.2.
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Não autenticado." });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Sem permissão para este recurso." });
      return;
    }

    next();
  };
}
