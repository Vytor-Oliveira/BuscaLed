import { ConsoleEmailSender } from "./console-email-sender";
import { NodemailerEmailSender } from "./nodemailer-email-sender";
import { ResendEmailSender } from "./resend-email-sender";
import { EmailSender } from "./types";

/**
 * Ordem de preferência: Resend (domínio próprio, com SPF/DKIM) > Gmail SMTP >
 * console. O console não envia nada de verdade: é fallback de desenvolvimento,
 * e por isso avisa alto quando é ele que está no ar.
 */
export function createEmailSender(): EmailSender {
  // Em teste nenhum provedor real entra, mesmo configurado. A suíte cadastra
  // dezenas de usuários e cada um disparava um e-mail de verdade: o Resend
  // recusava por limite de taxa e por domínio de exemplo, e as cinco
  // retentativas do Bull seguravam o encerramento da fila.
  if (process.env.NODE_ENV === "test") {
    return new ConsoleEmailSender();
  }

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
