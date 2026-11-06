import type { Ticket } from "../api/tickets";
import { numeroTicket } from "./ticket";

/**
 * Deep link, nunca API: o envio automatico esta fora de escopo na v1 e a
 * documentacao prescreve o link. Devolve null quando o telefone nao da nem
 * para DDD + numero, para o botao poder sair da tela em vez de abrir um link
 * quebrado.
 */
export function montarLinkWhatsApp(telefone: string, mensagem?: string): string | null {
  const digitos = telefone.replace(/\D/g, "");
  if (digitos.length < 10) {
    return null;
  }
  const comPais = digitos.length <= 11 ? `55${digitos}` : digitos;
  const base = `https://wa.me/${comPais}`;
  return mensagem ? `${base}?text=${encodeURIComponent(mensagem)}` : base;
}

// RF24: o representante abre a conversa ja com o contexto do pedido escrito.
export function montarMensagem(ticket: Ticket): string {
  const produtos = ticket.items
    .map((item) => `${item.quantity}x ${item.ledModelName}`)
    .join(", ");
  return [
    `Olá! Sou da Shocklight e estou falando sobre o seu pedido ${numeroTicket(ticket.id)}.`,
    `Produtos: ${produtos}.`,
    "Podemos confirmar?",
  ].join(" ");
}
