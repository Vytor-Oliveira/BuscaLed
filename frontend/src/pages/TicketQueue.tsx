import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "../api/client";
import {
  Ticket,
  TicketStatus,
  cancelTicket,
  completeTicket,
  confirmTicket,
  listTickets,
} from "../api/tickets";
import { IconeDownload, IconeLapis, IconeWhatsApp } from "../components/Icones";
import { ModalTrocaProduto } from "../components/ModalTrocaProduto";

// RN14 — só ticket aberto aceita troca de item.
const EDITAVEIS: TicketStatus[] = ["PENDENTE", "CONFIRMADO"];

const FILTROS: Array<{ rotulo: string; valor?: TicketStatus }> = [
  { rotulo: "Todos status" },
  { rotulo: "Novos", valor: "PENDENTE" },
  { rotulo: "Em andamento", valor: "CONFIRMADO" },
  { rotulo: "Concluídos", valor: "CONCLUIDO" },
  { rotulo: "Cancelados", valor: "CANCELADO" },
];

const PERIODOS = [
  { rotulo: "Tudo", dias: 0 },
  { rotulo: "7 dias", dias: 7 },
  { rotulo: "30 dias", dias: 30 },
];

const ROTULO_STATUS: Record<TicketStatus, string> = {
  PENDENTE: "Novo",
  CONFIRMADO: "Em andamento",
  CANCELADO: "Cancelado",
  CONCLUIDO: "Concluído",
};

// O deep link exige só dígitos, com código do país. Número brasileiro vem
// com 10 ou 11 dígitos (DDD + número), então o 55 entra quando falta.
export function montarLinkWhatsApp(telefone: string, mensagem?: string): string | null {
  const digitos = telefone.replace(/\D/g, "");
  if (digitos.length < 10) {
    return null;
  }
  const comPais = digitos.length <= 11 ? `55${digitos}` : digitos;
  const base = `https://wa.me/${comPais}`;
  return mensagem ? `${base}?text=${encodeURIComponent(mensagem)}` : base;
}

// RF24: o representante abre a conversa já com o contexto do pedido escrito.
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

// O backend identifica o pedido por UUID; o RFC mostra um número curto. Até
// existir sequencial no banco, o sufixo do próprio id serve de rótulo estável.
export function numeroTicket(id: string): string {
  return `TKT-${id.replace(/-/g, "").slice(-4).toUpperCase()}`;
}

