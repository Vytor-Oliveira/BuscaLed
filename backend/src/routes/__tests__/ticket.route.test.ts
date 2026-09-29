import "dotenv/config";
import request from "supertest";
import { createApp } from "../../app";
import { prisma } from "../../db/prisma";
import { closeNotificationQueue } from "../../queue/notification.bootstrap";

const app = createApp();

function uniqueEmail(prefix: string): string {
  return `teste-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

async function registerAndLogin(role: "USER" | "REP" | "ADMIN"): Promise<{ cookies: string[]; userId: string }> {
  const email = uniqueEmail(role.toLowerCase());
  await request(app)
    .post("/auth/register")
    .send({ name: "Teste", email, password: "senha-forte-123" });
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  await request(app).get(`/auth/confirm?token=${user.emailConfirmationToken}`);
  if (role !== "USER") {
    await prisma.user.update({ where: { id: user.id }, data: { role } });
  }
  const loginRes = await request(app).post("/auth/login").send({ email, password: "senha-forte-123" });
  return { cookies: loginRes.headers["set-cookie"] as unknown as string[], userId: user.id };
}

async function createLedModel(socketCode: string, stockQty = 10): Promise<{ id: string; sku: string; name: string }> {
  return prisma.ledModel.create({
    data: {
      sku: `TESTE-TICKET-${socketCode}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: `LED de teste ${socketCode}`,
      socketCode,
      stockQty,
      stockMin: 2,
    },
  });
}

