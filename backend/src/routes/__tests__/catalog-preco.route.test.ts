import "dotenv/config";
import request from "supertest";
import { createApp } from "../../app";
import { prisma } from "../../db/prisma";
import { closeRedis } from "../../db/redis";
import { closeNotificationQueue } from "../../queue/notification.bootstrap";

const app = createApp();

function emailUnico(prefixo: string): string {
  return `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

const sessoes = new Map<string, string[]>();

async function logarComo(role: "ADMIN" | "REP" | "USER"): Promise<string[]> {
  const guardada = sessoes.get(role);
  if (guardada) {
    return guardada;
  }
  const nova = await criarSessao(role);
  sessoes.set(role, nova);
  return nova;
}

async function criarSessao(role: "ADMIN" | "REP" | "USER"): Promise<string[]> {
  const email = emailUnico("preco");
  await request(app)
    .post("/auth/register")
    .send({ name: "Teste Preço", email, password: "senha-forte-123" });
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  await request(app).get(`/auth/confirm?token=${user.emailConfirmationToken}`);
  await prisma.user.update({ where: { id: user.id }, data: { role } });
  const login = await request(app)
    .post("/auth/login")
    .send({ email, password: "senha-forte-123" });
  return login.headers["set-cookie"] as unknown as string[];
}

const criados: string[] = [];
const veiculosCriados: string[] = [];

// Um único encerramento para o arquivo inteiro: dois describe fechando Prisma
// e Redis cada um pendurava a suíte, porque o segundo ainda precisava deles.
afterAll(async () => {
  if (criados.length > 0) {
    await prisma.ledModel.deleteMany({ where: { id: { in: criados } } });
  }
  if (veiculosCriados.length > 0) {
    await prisma.vehicleFitting.deleteMany({
      where: { vehicleModelId: { in: veiculosCriados } },
    });
    await prisma.vehicleModel.deleteMany({ where: { id: { in: veiculosCriados } } });
  }
  await prisma.$disconnect();
  await closeNotificationQueue();
  await closeRedis();
}, 30_000);

describe("Catálogo — preço, custo e imagem (integração real)", () => {

  async function criarProduto(
    cookies: string[],
    extra: Record<string, unknown> = {}
  ): Promise<{ status: number; body: Record<string, never> & { ledModel?: never } }> {
    const resposta = await request(app)
      .post("/catalog/led-models")
      .set("Cookie", cookies)
      .send({
        sku: `TESTE-PRECO-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: "LED de teste com preço",
        socketCode: `TP-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
        ...extra,
      });
    const id = (resposta.body as { ledModel?: { id?: string } }).ledModel?.id;
    if (id) {
      criados.push(id);
    }
    return resposta as never;
  }

  it("grava preço de venda e custo em centavos", async () => {
    const cookies = await logarComo("ADMIN");

    const resposta = await criarProduto(cookies, { priceCents: 12990, costCents: 7450 });

    expect(resposta.status).toBe(201);
    const ledModel = (resposta.body as never as { ledModel: Record<string, number> }).ledModel;
    expect(ledModel.priceCents).toBe(12990);
    expect(ledModel.costCents).toBe(7450);
  });

  it("aceita produto sem preço — o campo é opcional", async () => {
    const cookies = await logarComo("ADMIN");

    const resposta = await criarProduto(cookies);

    expect(resposta.status).toBe(201);
    const ledModel = (resposta.body as never as {
      ledModel: Record<string, number | null>;
    }).ledModel;
    expect(ledModel.priceCents).toBeNull();
    expect(ledModel.costCents).toBeNull();
  });

  it("recusa preço negativo e preço fracionado", async () => {
    const cookies = await logarComo("ADMIN");

    for (const priceCents of [-1, 12.5]) {
      const resposta = await criarProduto(cookies, { priceCents });
      expect(resposta.status).toBe(400);
    }
  });

  it("edita preço, custo e imagem de um produto existente", async () => {
    const cookies = await logarComo("ADMIN");
    const criado = await criarProduto(cookies, { priceCents: 1000 });
    const id = (criado.body as never as { ledModel: { id: string } }).ledModel.id;

    const resposta = await request(app)
      .patch(`/catalog/led-models/${id}`)
      .set("Cookie", cookies)
      .send({ priceCents: 24900, costCents: 11000, imageUrl: "/uploads/abc.jpg" });

    expect(resposta.status).toBe(200);
    expect(resposta.body.ledModel).toMatchObject({
      priceCents: 24900,
      costCents: 11000,
      imageUrl: "/uploads/abc.jpg",
    });
  });

  it("limpa o preço quando recebe null, sem apagar o resto", async () => {
    const cookies = await logarComo("ADMIN");
    const criado = await criarProduto(cookies, { priceCents: 5000, costCents: 2000 });
    const id = (criado.body as never as { ledModel: { id: string } }).ledModel.id;

    const resposta = await request(app)
      .patch(`/catalog/led-models/${id}`)
      .set("Cookie", cookies)
      .send({ priceCents: null });

    expect(resposta.status).toBe(200);
    expect(resposta.body.ledModel.priceCents).toBeNull();
    // Campo ausente do corpo não pode ser zerado junto.
    expect(resposta.body.ledModel.costCents).toBe(2000);
  });

  it("recusa campo desconhecido na edição em vez de descartar em silêncio", async () => {
    const cookies = await logarComo("ADMIN");
    const criado = await criarProduto(cookies);
    const id = (criado.body as never as { ledModel: { id: string } }).ledModel.id;

    const resposta = await request(app)
      .patch(`/catalog/led-models/${id}`)
      .set("Cookie", cookies)
      .send({ sku: "OUTRO-SKU" });

    expect(resposta.status).toBe(400);
  });

  it("responde 404 ao editar produto que não existe", async () => {
    const cookies = await logarComo("ADMIN");

    const resposta = await request(app)
      .patch("/catalog/led-models/00000000-0000-0000-0000-000000000000")
      .set("Cookie", cookies)
      .send({ priceCents: 100 });

    expect(resposta.status).toBe(404);
  });

  // RN06: catálogo é exclusivo do admin.
  it("bloqueia o representante na edição de produto", async () => {
    const admin = await logarComo("ADMIN");
    const criado = await criarProduto(admin);
    const id = (criado.body as never as { ledModel: { id: string } }).ledModel.id;

    const rep = await logarComo("REP");
    const resposta = await request(app)
      .patch(`/catalog/led-models/${id}`)
      .set("Cookie", rep)
      .send({ priceCents: 999 });

    expect(resposta.status).toBe(403);
  });

  it("bloqueia o upload de imagem sem sessão", async () => {
    const resposta = await request(app)
      .post("/catalog/uploads/imagem")
      .attach("imagem", Buffer.from("x"), "a.jpg");

    expect(resposta.status).toBe(401);
  });

  it("recusa arquivo que não é imagem", async () => {
    const cookies = await logarComo("ADMIN");

    const resposta = await request(app)
      .post("/catalog/uploads/imagem")
      .set("Cookie", cookies)
      .attach("imagem", Buffer.from("isto nao e imagem"), {
        filename: "script.js",
        contentType: "application/javascript",
      });

    expect(resposta.status).toBe(415);
  });

  it("aceita uma imagem e devolve a URL pública", async () => {
    const cookies = await logarComo("ADMIN");
    // PNG mínimo válido (1x1 transparente).
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      "base64"
    );

    const resposta = await request(app)
      .post("/catalog/uploads/imagem")
      .set("Cookie", cookies)
      .attach("imagem", png, { filename: "produto.png", contentType: "image/png" });

    expect(resposta.status).toBe(201);
    expect(resposta.body.imageUrl).toMatch(/^\/uploads\/[\w-]+\.png$/);
    // O nome original não vai para o disco: o arquivo é renomeado.
    expect(resposta.body.imageUrl).not.toContain("produto");
  });
});

describe("Compatibilidade — o custo interno nunca vaza (rota pública)", () => {
  // Massa propria, do produto ao encaixe: procurar um produto do seed e depois
  // um encaixe que combine com ele deixa o teste refem do que ja esta no
  // banco, e no CI a matriz nao tem o encaixe do primeiro produto.
  it("expõe priceCents e omite costCents sem sessão nenhuma", async () => {
    const marcador = `PRECO-${Date.now()}`;

    const produto = await prisma.ledModel.create({
      data: {
        sku: `TESTE-${marcador}`,
        name: "LED de teste de vazamento",
        socketCode: marcador,
        stockQty: 10,
        stockMin: 1,
        // Valores sem sobreposicao de digitos: 19900 contem "9900" como
        // substring, e a assercao abaixo daria falso positivo.
        priceCents: 19900,
        costCents: 7350,
      },
    });
    criados.push(produto.id);

    const veiculo = await prisma.vehicleModel.create({
      data: {
        make: marcador,
        model: "MODELO-PRECO",
        yearStart: 2020,
        yearEnd: 2020,
        fittings: {
          create: [{ position: "FAROL_BAIXO", socketCode: marcador }],
        },
      },
    });
    veiculosCriados.push(veiculo.id);

    const resposta = await request(app).get("/compatibility").query({
      make: veiculo.make,
      model: veiculo.model,
      year: veiculo.yearStart,
    });

    expect(resposta.status).toBe(200);
    const corpo = JSON.stringify(resposta.body);
    expect(corpo).toContain("priceCents");
    // O teste que importa: o custo não pode estar em lugar nenhum da resposta.
    expect(corpo).not.toContain("costCents");
    expect(corpo).not.toContain("7350");
  });
});
