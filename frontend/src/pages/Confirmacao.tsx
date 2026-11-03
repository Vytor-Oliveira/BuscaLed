import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { CompatibleLed, LightingPosition, ROTULO_POSICAO } from "../api/compatibility";
import { ApiError } from "../api/client";
import { createTicket, numeroTicket } from "../api/tickets";
import { useAuth } from "../auth/AuthContext";
import { SiteHeader } from "../components/SiteHeader";
import { IconeLampada } from "../components/Icones";

interface EstadoNavegacao {
  veiculo: { make: string; model: string; year: number };
  itens: Array<{ position: LightingPosition; led: CompatibleLed }>;
}

export default function Confirmacao() {
  const { state } = useLocation();
  const { user } = useAuth();
  const dados = state as EstadoNavegacao | null;

  const [telefone, setTelefone] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [criado, setCriado] = useState<string | null>(null);

  // Chegar aqui sem seleção só acontece por URL digitada ou refresh — o
  // estado vive na navegação, não na URL.
  if (!dados || dados.itens.length === 0) {
    return <Navigate to="/" replace />;
  }

  async function enviar(event: React.FormEvent) {
    event.preventDefault();
    setEnviando(true);
    setErro("");
    try {
      const { ticket } = await createTicket(
        dados!.itens.map((item) => ({
          ledModelId: item.led.ledModelId,
          position: item.position,
          quantity: 1,
        })),
        telefone.trim() || undefined
      );
      setCriado(ticket.id);
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível enviar o pedido.");
    } finally {
      setEnviando(false);
    }
  }

  if (criado) {
    return (
      <>
        <SiteHeader />
        <main className="site-conteudo sucesso">
          <div className="cartao sucesso-cartao">
            <span className="sucesso-marca">✓</span>
            <h2>Pedido enviado!</h2>
            <p className="subtitulo">
              O representante da Shocklight recebeu seu pedido por e-mail e vai entrar em contato.
            </p>
            <p className="sucesso-numero">{numeroTicket(criado)}</p>
            <Link to="/pedidos" className="botao-primario">
              Ver Meus Pedidos
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader />

      <main className="site-conteudo">
        <div className="pagina-topo">
          <div>
            <h2>Confirmar pedido</h2>
            <p className="subtitulo">Revise antes de enviar ao representante.</p>
          </div>
        </div>

        {erro && (
          <p role="alert" className="mensagem-erro">
            {erro}
          </p>
        )}

        <div className="grade-confirmacao">
          <section className="cartao-painel">
            <h3>RESUMO DO PEDIDO</h3>
            <div className="cartao-painel-corpo">
              <ul className="lista-resumo">
                {dados.itens.map((item) => (
                  <li key={item.position}>
                    <span className="produto-icone">
                      <IconeLampada tamanho={18} />
                    </span>
                    <div>
                      <strong>{item.led.name}</strong>
                      <small>{item.led.sku}</small>
                      <span className="selo selo-pendente">
                        {ROTULO_POSICAO[item.position]}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              <dl className="lista-atributos">
                <div>
                  <dt>Veículo</dt>
                  <dd>
                    {dados.veiculo.make} {dados.veiculo.model} {dados.veiculo.year}
                  </dd>
                </div>
                <div>
                  <dt>Encaixes</dt>
                  <dd>{[...new Set(dados.itens.map((i) => i.led.socketCode))].join(", ")}</dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="cartao-painel">
            <h3>SEUS DADOS</h3>
            <form className="cartao-painel-corpo formulario" onSubmit={enviar}>
              <label htmlFor="nome">Nome</label>
              <input id="nome" value={user?.name ?? ""} readOnly />

              <label htmlFor="email">E-mail</label>
              <input id="email" value={user?.email ?? ""} readOnly />

              <label htmlFor="telefone">Telefone (WhatsApp)</label>
              <input
                id="telefone"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(47) 99999-0000"
                inputMode="tel"
              />

              {/* O mockup tem "Observações", mas o ticket ainda não guarda
                  texto livre — campo omitido para não descartar o que a
                  pessoa escrevesse. */}

              <button type="submit" className="botao-primario botao-largo" disabled={enviando}>
                {enviando ? "Enviando…" : "Confirmar e enviar pedido"}
              </button>
            </form>
          </section>
        </div>

        <p className="aviso-privacidade">
          Seus dados são utilizados apenas para contato do representante.
        </p>
      </main>
    </>
  );
}
