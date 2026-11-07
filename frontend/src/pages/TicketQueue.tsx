import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowDownUp, Download, Inbox, MessageCircle, SearchX } from "lucide-react";
import type { Ticket, TicketStatus } from "../api/tickets";
import { ApiError } from "../api/client";
import { Button } from "../components/ui/Button";
import { SelectNativo } from "../components/ui/Field";
import { Skeleton } from "../components/ui/Skeleton";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/Tabs";
import { DetalheDoPedido } from "../features/painel/fila/DetalheDoPedido";
import { ModalTrocaProduto } from "../features/painel/fila/ModalTrocaProduto";
import { SeloStatus } from "../features/painel/fila/SeloStatus";
import { POR_PAGINA, useFila, type Ordenacao } from "../features/painel/fila/useFila";
import { arquivoCsv } from "../lib/csv";
import { formatarDataHora } from "../lib/formato";
import { ORDEM_STATUS, numeroTicket } from "../lib/ticket";
import { montarLinkWhatsApp, montarMensagem } from "../lib/whatsapp";

const PERIODOS = [
  { valor: 0, rotulo: "Todo o período" },
  { valor: 7, rotulo: "Últimos 7 dias" },
  { valor: 30, rotulo: "Últimos 30 dias" },
  { valor: 90, rotulo: "Últimos 90 dias" },
];

function resumoItens(ticket: Ticket): string {
  return ticket.items.map((i) => `${i.quantity}x ${i.ledModelName}`).join(", ");
}

