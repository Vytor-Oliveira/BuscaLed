import Queue from "bull";
import {
  EmailSender,
  NewTicketInfo,
  StockAlertInfo,
  TicketCancelledInfo,
  TicketEditedInfo,
} from "../services/notification/types";

export type NotificationJob =
  | { type: "confirmationEmail"; email: string; token: string }
  | { type: "lowStockAlert"; to: string; info: StockAlertInfo }
  | { type: "newTicket"; to: string; info: NewTicketInfo }
  | { type: "ticketEdited"; to: string; info: TicketEditedInfo }
  | { type: "ticketCancelled"; to: string; info: TicketCancelledInfo };

export const NOTIFICATION_QUEUE_NAME = "notifications";

// queueName customizável: filas Bull com o mesmo nome no mesmo Redis viram
// consumidores concorrentes entre si, mesmo em processos/workers diferentes
// (ex: testes rodando em paralelo). Um nome próprio isola a fila de teste do
// singleton de produção, que já roda em todo arquivo que sobe createApp().
export function createNotificationQueue(
  queueName: string = NOTIFICATION_QUEUE_NAME
): Queue.Queue<NotificationJob> {
  const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
  const queue = new Queue<NotificationJob>(queueName, redisUrl);

  // Sem listener, um erro de conexão com o Redis derruba o processo inteiro.
  queue.on("error", (error) => {
    // eslint-disable-next-line no-console
    console.error("Erro na fila de notificações (Redis indisponível?):", error);
  });

  return queue;
}

export function registerNotificationProcessor(
  queue: Queue.Queue<NotificationJob>,
  realSender: EmailSender
): void {
  queue.process(async (job) => {
    const data = job.data;
    switch (data.type) {
      case "confirmationEmail":
        return realSender.sendConfirmationEmail(data.email, data.token);
      case "lowStockAlert":
        return realSender.sendLowStockAlert(data.to, data.info);
      case "newTicket":
        return realSender.sendNewTicketNotification(data.to, data.info);
      case "ticketEdited":
        return realSender.sendTicketEditedNotification(data.to, data.info);
      case "ticketCancelled":
        return realSender.sendTicketCancelledNotification(data.to, data.info);
    }
  });
}
