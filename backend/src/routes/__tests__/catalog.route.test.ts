import "dotenv/config";
import request from "supertest";
import { createApp } from "../../app";
import { prisma } from "../../db/prisma";

const app = createApp();

function uniqueEmail(): string {
  return `teste-catalog-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

async function createAdminAndLogin(): Promise<string[]> {
  const email = uniqueEmail();
  await request(app).post("/auth/register").send({ name: "Admin Teste", email, password: "senha-forte-123" });
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  await request(app).get(`/auth/confirm?token=${user.emailConfirmationToken}`);
  await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  const loginRes = await request(app).post("/auth/login").send({ email, password: "senha-forte-123" });
  return loginRes.headers["set-cookie"] as unknown as string[];
}

describe("Catalog routes (integração real — Postgres, sem mocks)", () => {
  const createdLedModelIds: string[] = [];
  const createdVehicleModelIds: string[] = [];

  afterAll(async () => {
    if (createdLedModelIds.length > 0) {
      await prisma.ledModel.deleteMany({ where: { id: { in: createdLedModelIds } } });
    }
    if (createdVehicleModelIds.length > 0) {
      await prisma.vehicleFitting.deleteMany({ where: { vehicleModelId: { in: createdVehicleModelIds } } });
      await prisma.vehicleModel.deleteMany({ where: { id: { in: createdVehicleModelIds } } });
    }
    await prisma.$disconnect();
  });

  it("bloqueia acesso sem autenticação", async () => {
    const res = await request(app).post("/catalog/led-models").send({});
    expect(res.status).toBe(401);
  });

  it("admin cria um novo produto LED com sucesso", async () => {
    const cookies = await createAdminAndLogin();
    const sku = `TESTE-CATALOG-${Date.now()}`;

    const res = await request(app)
      .post("/catalog/led-models")
      .set("Cookie", cookies)
      .send({ sku, name: "Produto de teste", socketCode: "H4" });

    expect(res.status).toBe(201);
    expect(res.body.ledModel.sku).toBe(sku);
    createdLedModelIds.push(res.body.ledModel.id);
  });

  it("retorna 409 ao tentar criar um produto com SKU duplicado", async () => {
    const cookies = await createAdminAndLogin();
    const sku = `TESTE-CATALOG-DUP-${Date.now()}`;

    const first = await request(app)
      .post("/catalog/led-models")
      .set("Cookie", cookies)
      .send({ sku, name: "Produto 1", socketCode: "H4" });
    createdLedModelIds.push(first.body.ledModel.id);

    const second = await request(app)
      .post("/catalog/led-models")
      .set("Cookie", cookies)
      .send({ sku, name: "Produto 2", socketCode: "H7" });

    expect(second.status).toBe(409);
  });

  it("adiciona um encaixe manualmente a um veículo existente", async () => {
    const cookies = await createAdminAndLogin();
    const vehicle = await prisma.vehicleModel.create({
      data: { make: "TESTE-CATALOGO", model: "MODELO-X", yearStart: 2020, yearEnd: 2020 },
    });
    createdVehicleModelIds.push(vehicle.id);

    const res = await request(app)
      .post("/catalog/fittings")
      .set("Cookie", cookies)
      .send({ vehicleModelId: vehicle.id, position: "FAROL_BAIXO", socketCode: "H4" });

    expect(res.status).toBe(201);

    const fitting = await prisma.vehicleFitting.findFirst({ where: { vehicleModelId: vehicle.id } });
    expect(fitting?.socketCode).toBe("H4");
  });

  it("retorna 404 ao tentar adicionar encaixe a um veículo inexistente", async () => {
    const cookies = await createAdminAndLogin();

    const res = await request(app)
      .post("/catalog/fittings")
      .set("Cookie", cookies)
      .send({ vehicleModelId: "id-que-nao-existe", position: "FAROL_BAIXO", socketCode: "H4" });

    expect(res.status).toBe(404);
  });
});
