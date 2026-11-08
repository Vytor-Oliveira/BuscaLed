import { Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { UserRole, signAccessToken, signRefreshToken, verifyRefreshToken } from "./jwt";
import {
  AuthTokens,
  EmailAlreadyRegisteredError,
  EmailNotVerifiedError,
  EmailSender,
  GoogleTokenInvalidError,
  InvalidCredentialsError,
  InvalidOrExpiredTokenError,
  LoginInput,
  RegisterInput,
  UserProfile,
  UserRepository,
} from "./types";

const BCRYPT_SALT_ROUNDS = 12; // RFC — Seção 6.1 (OWASP A02)
const CONFIRMATION_TOKEN_EXPIRES_MS = 24 * 60 * 60 * 1000; // 24h
// Janela curta: redefinir senha é mais sensível que confirmar e-mail.
const PASSWORD_RESET_TOKEN_EXPIRES_MS = 60 * 60 * 1000; // 1h
const PRISMA_UNIQUE_CONSTRAINT_ERROR_CODE = "P2002";

// E-mail nunca deve diferenciar maiúsculas/minúsculas — sem isso,
// "User@x.com" e "user@x.com" virariam duas contas diferentes.
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly emailSender: EmailSender,
    private readonly googleClient: Pick<OAuth2Client, "verifyIdToken">
  ) {}

  async register(input: RegisterInput): Promise<void> {
    const email = normalizeEmail(input.email);
    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      throw new EmailAlreadyRegisteredError(email);
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS);
    const confirmationToken = crypto.randomBytes(32).toString("hex");
    const confirmationExpiresAt = new Date(Date.now() + CONFIRMATION_TOKEN_EXPIRES_MS);

    try {
      await this.userRepository.create({
        name: input.name,
        email,
        passwordHash,
        emailConfirmationToken: confirmationToken,
        emailConfirmationExpiresAt: confirmationExpiresAt,
      });
    } catch (error) {
      // Corrida: duas requisições passaram pela checagem acima antes de
      // qualquer uma commitar. O banco pega o que o código não pegou.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_UNIQUE_CONSTRAINT_ERROR_CODE
      ) {
        throw new EmailAlreadyRegisteredError(email);
      }
      throw error;
    }

    await this.emailSender.sendConfirmationEmail(email, confirmationToken);
  }

  async confirmEmail(token: string): Promise<void> {
    const user = await this.userRepository.findByConfirmationToken(token);

    if (
      !user ||
      !user.emailConfirmationExpiresAt ||
      user.emailConfirmationExpiresAt.getTime() < Date.now()
    ) {
      throw new InvalidOrExpiredTokenError();
    }

    await this.userRepository.update(user.id, {
      emailVerifiedAt: new Date(),
      emailConfirmationToken: null,
      emailConfirmationExpiresAt: null,
    });
  }

  /**
   * RF02 — pedido de redefinição. Responde igual existindo ou não a conta:
   * dizer "e-mail não cadastrado" entregaria quem tem conta no sistema.
   */
  async requestPasswordReset(rawEmail: string): Promise<void> {
    const email = normalizeEmail(rawEmail);
    const user = await this.userRepository.findByEmail(email);

    // Conta de Google não tem senha para redefinir.
    if (!user || !user.passwordHash) {
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    await this.userRepository.update(user.id, {
      passwordResetToken: token,
      passwordResetExpiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRES_MS),
    });

    await this.emailSender.sendPasswordResetEmail(email, token);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findByPasswordResetToken(token);

    if (
      !user ||
      !user.passwordResetExpiresAt ||
      user.passwordResetExpiresAt.getTime() < Date.now()
    ) {
      throw new InvalidOrExpiredTokenError();
    }

    // O token é de uso único: some junto com a troca da senha. Quem redefiniu
    // provou ter acesso ao e-mail, então a conta já fica confirmada.
    await this.userRepository.update(user.id, {
      passwordHash: await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS),
      passwordResetToken: null,
      passwordResetExpiresAt: null,
      emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
    });
  }

  async login(input: LoginInput): Promise<AuthTokens> {
    const email = normalizeEmail(input.email);
    const user = await this.userRepository.findByEmail(email);

    if (!user || !user.passwordHash) {
      throw new InvalidCredentialsError();
    }

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new InvalidCredentialsError();
    }

    if (!user.emailVerifiedAt) {
      throw new EmailNotVerifiedError();
    }

    return this.issueTokens(user.id, user.role);
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    const decoded = verifyRefreshToken(refreshToken);

    // Busca o perfil atual no banco em vez de confiar no que estava
    // gravado no token — assim, se o usuário for promovido/rebaixado
    // (ou removido), isso vale a partir da próxima renovação, não só
    // depois que o token antigo expirar sozinho.
    const user = await this.userRepository.findById(decoded.user_id);
    if (!user) {
      throw new InvalidCredentialsError();
    }

    return { accessToken: signAccessToken({ user_id: user.id, role: user.role }) };
  }

  async loginWithGoogle(idToken: string, googleClientId: string): Promise<AuthTokens> {
    let payload;
    try {
      const ticket = await this.googleClient.verifyIdToken({ idToken, audience: googleClientId });
      payload = ticket.getPayload();
    } catch (error) {
      // A biblioteca do Google diz o motivo exato — audiência diferente da
      // esperada, token expirado, assinatura inválida —, e o erro genérico
      // abaixo apagava isso. Em produção, falha de login social ficava sem
      // rastro nenhum no log.
      // eslint-disable-next-line no-console
      console.error("Falha ao validar o ID token do Google:", error);
      throw new GoogleTokenInvalidError();
    }

    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      // Token válido, conteúdo insuficiente: sem isto, este caso e o de cima
      // produzem a mesma resposta e viram o mesmo mistério.
      // eslint-disable-next-line no-console
      console.error("ID token do Google sem os dados necessários:", {
        temSub: Boolean(payload?.sub),
        temEmail: Boolean(payload?.email),
        emailVerificado: payload?.email_verified,
      });
      throw new GoogleTokenInvalidError();
    }

    const { sub: googleId, name } = payload;
    const email = normalizeEmail(payload.email);

    let user = await this.userRepository.findByGoogleId(googleId);

    if (!user) {
      const existingByEmail = await this.userRepository.findByEmail(email);

      user = existingByEmail
        ? await this.userRepository.update(existingByEmail.id, {
            googleId,
            emailVerifiedAt: new Date(),
            // O Google acabou de confirmar a posse desse e-mail — qualquer
            // senha cadastrada antes (inclusive por um possível atacante que
            // tenha se cadastrado com este e-mail sem nunca confirmá-lo)
            // deixa de funcionar. Evita "account pre-hijacking".
            passwordHash: null,
          })
        : await this.userRepository.create({
            name: name ?? email,
            email,
            passwordHash: null,
            googleId,
            emailVerifiedAt: new Date(),
          });
    }

    return this.issueTokens(user.id, user.role);
  }

  // Usado pelo GET /auth/me: o cookie e httpOnly, entao o frontend nao tem
  // outra forma de descobrir quem esta logado e com que papel.
  async getProfile(userId: string): Promise<UserProfile | null> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return null;
    }
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }

  private issueTokens(userId: string, role: UserRole): AuthTokens {
    return {
      accessToken: signAccessToken({ user_id: userId, role }),
      refreshToken: signRefreshToken({ user_id: userId, role }),
    };
  }
}
