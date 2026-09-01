import { EmailSender } from "./types";

/**
 * Implementação mínima pro M2: loga o link de confirmação no terminal em vez
 * de enviar um e-mail de verdade. Não finge ser algo que não é — o NotifModule
 * (fila Bull/Redis + SendGrid, RFC M4) é quem vai enviar e-mails de verdade.
 */
export class ConsoleEmailSender implements EmailSender {
  async sendConfirmationEmail(email: string, token: string): Promise<void> {
    const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
    const link = `${baseUrl}/auth/confirm?token=${token}`;

    // eslint-disable-next-line no-console
    console.log(`[ConsoleEmailSender] Confirmação de e-mail para ${email}: ${link}`);
  }
}
