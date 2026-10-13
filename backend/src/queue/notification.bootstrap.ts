import { ConsoleEmailSender } from "../services/notification/console-email-sender";
import { NodemailerEmailSender } from "../services/notification/nodemailer-email-sender";
import { QueuedEmailSender } from "../services/notification/queued-email-sender";
import { EmailSender } from "../services/notification/types";
import { createNotificationQueue, registerNotificationProcessor } from "./notification.queue";

function createRealEmailSender(): EmailSender {
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

  if (gmailUser && gmailAppPassword) {
    return new NodemailerEmailSender(gmailUser, gmailAppPassword);
  }

  return new ConsoleEmailSender();
}

// Singleton — uma fila compartilhada entre StockModule e TicketModule.
const notificationQueue = createNotificationQueue();
registerNotificationProcessor(notificationQueue, createRealEmailSender());

export const notificationEmailSender: EmailSender = new QueuedEmailSender(notificationQueue);

// Testes que sobem createApp() precisam chamar isto no afterAll, senão o
// Jest não termina sozinho.
export async function closeNotificationQueue(): Promise<void> {
  await notificationQueue.close();
}
