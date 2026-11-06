import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../api/client";
import {
  LedModel,
  createLedModel,
  listLedModels,
  restock,
  updateMinimum,
} from "../api/catalog";
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
  const [formAberto, setFormAberto] = useState(false);
  const [criando, setCriando] = useState(false);
  const [novo, setNovo] = useState({ sku: "", name: "", socketCode: "", stockQty: "", stockMin: "" });
  const [minimos, setMinimos] = useState<Record<string, string>>({});

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

  // RF13 — o minimo e o que dispara o alerta de estoque baixo, entao ele e
  // editavel por produto. Salva no blur, nao a cada tecla.
  async function salvarMinimo(produto: LedModel, valor: string) {
    const minimo = Number(valor);
    if (valor === "" || !Number.isInteger(minimo) || minimo < 0 || minimo === produto.stockMin) {
      setMinimos((atuais) => ({ ...atuais, [produto.id]: "" }));
      return;
    }

    setErro("");
    try {
      const { stock } = await updateMinimum(produto.id, minimo);
      setProdutos((atuais) =>
        atuais.map((p) => (p.id === stock.ledModelId ? { ...p, stockMin: stock.stockMin } : p))
      );
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Nao foi possivel salvar o minimo.");
    } finally {
      setMinimos((atuais) => ({ ...atuais, [produto.id]: "" }));
    }
  }

  async function cadastrar(event: React.FormEvent) {
    event.preventDefault();
    setCriando(true);
    setErro("");
    try {
      const { ledModel } = await createLedModel({
        sku: novo.sku.trim(),
        name: novo.name.trim(),
        socketCode: novo.socketCode.trim().toUpperCase(),
        stockQty: novo.stockQty === "" ? undefined : Number(novo.stockQty),
        stockMin: novo.stockMin === "" ? undefined : Number(novo.stockMin),
      });
      setProdutos((atuais) =>
        [...atuais, ledModel].sort((a, b) => a.sku.localeCompare(b.sku))
      );
      setFormAberto(false);
      setNovo({ sku: "", name: "", socketCode: "", stockQty: "", stockMin: "" });
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível cadastrar o produto.");
    } finally {
      setCriando(false);
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
          onClick={() => setFormAberto((aberto) => !aberto)}
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

      {formAberto && (
        <form className="cartao form-produto" onSubmit={cadastrar}>
          <label>
            SKU
            <input
              value={novo.sku}
              onChange={(e) => setNovo({ ...novo, sku: e.target.value })}
              placeholder="SHK-S14-H4"
              required
            />
          </label>
          <label>
            Nome
            <input
              value={novo.name}
              onChange={(e) => setNovo({ ...novo, name: e.target.value })}
              placeholder="Headlight S14 Nano"
              required
            />
          </label>
          <label>
            Encaixe
            <input
              value={novo.socketCode}
              onChange={(e) => setNovo({ ...novo, socketCode: e.target.value })}
              placeholder="H4"
              required
            />
          </label>
          <label>
            Estoque inicial
            <input
              type="number"
              min={0}
              value={novo.stockQty}
              onChange={(e) => setNovo({ ...novo, stockQty: e.target.value })}
              placeholder="0"
            />
          </label>
          <label>
            Mínimo
            <input
              type="number"
              min={0}
              value={novo.stockMin}
              onChange={(e) => setNovo({ ...novo, stockMin: e.target.value })}
              placeholder="0"
            />
          </label>
          <button type="submit" className="botao-primario" disabled={criando}>
            {criando ? "Salvando…" : "Salvar produto"}
          </button>
        </form>
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
                <small>em estoque</small>
              </div>

              <div className="produto-meta">
                <label className="campo-minimo">
                  mín.
                  <input
                    type="number"
                    min={0}
                    aria-label={`Nível mínimo de ${produto.sku}`}
                    value={minimos[produto.id] ?? String(produto.stockMin)}
                    onChange={(e) =>
                      setMinimos((atuais) => ({ ...atuais, [produto.id]: e.target.value }))
                    }
                    onBlur={(e) => salvarMinimo(produto, e.target.value)}
                  />
                </label>
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
