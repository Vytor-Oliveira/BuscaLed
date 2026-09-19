import "dotenv/config";
import request from "supertest";
import { createApp } from "../../app";
import { prisma } from "../../db/prisma";
import { PrismaStockRepository } from "../../repositories/stock.repository";
import { StockService } from "../../services/stock/stock.service";
import { InsufficientStockError } from "../../services/stock/types";

const app = createApp();

function uniqueEmail(): string {
  return `teste-stock-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
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

describe("Stock routes (integração real — Postgres, sem mocks)", () => {
  const createdLedModelIds: string[] = [];

  afterAll(async () => {
    if (createdLedModelIds.length > 0) {
      await prisma.ledModel.deleteMany({ where: { id: { in: createdLedModelIds } } });
    }
    await prisma.$disconnect();
  });

  it("bloqueia acesso sem autenticação", async () => {
    const res = await request(app).get("/stock/qualquer-id");
    expect(res.status).toBe(401);
  });

  it("bloqueia acesso de usuário autenticado que não é admin", async () => {
    const email = uniqueEmail();
    await request(app).post("/auth/register").send({ name: "Teste", email, password: "senha-forte-123" });
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    await request(app).get(`/auth/confirm?token=${user.emailConfirmationToken}`);
    const loginRes = await request(app).post("/auth/login").send({ email, password: "senha-forte-123" });
    const cookies = loginRes.headers["set-cookie"] as unknown as string[];

    const res = await request(app).get("/stock/qualquer-id").set("Cookie", cookies);
    expect(res.status).toBe(403);
  });

  it("admin consulta e reabastece o estoque de um produto", async () => {
    const cookies = await createAdminAndLogin();
    const ledModel = await prisma.ledModel.create({
      data: { sku: `TESTE-STOCK-${Date.now()}`, name: "LED de teste", socketCode: "H4", stockQty: 3, stockMin: 5 },
    });
    createdLedModelIds.push(ledModel.id);

    const getRes = await request(app).get(`/stock/${ledModel.id}`).set("Cookie", cookies);
    expect(getRes.status).toBe(200);
    expect(getRes.body.stock.belowMinimum).toBe(true);

    const restockRes = await request(app)
      .post(`/stock/${ledModel.id}/restock`)
      .set("Cookie", cookies)
      .send({ quantity: 10 });
    expect(restockRes.status).toBe(200);
    expect(restockRes.body.stock.stockQty).toBe(13);
    expect(restockRes.body.stock.belowMinimum).toBe(false);
  });

  it("retorna 400 ao tentar reabastecer com quantidade inválida", async () => {
    const cookies = await createAdminAndLogin();
    const ledModel = await prisma.ledModel.create({
      data: { sku: `TESTE-STOCK-${Date.now()}`, name: "LED de teste", socketCode: "H4", stockQty: 3, stockMin: 5 },
    });
    createdLedModelIds.push(ledModel.id);

    const res = await request(app)
      .post(`/stock/${ledModel.id}/restock`)
      .set("Cookie", cookies)
      .send({ quantity: -1 });
    expect(res.status).toBe(400);
  });

  it("decrementStock lança InsufficientStockError quando não há saldo suficiente (RN12)", async () => {
    const ledModel = await prisma.ledModel.create({
      data: { sku: `TESTE-STOCK-${Date.now()}`, name: "LED de teste", socketCode: "H4", stockQty: 2, stockMin: 5 },
    });
    createdLedModelIds.push(ledModel.id);

    const service = new StockService(
      new PrismaStockRepository(prisma),
      { sendConfirmationEmail: jest.fn(), sendLowStockAlert: jest.fn() },
      "admin@teste.local"
    );

    await expect(service.decrementStock(ledModel.id, 5)).rejects.toBeInstanceOf(InsufficientStockError);
  });

  it("decrementStock dispara alerta de estoque mínimo quando o novo saldo fica abaixo do mínimo", async () => {
    const ledModel = await prisma.ledModel.create({
      data: { sku: `TESTE-STOCK-${Date.now()}`, name: "LED de teste", socketCode: "H4", stockQty: 6, stockMin: 5 },
    });
    createdLedModelIds.push(ledModel.id);

    const sendLowStockAlert = jest.fn().mockResolvedValue(undefined);
    const service = new StockService(
      new PrismaStockRepository(prisma),
      { sendConfirmationEmail: jest.fn(), sendLowStockAlert },
      "admin@teste.local"
    );

    const result = await service.decrementStock(ledModel.id, 3);

    expect(result.stockQty).toBe(3);
    expect(result.belowMinimum).toBe(true);
    expect(sendLowStockAlert).toHaveBeenCalledWith(
      "admin@teste.local",
      expect.objectContaining({ sku: ledModel.sku })
    );
  });
});
