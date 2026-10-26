import { useCallback, useEffect, useState } from "react";
import { DemandSummary, getDemandSummary } from "../api/analytics";
import { ApiError } from "../api/client";
import { BarRanking } from "../components/BarRanking";
import { LineChart } from "../components/LineChart";
import {
  IconeAlerta,
  IconeBusca,
  IconeDashboard,
  IconeLampada,
  IconeTicket,
} from "../components/Icones";

const PERIODOS = [7, 30, 90];

function Metrica({
  icone,
  valor,
  rotulo,
  compacto,
}: {
  icone: React.ReactNode;
  valor: string;
  rotulo: string;
  compacto?: boolean;
}) {
  return (
    <div className="metrica">
      <div className="metrica-topo">
        <span className="metrica-icone">{icone}</span>
      </div>
      <div className={compacto ? "metrica-valor metrica-valor-compacto" : "metrica-valor"}>
        {valor}
      </div>
      <div className="metrica-rotulo">{rotulo}</div>
    </div>
  );
}

export default function Dashboard() {
  const [resumo, setResumo] = useState<DemandSummary | null>(null);
  const [dias, setDias] = useState(30);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async (periodo: number) => {
    setCarregando(true);
    setErro("");
    try {
      const { summary } = await getDemandSummary(periodo);
      setResumo(summary);
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível carregar a demanda.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar(dias);
  }, [carregar, dias]);

  if (erro) {
    return (
      <p role="alert" className="mensagem-erro">
        {erro}
      </p>
    );
  }

  if (carregando && !resumo) {
    return <p className="estado-carregando">Carregando demanda…</p>;
  }

  if (!resumo) {
    return <p className="estado-vazio">Sem dados de demanda.</p>;
  }

  const topProduto = resumo.topProducts[0];

  return (
    <section>
      <div className="pagina-topo">
        <div>
          <h2>Dashboard</h2>
          <p className="subtitulo">Inteligência de demanda · Shocklight SC</p>
        </div>
        <div className="filtros" role="group" aria-label="Período">
          {PERIODOS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setDias(p)}
              className={dias === p ? "chip chip-ativo" : "chip"}
            >
              {p}d
            </button>
          ))}
        </div>
      </div>

      <div className="grade-metricas">
        <Metrica
          icone={<IconeBusca tamanho={16} />}
          valor={String(resumo.totals.searches)}
          rotulo="Buscas"
        />
        <Metrica
          icone={<IconeTicket tamanho={16} />}
          valor={String(resumo.totals.tickets)}
          rotulo="Tickets"
        />
        <Metrica
          icone={<IconeDashboard tamanho={16} />}
          valor={`${Math.round(resumo.totals.conversionRate * 100)}%`}
          rotulo="Conversão"
        />
        <Metrica
          icone={<IconeLampada tamanho={16} />}
          valor={topProduto ? topProduto.name : "—"}
          rotulo="Produto mais pedido"
          compacto
        />
      </div>

      <div className="cartao" style={{ marginBottom: 14 }}>
        <div className="cartao-titulo">
          <h3>Buscas por dia</h3>
          <span className="celula-sub">últimos {resumo.periodDays} dias</span>
        </div>
        <LineChart pontos={resumo.searchesPerDay} rotulo="Buscas" />
      </div>

      <div className="grade-rankings">
        <BarRanking
          titulo="Top produtos pedidos"
          descricao="Soma das quantidades reservadas no histórico, sem contar pedidos cancelados."
          rotuloValor="Unidades"
          vazio="Nenhum pedido registrado ainda."
          itens={resumo.topProducts.map((p) => ({
            id: p.ledModelId,
            rotulo: p.name,
            detalhe: p.sku,
            valor: p.totalReserved,
          }))}
        />

        <BarRanking
          titulo="Top modelos pesquisados"
          descricao="Buscas por marca e modelo no histórico. O detalhe mostra quantas não acharam nenhum LED — essas apontam lacuna na matriz."
          rotuloValor="Buscas"
          vazio="Nenhuma busca registrada ainda."
          itens={resumo.topVehicles.map((v) => ({
            id: `${v.make}-${v.model}`,
            rotulo: `${v.make} ${v.model}`,
            detalhe:
              v.withoutResultCount > 0 ? `${v.withoutResultCount} sem resultado` : undefined,
            valor: v.searchCount,
          }))}
        />

        <BarRanking
          titulo="Estoque crítico"
          descricao="Produtos com quantidade igual ou abaixo do mínimo configurado."
          rotuloValor="Em estoque"
          vazio="Nenhum produto abaixo do mínimo."
          itens={resumo.criticalStock.map((p) => ({
            id: p.ledModelId,
            rotulo: p.name,
            detalhe: `${p.sku} · mínimo ${p.stockMin}`,
            valor: p.stockQty,
          }))}
        />

        <section className="cartao">
          <div className="cartao-titulo">
            <h3>Lacuna da matriz</h3>
          </div>
          <p className="ranking-descricao">
            Buscas do período que não acharam nenhum LED compatível.
          </p>
          <div className="metrica-topo">
            <span className="metrica-icone">
              <IconeAlerta tamanho={16} />
            </span>
          </div>
          <div className="metrica-valor">{resumo.totals.searchesWithoutResult}</div>
          <div className="metrica-rotulo">
            de {resumo.totals.searches} buscas nos últimos {resumo.periodDays} dias
          </div>
        </section>
      </div>
    </section>
  );
}
