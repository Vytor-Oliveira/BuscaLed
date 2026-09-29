import {
  EmailSender,
  NewTicketInfo,
  StockAlertInfo,
  TicketCancelledInfo,
  TicketEditedInfo,
} from "./types";

// Loga no terminal em vez de enviar e-mail de verdade — usada pelos testes e
// como fallback sem GMAIL_USER/GMAIL_APP_PASSWORD configurados.
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

  async sendNewTicketNotification(to: string, info: NewTicketInfo): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(
      `[ConsoleEmailSender] Novo ticket para ${to}: ${info.ticketId} (${info.itemCount} ${info.itemCount === 1 ? "item" : "itens"})`
    );
  }

  async sendTicketEditedNotification(to: string, info: TicketEditedInfo): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(
      `[ConsoleEmailSender] Item do ticket ${info.ticketId} editado para ${to}: ` +
        `${info.previousProductName} → ${info.newProductName}`
    );
  }

  async sendTicketCancelledNotification(to: string, info: TicketCancelledInfo): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`[ConsoleEmailSender] Ticket ${info.ticketId} cancelado — aviso pra ${to}`);
  }
}
