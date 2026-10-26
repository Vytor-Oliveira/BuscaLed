import { useEffect, useState } from "react";
import { ApiError } from "../api/client";
import {
  ItemAlternative,
  Ticket,
  TicketItem,
  listItemAlternatives,
  updateTicketItem,
} from "../api/tickets";

/**
 * Troca do produto de um item do ticket (Tela 7 do RFC). As opções vêm prontas
 * do backend — mesmo encaixe e com estoque —, então a RN11 não é reimplementada
 * aqui; a lista já é só o que passaria na regra.
 */
export function ModalTrocaProduto({
  ticket,
  aoFechar,
  aoTrocar,
}: {
  ticket: Ticket;
  aoFechar: () => void;
  aoTrocar: (atualizado: Ticket) => void;
}) {
  // Ticket com um item só não tem o que escolher — vai direto pras opções.
  const [item, setItem] = useState<TicketItem | null>(
    ticket.items.length === 1 ? ticket.items[0] : null
  );
  const [opcoes, setOpcoes] = useState<ItemAlternative[]>([]);
  const [carregando, setCarregando] = useState(ticket.items.length === 1);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!item) {
      return;
    }
    let ativo = true;
    setCarregando(true);
    (async () => {
      try {
        const { alternatives } = await listItemAlternatives(ticket.id, item.id);
        if (ativo) {
          setOpcoes(alternatives);
        }
      } catch (error) {
        if (ativo) {
          setErro(
            error instanceof ApiError ? error.message : "Não foi possível carregar as opções."
          );
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    })();
    return () => {
      ativo = false;
    };
  }, [ticket.id, item]);

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") {
        aoFechar();
      }
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aoFechar]);

  async function trocar(opcao: ItemAlternative) {
    if (!item) {
      return;
    }
    setSalvando(opcao.id);
    setErro("");
    try {
      const { ticket: atualizado } = await updateTicketItem(ticket.id, item.id, opcao.id);
      aoTrocar(atualizado);
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível trocar o produto.");
      setSalvando(null);
    }
  }

  return (
    <div className="modal-fundo" onClick={aoFechar}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-troca"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cartao-titulo">
          <h3 id="titulo-troca">Trocar produto</h3>
          <button type="button" className="botao-secundario" onClick={aoFechar}>
            Fechar
          </button>
        </div>

        {item ? (
          <p className="ranking-descricao">
            Atual: <strong>{item.ledModelName}</strong> ({item.ledModelSku}). Só aparecem
            modelos do mesmo encaixe e com estoque. O cliente é avisado por e-mail.
          </p>
        ) : (
          <p className="ranking-descricao">Qual item deste pedido você quer trocar?</p>
        )}

        {erro && (
          <p role="alert" className="mensagem-erro">
            {erro}
          </p>
        )}

        {!item && (
          <ul className="lista-produtos">
            {ticket.items.map((candidato) => (
              <li key={candidato.id} className="produto-linha modal-opcao">
                <div>
                  <p className="produto-nome">{candidato.ledModelName}</p>
                  <div className="produto-meta">
                    <small className="celula-sub">
                      {candidato.quantity}× · {candidato.ledModelSku}
                    </small>
                  </div>
                </div>
                <button
                  type="button"
                  className="botao-contorno-azul"
                  onClick={() => setItem(candidato)}
                >
                  Escolher
                </button>
              </li>
            ))}
          </ul>
        )}

        {item && carregando && <p className="estado-carregando">Carregando opções…</p>}

        {item && !carregando && opcoes.length === 0 && !erro && (
          <p className="estado-vazio">Nenhum outro modelo deste encaixe com estoque.</p>
        )}

        <ul className="lista-produtos">
          {item &&
            opcoes.map((opcao) => (
            <li key={opcao.id} className="produto-linha modal-opcao">
              <div>
                <p className="produto-nome">{opcao.name}</p>
                <div className="produto-meta">
                  <span className="etiqueta-encaixe">{opcao.socketCode}</span>
                  <small className="celula-sub">{opcao.sku}</small>
                </div>
              </div>

              <div className="produto-quantidade">
                <strong>{opcao.stockQty}</strong>
                <small>em estoque</small>
              </div>

              <button
                type="button"
                className="botao-contorno-azul"
                onClick={() => trocar(opcao)}
                disabled={salvando !== null}
              >
                {salvando === opcao.id ? "Trocando…" : "Usar este"}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
