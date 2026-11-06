import { PrismaClient } from "@prisma/client";

export interface PlateLookupRepository {
  incrementIfUnder(userId: string, max: number, windowMs: number): Promise<number | null>;
  refund(userId: string): Promise<void>;
}

export class PrismaPlateLookupRepository implements PlateLookupRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Debita uma consulta da cota da janela corrente e devolve o total já gasto
   * nela, ou null se não havia vaga. Ler-somar-gravar deixaria duas
   * requisições simultâneas passarem na última vaga — por isso o limite vive
   * no WHERE do UPDATE, e é o banco que decide.
   */
  async incrementIfUnder(
    userId: string,
    max: number,
    windowMs: number
  ): Promise<number | null> {
    const inicioDaJanela = new Date(Date.now() - windowMs);

    // Zera quem já saiu da janela. É idempotente: se duas requisições zerarem
    // junto, quem limita continua sendo o incremento condicional abaixo.
    await this.prisma.user.updateMany({
      where: { id: userId, plateLookupWindowStart: { lt: inicioDaJanela } },
      data: { plateLookupCount: 0, plateLookupWindowStart: new Date() },
    });

    const result = await this.prisma.user.updateMany({
      where: { id: userId, plateLookupCount: { lt: max } },
      data: { plateLookupCount: { increment: 1 } },
    });

    if (result.count === 0) {
      return null;
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return user.plateLookupCount;
  }

  // O guarda `gt: 0` evita cota negativa se um refund chegar depois de a
  // janela ter virado e zerado a contagem.
  async refund(userId: string): Promise<void> {
    await this.prisma.user.updateMany({
      where: { id: userId, plateLookupCount: { gt: 0 } },
      data: { plateLookupCount: { decrement: 1 } },
    });
  }
}
