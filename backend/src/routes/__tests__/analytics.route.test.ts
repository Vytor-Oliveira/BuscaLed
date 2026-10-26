import "dotenv/config";
import request from "supertest";
import { createApp } from "../../app";
import { prisma } from "../../db/prisma";
import { closeNotificationQueue } from "../../queue/notification.bootstrap";

const app = createApp();

function uniqueEmail(prefix: string): string {
  return `teste-analytics-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

async function registerAndLogin(role: "USER" | "REP"): Promise<string[]> {
  const email = uniqueEmail(role.toLowerCase());
  await request(app).post("/auth/register").send({ name: "Teste", email, password: "senha-forte-123" });
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  await request(app).get(`/auth/confirm?token=${user.emailConfirmationToken}`);
  if (role !== "USER") {
    await prisma.user.update({ where: { id: user.id }, data: { role: role } });
  }
  const loginRes = await request(app).post("/auth/login").send({ email, password: "senha-forte-123" });
  return loginRes.headers["set-cookie"] as unknown as string[];
}

describe("Analytics routes (integração real — Postgres, sem mocks)", () => {
  const createdLedModelIds: string[] = [];
  const createdTicketIds: string[] = [];
  const marcasDeTeste: string[] = [];

  // Reaproveitados: o loginRateLimiter é 10/janela e não aguenta login novo
  // em cada teste deste arquivo.
  let rep: string[];
  let client: string[];

  beforeAll(async () => {
    rep = await registerAndLogin("REP");
    client = await registerAndLogin("USER");
  });

  afterAll(async () => {
    if (createdTicketIds.length > 0) {
      await prisma.reservationItem.deleteMany({ where: { reservationId: { in: createdTicketIds } } });
      await prisma.reservation.deleteMany({ where: { id: { in: createdTicketIds } } });
    }
    if (createdLedModelIds.length > 0) {
      await prisma.ledModel.deleteMany({ where: { id: { in: createdLedModelIds } } });
    }
    if (marcasDeTeste.length > 0) {
      await prisma.searchHistory.deleteMany({ where: { make: { in: marcasDeTeste } } });
    }
    await prisma.$disconnect();
    await closeNotificationQueue();
  });

  it("bloqueia acesso sem autenticação", async () => {
    const res = await request(app).get("/analytics/summary");
    expect(res.status).toBe(401);
  });

  it("bloqueia o cliente final, que não monitora demanda", async () => {
    const res = await request(app).get("/analytics/summary").set("Cookie", client);
    expect(res.status).toBe(403);
  });

  it("rejeita limite inválido", async () => {
    const res = await request(app).get("/analytics/summary?limit=0").set("Cookie", rep);
    expect(res.status).toBe(400);
  });

  it("aceita só os períodos que o seletor do dashboard oferece", async () => {
    const valido = await request(app).get("/analytics/summary?days=7").set("Cookie", rep);
    expect(valido.status).toBe(200);
    expect(valido.body.summary.periodDays).toBe(7);

    const invalido = await request(app).get("/analytics/summary?days=15").set("Cookie", rep);
    expect(invalido.status).toBe(400);
  });

  it("devolve os três blocos do dashboard com dados reais", async () => {
    const runId = Date.now();
    const marca = `TESTEANALYTICS-${runId}`;
    marcasDeTeste.push(marca);

    // estoque crítico: stockQty <= stockMin
    const critico = await prisma.ledModel.create({
      data: {
        sku: `TESTE-ANALYTICS-CRIT-${runId}`,
        name: "LED critico",
        socketCode: `TESTE-ANALYTICS-${runId}`,
        stockQty: 1,
        stockMin: 5,
      },
    });
    createdLedModelIds.push(critico.id);

    // produto pedido: ticket com 3 unidades
    const criado = await request(app)
      .post("/tickets")
      .set("Cookie", client)
      .send({ items: [{ ledModelId: critico.id, position: "FAROL_BAIXO", quantity: 3 }] });
    createdTicketIds.push(criado.body.ticket.id);

    // veículo buscado, sem resultado (lacuna da matriz)
    await request(app).get(`/compatibility?make=${marca}&model=MODELO-ANALYTICS&year=2020`);

    // limit alto de proposito: o catalogo semeado tem 20 produtos zerados, que
    // ocupariam o topo de criticalStock e esconderiam o deste teste.
    const res = await request(app).get("/analytics/summary?limit=50").set("Cookie", rep);
    expect(res.status).toBe(200);

    const { topProducts, criticalStock, topVehicles } = res.body.summary;

    expect(topProducts.find((p: { sku: string }) => p.sku === critico.sku)).toMatchObject({
      totalReserved: 3,
    });
    expect(criticalStock.find((p: { sku: string }) => p.sku === critico.sku)).toMatchObject({
      stockQty: 1,
      stockMin: 5,
    });
    expect(topVehicles.find((v: { make: string }) => v.make === marca)).toMatchObject({
      model: "MODELO-ANALYTICS",
      searchCount: 1,
      withoutResultCount: 1,
    });
  });

  it("devolve os totais e a série por dia que os cards e o gráfico consomem", async () => {
    const runId = Date.now();
    const marca = `TESTETOTAIS-${runId}`;
    marcasDeTeste.push(marca);

    await request(app).get(`/compatibility?make=${marca}&model=MODELO-TOTAIS&year=2020`);

    const res = await request(app).get("/analytics/summary?days=30").set("Cookie", rep);
    expect(res.status).toBe(200);

    const { totals, searchesPerDay } = res.body.summary;
    expect(totals.searches).toBeGreaterThan(0);
    expect(totals.searchesWithoutResult).toBeGreaterThan(0);
    // A taxa é tickets/buscas do período, então fica sempre entre 0 e 1.
    expect(totals.conversionRate).toBeGreaterThanOrEqual(0);

    const hoje = new Date().toISOString().slice(0, 10);
    expect(searchesPerDay.find((p: { day: string }) => p.day === hoje)).toBeDefined();
  });

  it("não conta ticket cancelado como demanda", async () => {
    const runId = Date.now();
    const led = await prisma.ledModel.create({
      data: {
        sku: `TESTE-ANALYTICS-CANC-${runId}`,
        name: "LED cancelado",
        socketCode: `TESTE-ANALYTICS-C-${runId}`,
        stockQty: 50,
        stockMin: 1,
      },
    });
    createdLedModelIds.push(led.id);

    const criado = await request(app)
      .post("/tickets")
      .set("Cookie", client)
      .send({ items: [{ ledModelId: led.id, position: "FAROL_BAIXO", quantity: 9 }] });
    const ticketId = criado.body.ticket.id;
    createdTicketIds.push(ticketId);

    await request(app).patch(`/tickets/${ticketId}/cancel`).set("Cookie", client);

    const res = await request(app).get("/analytics/summary?limit=50").set("Cookie", rep);
    expect(res.status).toBe(200);
    expect(res.body.summary.topProducts.find((p: { sku: string }) => p.sku === led.sku)).toBeUndefined();
  });
});
