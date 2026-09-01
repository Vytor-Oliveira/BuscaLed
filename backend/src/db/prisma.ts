import { PrismaClient } from "@prisma/client";

// Instância única compartilhada — evita que cada módulo (auth, vehicle,
// compatibility) abra seu próprio pool de conexões com o banco.
export const prisma = new PrismaClient();
