import { render, screen, waitFor, within } from "@testing-library/react";
import Dashboard from "./Dashboard";

// "Buscas" também é cabeçalho da tabela do gráfico, então a busca é pelo
// rótulo do card, não pelo texto solto.
function cartaoMetrica(rotulo: string): HTMLElement {
  const alvo = screen
    .getAllByText(rotulo)
    .find((el) => el.classList.contains("metrica-rotulo"));
  return alvo!.closest(".metrica") as HTMLElement;
}

const resumo = {
  periodDays: 30,
  totals: { searches: 47, searchesWithoutResult: 9, tickets: 8, conversionRate: 0.17 },
  searchesPerDay: [
    { day: "2026-10-01", count: 3 },
    { day: "2026-10-02", count: 7 },
    { day: "2026-10-03", count: 5 },
  ],
  topProducts: [
    { ledModelId: "led-1", sku: "SHK-S14-H4", name: "Headlight S14", totalReserved: 12 },
    { ledModelId: "led-2", sku: "SHK-S16-H7", name: "Ultraled S16", totalReserved: 3 },
  ],
  criticalStock: [
    { ledModelId: "led-3", sku: "SHK-S17-H1", name: "Ultraled S17", stockQty: 1, stockMin: 5 },
  ],
  topVehicles: [
    { make: "VOLKSWAGEN", model: "SAVEIRO", searchCount: 9, withoutResultCount: 4 },
    { make: "FORD", model: "KA", searchCount: 2, withoutResultCount: 0 },
  ],
};

function mockFetch(resposta: unknown, ok = true, status = 200) {
  globalThis.fetch = (() =>
    Promise.resolve({ ok, status, json: () => Promise.resolve(resposta) })) as unknown as typeof fetch;
}

describe("Dashboard", () => {
  it("mostra os cards de métrica com os totais do período", async () => {
    mockFetch({ summary: resumo });
    render(<Dashboard />);

    expect(await screen.findByText("Buscas por dia")).toBeInTheDocument();
    expect(within(cartaoMetrica("Buscas")).getByText("47")).toBeInTheDocument();
    expect(within(cartaoMetrica("Tickets")).getByText("8")).toBeInTheDocument();
    // conversionRate 0.17 vira 17%.
    expect(within(cartaoMetrica("Conversão")).getByText("17%")).toBeInTheDocument();
    expect(
      within(cartaoMetrica("Produto mais pedido")).getByText("Headlight S14")
    ).toBeInTheDocument();
  });

  it("mostra os três rankings com os valores da API", async () => {
    mockFetch({ summary: resumo });
    render(<Dashboard />);

    expect(await screen.findByText("Top produtos pedidos")).toBeInTheDocument();
    expect(screen.getByText("Top modelos pesquisados")).toBeInTheDocument();
    expect(screen.getByText("Estoque crítico")).toBeInTheDocument();

    // O produto top aparece duas vezes por design: no card de métrica e no ranking.
    expect(screen.getAllByText("Headlight S14")).toHaveLength(2);
    expect(screen.getByText("VOLKSWAGEN SAVEIRO")).toBeInTheDocument();
  });

  it("desenha a série de buscas por dia", async () => {
    mockFetch({ summary: resumo });
    render(<Dashboard />);

    expect(await screen.findByText("Buscas por dia")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /3 dias, pico de 7/ })).toBeInTheDocument();
  });

  it("destaca quantas buscas do veículo não acharam LED, que é a lacuna da matriz", async () => {
    mockFetch({ summary: resumo });
    render(<Dashboard />);

    expect(await screen.findByText("4 sem resultado")).toBeInTheDocument();
    // FORD KA achou resultado em todas, então não ganha o detalhe.
    expect(screen.queryByText("0 sem resultado")).not.toBeInTheDocument();
  });

  it("cada ranking é uma tabela de verdade, legível por leitor de tela", async () => {
    mockFetch({ summary: resumo });
    render(<Dashboard />);

    await screen.findByText("Top produtos pedidos");
    expect(screen.getAllByRole("rowheader").length).toBeGreaterThan(0);
  });

  it("avisa quando um ranking não tem dado", async () => {
    mockFetch({
      summary: { ...resumo, topProducts: [], criticalStock: [], topVehicles: [] },
    });
    render(<Dashboard />);

    expect(await screen.findByText("Nenhum pedido registrado ainda.")).toBeInTheDocument();
    expect(screen.getByText("Nenhuma busca registrada ainda.")).toBeInTheDocument();
    expect(screen.getByText("Nenhum produto abaixo do mínimo.")).toBeInTheDocument();
  });

  it("mostra o erro que a API devolveu", async () => {
    mockFetch({ error: "Sem permissão para este recurso." }, false, 403);
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Sem permissão para este recurso.");
    });
  });
});
