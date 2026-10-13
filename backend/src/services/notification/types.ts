export interface StockAlertInfo {
  sku: string;
  name: string;
  stockQty: number;
  stockMin: number;
}

export interface NewTicketInfo {
  ticketId: string;
  itemCount: number;
}

export interface TicketEditedInfo {
  ticketId: string;
  itemId: string;
  previousProductName: string;
  newProductName: string;
}

export interface TicketCancelledInfo {
  ticketId: string;
}

export interface EmailSender {
  sendConfirmationEmail(email: string, token: string): Promise<void>;
  sendLowStockAlert(to: string, info: StockAlertInfo): Promise<void>;
  sendNewTicketNotification(to: string, info: NewTicketInfo): Promise<void>;
  sendTicketEditedNotification(to: string, info: TicketEditedInfo): Promise<void>;
  sendTicketCancelledNotification(to: string, info: TicketCancelledInfo): Promise<void>;
}
