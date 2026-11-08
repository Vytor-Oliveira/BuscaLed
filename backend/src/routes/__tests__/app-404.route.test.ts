import "dotenv/config";
import request from "supertest";
import { createApp } from "../../app";
import { prisma } from "../../db/prisma";
import { closeRedis } from "../../db/redis";
import { closeNotificationQueue } from "../../queue/notification.bootstrap";

const app = createApp();

/**
 * Em produção o mesmo processo serve a API e o frontend, e o fallback da SPA
 * devolve index.html para qualquer caminho desconhecido. Sem o recorte por
 * prefixo de API, uma rota digitada errada responderia HTML com status 200 — o
 * cliente tentaria fazer JSON.parse num documento e o erro apareceria longe da
 * causa.
 */
describe("Rotas desconhecidas", () => {
  afterAll(async () => {
    await prisma.$disconnect();
    await closeNotificationQueue();
    await closeRedis();
  });

  it.each(["/auth/naoexiste", "/health/nada", "/compatibility/nada"])(
    "responde 404 em JSON para %s",
    async (caminho) => {
      const res = await request(app).get(caminho);

      expect(res.status).toBe(404);
      expect(res.headers["content-type"]).toMatch(/application\/json/);
      expect(res.body.error).toBe("Rota não encontrada.");
    }
  );

  // Prefixo protegido barra antes de dizer se o caminho existe: responder 404
  // aqui entregaria o mapa da API para quem não está autenticado.
  it.each(["/tickets/naoexiste", "/catalog/nada", "/analytics/foo"])(
    "responde 401, não 404, em %s",
    async (caminho) => {
      const res = await request(app).get(caminho);

      expect(res.status).toBe(401);
    }
  );

  it("não transforma em 404 uma rota de API que existe", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
  });
});
