import type { Ticket } from "../api/tickets";
import { numeroTicket, ROTULO_STATUS } from "./ticket";

// As aspas resolvem separador e quebra de linha, mas nao impedem o Excel de
// avaliar celula que comeca com = + - @ como formula. Telefone, e-mail e nome
// de produto vem de fora: o apostrofo forca leitura como texto.
const campo = (v: string) =>
  `"${(/^[=+\-@\t\r]/.test(v) ? `'${v}` : v).replace(/"/g, '""')}"`;

const COLUNAS = ["Ticket", "Cliente", "Telefone", "Veículo", "Produtos", "Data", "Status"];

/**
 * Exportacao da fila. O separador e `;` porque o Excel em pt-BR usa virgula
 * como separador decimal e abriria um CSV virgulado numa unica coluna.
 */
export function paraCsv(tickets: Ticket[]): string {
  const linhas = tickets.map((t) =>
    [
      numeroTicket(t.id),
      t.userEmail,
      t.customerPhone ?? "",
      t.vehicle ? `${t.vehicle.make} ${t.vehicle.model} ${t.vehicle.year}` : "",
      t.items.map((i) => `${i.quantity}x ${i.ledModelName}`).join(" | "),
      new Date(t.createdAt).toISOString(),
      ROTULO_STATUS[t.status],
    ]
      .map(campo)
      .join(";")
  );
  return [COLUNAS.map(campo).join(";"), ...linhas].join("\r\n");
}

/** O BOM faz o Excel abrir o arquivo em UTF-8 em vez de Windows-1252. */
export function arquivoCsv(tickets: Ticket[]): Blob {
  return new Blob(["﻿", paraCsv(tickets)], {
    type: "text/csv;charset=utf-8",
  });
}
