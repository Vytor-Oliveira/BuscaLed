import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getDemandSummary } from "../api/analytics";
import { ApiError } from "../api/client";
import { Button } from "../components/ui/Button";
import { Skeleton } from "../components/ui/Skeleton";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/Tabs";
import { GraficoBuscas } from "../features/painel/demanda/GraficoBuscas";
import { Ranking, type LinhaDeRanking } from "../features/painel/demanda/Ranking";
import { formatarInteiro, formatarPorcento } from "../lib/formato";
import { cn } from "../lib/cn";

const PERIODOS = [7, 30, 90];

function Kpi({
  rotulo,
  valor,
  apoio,
  carregando,
}: {
  rotulo: string;
  valor: string;
  apoio?: string;
  carregando: boolean;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-line bg-surface p-4">
      <p className="text-[12px] font-semibold uppercase tracking-wider text-subtle">
        {rotulo}
      </p>
      {carregando ? (
        <Skeleton className="mt-2 h-7 w-20" />
      ) : (
        <p
          data-numeros
          className="mt-1.5 text-[clamp(1.5rem,2.4vw,1.85rem)] font-bold leading-none tracking-[-0.02em] text-ink"
        >
          {valor}
        </p>
      )}
      {apoio && <p className="mt-1.5 text-[12.5px] leading-snug text-muted">{apoio}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [dias, setDias] = useState(30);

  const consulta = useQuery({
    queryKey: ["demanda", dias],
    queryFn: () => getDemandSummary(dias).then((r) => r.summary),
  });

  const resumo = consulta.data;
  const carregando = consulta.isLoading;

  const produtos: LinhaDeRanking[] = (resumo?.topProducts ?? []).map((p) => ({
    chave: p.ledModelId,
    rotulo: p.name,
    detalhe: p.sku,
    valor: p.totalReserved,
  }));

  const veiculos: LinhaDeRanking[] = (resumo?.topVehicles ?? []).map((v) => ({
    chave: `${v.make}-${v.model}`,
    rotulo: `${v.make} ${v.model}`,
    valor: v.searchCount,
    destaque:
      v.withoutResultCount > 0
        ? { valor: v.withoutResultCount, rotulo: "sem resultado" }
        : undefined,
  }));

  const estoque: LinhaDeRanking[] = (resumo?.criticalStock ?? []).map((i) => ({
    chave: i.ledModelId,
    rotulo: i.name,
    detalhe: `${i.sku} · mínimo ${i.stockMin}`,
    valor: i.stockQty,
  }));

  return (
    <div className="flex flex-col gap-5">
      <Tabs value={String(dias)} onValueChange={(v) => setDias(Number(v))}>
        <TabsList rotulo="Período das métricas" className="w-auto">
          {PERIODOS.map((p) => (
            <TabsTrigger key={p} value={String(p)}>
              {p} dias
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {consulta.isError && (
        <div
          role="alert"
          className="rounded-[var(--radius-md)] border border-danger/35 bg-danger-bg p-5"
        >
          <h2 className="text-[15px] font-bold text-danger">
            Não conseguimos carregar as métricas
          </h2>
          <p className="mt-1.5 text-[13.5px] text-danger/90">
            {consulta.error instanceof ApiError
              ? consulta.error.message
              : "Tente novamente em instantes."}
          </p>
          <Button variante="secundario" className="mt-4" onClick={() => void consulta.refetch()}>
            Tentar de novo
          </Button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          rotulo="Buscas"
          valor={formatarInteiro(resumo?.totals.searches ?? 0)}
          apoio="Consultas de compatibilidade no período."
          carregando={carregando}
        />
        <Kpi
          rotulo="Pedidos"
          valor={formatarInteiro(resumo?.totals.tickets ?? 0)}
          apoio="Reservas geradas no período."
          carregando={carregando}
        />
        <Kpi
          rotulo="Conversão"
          valor={formatarPorcento(resumo?.totals.conversionRate ?? 0)}
          apoio="Pedidos divididos por buscas."
          carregando={carregando}
        />
        <Kpi
          rotulo="Buscas sem resultado"
          valor={formatarInteiro(resumo?.totals.searchesWithoutResult ?? 0)}
          apoio="Veículo procurado que a matriz não cobre."
          carregando={carregando}
        />
      </div>

      <section className="rounded-[var(--radius-md)] border border-line bg-surface">
        <header className="border-b border-line px-4 py-3.5">
          <h2 className="text-[15px] font-bold tracking-[-0.01em] text-ink">Buscas por dia</h2>
          <p className="mt-0.5 text-[12.5px] text-muted">
            Dias sem busca aparecem como zero, não como lacuna.
          </p>
        </header>
        <div className={cn("p-4", carregando && "animate-pulse")}>
          {carregando ? (
            <Skeleton className="h-56" />
          ) : (
            <GraficoBuscas dados={resumo?.searchesPerDay ?? []} dias={dias} />
          )}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <Ranking
          titulo="Produtos mais pedidos"
          linhas={produtos}
          sufixo="un."
          vazio="Nenhum produto reservado neste período."
          acao={{ para: "/painel/estoque", rotulo: "Catálogo" }}
        />
        <Ranking
          titulo="Veículos mais buscados"
          descricao="O trecho claro é a lacuna da matriz: busca que não achou nada."
          linhas={veiculos}
          sufixo="buscas"
          vazio="Nenhuma busca registrada neste período."
        />
        <Ranking
          titulo="Estoque crítico"
          descricao="Quantidade atual contra o mínimo configurado."
          linhas={estoque}
          sufixo="un."
          vazio="Nenhum produto abaixo do mínimo."
          acao={{ para: "/painel/estoque", rotulo: "Repor" }}
        />
      </div>
    </div>
  );
}
