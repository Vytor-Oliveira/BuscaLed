import "dotenv/config";
import Redis from "ioredis";
import { prisma } from "../../../db/prisma";
import { closeRedis, redis, redisReady } from "../../../db/redis";
import { PrismaPlateLookupRepository } from "../../../repositories/plate-lookup.repository";
import { PlateLookupService } from "../plate-lookup.service";
import {
  PlateInfo,
  PlateLookupLimitExceededError,
  PlateNotFoundError,
  PlateProviderUnavailableError,
  PlateService,
} from "../types";

function uniqueEmail(): string {
  return `teste-plate-lookup-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

function uniquePlate(): string {
  return `TST${Math.floor(Math.random() * 100000)}`;
}

async function createUser(): Promise<string> {
  const user = await prisma.user.create({ data: { name: "Teste", email: uniqueEmail() } });
  return user.id;
}

// A API de placas é paga e externa: o dublê conta chamadas, que é justamente
// o que precisa ser observado. Postgres e Redis são os de verdade.
function createCountingFakePlateService(): PlateService & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async resolvePlate(plate: string): Promise<PlateInfo> {
      calls.push(plate);
      return { make: "VW", model: "Gol", year: 2018, color: "PRATA" };
    },
  };
}

function createFailingPlateService(erro: Error): PlateService {
  return {
    async resolvePlate(): Promise<PlateInfo> {
      throw erro;
    },
  };
}

async function gastas(userId: string): Promise<number> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return user.plateLookupCount;
}

describe("PlateLookupService (integração real — Postgres + Redis, sem mocks)", () => {
  const createdUserIds: string[] = [];
  const usedPlates: string[] = [];
  const clientesMortos: Redis[] = [];

  beforeAll(async () => {
    await redisReady();
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    if (usedPlates.length > 0) {
      await redis.del(...usedPlates.map((p) => `plate:${p}`));
    }
    clientesMortos.forEach((c) => c.disconnect());
    await prisma.$disconnect();
    await closeRedis();
  });

  it("cache hit não consome a cota do usuário", async () => {
    const userId = await createUser();
    createdUserIds.push(userId);
    const plate = uniquePlate();
    usedPlates.push(plate);
    const fakeService = createCountingFakePlateService();
    const service = new PlateLookupService(
      fakeService,
      redis,
      new PrismaPlateLookupRepository(prisma)
    );

    await service.resolveForUser(userId, plate);
    await service.resolveForUser(userId, plate);
    await service.resolveForUser(userId, plate);

    expect(fakeService.calls).toHaveLength(1);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.plateLookupCount).toBe(1);
  });

  it("o cache é anônimo: a placa de um usuário serve outro sem gastar cota", async () => {
    const primeiro = await createUser();
    const segundo = await createUser();
    createdUserIds.push(primeiro, segundo);
    const plate = uniquePlate();
    usedPlates.push(plate);
    const fakeService = createCountingFakePlateService();
    const service = new PlateLookupService(
      fakeService,
      redis,
      new PrismaPlateLookupRepository(prisma)
    );

    await service.resolveForUser(primeiro, plate);
    const doSegundo = await service.resolveForUser(segundo, plate);

    expect(doSegundo).toEqual({ make: "VW", model: "Gol", year: 2018, color: "PRATA" });
    expect(fakeService.calls).toHaveLength(1);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: segundo } });
    expect(user.plateLookupCount).toBe(0);
  });

  it("o cache guarda só marca/modelo/ano, sem nada que ligue a placa a uma conta", async () => {
    const userId = await createUser();
    createdUserIds.push(userId);
    const plate = uniquePlate();
    usedPlates.push(plate);
    const service = new PlateLookupService(
      createCountingFakePlateService(),
      redis,
      new PrismaPlateLookupRepository(prisma)
    );

    await service.resolveForUser(userId, plate);

    const bruto = await redis.get(`plate:${plate}`);
    expect(bruto).not.toBeNull();
    expect(Object.keys(JSON.parse(bruto!)).sort()).toEqual(["color", "make", "model", "year"]);
    expect(bruto).not.toContain(userId);
  });

  it("permite 5 consultas reais e bloqueia a 6ª", async () => {
    const userId = await createUser();
    createdUserIds.push(userId);
    const fakeService = createCountingFakePlateService();
    const service = new PlateLookupService(
      fakeService,
      redis,
      new PrismaPlateLookupRepository(prisma)
    );

    for (let i = 0; i < 5; i += 1) {
      const plate = uniquePlate();
      usedPlates.push(plate);
      await expect(service.resolveForUser(userId, plate)).resolves.toBeDefined();
    }

    const sixthPlate = uniquePlate();
    usedPlates.push(sixthPlate);
    await expect(service.resolveForUser(userId, sixthPlate)).rejects.toBeInstanceOf(
      PlateLookupLimitExceededError
    );
    expect(fakeService.calls).toHaveLength(5);
  });

  it("duas consultas concorrentes na 5ª vaga não deixam passar de 5 no total", async () => {
    const userId = await createUser();
    createdUserIds.push(userId);
    const fakeService = createCountingFakePlateService();
    const service = new PlateLookupService(
      fakeService,
      redis,
      new PrismaPlateLookupRepository(prisma)
    );

    for (let i = 0; i < 4; i += 1) {
      const plate = uniquePlate();
      usedPlates.push(plate);
      await service.resolveForUser(userId, plate);
    }

    const plateA = uniquePlate();
    const plateB = uniquePlate();
    usedPlates.push(plateA, plateB);

    const results = await Promise.allSettled([
      service.resolveForUser(userId, plateA),
      service.resolveForUser(userId, plateB),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.plateLookupCount).toBe(5);
  });

  // Sem isto, o 402 da PuxaPlaca queimava as 5 vagas da pessoa entregando erro.
  it("devolve a cota quando o fornecedor não entrega resposta", async () => {
    const userId = await createUser();
    createdUserIds.push(userId);
    const service = new PlateLookupService(
      createFailingPlateService(new PlateProviderUnavailableError("status 402")),
      redis,
      new PrismaPlateLookupRepository(prisma)
    );

    await expect(service.resolveForUser(userId, uniquePlate())).rejects.toBeInstanceOf(
      PlateProviderUnavailableError
    );

    expect(await gastas(userId)).toBe(0);
  });

  // "Não encontrada" é resposta e o fornecedor cobra por ela — devolver a cota
  // aqui deixaria varrer placas de graça.
  it("não devolve a cota quando a placa não existe", async () => {
    const userId = await createUser();
    createdUserIds.push(userId);
    const service = new PlateLookupService(
      createFailingPlateService(new PlateNotFoundError("ZZZ9Z99")),
      redis,
      new PrismaPlateLookupRepository(prisma)
    );

    await expect(service.resolveForUser(userId, uniquePlate())).rejects.toBeInstanceOf(
      PlateNotFoundError
    );

    expect(await gastas(userId)).toBe(1);
  });

  it("a cota volta a zero quando a janela de 30 dias vira", async () => {
    const userId = await createUser();
    createdUserIds.push(userId);
    const fakeService = createCountingFakePlateService();
    const service = new PlateLookupService(
      fakeService,
      redis,
      new PrismaPlateLookupRepository(prisma)
    );

    for (let i = 0; i < 5; i += 1) {
      const plate = uniquePlate();
      usedPlates.push(plate);
      await service.resolveForUser(userId, plate);
    }
    const bloqueada = uniquePlate();
    usedPlates.push(bloqueada);
    await expect(service.resolveForUser(userId, bloqueada)).rejects.toBeInstanceOf(
      PlateLookupLimitExceededError
    );

    // Envelhece a janela em 31 dias em vez de esperar: o corte é calculado a
    // partir de plateLookupWindowStart.
    await prisma.user.update({
      where: { id: userId },
      data: { plateLookupWindowStart: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) },
    });

    const depois = uniquePlate();
    usedPlates.push(depois);
    await expect(service.resolveForUser(userId, depois)).resolves.toBeDefined();
    expect(await gastas(userId)).toBe(1);
  });

  // O cache é otimização. Com a fila offline do ioredis ligada, o comando
  // ficava pendurado esperando o Redis voltar e pendurava a consulta junto.
  it(
    "com o Redis fora do ar, a consulta segue pro fornecedor em vez de travar",
    async () => {
      const userId = await createUser();
      createdUserIds.push(userId);

      // Cliente de verdade apontado pra uma porta onde não há nada: é assim
      // que se prova a queda sem derrubar o Redis dos outros testes.
      const redisMorto = new Redis(6399, "127.0.0.1", {
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        commandTimeout: 500,
        retryStrategy: () => null,
      });
      redisMorto.on("error", () => {});
      clientesMortos.push(redisMorto);

      const fakeService = createCountingFakePlateService();
      const service = new PlateLookupService(
        fakeService,
        redisMorto,
        new PrismaPlateLookupRepository(prisma)
      );

      const info = await service.resolveForUser(userId, uniquePlate());

      expect(info).toEqual({ make: "VW", model: "Gol", year: 2018, color: "PRATA" });
      expect(fakeService.calls).toHaveLength(1);
      // Sem cache não há como poupar: a consulta passa a custar cota.
      expect(await gastas(userId)).toBe(1);
    },
    15000
  );
});
