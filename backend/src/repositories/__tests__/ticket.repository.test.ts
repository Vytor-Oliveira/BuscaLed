import "dotenv/config";
import { prisma } from "../../db/prisma";
import {
  InvalidStatusTransitionError,
  TicketNotFoundError,
} from "../../services/ticket/types";
import { PrismaTicketRepository } from "../ticket.repository";

const INEXISTENTE = "00000000-0000-0000-0000-000000000000";

// As guardas atômicas do repositório só são alcançadas quando a checagem do
// service já passou — o que, em produção, é o resultado de uma corrida. Aqui
// elas são chamadas direto, com Postgres de verdade.
describe("PrismaTicketRepository (integração real — Postgres, sem mocks)", () => {
  const repository = new PrismaTicketRepository(prisma);
  const createdUserIds: string[] = [];
  const createdLedModelIds: string[] = [];
  const createdTicketIds: string[] = [];

  afterAll(async () => {
    if (createdTicketIds.length > 0) {
      await prisma.reservationItem.deleteMany({
        where: { reservationId: { in: createdTicketIds } },
      });
      await prisma.reservation.deleteMany({ where: { id: { in: createdTicketIds } } });
    }
    if (createdLedModelIds.length > 0) {
      await prisma.ledModel.deleteMany({ where: { id: { in: createdLedModelIds } } });
    }
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await prisma.$disconnect();
  });

  async function criarTicket(): Promise<string> {
    const sufixo = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const user = await prisma.user.create({
      data: { name: "Teste repo", email: `teste-repo-${sufixo}@example.com` },
    });
    createdUserIds.push(user.id);

    const led = await prisma.ledModel.create({
      data: {
        sku: `TESTE-REPO-${sufixo}`,
        name: "LED de teste repo",
        socketCode: "TESTE-REPO",
        stockQty: 5,
        stockMin: 1,
      },
    });
    createdLedModelIds.push(led.id);

    const ticket = await repository.create(user.id, [
      { ledModelId: led.id, position: "FAROL_BAIXO", quantity: 1 },
    ]);
    createdTicketIds.push(ticket.id);
    return ticket.id;
  }

  it("updateStatus lança TicketNotFoundError quando o ticket não existe", async () => {
    await expect(
      repository.updateStatus(INEXISTENTE, ["PENDENTE"], "CONFIRMADO")
    ).rejects.toBeInstanceOf(TicketNotFoundError);
  });

  it("updateStatus lança InvalidStatusTransitionError quando o status atual não é permitido", async () => {
    const ticketId = await criarTicket();

    // O ticket nasce PENDENTE; pedir uma transição que exige CONCLUIDO falha.
    await expect(
      repository.updateStatus(ticketId, ["CONCLUIDO"], "CANCELADO")
    ).rejects.toBeInstanceOf(InvalidStatusTransitionError);

    const intacto = await prisma.reservation.findUniqueOrThrow({ where: { id: ticketId } });
    expect(intacto.status).toBe("PENDENTE");
  });

  it("findItem devolve null para item inexistente", async () => {
    await expect(repository.findItem(INEXISTENTE)).resolves.toBeNull();
  });

  it("findById devolve null para ticket inexistente", async () => {
    await expect(repository.findById(INEXISTENTE)).resolves.toBeNull();
  });

  it("listAll filtra por status e, sem filtro, traz o ticket criado", async () => {
    const ticketId = await criarTicket();

    const pendentes = await repository.listAll("PENDENTE");
    expect(pendentes.some((t) => t.id === ticketId)).toBe(true);

    const cancelados = await repository.listAll("CANCELADO");
    expect(cancelados.some((t) => t.id === ticketId)).toBe(false);

    const todos = await repository.listAll();
    expect(todos.some((t) => t.id === ticketId)).toBe(true);
  });

  it("findLedModel devolve null para produto inexistente", async () => {
    await expect(repository.findLedModel(INEXISTENTE)).resolves.toBeNull();
  });
});
