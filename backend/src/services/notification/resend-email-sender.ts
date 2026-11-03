import {
  EmailSender,
  NewTicketInfo,
  StockAlertInfo,
  TicketCancelledInfo,
  TicketEditedInfo,
} from "./types";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * Envio por HTTP na API do Resend. Escolhido no lugar de SMTP do Gmail porque
 * o domínio é verificado com SPF e DKIM — mensagem automática saindo de conta
 * Gmail nova costuma ser classificada como spam.
 *
 * Sem SDK: é um POST com JSON, e o projeto evita dependência que não paga o
 * próprio peso.
 */
export class ResendEmailSender implements EmailSender {
  constructor(
    private readonly apiKey: string,
    private readonly from: string
  ) {}

  private async send(to: string, subject: string, text: string): Promise<void> {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: this.from, to: [to], subject, text }),
    });

    if (!response.ok) {
      // O corpo traz o motivo (domínio não verificado, chave inválida, etc.).
      // Sem ele o erro na fila vira "falhou" sem pista nenhuma.
      const detalhe = await response.text().catch(() => "");
      throw new Error(`Resend recusou o envio (${response.status}): ${detalhe}`);
    }
  }

  async sendConfirmationEmail(email: string, token: string): Promise<void> {
    const baseUrl = process.env.APP_BASE_URL;
    if (!baseUrl) {
      throw new Error("APP_BASE_URL não configurado — necessário para o link de confirmação.");
    }
    await this.send(
      email,
      "Confirme seu e-mail — BuscaLED",
      `Bem-vindo ao BuscaLED!\n\nConfirme sua conta neste link:\n${baseUrl}/auth/confirm?token=${token}\n\nSe não foi você que se cadastrou, ignore este e-mail.`
    );
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const baseUrl = process.env.FRONTEND_URL;
    if (!baseUrl) {
      throw new Error("FRONTEND_URL não configurado — necessário para o link de redefinição.");
    }
    await this.send(
      email,
      "Redefinição de senha — BuscaLED",
      `Para criar uma senha nova, acesse:\n${baseUrl}/redefinir-senha?token=${token}\n\nO link vale por 1 hora. Se não foi você que pediu, ignore este e-mail.`
    );
  }

  async sendLowStockAlert(to: string, info: StockAlertInfo): Promise<void> {
    await this.send(
      to,
      `Estoque baixo: ${info.name} — BuscaLED`,
      `${info.name} (${info.sku}) está com ${info.stockQty} unidades, abaixo do mínimo de ${info.stockMin}.`
    );
  }

  async sendNewTicketNotification(to: string, info: NewTicketInfo): Promise<void> {
    await this.send(
      to,
      "Novo pedido recebido — BuscaLED",
      `Novo pedido ${info.ticketId} com ${info.itemCount} ${info.itemCount === 1 ? "item" : "itens"}.\n\nAbra o painel para atender.`
    );
  }

  async sendTicketEditedNotification(to: string, info: TicketEditedInfo): Promise<void> {
    await this.send(
      to,
      "Seu pedido foi atualizado — BuscaLED",
      `O representante trocou um produto do pedido ${info.ticketId}:\n\n${info.previousProductName} → ${info.newProductName}`
    );
  }

  async sendTicketCancelledNotification(to: string, info: TicketCancelledInfo): Promise<void> {
    await this.send(
      to,
      "Pedido cancelado — BuscaLED",
      `O pedido ${info.ticketId} foi cancelado.`
    );
  }
}