export default function TicketQueue() {
  const navigate = useNavigate();
  const { id: idNaRota } = useParams<{ id: string }>();
  const [params, setParams] = useSearchParams();

  const [status, setStatus] = useState<TicketStatus | "TODOS">("TODOS");
  const [dias, setDias] = useState(0);
  const [ordem, setOrdem] = useState<Ordenacao>("recentes");
  const [pagina, setPagina] = useState(1);
  const [trocando, setTrocando] = useState<Ticket | null>(null);

  const termo = params.get("q") ?? "";

  const fila = useFila({ status, dias, termo, ordem, pagina });
  const selecionado = useMemo(
    () => fila.filtrados.find((t) => t.id === idNaRota) ?? null,
    [fila.filtrados, idNaRota]
  );

  function abrir(ticket: Ticket) {
    navigate(`/painel/tickets/${ticket.id}${params.toString() ? `?${params}` : ""}`);
  }

  function fecharDetalhe() {
    navigate(`/painel/tickets${params.toString() ? `?${params}` : ""}`);
  }

  function exportar() {
    const url = URL.createObjectURL(arquivoCsv(fila.filtrados));
    const link = document.createElement("a");
    link.href = url;
    link.download = `pedidos-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-5">
      <Tabs
        value={status}
        onValueChange={(v) => {
          setStatus(v as TicketStatus | "TODOS");
          setPagina(1);
        }}
      >
        <TabsList rotulo="Filtrar por situação" className="max-w-full overflow-x-auto">
          <TabsTrigger value="TODOS" contador={fila.contadores.TODOS}>
            Todos
          </TabsTrigger>
          {ORDEM_STATUS.map((s) => (
            <TabsTrigger key={s} value={s} contador={fila.contadores[s]}>
              {s === "PENDENTE"
                ? "Novos"
                : s === "CONFIRMADO"
                  ? "Em atendimento"
                  : s === "CONCLUIDO"
                    ? "Concluídos"
                    : "Cancelados"}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-48">
          <SelectNativo
            rotulo="Período"
            rotuloOculto
            value={dias}
            onChange={(e) => {
              setDias(Number(e.target.value));
              setPagina(1);
            }}
          >
            {PERIODOS.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.rotulo}
              </option>
            ))}
          </SelectNativo>
        </div>

        <Button
          variante="secundario"
          Icone={ArrowDownUp}
          onClick={() => setOrdem((o) => (o === "recentes" ? "antigos" : "recentes"))}
        >
          {ordem === "recentes" ? "Mais recentes" : "Mais antigos"}
        </Button>

        {/* Busca no celular: no desktop ela mora na topbar. */}
        <div className="w-full sm:hidden">
          <input
            value={termo}
            onChange={(e) => {
              const proximos = new URLSearchParams(params);
              if (e.target.value) {
                proximos.set("q", e.target.value);
              } else {
                proximos.delete("q");
              }
              setParams(proximos, { replace: true });
              setPagina(1);
            }}
            type="search"
            aria-label="Buscar pedido por número, e-mail, telefone ou produto"
            placeholder="Buscar pedido…"
            className="h-11 w-full rounded-[var(--radius-sm)] border border-line-strong bg-surface px-3.5 text-[14px] text-ink placeholder:text-subtle"
          />
        </div>

        <Button
          variante="secundario"
          Icone={Download}
          onClick={exportar}
          disabled={fila.filtrados.length === 0}
          className="sm:ml-auto"
        >
          Exportar CSV
        </Button>
      </div>

      {fila.isLoading && (
        <div aria-busy className="flex flex-col gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      )}

      {fila.isError && (
        <div
          role="alert"
          className="rounded-[var(--radius-md)] border border-danger/35 bg-danger-bg p-5"
        >
          <h2 className="text-[15px] font-bold text-danger">Não conseguimos carregar a fila</h2>
          <p className="mt-1.5 text-[13.5px] text-danger/90">
            {fila.error instanceof ApiError ? fila.error.message : "Tente novamente."}
          </p>
          <Button variante="secundario" className="mt-4" onClick={() => void fila.refetch()}>
            Tentar de novo
          </Button>
        </div>
      )}

      {fila.data && fila.filtrados.length === 0 && (
        <div className="rounded-[var(--radius-md)] border border-line bg-surface p-10 text-center">
          <span
            aria-hidden
            className="mx-auto grid size-14 place-items-center rounded-full bg-sunken text-subtle"
          >
            {termo || dias > 0 || status !== "TODOS" ? (
              <SearchX className="size-7" />
            ) : (
              <Inbox className="size-7" />
            )}
          </span>
          <h2 className="mt-5 text-lg font-bold tracking-[-0.015em] text-ink">
            {termo || dias > 0 || status !== "TODOS"
              ? "Nenhum pedido com esses filtros"
              : "Nenhum pedido ainda"}
          </h2>
          <p className="mx-auto mt-1.5 max-w-[44ch] text-[14px] leading-relaxed text-muted">
            {termo || dias > 0 || status !== "TODOS"
              ? "Troque a situação, amplie o período ou limpe a busca."
              : "Quando um cliente gerar uma reserva, ela aparece aqui."}
          </p>
        </div>
      )}

      {fila.visiveis.length > 0 && (
        <>
          {/* Desktop: tabela. */}
          <div className="hidden overflow-hidden rounded-[var(--radius-md)] border border-line bg-surface lg:block">
            <table className="w-full table-fixed border-collapse text-left">
              <colgroup>
                <col className="w-28" />
                <col className="w-56" />
                <col className="w-44" />
                <col />
                <col className="w-32" />
                <col className="w-40" />
                <col className="w-16" />
              </colgroup>
              <thead>
                <tr className="border-b border-line bg-sunken">
                  {["Pedido", "Cliente", "Veículo", "Itens", "Criado", "Situação", ""].map(
                    (coluna) => (
                      <th
                        key={coluna}
                        scope="col"
                        className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wider text-subtle"
                      >
                        {coluna}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {fila.visiveis.map((ticket) => {
                  const link = ticket.customerPhone
                    ? montarLinkWhatsApp(ticket.customerPhone, montarMensagem(ticket))
                    : null;
                  return (
                    <tr
                      key={ticket.id}
                      className="cursor-pointer border-b border-line last:border-0 transition-colors hover:bg-sunken"
                      onClick={() => abrir(ticket)}
                    >
                      <td className="whitespace-nowrap px-4 py-3">
                        <button
                          type="button"
                          className="font-mono text-[13.5px] font-bold text-brand-600"
                        >
                          {numeroTicket(ticket.id)}
                        </button>
                      </td>
                      <td className="truncate px-4 py-3 text-[13.5px] text-ink">
                        {ticket.userEmail}
                      </td>
                      <td className="px-4 py-3 text-[13.5px] text-ink">
                        {ticket.vehicle ? (
                          `${ticket.vehicle.make} ${ticket.vehicle.model} ${ticket.vehicle.year}`
                        ) : (
                          <span className="text-subtle">—</span>
                        )}
                      </td>
                      <td className="truncate px-4 py-3 text-[13.5px] text-muted">
                        {resumoItens(ticket)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-muted">
                        {formatarDataHora(ticket.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <SeloStatus status={ticket.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {link && (
                          <a
                            href={link}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Falar no WhatsApp sobre ${numeroTicket(ticket.id)}`}
                            className="inline-flex size-9 items-center justify-center rounded-[var(--radius-sm)] bg-[#25d366]/15 text-[#128c4a] hover:bg-[#25d366]/25"
                          >
                            <MessageCircle aria-hidden className="size-4" />
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Celular: cartões, porque tabela densa não cabe. */}
          <ul className="flex flex-col gap-2.5 lg:hidden">
            {fila.visiveis.map((ticket) => (
              <li key={ticket.id}>
                <button
                  type="button"
                  onClick={() => abrir(ticket)}
                  className="w-full rounded-[var(--radius-md)] border border-line bg-surface p-4 text-left"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      data-numeros
                      className="font-mono text-[14px] font-bold text-brand-600"
                    >
                      {numeroTicket(ticket.id)}
                    </span>
                    <SeloStatus status={ticket.status} />
                  </div>
                  <p className="mt-2 truncate text-[13.5px] text-ink">{ticket.userEmail}</p>
                  {ticket.vehicle && (
                    <p className="mt-0.5 truncate text-[13px] text-muted">
                      {ticket.vehicle.make} {ticket.vehicle.model} {ticket.vehicle.year}
                    </p>
                  )}
                  <p className="mt-1.5 line-clamp-2 text-[13px] text-muted">
                    {resumoItens(ticket)}
                  </p>
                  <p className="mt-2 text-[12.5px] text-subtle">
                    {formatarDataHora(ticket.createdAt)}
                  </p>
                </button>
              </li>
            ))}
          </ul>

          {fila.paginas > 1 && (
            <nav
              aria-label="Paginação da fila"
              className="flex items-center justify-between gap-3"
            >
              <p className="text-[13px] text-muted">
                <span data-numeros>
                  {(fila.pagina - 1) * POR_PAGINA + 1}–
                  {Math.min(fila.pagina * POR_PAGINA, fila.filtrados.length)}
                </span>{" "}
                de <span data-numeros>{fila.filtrados.length}</span>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variante="secundario"
                  tamanho="sm"
                  disabled={fila.pagina <= 1}
                  onClick={() => setPagina((p) => p - 1)}
                >
                  Anterior
                </Button>
                <span data-numeros className="text-[13px] font-semibold text-ink">
                  {fila.pagina} / {fila.paginas}
                </span>
                <Button
                  variante="secundario"
                  tamanho="sm"
                  disabled={fila.pagina >= fila.paginas}
                  onClick={() => setPagina((p) => p + 1)}
                >
                  Próxima
                </Button>
              </div>
            </nav>
          )}
        </>
      )}

      <DetalheDoPedido
        ticket={selecionado}
        onFechar={fecharDetalhe}
        onTrocar={(ticket) => setTrocando(ticket)}
      />
      <ModalTrocaProduto ticket={trocando} onFechar={() => setTrocando(null)} />
    </div>
  );
}
