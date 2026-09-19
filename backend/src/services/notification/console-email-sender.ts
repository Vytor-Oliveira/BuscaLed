import { EmailSender, StockAlertInfo } from "./types";

/**
 * Implementação mínima pro M2/M3: loga no terminal em vez de enviar e-mail
 * de verdade. O NotifModule real (fila Bull/Redis + SendGrid) é escopo do
 * M4 da RFC.
 */
export class ConsoleEmailSender implements EmailSender {
  async sendConfirmationEmail(email: string, token: string): Promise<void> {
    const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
    const link = `${baseUrl}/auth/confirm?token=${token}`;

    // eslint-disable-next-line no-console
    console.log(`[ConsoleEmailSender] Confirmação de e-mail para ${email}: ${link}`);
  }

  async sendLowStockAlert(to: string, info: StockAlertInfo): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(
      `[ConsoleEmailSender] Alerta de estoque mínimo para ${to}: ${info.name} (${info.sku}) — ${info.stockQty}/${info.stockMin}`
    );
  }
}
