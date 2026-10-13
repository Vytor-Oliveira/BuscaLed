import Queue from "bull";
import { NotificationJob } from "../../queue/notification.queue";
import {
  EmailSender,
  NewTicketInfo,
  StockAlertInfo,
  TicketCancelledInfo,
  TicketEditedInfo,
} from "./types";

// Implementa EmailSender enfileirando em vez de enviar direto — resolve
// assim que o job entra na fila, não quando é processado.
export class QueuedEmailSender implements EmailSender {
  constructor(private readonly queue: Queue.Queue<NotificationJob>) {}

  async sendConfirmationEmail(email: string, token: string): Promise<void> {
    await this.queue.add({ type: "confirmationEmail", email, token });
  }

  async sendLowStockAlert(to: string, info: StockAlertInfo): Promise<void> {
    await this.queue.add({ type: "lowStockAlert", to, info });
  }

  async sendNewTicketNotification(to: string, info: NewTicketInfo): Promise<void> {
    await this.queue.add({ type: "newTicket", to, info });
  }

  async sendTicketEditedNotification(to: string, info: TicketEditedInfo): Promise<void> {
    await this.queue.add({ type: "ticketEdited", to, info });
  }

  async sendTicketCancelledNotification(to: string, info: TicketCancelledInfo): Promise<void> {
    await this.queue.add({ type: "ticketCancelled", to, info });
  }
}
