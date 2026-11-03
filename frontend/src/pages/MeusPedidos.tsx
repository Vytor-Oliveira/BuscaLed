import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../api/client";
import { Ticket, TicketStatus, cancelTicket, listTickets, numeroTicket } from "../api/tickets";
import { SiteHeader } from "../components/SiteHeader";
import { IconeLampada, IconeLapis } from "../components/Icones";

const ROTULO_STATUS: Record<TicketStatus, string> = {
  PENDENTE: "Novo",
  CONFIRMADO: "Em andamento",
  CANCELADO: "Cancelado",
  CONCLUIDO: "Concluído",
};

// RN14 — o cliente só cancela enquanto o pedido está aberto.
const CANCELAVEIS: TicketStatus[] = ["PENDENTE", "CONFIRMADO"];

function formatarData(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(
    d.getMinutes()
  )}`;
}

export default function MeusPedidos() {
  const [pedidos, setPedidos] = useState<Ticket[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const { tickets } = await listTickets();
      setPedidos(tickets);
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível carregar os pedidos.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function cancelar(id: string) {
    setCancelando(id);
    setErro("");
    try {
      const { ticket } = await cancelTicket(id);
      setPedidos((atuais) => atuais.map((p) => (p.id === ticket.id ? ticket : p)));
      setConfirmando(null);
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível cancelar o pedido.");
    } finally {
      setCancelando(null);
    }
  }

  return (
    <>
      <SiteHeader />

      <main className="site-conteudo">
        <div className="pagina-topo">
          <div>
            <h2>Meus Pedidos</h2>
            <p className="subtitulo">
              {carregando ? "Carregando…" : `${pedidos.length} pedido(s)`}
            </p>
          </div>
        </div>

        {erro && (
          <p role="alert" className="mensagem-erro">
            {erro}
          </p>
        )}

        {carregando && <p className="estado-carregando">Carregando pedidos…</p>}

        {!carregando && pedidos.length === 0 && (
          <p className="estado-vazio">
            Você ainda não fez nenhum pedido. <Link to="/">Buscar o LED do meu carro</Link>
          </p>
        )}

        <ul className="lista-pedidos">
          {pedidos.map((pedido) => {
            const trocado = pedido.items.some((i) => i.originalLedModelId);
            const podeCancelar = CANCELAVEIS.includes(pedido.status);

            return (
              <li key={pedido.id} className="cartao-pedido">
                <div className="cartao-pedido-topo">
                  <strong className="celula-ticket">{numeroTicket(pedido.id)}</strong>
                  <span className={`selo selo-${pedido.status.toLowerCase()}`}>
                    {ROTULO_STATUS[pedido.status]}
                  </span>
                </div>

                <ul className="lista-itens-pedido">
                  {pedido.items.map((item) => (
                    <li key={item.id}>
                      <IconeLampada tamanho={14} />
                      {item.quantity}× {item.ledModelName}
                    </li>
                  ))}
                </ul>

                {trocado && (
                  <p className="aviso-troca">
                    <IconeLapis tamanho={13} />
                    Atualizado pelo representante
                  </p>
                )}

                <div className="cartao-pedido-rodape">
                  <small>{formatarData(pedido.createdAt)}</small>

                  {podeCancelar &&
                    (confirmando === pedido.id ? (
                      <span className="cartao-pedido-acoes">
                        <button
                          type="button"
                          className="botao-contorno-vermelho"
                          onClick={() => cancelar(pedido.id)}
                          disabled={cancelando === pedido.id}
                        >
                          Confirmar cancelamento
                        </button>
                        <button
                          type="button"
                          className="botao-secundario"
                          onClick={() => setConfirmando(null)}
                        >
                          Não
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="botao-contorno-vermelho"
                        onClick={() => setConfirmando(pedido.id)}
                      >
                        Cancelar pedido
                      </button>
                    ))}
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </>
  );
}
