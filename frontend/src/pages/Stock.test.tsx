import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Stock from "./Stock";

const produtos = [
  {
    id: "led-1",
    sku: "SHK-S14-H4",
    name: "Headlight S14 Nano",
    socketCode: "H4",
    imageUrl: "/leds/SLL-140004.jpg",
    stockQty: 2,
    stockMin: 5,
  },
  {
    id: "led-2",
    sku: "SHK-S16-H7",
    name: "Ultraled S16",
    socketCode: "H7",
    imageUrl: null,
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

  it("mostra a foto do produto quando existe e o ícone quando não", async () => {
    mockFetch({ ledModels: produtos });
    const { container } = render(<Stock />);

    await screen.findByText("Headlight S14 Nano");
    expect(container.querySelector('img[src="/leds/SLL-140004.jpg"]')).toBeInTheDocument();

    const semFoto = screen.getByText("Ultraled S16").closest("li");
    expect(semFoto?.querySelector("img")).toBeNull();
    expect(semFoto?.querySelector("svg")).toBeInTheDocument();
  });

  it("oferece um campo de reposição por produto", async () => {
    mockFetch({ ledModels: produtos });
    render(<Stock />);

    expect(
      await screen.findByLabelText("Quantidade a repor de SHK-S14-H4")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Quantidade a repor de SHK-S16-H7")).toBeInTheDocument();
  });

  it("cadastra um produto novo e põe na lista em ordem de SKU", async () => {
    const criado = {
      id: "led-9",
      sku: "SHK-S11-H11",
      name: "Fog H11",
      socketCode: "H11",
      stockQty: 10,
      stockMin: 2,
    };
    globalThis.fetch = ((_url: string, init?: RequestInit) =>
      Promise.resolve({
        ok: true,
        status: init?.method === "POST" ? 201 : 200,
        json: () =>
          Promise.resolve(init?.method === "POST" ? { ledModel: criado } : { ledModels: produtos }),
      })) as unknown as typeof fetch;

    render(<Stock />);
    await screen.findByText("Headlight S14 Nano");

    fireEvent.click(screen.getByRole("button", { name: /Adicionar produto/ }));
    fireEvent.change(screen.getByLabelText("SKU"), { target: { value: "SHK-S11-H11" } });
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Fog H11" } });
    fireEvent.change(screen.getByLabelText("Encaixe"), { target: { value: "h11" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar produto" }));

    expect(await screen.findByText("Fog H11")).toBeInTheDocument();
  });

  it("mostra o 409 de SKU duplicado", async () => {
    globalThis.fetch = ((_url: string, init?: RequestInit) =>
      Promise.resolve({
        ok: init?.method !== "POST",
        status: init?.method === "POST" ? 409 : 200,
        json: () =>
          Promise.resolve(
            init?.method === "POST" ? { error: "SKU já cadastrado." } : { ledModels: produtos }
          ),
      })) as unknown as typeof fetch;

    render(<Stock />);
    await screen.findByText("Headlight S14 Nano");

    fireEvent.click(screen.getByRole("button", { name: /Adicionar produto/ }));
    fireEvent.change(screen.getByLabelText("SKU"), { target: { value: "SHK-S14-H4" } });
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Repetido" } });
    fireEvent.change(screen.getByLabelText("Encaixe"), { target: { value: "H4" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar produto" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("SKU já cadastrado.");
    });
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
