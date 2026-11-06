import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import type { DemandSummary } from "../api/analytics";
import Dashboard from "./Dashboard";
import { mockarApi, renderizarComProvedores, sessaoDe } from "../test/render";

function resumo(sobrescreve: Partial<DemandSummary> = {}): DemandSummary {
  return {
    periodDays: 30,
    totals: {
      searches: 120,
      searchesWithoutResult: 18,
      tickets: 30,
      // Fração, não percentual: o serviço faz tickets / searches.
      conversionRate: 0.25,
    },
    searchesPerDay: [
      { day: "2026-11-01", count: 4 },
      { day: "2026-11-02", count: 0 },
      { day: "2026-11-03", count: 7 },
    ],
    topProducts: [
      { ledModelId: "led-1", sku: "SLL-140004", name: "Ultraled Infinity", totalReserved: 12 },
    ],
    criticalStock: [
      { ledModelId: "led-2", sku: "SLL-120004", name: "S16 T10", stockQty: 1, stockMin: 5 },
    ],
    topVehicles: [
      { make: "VOLKSWAGEN", model: "GOL", searchCount: 40, withoutResultCount: 9 },
    ],
    ...sobrescreve,
  };
}

function montar(corpo: unknown, ok = true, status = 200) {
  mockarApi((caminho) =>
    caminho === "/auth/me"
      ? sessaoDe("rep")
      : { ok, status, corpo }
  );
  return renderizarComProvedores(<Dashboard />, { rota: "/painel/demanda" });
}

function noRanking(titulo: string) {
  const tabela = screen
    .getAllByRole("table")
    .find((t) => within(t).queryByText(titulo) !== null);
  return within(tabela ?? screen.getAllByRole("table")[0]);
}

describe("Dashboard", () => {
  it("mostra os KPIs com os totais do período", async () => {
    montar({ summary: resumo() });

    expect(await screen.findByText("120")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
  });

  it("formata a conversão como porcentagem em pt-BR", async () => {
    montar({ summary: resumo() });

    // 0,25 é fração: tem que sair 25%, não 0,25%.
    expect(await screen.findByText("25%")).toBeInTheDocument();
  });

  it("mostra os três rankings com os valores da API", async () => {
    montar({ summary: resumo() });

    expect(await screen.findByText("Ultraled Infinity")).toBeInTheDocument();
    expect(screen.getByText("VOLKSWAGEN GOL")).toBeInTheDocument();
    expect(screen.getByText("S16 T10")).toBeInTheDocument();
  });

  it("cada ranking é uma tabela de verdade, legível por leitor de tela", async () => {
    montar({ summary: resumo() });

    await screen.findByText("Ultraled Infinity");
    const tabelas = screen.getAllByRole("table");
    expect(tabelas).toHaveLength(3);
    // O rótulo é cabeçalho da linha: o leitor de tela anuncia item e valor.
    expect(noRanking("Ultraled Infinity").getByRole("rowheader")).toHaveTextContent(
      "Ultraled Infinity"
    );
  });

  it("destaca quantas buscas do veículo não acharam LED, que é a lacuna da matriz", async () => {
    montar({ summary: resumo() });

    await screen.findByText("VOLKSWAGEN GOL");
    expect(screen.getByText("sem resultado")).toBeInTheDocument();
    expect(noRanking("VOLKSWAGEN GOL").getByText("9")).toBeInTheDocument();
  });

  it("desenha a série de buscas por dia", async () => {
    montar({ summary: resumo() });

    expect(
      await screen.findByRole("heading", { name: "Buscas por dia" })
    ).toBeInTheDocument();
  });

  it("explica o gráfico vazio em vez de desenhar uma linha reta", async () => {
    montar({
      summary: resumo({
        searchesPerDay: [
          { day: "2026-11-01", count: 0 },
          { day: "2026-11-02", count: 0 },
        ],
      }),
    });

    expect(await screen.findByText(/Nenhuma busca de compatibilidade/)).toBeInTheDocument();
  });

  it("avisa quando um ranking não tem dado", async () => {
    montar({ summary: resumo({ topProducts: [], criticalStock: [], topVehicles: [] }) });

    expect(
      await screen.findByText("Nenhum produto reservado neste período.")
    ).toBeInTheDocument();
    expect(screen.getByText("Nenhum produto abaixo do mínimo.")).toBeInTheDocument();
  });

  it("mostra o erro que a API devolveu", async () => {
    montar({ error: "Analytics fora do ar." }, false, 500);

    expect(await screen.findByText("Analytics fora do ar.")).toBeInTheDocument();
  });

  it("troca o período e pede o novo recorte à API", async () => {
    const chamadas = mockarApi((caminho) =>
      caminho === "/auth/me"
        ? sessaoDe("rep")
        : { ok: true, status: 200, corpo: { summary: resumo() } }
    );

    renderizarComProvedores(<Dashboard />, { rota: "/painel/demanda" });
    await screen.findByText("Ultraled Infinity");
    expect(chamadas.some((c) => c.includes("days=30"))).toBe(true);

    // Radix Tabs ativa no mousedown, não no click.
    fireEvent.mouseDown(screen.getByRole("tab", { name: "7 dias" }));

    await waitFor(() => {
      expect(chamadas.some((c) => c.includes("days=7"))).toBe(true);
    });
  });
});