function formatarData(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function paraCsv(tickets: Ticket[]): string {
  const campo = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const linhas = tickets.map((t) =>
    [
      numeroTicket(t.id),
      t.userEmail,
      t.customerPhone ?? "",
      t.items.map((i) => `${i.quantity}x ${i.ledModelName}`).join(" | "),
      new Date(t.createdAt).toISOString(),
      ROTULO_STATUS[t.status],
    ]
      .map(campo)
      .join(",")
  );
  return ["# Ticket,Cliente,Telefone,Produtos,Data,Status", ...linhas].join("\n");
}

export default function TicketQueue() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filtro, setFiltro] = useState<TicketStatus | undefined>(undefined);
  const [periodo, setPeriodo] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [agindoEm, setAgindoEm] = useState<string | null>(null);
  const [trocando, setTrocando] = useState<Ticket | null>(null);
  // Cancelar é irreversível (RN10: ticket cancelado é imutável), então pede
  // uma segunda confirmação na própria linha.
  const [confirmandoCancelamento, setConfirmandoCancelamento] = useState<string | null>(null);

  const carregar = useCallback(async (status?: TicketStatus) => {
    setCarregando(true);
    setErro("");
    try {
      const { tickets: lista } = await listTickets(status);
      setTickets(lista);
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível carregar os pedidos.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar(filtro);
  }, [carregar, filtro]);

  // O backend filtra por status; o período é recorte local sobre o que veio.
  const visiveis = useMemo(() => {
    if (periodo === 0) {
      return tickets;
    }
    const corte = Date.now() - periodo * 24 * 60 * 60 * 1000;
    return tickets.filter((t) => new Date(t.createdAt).getTime() >= corte);
  }, [tickets, periodo]);

  const ACOES = { confirmar: confirmTicket, concluir: completeTicket, cancelar: cancelTicket };

  async function agir(id: string, acao: keyof typeof ACOES) {
    setAgindoEm(id);
    setErro("");
    try {
      const { ticket } = await ACOES[acao](id);
      setTickets((atuais) => atuais.map((t) => (t.id === ticket.id ? ticket : t)));
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível atualizar o pedido.");
    } finally {
      setAgindoEm(null);
    }
  }

  function exportarCsv() {
    const blob = new Blob([paraCsv(visiveis)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pedidos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section>
      <div className="pagina-topo">
        <div>
          <h2>Fila de Pedidos</h2>
          <p className="subtitulo">
            {carregando ? "Carregando…" : `${visiveis.length} pedidos · Mais recentes primeiro`}
          </p>
        </div>
        <button
          type="button"
          className="botao-secundario"
          onClick={exportarCsv}
          disabled={visiveis.length === 0}
        >
          <IconeDownload tamanho={14} />
          Exportar CSV
        </button>
      </div>

      <div className="filtros">
        <div role="group" aria-label="Filtrar por período" className="filtros">
          {PERIODOS.map((opcao) => (
            <button
              key={opcao.rotulo}
              type="button"
              onClick={() => setPeriodo(opcao.dias)}
              className={periodo === opcao.dias ? "chip chip-ativo" : "chip"}
            >
              {opcao.rotulo}
            </button>
          ))}
        </div>

        <div role="group" aria-label="Filtrar por status" className="filtros">
          {FILTROS.map((opcao) => (
            <button
              key={opcao.rotulo}
              type="button"
              onClick={() => setFiltro(opcao.valor)}
              className={filtro === opcao.valor ? "chip chip-ativo" : "chip"}
            >
              {opcao.rotulo}
            </button>
          ))}
        </div>
      </div>

      {erro && (
        <p role="alert" className="mensagem-erro">
          {erro}
        </p>
      )}

      {carregando && <p className="estado-carregando">Carregando pedidos…</p>}

      {!carregando && visiveis.length === 0 && (
        <p className="estado-vazio">Nenhum pedido neste filtro.</p>
      )}

      {visiveis.length > 0 && (
        <div className="tabela-cartao">
          <div className="tabela-rolavel">
            <table className="tabela">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Cliente</th>
                  <th scope="col">Veículo</th>
                  <th scope="col">Produto(s)</th>
                  <th scope="col">Data</th>
                  <th scope="col">Status</th>
                  <th scope="col">Ações</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((ticket) => {
                  const link = ticket.customerPhone
                    ? montarLinkWhatsApp(ticket.customerPhone, montarMensagem(ticket))
                    : null;
                  const ocupado = agindoEm === ticket.id;

                  return (
                    <tr key={ticket.id}>
                      <td className="celula-ticket">{numeroTicket(ticket.id)}</td>

                      <td className="celula-cliente">
                        <strong>{ticket.userEmail}</strong>
                        {ticket.customerPhone && <small>{ticket.customerPhone}</small>}
                      </td>

                      <td className="aviso-dado-ausente">—</td>

                      <td>
                        {ticket.items.map((item) => (
                          <div key={item.id}>
                            {item.quantity}× {item.ledModelName}
                            {item.originalLedModelId && (
                              <small className="celula-sub">substituído pelo representante</small>
                            )}
                          </div>
                        ))}
                      </td>

                      <td>{formatarData(ticket.createdAt)}</td>

                      <td>
                        <span className={`selo selo-${ticket.status.toLowerCase()}`}>
                          {ROTULO_STATUS[ticket.status]}
                        </span>
                      </td>

                      <td>
                        <div className="celula-acoes">
                          {link && (
                            <a
                              href={link}
                              target="_blank"
                              rel="noreferrer"
                              className="acao-circular acao-whatsapp"
                              aria-label={`WhatsApp de ${ticket.userEmail}`}
                              title="Contatar cliente"
                            >
                              <IconeWhatsApp />
                            </a>
                          )}

                          <button
                            type="button"
                            className="acao-circular acao-editar"
                            onClick={() => setTrocando(ticket)}
                            disabled={!EDITAVEIS.includes(ticket.status)}
                            aria-label={`Editar produto do pedido ${numeroTicket(ticket.id)}`}
                            title="Trocar produto"
                          >
                            <IconeLapis />
                          </button>

                          {ticket.status === "PENDENTE" && (
                            <button
                              type="button"
                              className="botao-contorno-azul"
                              onClick={() => agir(ticket.id, "confirmar")}
                              disabled={ocupado}
                            >
                              Confirmar
                            </button>
                          )}
                          {ticket.status === "CONFIRMADO" && (
                            <button
                              type="button"
                              className="botao-contorno-azul"
                              onClick={() => agir(ticket.id, "concluir")}
                              disabled={ocupado}
                            >
                              Concluir
                            </button>
                          )}

                          {/* RF12 — representante e admin também cancelam. */}
                          {EDITAVEIS.includes(ticket.status) &&
                            (confirmandoCancelamento === ticket.id ? (
                              <>
                                <button
                                  type="button"
                                  className="botao-contorno-vermelho"
                                  onClick={() => agir(ticket.id, "cancelar")}
                                  disabled={ocupado}
                                >
                                  Confirmar cancelamento
                                </button>
                                <button
                                  type="button"
                                  className="botao-secundario"
                                  onClick={() => setConfirmandoCancelamento(null)}
                                >
                                  Não
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                className="botao-contorno-vermelho"
                                onClick={() => setConfirmandoCancelamento(ticket.id)}
                                disabled={ocupado}
                              >
                                Cancelar
                              </button>
                            ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {trocando && (
        <ModalTrocaProduto
          ticket={trocando}
          aoFechar={() => setTrocando(null)}
          aoTrocar={(atualizado) => {
            setTickets((atuais) =>
              atuais.map((t) => (t.id === atualizado.id ? atualizado : t))
            );
            setTrocando(null);
          }}
        />
      )}
    </section>
  );
}
