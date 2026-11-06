import "dotenv/config";
import request from "supertest";
import { createApp } from "../../app";
import { prisma } from "../../db/prisma";
import { closeRedis } from "../../db/redis";
import { closeNotificationQueue } from "../../queue/notification.bootstrap";
import { PrismaAnalyticsRepository } from "../../repositories/analytics.repository";

const app = createApp();

/**
 * Os três rankings são globais e sem filtro por item: a posição da massa de
 * teste depende do tamanho do banco, e um veículo com uma única busca já fica
 * fora de qualquer limite que a rota aceita (o máximo é 50). A agregação é
 * conferida no repositório — mesmo SQL, Postgres real — com limite acima do
 * banco; a rota responde pelo contrato que o dashboard consome.
 */
const repositorio = new PrismaAnalyticsRepository(prisma);
const ACIMA_DO_BANCO = 100_000;

function ordenado(valores: number[], sentido: "desc" | "asc"): boolean {
  return valores.every((valor, i) => i === 0 || (sentido === "desc" ? valores[i - 1] >= valor : valores[i - 1] <= valor));
}

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
    await closeRedis();
    // Limpeza em tabelas grandes: 5s (padrao do Jest) estoura com o
    // container frio e deixa o CI vermelho sem motivo real.
  }, 30_000);

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

  it("agrega os três blocos do dashboard a partir de dados reais", async () => {
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

    const [topProducts, criticalStock, topVehicles] = await Promise.all([
      repositorio.findTopProducts(ACIMA_DO_BANCO),
      repositorio.findCriticalStock(ACIMA_DO_BANCO),
      repositorio.findTopVehicles(ACIMA_DO_BANCO),
    ]);

    expect(topProducts.find((p) => p.sku === critico.sku)).toMatchObject({
      totalReserved: 3,
    });
    expect(criticalStock.find((p) => p.sku === critico.sku)).toMatchObject({
      stockQty: 1,
      stockMin: 5,
    });
    expect(topVehicles.find((v) => v.make === marca)).toMatchObject({
      model: "MODELO-ANALYTICS",
      searchCount: 1,
      withoutResultCount: 1,
    });
  });

  it("devolve os três rankings pela rota, ordenados e dentro do limite", async () => {
    const limite = 5;
    const res = await request(app).get(`/analytics/summary?limit=${limite}`).set("Cookie", rep);
    expect(res.status).toBe(200);

    const { topProducts, criticalStock, topVehicles } = res.body.summary;

    for (const bloco of [topProducts, criticalStock, topVehicles]) {
      expect(Array.isArray(bloco)).toBe(true);
      expect(bloco.length).toBeLessThanOrEqual(limite);
    }

    expect(topProducts.length).toBeGreaterThan(0);
    expect(topVehicles.length).toBeGreaterThan(0);

    expect(ordenado(topProducts.map((p: { totalReserved: number }) => p.totalReserved), "desc")).toBe(true);
    expect(ordenado(topVehicles.map((v: { searchCount: number }) => v.searchCount), "desc")).toBe(true);
    // Estoque crítico sobe do mais urgente: menor quantidade primeiro.
    expect(ordenado(criticalStock.map((p: { stockQty: number }) => p.stockQty), "asc")).toBe(true);
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

    // Em UTC isto quebraria entre 21h e meia-noite, quando o dia UTC ja virou.
    const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    expect(searchesPerDay.find((p: { day: string }) => p.day === hoje)).toBeDefined();

    // Dia sem busca precisa vir com 0: sem isso o grafico encosta os dias e
    // esconde justamente a queda de demanda.
    const dias = searchesPerDay.map((p: { day: string }) => p.day);
    expect(dias).toEqual([...dias].sort());
    const emDias = (d: string) => new Date(`${d}T12:00:00Z`).getTime() / 86400000;
    expect(dias.length).toBe(Math.round(emDias(dias[dias.length - 1]) - emDias(dias[0])) + 1);
  });

  // 02:30Z e 23:30 do dia anterior em Brasilia: a busca tem que ser contada
  // no dia em que a pessoa buscou, nao no dia seguinte do grafico.
  it("agrupa a busca no dia de Brasília, não no dia UTC", async () => {
    const marcaFuso = `TESTEFUSO-${Date.now()}`;
    marcasDeTeste.push(marcaFuso);

    const instante = new Date();
    instante.setUTCDate(instante.getUTCDate() - 1);
    instante.setUTCHours(2, 30, 0, 0);
    await prisma.searchHistory.create({
      data: {
        make: marcaFuso,
        model: "MODELO-FUSO",
        year: 2020,
        resultCount: 0,
        createdAt: instante,
      },
    });

    const diaEmBrasilia = instante.toLocaleDateString("en-CA", {
      timeZone: "America/Sao_Paulo",
    });
    expect(diaEmBrasilia).not.toBe(instante.toISOString().slice(0, 10));

    const res = await request(app).get("/analytics/summary?days=30").set("Cookie", rep);
    expect(res.status).toBe(200);
    const serie = res.body.summary.searchesPerDay as { day: string; count: number }[];
    const noDiaCerto = serie.find((p) => p.day === diaEmBrasilia);
    expect(noDiaCerto).toBeDefined();
    expect(noDiaCerto?.count).toBeGreaterThan(0);
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

    // Limite acima do banco: senão "ausente" poderia ser só "fora do top".
    const topProducts = await repositorio.findTopProducts(ACIMA_DO_BANCO);
    expect(topProducts.find((p) => p.sku === led.sku)).toBeUndefined();
  });
});
