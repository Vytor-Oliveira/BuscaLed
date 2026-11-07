import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { listTickets, type Ticket, type TicketStatus } from "../../../api/tickets";
import { numeroTicket } from "../../../lib/ticket";

export type Ordenacao = "recentes" | "antigos";

export interface FiltrosDaFila {
  status: TicketStatus | "TODOS";
  dias: number;
  termo: string;
  ordem: Ordenacao;
  pagina: number;
}

export const POR_PAGINA = 15;

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** Casa o termo contra número, e-mail, telefone, veículo e nome de produto. */
function casaTermo(ticket: Ticket, alvo: string): boolean {
  if (!alvo) {
    return true;
  }
  const campos = [
    numeroTicket(ticket.id),
    ticket.userEmail,
    ticket.customerPhone ?? "",
    ticket.vehicle ? `${ticket.vehicle.make} ${ticket.vehicle.model} ${ticket.vehicle.year}` : "",
    ...ticket.items.flatMap((i) => [i.ledModelName, i.ledModelSku]),
  ];
  return campos.some((campo) => normalizar(campo).includes(alvo));
}

/**
 * Busca a fila inteira uma vez e filtra na memória. O backend ainda não oferece
 * paginação nem busca em `GET /tickets`, então contadores por aba e busca por
 * produto só existem desse jeito — e a paginação aqui é de apresentação.
 */
export function useFila(filtros: FiltrosDaFila) {
  const consulta = useQuery({
    queryKey: ["tickets", "todos"],
    queryFn: () => listTickets().then((r) => r.tickets),
  });

  const derivado = useMemo(() => {
    const todos = consulta.data ?? [];

    const contadores = todos.reduce<Record<string, number>>(
      (acumulado, ticket) => {
        acumulado[ticket.status] = (acumulado[ticket.status] ?? 0) + 1;
        return acumulado;
      },
      { TODOS: todos.length }
    );

    const limite =
      filtros.dias > 0 ? Date.now() - filtros.dias * 24 * 60 * 60 * 1000 : null;
    const alvo = normalizar(filtros.termo.trim());

    const filtrados = todos
      .filter((t) => filtros.status === "TODOS" || t.status === filtros.status)
      .filter((t) => (limite === null ? true : new Date(t.createdAt).getTime() >= limite))
      .filter((t) => casaTermo(t, alvo))
      .sort((a, b) => {
        const diferenca =
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return filtros.ordem === "recentes" ? diferenca : -diferenca;
      });

    const paginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
    const pagina = Math.min(filtros.pagina, paginas);
    const inicio = (pagina - 1) * POR_PAGINA;

    return {
      contadores,
      filtrados,
      visiveis: filtrados.slice(inicio, inicio + POR_PAGINA),
      paginas,
      pagina,
    };
  }, [consulta.data, filtros]);

  return { ...consulta, ...derivado };
}
