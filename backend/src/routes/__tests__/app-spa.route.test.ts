import "dotenv/config";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { createApp } from "../../app";
import { prisma } from "../../db/prisma";
import { closeRedis } from "../../db/redis";
import { closeNotificationQueue } from "../../queue/notification.bootstrap";

/**
 * Em produção o mesmo processo serve a API e o frontend compilado — é o que faz
 * o cookie de sessão funcionar, porque SameSite=Lax não atravessa sites
 * diferentes. Aqui o build do frontend é substituído por um diretório de
 * mentira apontado por FRONTEND_DIST: o que se verifica é o roteamento, não o
 * conteúdo da SPA.
 */
const diretorio = fs.mkdtempSync(path.join(os.tmpdir(), "buscaled-spa-"));
const HTML = "<!doctype html><title>BuscaLED</title><div id=root></div>";

fs.writeFileSync(path.join(diretorio, "index.html"), HTML);
fs.mkdirSync(path.join(diretorio, "assets"));
fs.writeFileSync(path.join(diretorio, "assets", "app.js"), "console.log(1);");

process.env.FRONTEND_DIST = diretorio;
const app = createApp();

describe("Frontend servido pelo backend", () => {
  afterAll(async () => {
    delete process.env.FRONTEND_DIST;
    fs.rmSync(diretorio, { recursive: true, force: true });
    await prisma.$disconnect();
    await closeNotificationQueue();
    await closeRedis();
  });

  it("serve o index na raiz", async () => {
    const res = await request(app).get("/");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/html/);
    expect(res.text).toContain("BuscaLED");
  });

  // O roteador é do lado do cliente: recarregar a página numa rota interna
  // precisa devolver o index, não 404.
  it.each(["/painel/tickets", "/garagem", "/resultado/algum/caminho"])(
    "devolve o index em %s, para o roteador do cliente assumir",
    async (caminho) => {
      const res = await request(app).get(caminho);

      expect(res.status).toBe(200);
      expect(res.text).toContain("BuscaLED");
    }
  );

  it("serve arquivo estático do build", async () => {
    const res = await request(app).get("/assets/app.js");

    expect(res.status).toBe(200);
    expect(res.text).toContain("console.log");
  });

  // O ponto crítico: com o fallback ligado, rota de API inexistente não pode
  // virar HTML 200 — o cliente quebraria no JSON.parse longe da causa.
  it("não deixa o fallback engolir rota de API inexistente", async () => {
    const res = await request(app).get("/auth/naoexiste");

    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
  });

  it("não engole rota de API que existe", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
  });
});
