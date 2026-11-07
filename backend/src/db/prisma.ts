import { Prisma, PrismaClient } from "@prisma/client";

// Instância única compartilhada — evita que cada módulo (auth, vehicle,
// compatibility) abra seu próprio pool de conexões com o banco.
export const prisma = new PrismaClient();

// Cliente de uma transação em andamento. Repositório que aceita este tipo
// pode participar de uma transação de quem o chama, em vez de abrir escrita
// própria e solta.
export type TransactionClient = Prisma.TransactionClient;
