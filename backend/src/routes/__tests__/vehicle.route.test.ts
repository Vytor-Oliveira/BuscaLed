import "dotenv/config";
import request from "supertest";
import { createApp } from "../../app";
import { prisma } from "../../db/prisma";

const app = createApp();

function uniqueEmail(): string {
  return `teste-garagem-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

async function registerAndLogin(): Promise<{ cookies: string[]; email: string }> {
  const email = uniqueEmail();
  await request(app)
    .post("/auth/register")
    .send({ name: "Teste Garagem", email, password: "senha-forte-123" });
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  await request(app).get(`/auth/confirm?token=${user.emailConfirmationToken}`);
  const loginRes = await request(app)
    .post("/auth/login")
    .send({ email, password: "senha-forte-123" });
  return { cookies: loginRes.headers["set-cookie"] as unknown as string[], email };
}

/**
 * Testes de integração reais: HTTP -> rota -> serviço -> repositório ->
 * Postgres de verdade. Sem mock. Requer `docker compose up -d` e a
 * migration aplicada.
 */
describe("Vehicle routes / Garagem Virtual (integração real — Postgres, sem mocks)", () => {
  const createdEmails: string[] = [];

  afterAll(async () => {
    if (createdEmails.length > 0) {
      const users = await prisma.user.findMany({ where: { email: { in: createdEmails } } });
      const userIds = users.map((u) => u.id);
      await prisma.garageVehicle.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await prisma.$disconnect();
  });

  it("bloqueia acesso sem autenticação", async () => {
    const res = await request(app).get("/garage");
    expect(res.status).toBe(401);
  });

  it("cria, lista, edita e remove um veículo informado manualmente", async () => {
    const { cookies, email } = await registerAndLogin();
    createdEmails.push(email);

    const createRes = await request(app)
      .post("/garage")
      .set("Cookie", cookies)
      .send({ make: "VW", model: "Gol", year: 2018 });
    expect(createRes.status).toBe(201);
    const vehicleId = createRes.body.vehicle.id;

    const listRes = await request(app).get("/garage").set("Cookie", cookies);
    expect(listRes.status).toBe(200);
    expect(listRes.body.vehicles).toHaveLength(1);

    const updateRes = await request(app)
      .patch(`/garage/${vehicleId}`)
      .set("Cookie", cookies)
      .send({ year: 2020 });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.vehicle.year).toBe(2020);

    const deleteRes = await request(app).delete(`/garage/${vehicleId}`).set("Cookie", cookies);
    expect(deleteRes.status).toBe(204);

    const listAfterRes = await request(app).get("/garage").set("Cookie", cookies);
    expect(listAfterRes.body.vehicles).toHaveLength(0);
  }, 15000);

  it("retorna 404 ao tentar editar um veículo que não pertence ao usuário", async () => {
    const owner = await registerAndLogin();
    createdEmails.push(owner.email);
    const other = await registerAndLogin();
    createdEmails.push(other.email);

    const createRes = await request(app)
      .post("/garage")
      .set("Cookie", owner.cookies)
      .send({ make: "VW", model: "Gol", year: 2018 });
    const vehicleId = createRes.body.vehicle.id;

    const res = await request(app)
      .patch(`/garage/${vehicleId}`)
      .set("Cookie", other.cookies)
      .send({ year: 2020 });

    expect(res.status).toBe(404);
  }, 15000);

  // ATENÇÃO — este teste consulta a API real da PuxaPlaca (custo: R$0,04 por
  // execução, descontado do saldo pago). Fica desligado por padrão pra não
  // gastar saldo toda vez que alguém rodar `npm test`. Pra rodar de propósito:
  //   RUN_PAID_API_TESTS=true npm test -- vehicle.route.test.ts
  const runPaidApiTests = process.env.RUN_PAID_API_TESTS === "true";
  (runPaidApiTests ? it : it.skip)(
    "resolve um veículo pela placa via API real da PuxaPlaca e NUNCA grava a placa no banco (RF05/RN02)",
    async () => {
      const { cookies, email } = await registerAndLogin();
      createdEmails.push(email);

      const res = await request(app).post("/garage").set("Cookie", cookies).send({ plate: "ABC1D23" });

      expect(res.status).toBe(201);
      expect(res.body.vehicle.make).toBe("VW");
      expect(res.body.vehicle.model).toBe("PASSAT TS");
      expect(res.body.vehicle.year).toBe(1979);
      expect(res.body.vehicle).not.toHaveProperty("plate");

      // Confirma direto no banco, não só na resposta da API.
      const dbRow = await prisma.garageVehicle.findUniqueOrThrow({
        where: { id: res.body.vehicle.id },
      });
      expect(dbRow).not.toHaveProperty("plate");
      expect(JSON.stringify(dbRow)).not.toContain("ABC1D23");
    },
    15000
  );
});
