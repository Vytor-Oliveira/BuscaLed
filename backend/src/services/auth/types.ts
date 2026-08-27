import { UserRole } from "./jwt";

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string | null;
  googleId: string | null;
  role: UserRole;
  emailVerifiedAt: Date | null;
  emailConfirmationToken: string | null;
  emailConfirmationExpiresAt: Date | null;
}

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string | null;
  googleId?: string | null;
  role?: UserRole;
  emailVerifiedAt?: Date | null;
  emailConfirmationToken?: string | null;
  emailConfirmationExpiresAt?: Date | null;
}

export type UpdateUserInput = Partial<CreateUserInput>;

export interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  findByGoogleId(googleId: string): Promise<UserRecord | null>;
  findByConfirmationToken(token: string): Promise<UserRecord | null>;
  create(input: CreateUserInput): Promise<UserRecord>;
  update(id: string, patch: UpdateUserInput): Promise<UserRecord>;
}

/**
 * Envio de e-mail transacional. M2 só tem a implementação ConsoleEmailSender
 * (loga o link no terminal) — o NotifModule de verdade (fila Bull/Redis +
 * SendGrid) é escopo do M4 da RFC. Trocar a implementação não deve exigir
 * mudanças no AuthService, só na injeção de dependência.
 */
export interface EmailSender {
  sendConfirmationEmail(email: string, token: string): Promise<void>;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export class EmailAlreadyRegisteredError extends Error {
  constructor(email: string) {
    super(`E-mail já cadastrado: ${email}`);
    this.name = "EmailAlreadyRegisteredError";
  }
}

export class InvalidOrExpiredTokenError extends Error {
  constructor() {
    super("Token de confirmação inválido ou expirado.");
    this.name = "InvalidOrExpiredTokenError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("E-mail ou senha inválidos.");
    this.name = "InvalidCredentialsError";
  }
}

export class EmailNotVerifiedError extends Error {
  constructor() {
    super("E-mail ainda não confirmado.");
    this.name = "EmailNotVerifiedError";
  }
}

export class GoogleTokenInvalidError extends Error {
  constructor() {
    super("Token do Google inválido.");
    this.name = "GoogleTokenInvalidError";
  }
}