describe("Ticket routes (integração real — Postgres, sem mocks)", () => {
  const createdLedModelIds: string[] = [];
  const createdTicketIds: string[] = [];

  // Reaproveitados na maioria dos testes — o loginRateLimiter (10/janela)
  // não aguenta login novo em quase todo teste do arquivo.
  let rep: { cookies: string[]; userId: string };
  let client: { cookies: string[]; userId: string };

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
    await prisma.$disconnect();
    await closeNotificationQueue();
  });

  it("bloqueia acesso sem autenticação", async () => {
    const res = await request(app).get("/tickets");
    expect(res.status).toBe(401);
  });

  it("cliente cria ticket com múltiplos itens", async () => {
    const ledA = await createLedModel("H4");
    const ledB = await createLedModel("H7");
    createdLedModelIds.push(ledA.id, ledB.id);

    const res = await request(app)
      .post("/tickets")
      .set("Cookie", client.cookies)
      .send({
        items: [
          { ledModelId: ledA.id, position: "FAROL_BAIXO", quantity: 1 },
          { ledModelId: ledB.id, position: "FAROL_ALTO", quantity: 2 },
        ],
      });

    expect(res.status).toBe(201);
    createdTicketIds.push(res.body.ticket.id);
    expect(res.body.ticket.status).toBe("PENDENTE");
    expect(res.body.ticket.items).toHaveLength(2);
  });

  it("retorna 400 ao criar ticket sem itens", async () => {
    const res = await request(app).post("/tickets").set("Cookie", client.cookies).send({ items: [] });
    expect(res.status).toBe(400);
  });

  it("retorna 404 ao criar ticket com produto inexistente", async () => {
    const res = await request(app)
      .post("/tickets")
      .set("Cookie", client.cookies)
      .send({ items: [{ ledModelId: "00000000-0000-0000-0000-000000000000", position: "FAROL_BAIXO", quantity: 1 }] });
    expect(res.status).toBe(404);
  });

  it("cliente só vê os próprios tickets; representante vê a fila inteira", async () => {
    const otherClient = await registerAndLogin("USER");
    const led = await createLedModel("H4");
    createdLedModelIds.push(led.id);

    const createRes = await request(app)
      .post("/tickets")
      .set("Cookie", client.cookies)
      .send({ items: [{ ledModelId: led.id, position: "FAROL_BAIXO", quantity: 1 }] });
    createdTicketIds.push(createRes.body.ticket.id);

    const clientList = await request(app).get("/tickets").set("Cookie", client.cookies);
    expect(clientList.body.tickets.some((t: { id: string }) => t.id === createRes.body.ticket.id)).toBe(true);

    const otherClientList = await request(app).get("/tickets").set("Cookie", otherClient.cookies);
    expect(otherClientList.body.tickets.some((t: { id: string }) => t.id === createRes.body.ticket.id)).toBe(false);

    const repList = await request(app).get("/tickets").set("Cookie", rep.cookies);
    expect(repList.body.tickets.some((t: { id: string }) => t.id === createRes.body.ticket.id)).toBe(true);
  });

  it("retorna 404 quando outro usuário tenta ver ou cancelar um ticket que não é seu", async () => {
    const stranger = await registerAndLogin("USER");
    const led = await createLedModel("H4");
    createdLedModelIds.push(led.id);

    const createRes = await request(app)
      .post("/tickets")
      .set("Cookie", client.cookies)
      .send({ items: [{ ledModelId: led.id, position: "FAROL_BAIXO", quantity: 1 }] });
    createdTicketIds.push(createRes.body.ticket.id);

    const getRes = await request(app).get(`/tickets/${createRes.body.ticket.id}`).set("Cookie", stranger.cookies);
    expect(getRes.status).toBe(404);

    const cancelRes = await request(app)
      .patch(`/tickets/${createRes.body.ticket.id}/cancel`)
      .set("Cookie", stranger.cookies);
    expect(cancelRes.status).toBe(404);
  });

  it("representante confirma o ticket (PENDENTE -> CONFIRMADO); cliente não pode confirmar", async () => {
    const led = await createLedModel("H4");
    createdLedModelIds.push(led.id);

    const createRes = await request(app)
      .post("/tickets")
      .set("Cookie", client.cookies)
      .send({ items: [{ ledModelId: led.id, position: "FAROL_BAIXO", quantity: 1 }] });
    const ticketId = createRes.body.ticket.id;
    createdTicketIds.push(ticketId);

    const forbidden = await request(app).patch(`/tickets/${ticketId}/confirm`).set("Cookie", client.cookies);
    expect(forbidden.status).toBe(403);

    const confirmRes = await request(app).patch(`/tickets/${ticketId}/confirm`).set("Cookie", rep.cookies);
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.ticket.status).toBe("CONFIRMADO");

    const secondConfirm = await request(app).patch(`/tickets/${ticketId}/confirm`).set("Cookie", rep.cookies);
    expect(secondConfirm.status).toBe(409);
  });

  it("representante edita item respeitando o mesmo encaixe (RN11) e rejeita soquete diferente", async () => {
    const original = await createLedModel("H4");
    const sameSocket = await createLedModel("H4");
    const differentSocket = await createLedModel("H7");
    createdLedModelIds.push(original.id, sameSocket.id, differentSocket.id);

    const createRes = await request(app)
      .post("/tickets")
      .set("Cookie", client.cookies)
      .send({ items: [{ ledModelId: original.id, position: "FAROL_BAIXO", quantity: 1 }] });
    const ticketId = createRes.body.ticket.id;
    const itemId = createRes.body.ticket.items[0].id;
    createdTicketIds.push(ticketId);

    const rejected = await request(app)
      .patch(`/tickets/${ticketId}/items/${itemId}`)
      .set("Cookie", rep.cookies)
      .send({ ledModelId: differentSocket.id });
    expect(rejected.status).toBe(400);

    const accepted = await request(app)
      .patch(`/tickets/${ticketId}/items/${itemId}`)
      .set("Cookie", rep.cookies)
      .send({ ledModelId: sameSocket.id });
    expect(accepted.status).toBe(200);
    const editedItem = accepted.body.ticket.items.find((i: { id: string }) => i.id === itemId);
    expect(editedItem.ledModelId).toBe(sameSocket.id);
    expect(editedItem.originalLedModelId).toBe(original.id);
  });

  it("conclui o ticket decrementando o estoque de verdade (RN12); item não pode mais ser editado depois", async () => {
    const led = await createLedModel("H4", 5);
    const otherLed = await createLedModel("H4", 5);
    createdLedModelIds.push(led.id, otherLed.id);

    const createRes = await request(app)
      .post("/tickets")
      .set("Cookie", client.cookies)
      .send({ items: [{ ledModelId: led.id, position: "FAROL_BAIXO", quantity: 3 }] });
    const ticketId = createRes.body.ticket.id;
    const itemId = createRes.body.ticket.items[0].id;
    createdTicketIds.push(ticketId);

    const notYetConfirmed = await request(app).patch(`/tickets/${ticketId}/complete`).set("Cookie", rep.cookies);
    expect(notYetConfirmed.status).toBe(409);

    await request(app).patch(`/tickets/${ticketId}/confirm`).set("Cookie", rep.cookies);

    const completeRes = await request(app).patch(`/tickets/${ticketId}/complete`).set("Cookie", rep.cookies);
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.ticket.status).toBe("CONCLUIDO");

    const updatedLed = await prisma.ledModel.findUniqueOrThrow({ where: { id: led.id } });
    expect(updatedLed.stockQty).toBe(2);

    // Ticket já concluído (estoque já decrementado pro produto atual) — não
    // pode mais trocar o item, mesmo que o soquete seja compatível.
    const editAfterComplete = await request(app)
      .patch(`/tickets/${ticketId}/items/${itemId}`)
      .set("Cookie", rep.cookies)
      .send({ ledModelId: otherLed.id });
    expect(editAfterComplete.status).toBe(409);
  });

  it("desfaz decrementos já feitos se um item no meio da lista tiver estoque insuficiente", async () => {
    const plentiful = await createLedModel("H4", 10);
    const scarce = await createLedModel("H7", 1);
    createdLedModelIds.push(plentiful.id, scarce.id);

    const createRes = await request(app)
      .post("/tickets")
      .set("Cookie", client.cookies)
      .send({
        items: [
          { ledModelId: plentiful.id, position: "FAROL_BAIXO", quantity: 2 },
          { ledModelId: scarce.id, position: "FAROL_ALTO", quantity: 5 },
        ],
      });
    const ticketId = createRes.body.ticket.id;
    createdTicketIds.push(ticketId);

    await request(app).patch(`/tickets/${ticketId}/confirm`).set("Cookie", rep.cookies);

    const completeRes = await request(app).patch(`/tickets/${ticketId}/complete`).set("Cookie", rep.cookies);
    expect(completeRes.status).toBe(400);

    const plentifulAfter = await prisma.ledModel.findUniqueOrThrow({ where: { id: plentiful.id } });
    expect(plentifulAfter.stockQty).toBe(10);

    const ticketAfter = await prisma.reservation.findUniqueOrThrow({ where: { id: ticketId } });
    expect(ticketAfter.status).toBe("CONFIRMADO");
  });

  it("cliente cancela dentro da janela permitida (RN14); não pode cancelar ticket já concluído", async () => {
    const led = await createLedModel("H4", 5);
    createdLedModelIds.push(led.id);

    const pendingTicket = await request(app)
      .post("/tickets")
      .set("Cookie", client.cookies)
      .send({ items: [{ ledModelId: led.id, position: "FAROL_BAIXO", quantity: 1 }] });
    createdTicketIds.push(pendingTicket.body.ticket.id);

    const cancelRes = await request(app)
      .patch(`/tickets/${pendingTicket.body.ticket.id}/cancel`)
      .set("Cookie", client.cookies);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.ticket.status).toBe("CANCELADO");

    const concludedTicket = await request(app)
      .post("/tickets")
      .set("Cookie", client.cookies)
      .send({ items: [{ ledModelId: led.id, position: "FAROL_BAIXO", quantity: 1 }] });
    const concludedId = concludedTicket.body.ticket.id;
    createdTicketIds.push(concludedId);
    await request(app).patch(`/tickets/${concludedId}/confirm`).set("Cookie", rep.cookies);
    await request(app).patch(`/tickets/${concludedId}/complete`).set("Cookie", rep.cookies);

    const lateCancel = await request(app).patch(`/tickets/${concludedId}/cancel`).set("Cookie", client.cookies);
    expect(lateCancel.status).toBe(409);
  });
});
