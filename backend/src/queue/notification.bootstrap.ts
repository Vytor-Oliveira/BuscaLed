import { createEmailSender } from "../services/notification/email-sender.factory";
import { QueuedEmailSender } from "../services/notification/queued-email-sender";
import { EmailSender } from "../services/notification/types";
import { createNotificationQueue, registerNotificationProcessor } from "./notification.queue";

// Singleton — uma fila compartilhada entre StockModule e TicketModule.
const notificationQueue = createNotificationQueue();
registerNotificationProcessor(notificationQueue, createEmailSender());

export const notificationEmailSender: EmailSender = new QueuedEmailSender(notificationQueue);

// Testes que sobem createApp() precisam chamar isto no afterAll, senão o
// Jest não termina sozinho.
export async function closeNotificationQueue(): Promise<void> {
  await notificationQueue.close();
}
