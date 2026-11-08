import "dotenv/config";
import { LightingPosition } from "@prisma/client";
import request from "supertest";
import { createApp } from "../../app";
import { prisma } from "../../db/prisma";
import { closeRedis } from "../../db/redis";
import { closeNotificationQueue } from "../../queue/notification.bootstrap";
import { PrismaTicketRepository } from "../../repositories/ticket.repository";
import { InvalidStatusTransitionError } from "../../services/ticket/types";

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

const veiculosSinteticos: string[] = [];

/**
 * A criação de ticket passou a exigir que o soquete seja usado na posição
 * pedida por algum veículo da matriz (issue #13). Produto de teste sem nenhum
 * encaixe cadastrado é produto que nenhum carro aceita — então cada um ganha
 * um veículo sintético que usa o soquete em todas as posições.
 */
async function garantirEncaixes(socketCode: string): Promise<void> {
  const vehicle = await prisma.vehicleModel.create({
    data: {
      make: `TESTE-TICKET-${socketCode}`,
      model: `MODELO-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      yearStart: 2000,
      yearEnd: 2030,
    },
  });
  veiculosSinteticos.push(vehicle.id);

  await prisma.vehicleFitting.createMany({
    data: Object.values(LightingPosition).map((position) => ({
      vehicleModelId: vehicle.id,
      position,
      socketCode,
    })),
  });
}

async function createLedModel(socketCode: string, stockQty = 10): Promise<{ id: string; sku: string; name: string }> {
  await garantirEncaixes(socketCode);
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
    if (veiculosSinteticos.length > 0) {
      await prisma.vehicleFitting.deleteMany({
        where: { vehicleModelId: { in: veiculosSinteticos } },
      });
      await prisma.vehicleModel.deleteMany({ where: { id: { in: veiculosSinteticos } } });
    }
    await prisma.$disconnect();
    await closeNotificationQueue();
    await closeRedis();
    // Limpeza em tabelas grandes: 5s (padrao do Jest) estoura com o
    // container frio e deixa o CI vermelho sem motivo real.
  }, 30_000);

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

  // A fila do painel mostrava um traço fixo na coluna Veículo porque o pedido
  // não guardava isso. Marca/modelo/ano, nunca a placa (RN02).
  it("guarda o veículo da busca no ticket, e aceita ticket sem veículo", async () => {
    const led = await createLedModel("H11");
    createdLedModelIds.push(led.id);

    const comVeiculo = await request(app)
      .post("/tickets")
      .set("Cookie", client.cookies)
      .send({
        items: [{ ledModelId: led.id, position: "NEBLINA", quantity: 1 }],
        vehicle: { make: "VOLKSWAGEN", model: "GOL", year: 2018 },
      });

    expect(comVeiculo.status).toBe(201);
    createdTicketIds.push(comVeiculo.body.ticket.id);
    expect(comVeiculo.body.ticket.vehicle).toEqual({
      make: "VOLKSWAGEN",
      model: "GOL",
      year: 2018,
    });

    const semVeiculo = await request(app)
      .post("/tickets")
      .set("Cookie", client.cookies)
      .send({ items: [{ ledModelId: led.id, position: "NEBLINA", quantity: 1 }] });

    expect(semVeiculo.status).toBe(201);
    createdTicketIds.push(semVeiculo.body.ticket.id);
    expect(semVeiculo.body.ticket.vehicle).toBeNull();
  });

  // A placa nunca pode chegar aqui: o schema não tem o campo, então um corpo
  // que a mande é recusado em vez de ignorado em silêncio.
  it("recusa um ticket que tente mandar a placa junto", async () => {
    const led = await createLedModel("H1");
    createdLedModelIds.push(led.id);

    const res = await request(app)
      .post("/tickets")
      .set("Cookie", client.cookies)
      .send({
        items: [{ ledModelId: led.id, position: "FAROL_BAIXO", quantity: 1 }],
        vehicle: { make: "VW", model: "GOL", year: 2018, plate: "ABC1D23" },
      });

    expect(res.status).toBe(400);
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

  // Issue #13 — estas três validações não existiam: dava para montar um pedido
  // impossível e só descobrir quando o representante tentasse concluir.
  it("recusa item com quantidade acima do estoque disponível", async () => {
    const escasso = await createLedModel("TESTE-VAL", 2);
    createdLedModelIds.push(escasso.id);

    const res = await request(app)
      .post("/tickets")
      .set("Cookie", client.cookies)
      .send({ items: [{ ledModelId: escasso.id, position: "FAROL_BAIXO", quantity: 5 }] });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Estoque insuficiente");
    expect(res.body.error).toContain(escasso.name);
  });

  it("recusa quantidade acima do teto por item", async () => {
    const led = await createLedModel("TESTE-VAL");
    createdLedModelIds.push(led.id);

    const res = await request(app)
      .post("/tickets")
      .set("Cookie", client.cookies)
      .send({ items: [{ ledModelId: led.id, position: "FAROL_BAIXO", quantity: 500 }] });

    expect(res.status).toBe(400);
  });

  // Lâmpada de placa pedida como farol baixo: nenhum veículo da matriz usa
  // esse soquete nessa posição.
  it("recusa produto cujo soquete não é usado naquela posição", async () => {
    const soquete = `TESTE-SOQ-${Date.now()}`;
    const led = await prisma.ledModel.create({
      data: {
        sku: `TESTE-SEM-ENCAIXE-${Date.now()}`,
        name: "LED sem encaixe na matriz",
        socketCode: soquete,
        stockQty: 10,
        stockMin: 2,
      },
    });
    createdLedModelIds.push(led.id);

    // Encaixe existe só em PLACA; o pedido vai em FAROL_BAIXO.
    const vehicle = await prisma.vehicleModel.create({
      data: {
        make: `TESTE-SOQ-${Date.now()}`,
        model: "MODELO",
        yearStart: 2000,
        yearEnd: 2030,
      },
    });
    veiculosSinteticos.push(vehicle.id);
    await prisma.vehicleFitting.create({
      data: { vehicleModelId: vehicle.id, position: "PLACA", socketCode: soquete },
    });

    const res = await request(app)
      .post("/tickets")
      .set("Cookie", client.cookies)
      .send({ items: [{ ledModelId: led.id, position: "FAROL_BAIXO", quantity: 1 }] });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain(soquete);

    // E aceita na posição em que o soquete é usado de verdade.
    const aceito = await request(app)
      .post("/tickets")
      .set("Cookie", client.cookies)
      .send({ items: [{ ledModelId: led.id, position: "PLACA", quantity: 1 }] });
    expect(aceito.status).toBe(201);
    createdTicketIds.push(aceito.body.ticket.id);
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

  // Issue #15: antes isto era compensação manual depois do commit de cada
  // etapa. Agora a conclusão inteira é uma transação, então falha no meio da
  // lista não deixa rastro — nem no estoque dos itens já visitados, nem no
  // status do ticket.
  it("não deixa rastro quando um item no meio da lista não tem estoque", async () => {
    const plentiful = await createLedModel("H4", 10);
    const scarce = await createLedModel("H7", 10);
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

    // O estoque cai depois da criação — outro pedido levou as unidades antes
    // deste ser concluído. Desde a issue #13 a criação recusa pedido acima do
    // estoque, então é esta corrida, e não o pedido impossível, que ainda
    // chega no Concluir.
    await prisma.ledModel.update({ where: { id: scarce.id }, data: { stockQty: 1 } });

    const completeRes = await request(app).patch(`/tickets/${ticketId}/complete`).set("Cookie", rep.cookies);
    expect(completeRes.status).toBe(400);

    const plentifulAfter = await prisma.ledModel.findUniqueOrThrow({ where: { id: plentiful.id } });
    expect(plentifulAfter.stockQty).toBe(10);

    const scarceAfter = await prisma.ledModel.findUniqueOrThrow({ where: { id: scarce.id } });
    expect(scarceAfter.stockQty).toBe(1);

    const ticketAfter = await prisma.reservation.findUniqueOrThrow({ where: { id: ticketId } });
    expect(ticketAfter.status).toBe("CONFIRMADO");
  });

  // O caminho feliz só era coberto com um item: um commit que levasse apenas a
  // primeira baixa passava despercebido.
  it("conclui ticket de três itens baixando o estoque de todos", async () => {
    const a = await createLedModel("TESTE-TX", 10);
    const b = await createLedModel("TESTE-TX", 10);
    const c = await createLedModel("TESTE-TX", 10);
    createdLedModelIds.push(a.id, b.id, c.id);

    const createRes = await request(app)
      .post("/tickets")
      .set("Cookie", client.cookies)
      .send({
        items: [
          { ledModelId: a.id, position: "FAROL_BAIXO", quantity: 1 },
          { ledModelId: b.id, position: "FAROL_ALTO", quantity: 2 },
          { ledModelId: c.id, position: "NEBLINA", quantity: 3 },
        ],
      });
    const ticketId = createRes.body.ticket.id;
    createdTicketIds.push(ticketId);

    await request(app).patch(`/tickets/${ticketId}/confirm`).set("Cookie", rep.cookies);
    const completeRes = await request(app)
      .patch(`/tickets/${ticketId}/complete`)
      .set("Cookie", rep.cookies);

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.ticket.status).toBe("CONCLUIDO");

    const finais = await prisma.ledModel.findMany({
      where: { id: { in: [a.id, b.id, c.id] } },
      select: { id: true, stockQty: true },
    });
    const porId = Object.fromEntries(finais.map((m) => [m.id, m.stockQty]));
    expect([porId[a.id], porId[b.id], porId[c.id]]).toEqual([9, 8, 7]);
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
  // RF12 — o representante gerencia o status, cancelamento incluso. A posse
  // (RN14) restringe só o cliente.
  it("deixa o representante cancelar pedido de outra pessoa", async () => {
    const led = await createLedModel("TESTE-CANCEL-REP");
    createdLedModelIds.push(led.id);

    const criado = await request(app)
      .post("/tickets")
      .set("Cookie", client.cookies)
      .send({ items: [{ ledModelId: led.id, position: "FAROL_BAIXO", quantity: 1 }] });
    const ticketId = criado.body.ticket.id;
    createdTicketIds.push(ticketId);

    const res = await request(app).patch(`/tickets/${ticketId}/cancel`).set("Cookie", rep.cookies);
    expect(res.status).toBe(200);
    expect(res.body.ticket.status).toBe("CANCELADO");
  });

  // O modal de troca consome esta rota; ela precisa aplicar a mesma RN11 da
  // edição, senão o representante escolhe algo que o PATCH depois recusa.
  it("lista alternativas só do mesmo encaixe, com estoque, sem o produto atual", async () => {
    const atual = await createLedModel("TESTE-ALT", 5);
    const mesmoEncaixe = await createLedModel("TESTE-ALT", 8);
    const semEstoque = await createLedModel("TESTE-ALT", 0);
    const outroEncaixe = await createLedModel("TESTE-ALT-OUTRO", 9);
    createdLedModelIds.push(atual.id, mesmoEncaixe.id, semEstoque.id, outroEncaixe.id);

    const criado = await request(app)
      .post("/tickets")
      .set("Cookie", client.cookies)
      .send({ items: [{ ledModelId: atual.id, position: "FAROL_BAIXO", quantity: 1 }] });
    const ticketId = criado.body.ticket.id;
    const itemId = criado.body.ticket.items[0].id;
    createdTicketIds.push(ticketId);

    const res = await request(app)
      .get(`/tickets/${ticketId}/items/${itemId}/alternatives`)
      .set("Cookie", rep.cookies);

    expect(res.status).toBe(200);
    const ids = res.body.alternatives.map((a: { id: string }) => a.id);
    expect(ids).toContain(mesmoEncaixe.id);
    expect(ids).not.toContain(atual.id);
    expect(ids).not.toContain(semEstoque.id);
    expect(ids).not.toContain(outroEncaixe.id);
  });

  // Antes, o filtro era só stockQty > 0: um item de 4 unidades recebia opção
  // com 1 em estoque e a falha só aparecia no Concluir, depois da troca feita.
  it("não oferece alternativa com estoque menor que a quantidade do item", async () => {
    const atual = await createLedModel("TESTE-QTD", 9);
    const insuficiente = await createLedModel("TESTE-QTD", 1);
    const naMedida = await createLedModel("TESTE-QTD", 4);
    const folgado = await createLedModel("TESTE-QTD", 9);
    createdLedModelIds.push(atual.id, insuficiente.id, naMedida.id, folgado.id);

    const criado = await request(app)
      .post("/tickets")
      .set("Cookie", client.cookies)
      .send({ items: [{ ledModelId: atual.id, position: "FAROL_BAIXO", quantity: 4 }] });
    const ticketId = criado.body.ticket.id;
    const itemId = criado.body.ticket.items[0].id;
    createdTicketIds.push(ticketId);

    const res = await request(app)
      .get(`/tickets/${ticketId}/items/${itemId}/alternatives`)
      .set("Cookie", rep.cookies);

    expect(res.status).toBe(200);
    const ids = res.body.alternatives.map((a: { id: string }) => a.id);
    expect(ids).not.toContain(insuficiente.id);
    expect(ids).toContain(naMedida.id);
    expect(ids).toContain(folgado.id);
  });
  it("não deixa o cliente final listar alternativas de troca", async () => {
    const led = await createLedModel("TESTE-ALT-403");
    createdLedModelIds.push(led.id);

    const criado = await request(app)
      .post("/tickets")
      .set("Cookie", client.cookies)
      .send({ items: [{ ledModelId: led.id, position: "FAROL_BAIXO", quantity: 1 }] });
    createdTicketIds.push(criado.body.ticket.id);

    const res = await request(app)
      .get(`/tickets/${criado.body.ticket.id}/items/${criado.body.ticket.items[0].id}/alternatives`)
      .set("Cookie", client.cookies);

    expect(res.status).toBe(403);
  });

  // A rota já barra a edição de ticket fechado; este teste ataca a escrita
  // direto no repositório, que é o que acontece quando um "concluir"
  // concorrente fecha o ticket depois da checagem do service e antes do UPDATE.
  it("repositório recusa editar item de ticket já concluído, mesmo chamado direto", async () => {
    const led = await createLedModel("TESTE-GUARDA");
    const substituto = await createLedModel("TESTE-GUARDA");
    createdLedModelIds.push(led.id, substituto.id);

    const criado = await request(app)
      .post("/tickets")
      .set("Cookie", client.cookies)
      .send({ items: [{ ledModelId: led.id, position: "FAROL_BAIXO", quantity: 1 }] });
    const ticketId = criado.body.ticket.id;
    const itemId = criado.body.ticket.items[0].id;
    createdTicketIds.push(ticketId);

    await request(app).patch(`/tickets/${ticketId}/confirm`).set("Cookie", rep.cookies);
    await request(app).patch(`/tickets/${ticketId}/complete`).set("Cookie", rep.cookies);

    const repository = new PrismaTicketRepository(prisma);
    await expect(
      repository.updateItemProduct(ticketId, itemId, substituto.id, led.id)
    ).rejects.toBeInstanceOf(InvalidStatusTransitionError);

    const item = await prisma.reservationItem.findUniqueOrThrow({ where: { id: itemId } });
    expect(item.ledModelId).toBe(led.id);
  });
  // O telefone fica no ticket, nao na conta: e o que o painel usa pro deep link
  // de WhatsApp, e quem nunca pediu nada nao tem telefone gravado.
  it("guarda o telefone informado na criacao do ticket e devolve null quando nao vem", async () => {
    const led = await createLedModel("TESTE-FONE");
    createdLedModelIds.push(led.id);
    const item = { ledModelId: led.id, position: "FAROL_BAIXO", quantity: 1 };

    const comFone = await request(app)
      .post("/tickets")
      .set("Cookie", client.cookies)
      .send({ items: [item], customerPhone: "47999990000" });
    createdTicketIds.push(comFone.body.ticket.id);
    expect(comFone.status).toBe(201);
    expect(comFone.body.ticket.customerPhone).toBe("47999990000");

    const semFone = await request(app)
      .post("/tickets")
      .set("Cookie", client.cookies)
      .send({ items: [item] });
    createdTicketIds.push(semFone.body.ticket.id);
    expect(semFone.status).toBe(201);
    expect(semFone.body.ticket.customerPhone).toBeNull();

    const curto = await request(app)
      .post("/tickets")
      .set("Cookie", client.cookies)
      .send({ items: [item], customerPhone: "123" });
    expect(curto.status).toBe(400);
  });

  it("rejeita filtro de status inválido na fila do representante", async () => {
    const res = await request(app).get("/tickets?status=XPTO").set("Cookie", rep.cookies);
    expect(res.status).toBe(400);
  });

  it("representante consulta um ticket pelo id, e recebe 404 se não existir", async () => {
    const led = await createLedModel("TESTE-GET");
    createdLedModelIds.push(led.id);
    const criado = await request(app)
      .post("/tickets")
      .set("Cookie", client.cookies)
      .send({ items: [{ ledModelId: led.id, position: "FAROL_BAIXO", quantity: 1 }] });
    createdTicketIds.push(criado.body.ticket.id);

    const ok = await request(app).get(`/tickets/${criado.body.ticket.id}`).set("Cookie", rep.cookies);
    expect(ok.status).toBe(200);
    expect(ok.body.ticket.id).toBe(criado.body.ticket.id);

    const inexistente = await request(app)
      .get("/tickets/00000000-0000-0000-0000-000000000000")
      .set("Cookie", rep.cookies);
    expect(inexistente.status).toBe(404);
  });

  it("cliente não pode editar item nem concluir ticket", async () => {
    const led = await createLedModel("TESTE-PERM");
    createdLedModelIds.push(led.id);
    const criado = await request(app)
      .post("/tickets")
      .set("Cookie", client.cookies)
      .send({ items: [{ ledModelId: led.id, position: "FAROL_BAIXO", quantity: 1 }] });
    const ticketId = criado.body.ticket.id;
    const itemId = criado.body.ticket.items[0].id;
    createdTicketIds.push(ticketId);

    const edicao = await request(app)
      .patch(`/tickets/${ticketId}/items/${itemId}`)
      .set("Cookie", client.cookies)
      .send({ ledModelId: led.id });
    expect(edicao.status).toBe(403);

    const conclusao = await request(app)
      .patch(`/tickets/${ticketId}/complete`)
      .set("Cookie", client.cookies);
    expect(conclusao.status).toBe(403);
  });

  it("rejeita edição sem ledModelId, com item de outro ticket ou com produto inexistente", async () => {
    const led = await createLedModel("TESTE-VAL");
    createdLedModelIds.push(led.id);

    const primeiro = await request(app)
      .post("/tickets")
      .set("Cookie", client.cookies)
      .send({ items: [{ ledModelId: led.id, position: "FAROL_BAIXO", quantity: 1 }] });
    const segundo = await request(app)
      .post("/tickets")
      .set("Cookie", client.cookies)
      .send({ items: [{ ledModelId: led.id, position: "FAROL_ALTO", quantity: 1 }] });
    createdTicketIds.push(primeiro.body.ticket.id, segundo.body.ticket.id);

    const semCorpo = await request(app)
      .patch(`/tickets/${primeiro.body.ticket.id}/items/${primeiro.body.ticket.items[0].id}`)
      .set("Cookie", rep.cookies)
      .send({});
    expect(semCorpo.status).toBe(400);

    // item existe, mas pertence ao outro ticket
    const itemDeOutro = await request(app)
      .patch(`/tickets/${primeiro.body.ticket.id}/items/${segundo.body.ticket.items[0].id}`)
      .set("Cookie", rep.cookies)
      .send({ ledModelId: led.id });
    expect(itemDeOutro.status).toBe(404);

    const produtoInexistente = await request(app)
      .patch(`/tickets/${primeiro.body.ticket.id}/items/${primeiro.body.ticket.items[0].id}`)
      .set("Cookie", rep.cookies)
      .send({ ledModelId: "00000000-0000-0000-0000-000000000000" });
    expect(produtoInexistente.status).toBe(404);
  });

  it("retorna 404 ao confirmar um ticket que não existe", async () => {
    const res = await request(app)
      .patch("/tickets/00000000-0000-0000-0000-000000000000/confirm")
      .set("Cookie", rep.cookies);
    expect(res.status).toBe(404);
  });
});
