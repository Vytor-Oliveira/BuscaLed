import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../api/client";
import { LedModel, listLedModels, restock } from "../api/catalog";
import { IconeLampada, IconeMais } from "../components/Icones";

type Situacao = "disponivel" | "baixo" | "esgotado";

function situacaoDe(produto: LedModel): Situacao {
  if (produto.stockQty === 0) {
    return "esgotado";
  }
  return produto.stockQty <= produto.stockMin ? "baixo" : "disponivel";
}

const SELO: Record<Situacao, { texto: string; classe: string }> = {
  disponivel: { texto: "Disponível", classe: "selo-concluido" },
  baixo: { texto: "Estoque baixo", classe: "selo-confirmado" },
  esgotado: { texto: "Esgotado", classe: "selo-cancelado" },
};

export default function Stock() {
  const [produtos, setProdutos] = useState<LedModel[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [quantidades, setQuantidades] = useState<Record<string, string>>({});
  const [reponho, setReponho] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const { ledModels } = await listLedModels();
      setProdutos(ledModels);
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível carregar o catálogo.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function repor(produto: LedModel) {
    const quantidade = Number(quantidades[produto.id]);
    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      setErro("Informe uma quantidade inteira maior que zero.");
      return;
    }

    setReponho(produto.id);
    setErro("");
    try {
      const { stock } = await restock(produto.id, quantidade);
      setProdutos((atuais) =>
        atuais.map((p) => (p.id === stock.ledModelId ? { ...p, stockQty: stock.stockQty } : p))
      );
      setQuantidades((atuais) => ({ ...atuais, [produto.id]: "" }));
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível repor o estoque.");
    } finally {
      setReponho(null);
    }
  }

  const abaixoDoMinimo = produtos.filter((p) => situacaoDe(p) !== "disponivel").length;

  return (
    <section>
      <div className="pagina-topo">
        <div>
          <h2>Catálogo de Produtos</h2>
          <p className="subtitulo">
            {carregando
              ? "Carregando…"
              : `Gerencie estoque por produto · ${produtos.length} produtos` +
                (abaixoDoMinimo > 0 ? ` · ${abaixoDoMinimo} abaixo do mínimo` : "")}
          </p>
        </div>
        <button
          type="button"
          className="botao-primario"
          disabled
          title="Cadastro de produto ainda não disponível nesta tela"
        >
          <IconeMais tamanho={14} />
          Adicionar produto
        </button>
      </div>

      {erro && (
        <p role="alert" className="mensagem-erro">
          {erro}
        </p>
      )}

      {carregando && <p className="estado-carregando">Carregando catálogo…</p>}

      {!carregando && produtos.length === 0 && (
        <p className="estado-vazio">Nenhum produto cadastrado.</p>
      )}

      <ul className="lista-produtos">
        {produtos.map((produto) => {
          const situacao = situacaoDe(produto);
          const selo = SELO[situacao];

          return (
            <li
              key={produto.id}
              className={
                situacao === "disponivel" ? "produto-linha" : `produto-linha produto-${situacao}`
              }
            >
              <span className="produto-icone">
                <IconeLampada tamanho={20} />
              </span>

              <div>
                <p className="produto-nome">{produto.name}</p>
                <div className="produto-meta">
                  <span className="etiqueta-encaixe">{produto.socketCode}</span>
                  <small className="celula-sub">{produto.sku}</small>
                </div>
              </div>

              <span className={`selo ${selo.classe}`}>{selo.texto}</span>

              <div className="produto-quantidade">
                <strong>{produto.stockQty}</strong>
                <small>em estoque · mín. {produto.stockMin}</small>
              </div>

              <div className="produto-meta">
                <input
                  type="number"
                  min={1}
                  className="campo-repor"
                  aria-label={`Quantidade a repor de ${produto.sku}`}
                  value={quantidades[produto.id] ?? ""}
                  onChange={(e) =>
                    setQuantidades((atuais) => ({ ...atuais, [produto.id]: e.target.value }))
                  }
                />
                <button
                  type="button"
                  className="botao-contorno-azul"
                  onClick={() => repor(produto)}
                  disabled={reponho === produto.id}
                >
                  + Repor
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
