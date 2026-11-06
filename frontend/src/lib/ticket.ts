import type { TicketStatus } from "../api/tickets";

// O backend identifica o pedido por UUID; o RFC mostra um número curto. Até
// existir sequencial no banco, o sufixo do próprio id serve de rótulo estável.
export function numeroTicket(id: string): string {
  return `TKT-${id.replace(/-/g, "").slice(-4).toUpperCase()}`;
}

export const ROTULO_STATUS: Record<TicketStatus, string> = {
  PENDENTE: "Novo",
  CONFIRMADO: "Em atendimento",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

/** Ordem em que a fila do painel apresenta os status. */
export const ORDEM_STATUS: TicketStatus[] = [
  "PENDENTE",
  "CONFIRMADO",
  "CONCLUIDO",
  "CANCELADO",
];

export type TomDeStatus = "info" | "warning" | "success" | "neutral";

export const TOM_STATUS: Record<TicketStatus, TomDeStatus> = {
  PENDENTE: "info",
  CONFIRMADO: "warning",
  CONCLUIDO: "success",
  CANCELADO: "neutral",
};

/** RN14: o cliente só cancela enquanto o pedido não foi concluído. */
export function clientePodeCancelar(status: TicketStatus): boolean {
  return status === "PENDENTE" || status === "CONFIRMADO";
}

/** RN10: cancelado é imutável, e concluído encerra o fluxo. */
export function estadoFinal(status: TicketStatus): boolean {
  return status === "CANCELADO" || status === "CONCLUIDO";
}
