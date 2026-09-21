export interface StockAlertInfo {
  sku: string;
  name: string;
  stockQty: number;
  stockMin: number;
}

/**
 * Envio de e-mail transacional. M2/M3 só têm a implementação
 * ConsoleEmailSender (loga no terminal) — o NotifModule de verdade (fila
 * Bull/Redis + SendGrid) é escopo do M4 da RFC. Trocar a implementação não
 * deve exigir mudanças em quem consome esta interface (AuthService,
 * StockService), só na injeção de dependência.
 */
export interface EmailSender {
  sendConfirmationEmail(email: string, token: string): Promise<void>;
  sendLowStockAlert(to: string, info: StockAlertInfo): Promise<void>;
}
