import { PrismaClient, User as PrismaUser, UserRole as PrismaUserRole } from "@prisma/client";
import {
  CreateUserInput,
  UpdateUserInput,
  UserRecord,
  UserRepository,
} from "../services/auth/types";
import { UserRole } from "../services/auth/jwt";

function toPrismaRole(role: UserRole): PrismaUserRole {
  return role.toUpperCase() as PrismaUserRole;
}

function toAppRole(role: PrismaUserRole): UserRole {
  return role.toLowerCase() as UserRole;
}

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? this.toRecord(user) : null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.toRecord(user) : null;
  }

  async findByGoogleId(googleId: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({ where: { googleId } });
    return user ? this.toRecord(user) : null;
  }

  async findByConfirmationToken(token: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findFirst({
      where: { emailConfirmationToken: token },
    });
    return user ? this.toRecord(user) : null;
  }

  async create(input: CreateUserInput): Promise<UserRecord> {
    const user = await this.prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: input.passwordHash,
        googleId: input.googleId ?? null,
        role: toPrismaRole(input.role ?? "user"),
        emailVerifiedAt: input.emailVerifiedAt ?? null,
        emailConfirmationToken: input.emailConfirmationToken ?? null,
        emailConfirmationExpiresAt: input.emailConfirmationExpiresAt ?? null,
      },
    });
    return this.toRecord(user);
  }

  async update(id: string, patch: UpdateUserInput): Promise<UserRecord> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(patch.name !== undefined && { name: patch.name }),
        ...(patch.passwordHash !== undefined && { passwordHash: patch.passwordHash }),
        ...(patch.googleId !== undefined && { googleId: patch.googleId }),
        ...(patch.role !== undefined && { role: toPrismaRole(patch.role) }),
        ...(patch.emailVerifiedAt !== undefined && { emailVerifiedAt: patch.emailVerifiedAt }),
        ...(patch.emailConfirmationToken !== undefined && {
          emailConfirmationToken: patch.emailConfirmationToken,
        }),
        ...(patch.emailConfirmationExpiresAt !== undefined && {
          emailConfirmationExpiresAt: patch.emailConfirmationExpiresAt,
        }),
      },
    });
    return this.toRecord(user);
  }

  private toRecord(user: PrismaUser): UserRecord {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
      googleId: user.googleId,
      role: toAppRole(user.role),
      emailVerifiedAt: user.emailVerifiedAt,
      emailConfirmationToken: user.emailConfirmationToken,
      emailConfirmationExpiresAt: user.emailConfirmationExpiresAt,
    };
  }
}
