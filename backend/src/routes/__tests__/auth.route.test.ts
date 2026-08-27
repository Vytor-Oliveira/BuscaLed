import "dotenv/config";
import request from "supertest";
import { createApp } from "../../app";
import { prisma } from "../../db/prisma";

const app = createApp();

function uniqueEmail(): string {
  return `teste-auth-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

async function getConfirmationToken(email: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  if (!user.emailConfirmationToken) {
    throw new Error("Usuário sem token de confirmação — o registro não funcionou como esperado.");
  }
  return user.emailConfirmationToken;
}

/**
 * Testes de integração reais: HTTP -> rota -> serviço -> repositório ->
 * Postgres de verdade (via Docker). Sem mock em nenhuma camada. Requer
 * `docker compose up -d` e a migration aplicada (`npx prisma migrate dev`).
 */
describe("Auth routes (integração real — Postgres, sem mocks)", () => {
  const createdEmails: string[] = [];

  afterAll(async () => {
    if (createdEmails.length > 0) {
      await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
    }
    await prisma.$disconnect();
  });

  it("cadastra, bloqueia login antes de confirmar, confirma e loga com sucesso", async () => {
    const email = uniqueEmail();
    createdEmails.push(email);

    const registerRes = await request(app)
      .post("/auth/register")
      .send({ name: "Teste Real", email, password: "senha-forte-123" });
    expect(registerRes.status).toBe(201);

    const loginAntesRes = await request(app)
      .post("/auth/login")
      .send({ email, password: "senha-forte-123" });
    expect(loginAntesRes.status).toBe(403);

    const token = await getConfirmationToken(email);
    const confirmRes = await request(app).get(`/auth/confirm?token=${token}`);
    expect(confirmRes.status).toBe(200);

    const loginRes = await request(app)
      .post("/auth/login")
      .send({ email, password: "senha-forte-123" });
    expect(loginRes.status).toBe(200);

    const cookies = loginRes.headers["set-cookie"] as unknown as string[];
    expect(cookies.some((c) => c.startsWith("access_token="))).toBe(true);
    expect(cookies.some((c) => c.startsWith("refresh_token="))).toBe(true);
    expect(cookies.every((c) => c.includes("HttpOnly"))).toBe(true);
  }, 15000);

  it("trata o e-mail sem diferenciar maiúsculas/minúsculas", async () => {
    const email = uniqueEmail();
    createdEmails.push(email);

    await request(app)
      .post("/auth/register")
      .send({ name: "Teste", email, password: "senha-forte-123" });

    const duplicadoComMaiuscula = await request(app)
      .post("/auth/register")
      .send({ name: "Outro", email: email.toUpperCase(), password: "outra-senha-123" });
    expect(duplicadoComMaiuscula.status).toBe(409);

    const token = await getConfirmationToken(email);
    await request(app).get(`/auth/confirm?token=${token}`);

    const loginComMaiuscula = await request(app)
      .post("/auth/login")
      .send({ email: email.toUpperCase(), password: "senha-forte-123" });
    expect(loginComMaiuscula.status).toBe(200);
  }, 15000);

  it("retorna 409 ao tentar cadastrar um e-mail já existente", async () => {
    const email = uniqueEmail();
    createdEmails.push(email);

    await request(app)
      .post("/auth/register")
      .send({ name: "Teste", email, password: "senha-123456" });
    const secondRes = await request(app)
      .post("/auth/register")
      .send({ name: "Teste 2", email, password: "outra-senha" });

    expect(secondRes.status).toBe(409);
  });

  it("retorna 401 ao logar com senha errada", async () => {
    const email = uniqueEmail();
    createdEmails.push(email);

    await request(app)
      .post("/auth/register")
      .send({ name: "Teste", email, password: "senha-correta-123" });
    const token = await getConfirmationToken(email);
    await request(app).get(`/auth/confirm?token=${token}`);

    const res = await request(app).post("/auth/login").send({ email, password: "senha-errada" });
    expect(res.status).toBe(401);
  });

  it("renova o access token com um refresh token válido", async () => {
    const email = uniqueEmail();
    createdEmails.push(email);

    await request(app)
      .post("/auth/register")
      .send({ name: "Teste", email, password: "senha-forte-123" });
    const token = await getConfirmationToken(email);
    await request(app).get(`/auth/confirm?token=${token}`);
    const loginRes = await request(app)
      .post("/auth/login")
      .send({ email, password: "senha-forte-123" });
    const cookies = loginRes.headers["set-cookie"] as unknown as string[];

    const refreshRes = await request(app).post("/auth/refresh").set("Cookie", cookies);
    expect(refreshRes.status).toBe(200);
  }, 15000);

  it("bloqueia login com token do Google inválido, sem chamar o Google de verdade", async () => {
    const res = await request(app).post("/auth/google").send({ idToken: "token-falso-de-teste" });
    expect(res.status).toBe(401);
  });

  it("bloqueia rota protegida (/garage) sem cookie de autenticação", async () => {
    const res = await request(app).get("/garage");
    expect(res.status).toBe(401);
  });
});
