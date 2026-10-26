import { api } from "./client";

export type TicketStatus = "PENDENTE" | "CONFIRMADO" | "CANCELADO" | "CONCLUIDO";

export interface TicketItem {
  id: string;
  ledModelId: string;
  ledModelSku: string;
  ledModelName: string;
  originalLedModelId: string | null;
  position: string;
  quantity: number;
}

export interface Ticket {
  id: string;
  userId: string;
  userEmail: string;
  customerPhone: string | null;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  items: TicketItem[];
}

export interface ItemAlternative {
  id: string;
  sku: string;
  name: string;
  socketCode: string;
  stockQty: number;
}

export function listItemAlternatives(
  ticketId: string,
  itemId: string
): Promise<{ alternatives: ItemAlternative[] }> {
  return api<{ alternatives: ItemAlternative[] }>(
    `/tickets/${ticketId}/items/${itemId}/alternatives`
  );
}

export function updateTicketItem(
  ticketId: string,
  itemId: string,
  ledModelId: string
): Promise<{ ticket: Ticket }> {
  return api<{ ticket: Ticket }>(`/tickets/${ticketId}/items/${itemId}`, {
    method: "PATCH",
    body: { ledModelId },
  });
}

export function listTickets(status?: TicketStatus): Promise<{ tickets: Ticket[] }> {
  return api<{ tickets: Ticket[] }>("/tickets", { query: { status } });
}

export function confirmTicket(id: string): Promise<{ ticket: Ticket }> {
  return api<{ ticket: Ticket }>(`/tickets/${id}/confirm`, { method: "PATCH" });
}

export function completeTicket(id: string): Promise<{ ticket: Ticket }> {
  return api<{ ticket: Ticket }>(`/tickets/${id}/complete`, { method: "PATCH" });
}

export function cancelTicket(id: string): Promise<{ ticket: Ticket }> {
  return api<{ ticket: Ticket }>(`/tickets/${id}/cancel`, { method: "PATCH" });
}
