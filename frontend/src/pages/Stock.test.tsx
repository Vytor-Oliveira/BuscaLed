import { render, screen, waitFor } from "@testing-library/react";
import Stock from "./Stock";

const produtos = [
  {
    id: "led-1",
    sku: "SHK-S14-H4",
    name: "Headlight S14 Nano",
    socketCode: "H4",
    stockQty: 2,
    stockMin: 5,
  },
  {
    id: "led-2",
    sku: "SHK-S16-H7",
    name: "Ultraled S16",
    socketCode: "H7",
    stockQty: 30,
    stockMin: 5,
  },
];

function mockFetch(resposta: unknown, ok = true, status = 200) {
  globalThis.fetch = (() =>
    Promise.resolve({ ok, status, json: () => Promise.resolve(resposta) })) as unknown as typeof fetch;
}

describe("Stock", () => {
  it("lista os produtos e marca os que estão abaixo do mínimo", async () => {
    mockFetch({ ledModels: produtos });
    render(<Stock />);

    expect(await screen.findByText("Headlight S14 Nano")).toBeInTheDocument();
    expect(screen.getByText("Ultraled S16")).toBeInTheDocument();
    // Só o primeiro está com estoque <= mínimo.
    expect(screen.getAllByText("Estoque baixo")).toHaveLength(1);
    expect(screen.getByText(/1 abaixo do mínimo/)).toBeInTheDocument();
  });

  it("oferece um campo de reposição por produto", async () => {
    mockFetch({ ledModels: produtos });
    render(<Stock />);

    expect(
      await screen.findByLabelText("Quantidade a repor de SHK-S14-H4")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Quantidade a repor de SHK-S16-H7")).toBeInTheDocument();
  });

  it("mostra o erro que a API devolveu", async () => {
    mockFetch({ error: "Sem permissão para este recurso." }, false, 403);
    render(<Stock />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Sem permissão para este recurso.");
    });
  });

  it("avisa quando o catálogo está vazio", async () => {
    mockFetch({ ledModels: [] });
    render(<Stock />);

    expect(await screen.findByText("Nenhum produto cadastrado.")).toBeInTheDocument();
  });
});
