import "dotenv/config";
import { EmailSender } from "../../services/notification/types";
import { createNotificationQueue, registerNotificationProcessor } from "../notification.queue";

// Fila Bull real contra o Redis real — só o sender final é um spy (mesmo
// corte já aceito em stock.route.test.ts: o envio via Gmail SMTP em si não
// dá pra automatizar sem credenciais reais). Nome de fila próprio, único por
// execução: outros arquivos de teste rodam em paralelo (workers do Jest) e
// já têm o singleton de produção (fila "notifications") ativo — usar o mesmo
// nome faria os jobs deste teste serem roubados por aquele processor.
const TEST_QUEUE_NAME = `notifications-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;

describe("Fila de notificações (integração real — Bull + Redis, sem mocks na fila)", () => {
  let queue: ReturnType<typeof createNotificationQueue>;

  afterEach(async () => {
    await queue.close();
  });

  function createSpySender(): EmailSender & { [K in keyof EmailSender]: jest.Mock } {
    return {
      sendConfirmationEmail: jest.fn().mockResolvedValue(undefined),
      sendLowStockAlert: jest.fn().mockResolvedValue(undefined),
      sendNewTicketNotification: jest.fn().mockResolvedValue(undefined),
      sendTicketEditedNotification: jest.fn().mockResolvedValue(undefined),
      sendTicketCancelledNotification: jest.fn().mockResolvedValue(undefined),
    };
  }

  it("processa um job de novo ticket chamando o método certo do sender real", async () => {
    queue = createNotificationQueue(TEST_QUEUE_NAME);
    const sender = createSpySender();
    registerNotificationProcessor(queue, sender);

    const job = await queue.add({
      type: "newTicket",
      to: "rep@teste.local",
      info: { ticketId: "ticket-123", itemCount: 2 },
    });
    await job.finished();

    expect(sender.sendNewTicketNotification).toHaveBeenCalledWith("rep@teste.local", {
      ticketId: "ticket-123",
      itemCount: 2,
    });
  });

  it("processa um job de estoque mínimo, edição e cancelamento cada um pro método certo", async () => {
    queue = createNotificationQueue(TEST_QUEUE_NAME);
    const sender = createSpySender();
    registerNotificationProcessor(queue, sender);

    const jobs = await Promise.all([
      queue.add({
        type: "lowStockAlert",
        to: "admin@teste.local",
        info: { sku: "SKU-1", name: "Produto", stockQty: 1, stockMin: 5 },
      }),
      queue.add({
        type: "ticketEdited",
        to: "cliente@teste.local",
        info: { ticketId: "t-1", itemId: "i-1", previousProductName: "A", newProductName: "B" },
      }),
      queue.add({
        type: "ticketCancelled",
        to: "rep@teste.local",
        info: { ticketId: "t-2" },
      }),
    ]);
    await Promise.all(jobs.map((job) => job.finished()));

    expect(sender.sendLowStockAlert).toHaveBeenCalledWith(
      "admin@teste.local",
      expect.objectContaining({ sku: "SKU-1" })
    );
    expect(sender.sendTicketEditedNotification).toHaveBeenCalledWith(
      "cliente@teste.local",
      expect.objectContaining({ ticketId: "t-1" })
    );
    expect(sender.sendTicketCancelledNotification).toHaveBeenCalledWith(
      "rep@teste.local",
      expect.objectContaining({ ticketId: "t-2" })
    );
  });
});
