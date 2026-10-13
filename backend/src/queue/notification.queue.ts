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

export function createNotificationQueue(
  queueName: string = NOTIFICATION_QUEUE_NAME
): Queue.Queue<NotificationJob> {
  const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
  const queue = new Queue<NotificationJob>(queueName, redisUrl, {
    defaultJobOptions: {
      // O padrão do Bull é 1 tentativa: uma oscilação do SMTP perderia o
      // e-mail de vez, que é justamente o que a fila deveria evitar.
      attempts: 5,
      backoff: { type: "exponential", delay: 5000 },
      // O job de confirmação carrega o token da conta — sem remover, ele ficaria
      // legível no Redis indefinidamente depois do envio.
      removeOnComplete: true,
      removeOnFail: 100,
    },
  });

  // Sem listener, um erro de conexão com o Redis derruba o processo inteiro.
  queue.on("error", (error) => {
    // eslint-disable-next-line no-console
    console.error("Erro na fila de notificações (Redis indisponível?):", error);
  });

  queue.on("failed", (job, error) => {
    // eslint-disable-next-line no-console
    console.error(
      `Notificação ${job.data.type} falhou (tentativa ${job.attemptsMade}/${job.opts.attempts}):`,
      error
    );
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
