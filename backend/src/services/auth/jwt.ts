import jwt from "jsonwebtoken";

// RFC — Seção 6.2: access token 8h, refresh token 7 dias, algoritmo HS256.
const ACCESS_TOKEN_EXPIRES_IN = "8h";
const REFRESH_TOKEN_EXPIRES_IN = "7d";

export type UserRole = "user" | "rep" | "admin";

export interface TokenPayload {
  user_id: string;
  role: UserRole;
}

export interface DecodedToken extends TokenPayload {
  iat: number;
  exp: number;
}

function getAccessSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET não configurado.");
  }
  return secret;
}

function getRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error("JWT_REFRESH_SECRET não configurado.");
  }
  return secret;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, getAccessSecret(), {
    algorithm: "HS256",
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, getRefreshSecret(), {
    algorithm: "HS256",
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });
}

export function verifyAccessToken(token: string): DecodedToken {
  return jwt.verify(token, getAccessSecret()) as DecodedToken;
}

export function verifyRefreshToken(token: string): DecodedToken {
  return jwt.verify(token, getRefreshSecret()) as DecodedToken;
}
