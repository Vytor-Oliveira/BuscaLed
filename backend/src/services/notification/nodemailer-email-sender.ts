import nodemailer, { Transporter } from "nodemailer";
import {
  EmailSender,
  NewTicketInfo,
  StockAlertInfo,
  TicketCancelledInfo,
  TicketEditedInfo,
} from "./types";

// GMAIL_APP_PASSWORD é uma senha de app gerada na conta Google, não a senha
// normal — exige verificação em duas etapas ativada.
export class NodemailerEmailSender implements EmailSender {
  private readonly transporter: Transporter;

  constructor(
    private readonly gmailUser: string,
    gmailAppPassword: string
  ) {
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailAppPassword },
    });
  }

  async sendConfirmationEmail(email: string, token: string): Promise<void> {
    const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
    const link = `${baseUrl}/auth/confirm?token=${token}`;
    await this.send(email, "Confirme seu e-mail — BuscaLED", `Clique para confirmar: ${link}`);
  }

  async sendLowStockAlert(to: string, info: StockAlertInfo): Promise<void> {
    await this.send(
      to,
      "Alerta de estoque mínimo — BuscaLED",
      `${info.name} (${info.sku}) está com ${info.stockQty} unidades, abaixo do mínimo de ${info.stockMin}.`
    );
  }

  async sendNewTicketNotification(to: string, info: NewTicketInfo): Promise<void> {
    await this.send(
      to,
      "Novo ticket recebido — BuscaLED",
      `Novo ticket ${info.ticketId} com ${info.itemCount} ${info.itemCount === 1 ? "item" : "itens"}.`
    );
  }

  async sendTicketEditedNotification(to: string, info: TicketEditedInfo): Promise<void> {
    await this.send(
      to,
      "Seu pedido foi atualizado — BuscaLED",
      `Um item do seu ticket ${info.ticketId} foi trocado: ${info.previousProductName} → ${info.newProductName}.`
    );
  }

  async sendTicketCancelledNotification(to: string, info: TicketCancelledInfo): Promise<void> {
    await this.send(to, "Ticket cancelado — BuscaLED", `O ticket ${info.ticketId} foi cancelado pelo cliente.`);
  }

  private async send(to: string, subject: string, text: string): Promise<void> {
    await this.transporter.sendMail({ from: this.gmailUser, to, subject, text });
  }
}
