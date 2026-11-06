import { ConsoleEmailSender } from "../services/notification/console-email-sender";
import { NodemailerEmailSender } from "../services/notification/nodemailer-email-sender";
import { QueuedEmailSender } from "../services/notification/queued-email-sender";
import { ResendEmailSender } from "../services/notification/resend-email-sender";
import { EmailSender } from "../services/notification/types";
import { createNotificationQueue, registerNotificationProcessor } from "./notification.queue";

// Ordem de preferência: Resend (domínio próprio, com SPF/DKIM) > Gmail SMTP >
// console. O console não envia nada de verdade: é só fallback de
// desenvolvimento, e por isso avisa alto quando é ele que está no ar.
function createRealEmailSender(): EmailSender {
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM;

  if (resendApiKey && resendFrom) {
    return new ResendEmailSender(resendApiKey, resendFrom);
  }

  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

  if (gmailUser && gmailAppPassword) {
    return new NodemailerEmailSender(gmailUser, gmailAppPassword);
  }

  // eslint-disable-next-line no-console
  console.warn(
    "[notificacoes] Nenhum provedor configurado (RESEND_API_KEY+RESEND_FROM ou " +
      "GMAIL_USER+GMAIL_APP_PASSWORD). Os e-mails serao apenas impressos no terminal."
  );
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
