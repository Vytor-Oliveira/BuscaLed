import "dotenv/config";
import request from "supertest";
import { createApp } from "../../app";
import { prisma } from "../../db/prisma";
import { closeRedis } from "../../db/redis";
import { closeNotificationQueue } from "../../queue/notification.bootstrap";

const app = createApp();

/**
 * Arquivo separado de proposito. O contador do express-rate-limit vive em
 * memoria no modulo da rota, e o Jest da um registro de modulos por arquivo
 * de teste — entao esgotar a cota aqui nao derruba os outros testes de
 * compatibilidade, que ficam no arquivo ao lado.
 */
describe("Compatibilidade — limite de consultas (integração real)", () => {
  const MAX = 60;

  afterAll(async () => {
    await prisma.$disconnect();
    await closeNotificationQueue();
    await closeRedis();
  }, 30_000);

  it("responde 429 depois de estourar a cota, sem gravar historico", async () => {
    // Ano invalido de proposito: o limitador roda antes do handler, entao a
    // cota e consumida sem escrever 60 linhas em SearchHistory nem bater na
    // matriz. O que se verifica aqui e a contagem, nao a busca.
    const consumir = () =>
      request(app).get("/compatibility?make=LIMITE&model=XPTO&year=1800");

    for (let i = 0; i < MAX; i += 1) {
      const res = await consumir();
      expect([i, res.status]).toEqual([i, 400]);
    }

    const estourou = await consumir();
    expect(estourou.status).toBe(429);
    expect(estourou.body.error).toMatch(/muitas consultas/i);

    // O cabecalho padrao do limitador precisa existir: e por ele que o
    // cliente sabe quanto ainda pode consultar.
    expect(estourou.headers["ratelimit-limit"]).toBe(String(MAX));

    const gravadas = await prisma.searchHistory.count({ where: { make: "LIMITE" } });
    expect(gravadas).toBe(0);
  }, 60_000);
});
