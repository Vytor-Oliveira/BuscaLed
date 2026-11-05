import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  CompatibleLed,
  PositionCompatibility,
  ROTULO_POSICAO,
  buscarCompatibilidade,
} from "../api/compatibility";
import { ApiError } from "../api/client";
import { SiteHeader } from "../components/SiteHeader";
import { IconeCarro, IconeLampada } from "../components/Icones";

export interface Escolha {
  position: string;
  led: CompatibleLed;
}

export default function Vitrine() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const make = params.get("make") ?? "";
  const model = params.get("model") ?? "";
  const year = Number(params.get("year") ?? 0);

  const [posicoes, setPosicoes] = useState<PositionCompatibility[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [escolhas, setEscolhas] = useState<Record<string, CompatibleLed>>({});

  useEffect(() => {
    if (!make || !model || !Number.isInteger(year) || year === 0) {
      setErro("Informe marca, modelo e ano para buscar.");
      setCarregando(false);
      return;
    }

    let ativo = true;
    setCarregando(true);
    setErro("");
    (async () => {
      try {
        const { positions } = await buscarCompatibilidade(make, model, year);
        if (ativo) {
          setPosicoes(positions);
        }
      } catch (error) {
        if (ativo) {
          setErro(
            error instanceof ApiError
              ? error.message
              : "Não foi possível buscar a compatibilidade."
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
  }, [make, model, year]);

  // Posição sem nenhum produto cadastrado não vira cartão: não há o que
  // escolher, e mostrar vazio só confunde.
  const comProduto = useMemo(() => posicoes.filter((p) => p.models.length > 0), [posicoes]);
  const totalModelos = useMemo(
    () => comProduto.reduce((soma, p) => soma + p.models.length, 0),
    [comProduto]
  );
  const selecionados = Object.entries(escolhas);

  function alternar(position: string, led: CompatibleLed) {
    setEscolhas((atuais) => {
      const copia = { ...atuais };
      if (copia[position]?.ledModelId === led.ledModelId) {
        delete copia[position];
      } else {
        copia[position] = led;
      }
      return copia;
    });
  }

  function reservar() {
    navigate("/confirmar", {
      state: {
        veiculo: { make, model, year },
        itens: selecionados.map(([position, led]) => ({ position, led })),
      },
    });
  }

  return (
    <>
      <SiteHeader />

      <main className="site-conteudo vitrine">
        <div className="vitrine-cabecalho">
          <span className="vitrine-rotulo">RESULTADO PARA</span>
          <strong>
            {make} {model} {year || ""}
          </strong>
          {!carregando && !erro && (
            <span className="selo selo-concluido">
              {totalModelos} LED{totalModelos === 1 ? "" : "s"} compatíve
              {totalModelos === 1 ? "l" : "is"}
            </span>
          )}
        </div>

        {erro && (
          <p role="alert" className="mensagem-erro">
            {erro}
          </p>
        )}

        {carregando && <p className="estado-carregando">Buscando LEDs compatíveis…</p>}

        {!carregando && !erro && comProduto.length === 0 && (
          <p className="estado-vazio">
            Nenhum LED cadastrado para este veículo ainda. O representante foi avisado da busca.
          </p>
        )}

        {comProduto.length > 0 && (
          <>
            <div className="cartao vitrine-instrucao">
              <span className="vitrine-instrucao-icone">
                <IconeCarro tamanho={20} />
              </span>
              <div>
                <strong>ESCOLHA QUAIS TROCAR</strong>
                <p>Cada farol pode usar uma lâmpada diferente.</p>
              </div>
              <div className="vitrine-contador">
                <small>SELECIONADOS</small>
                <strong>
                  {selecionados.length} de {comProduto.length}
                </strong>
              </div>
            </div>

            {comProduto.map((posicao) => (
              <section key={posicao.position} className="vitrine-posicao">
                <h3>
                  <span className="selo selo-pendente">{ROTULO_POSICAO[posicao.position]}</span>
                  <small>{posicao.socketCodes.join(" · ")}</small>
                </h3>

                <ul className="grade-leds">
                  {posicao.models.map((led) => {
                    const escolhido = escolhas[posicao.position]?.ledModelId === led.ledModelId;
                    return (
                      <li
                        key={led.ledModelId}
                        className={escolhido ? "cartao-led cartao-led-ativo" : "cartao-led"}
                      >
                        {/* Sem foto o cartao mantem o icone: produto novo entra
                            no catalogo antes da imagem existir. */}
                        <span
                          className={
                            led.imageUrl
                              ? "cartao-led-imagem cartao-led-imagem-foto"
                              : "cartao-led-imagem"
                          }
                        >
                          {led.imageUrl ? (
                            <img src={led.imageUrl} alt="" loading="lazy" />
                          ) : (
                            <IconeLampada tamanho={26} />
                          )}
                        </span>
                        <strong>{led.name}</strong>
                        <small>
                          {led.socketCode} · {led.sku}
                        </small>

                        {led.inStock ? (
                          <button
                            type="button"
                            className={escolhido ? "botao-escolhido" : "botao-contorno-azul"}
                            onClick={() => alternar(posicao.position, led)}
                          >
                            {escolhido ? "✓ Adicionado" : "+ Adicionar"}
                          </button>
                        ) : (
                          <>
                            <span className="selo selo-cancelado">Esgotado</span>
                            <button type="button" className="botao-contorno-azul" disabled>
                              Indisponível
                            </button>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </>
        )}
      </main>

      {selecionados.length > 0 && (
        <div className="barra-reserva">
          <div>
            <small>RESERVAR JUNTO</small>
            <strong>
              {selecionados.length} LED{selecionados.length === 1 ? "" : "s"} ·{" "}
              {selecionados.map(([, led]) => led.name).join(" + ")}
            </strong>
          </div>
          <button type="button" className="botao-primario" onClick={reservar}>
            Reservar pedido →
          </button>
        </div>
      )}
    </>
  );
}
