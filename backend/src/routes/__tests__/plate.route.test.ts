import "dotenv/config";
import request from "supertest";
import { createApp } from "../../app";
import { prisma } from "../../db/prisma";
import { closeRedis, redis, redisReady } from "../../db/redis";
import { closeNotificationQueue } from "../../queue/notification.bootstrap";

const app = createApp();

function uniqueEmail(): string {
  return `teste-placa-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

function uniquePlate(): string {
  return `TST${Math.floor(Math.random() * 100000)}`;
}

async function registerAndLogin(): Promise<{ cookies: string[]; email: string }> {
  const email = uniqueEmail();
  await request(app)
    .post("/auth/register")
    .send({ name: "Teste Placa", email, password: "senha-forte-123" });
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  await request(app).get(`/auth/confirm?token=${user.emailConfirmationToken}`);
  const loginRes = await request(app)
    .post("/auth/login")
    .send({ email, password: "senha-forte-123" });
  return { cookies: loginRes.headers["set-cookie"] as unknown as string[], email };
}

/**
 * Nenhum destes testes chega na PuxaPlaca: o cache e a cota resolvem antes.
 * A consulta paga de verdade está no vehicle.route.test.ts, desligada por padrão.
 * Por isso precisam passar com ou sem APIPLACAS_TOKEN no ambiente: o CI não tem
 * o token, e cache e cota não dependem dele.
 */
describe("Plate routes (integração real — Postgres + Redis, sem mocks)", () => {
  const createdEmails: string[] = [];
  const usedPlates: string[] = [];

  beforeAll(async () => {
    await redisReady();
  });

  afterAll(async () => {
    if (createdEmails.length > 0) {
      await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
    }
    if (usedPlates.length > 0) {
      await redis.del(...usedPlates.map((p) => `plate:${p}`));
    }
    await prisma.$disconnect();
    await closeNotificationQueue();
    await closeRedis();
  }, 30_000);

  it("bloqueia consulta de placa sem autenticação", async () => {
    const res = await request(app).get("/plate/ABC1D23");
    expect(res.status).toBe(401);
  });

  it("responde pelo cache sem gastar cota", async () => {
    const { cookies, email } = await registerAndLogin();
    createdEmails.push(email);
    const plate = uniquePlate();
    usedPlates.push(plate);
    await redis.set(
      `plate:${plate}`,
      JSON.stringify({ make: "FIAT", model: "UNO", year: 2010, color: "BRANCO" })
    );

    const res = await request(app).get(`/plate/${plate}`).set("Cookie", cookies);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ make: "FIAT", model: "UNO", year: 2010, color: "BRANCO" });
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(user.plateLookupCount).toBe(0);
  });

  it("devolve 403 quando a conta já gastou a cota", async () => {
    const { cookies, email } = await registerAndLogin();
    createdEmails.push(email);
    await prisma.user.update({ where: { email }, data: { plateLookupCount: 5 } });
    const plate = uniquePlate();
    usedPlates.push(plate);

    const res = await request(app).get(`/plate/${plate}`).set("Cookie", cookies);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain("Limite de 5 consultas de placa a cada 30 dias");
  });
});
