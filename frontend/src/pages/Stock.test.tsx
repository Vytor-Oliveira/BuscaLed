import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import type { LedModel } from "../api/catalog";
import Stock from "./Stock";
import { mockarApi, renderizarComProvedores, sessaoDe } from "../test/render";

// Os selos de situação usam o mesmo texto das opções do filtro, então toda
// consulta por eles precisa ser escopada na lista de produtos.
function naLista() {
  return within(screen.getByRole("list", { name: "Produtos do catálogo" }));
}

function noResumo() {
  return within(screen.getByRole("group", { name: "Resumo do catálogo" }));
}

function produto(sobrescreve: Partial<LedModel> = {}): LedModel {
  return {
    id: "led-1",
    sku: "SLL-140004",
    name: "Ultraled Infinity H4",
    description: null,
    socketCode: "H4",
    imageUrl: "/leds/SLL-140004.jpg",
    priceCents: 12990,
    costCents: 7450,
    unitsPerKit: 2,
    stockQty: 12,
    stockMin: 5,
    ...sobrescreve,
  };
}

function montar(ledModels: LedModel[], extra?: (caminho: string, init?: RequestInit) => unknown) {
  const chamadas = mockarApi((caminho, init) => {
    if (caminho === "/auth/me") {
      return sessaoDe("admin");
    }
    const resposta = extra?.(caminho, init);
    if (resposta) {
      return resposta as { ok: boolean; status: number; corpo: unknown };
    }
    if (caminho === "/catalog/led-models") {
      return { ok: true, status: 200, corpo: { ledModels } };
    }
    return { ok: true, status: 200, corpo: {} };
  });
  renderizarComProvedores(<Stock />, { rota: "/painel/estoque" });
  return chamadas;
}

describe("Stock", () => {
  it("lista os produtos com SKU e encaixe", async () => {
    montar([produto()]);

    expect(await screen.findByText("Ultraled Infinity H4")).toBeInTheDocument();
    expect(screen.getByText("SLL-140004")).toBeInTheDocument();
    expect(screen.getByText("encaixe H4")).toBeInTheDocument();
  });

  it("marca a situação de cada produto pelo mínimo", async () => {
    montar([
      produto(),
      produto({ id: "led-2", sku: "SLL-2", name: "Abaixo", stockQty: 3, stockMin: 5 }),
      produto({ id: "led-3", sku: "SLL-3", name: "Zerado", stockQty: 0, stockMin: 5 }),
    ]);

    await screen.findByText("Zerado");
    expect(naLista().getByText("Em estoque")).toBeInTheDocument();
    expect(naLista().getByText("Abaixo do mínimo")).toBeInTheDocument();
    expect(naLista().getByText("Esgotado")).toBeInTheDocument();
  });

  it("resume o catálogo em total, abaixo do mínimo e esgotados", async () => {
    montar([
      produto(),
      produto({ id: "led-2", sku: "SLL-2", name: "Abaixo", stockQty: 3, stockMin: 5 }),
      produto({ id: "led-3", sku: "SLL-3", name: "Zerado", stockQty: 0, stockMin: 5 }),
    ]);

    await screen.findByText("Zerado");
    expect(noResumo().getByText("Produtos no catálogo").nextElementSibling).toHaveTextContent("3");
    expect(noResumo().getByText("Em alerta").nextElementSibling).toHaveTextContent("1");
    expect(noResumo().getByText("Esgotados").nextElementSibling).toHaveTextContent("1");
  });

  it("mostra a foto do produto quando existe", async () => {
    montar([produto()]);

    expect(await screen.findByAltText("Foto do Ultraled Infinity H4")).toBeInTheDocument();
  });

  it("filtra por nome ou SKU", async () => {
    montar([
      produto(),
      produto({ id: "led-2", sku: "SLL-999", name: "Outro produto" }),
    ]);

    await screen.findByText("Ultraled Infinity H4");
    fireEvent.change(screen.getByLabelText(/Buscar por nome ou SKU/i), {
      target: { value: "SLL-999" },
    });

    await waitFor(() => {
      expect(screen.queryByText("Ultraled Infinity H4")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Outro produto")).toBeInTheDocument();
  });

  it("abre a reposição e mostra o total resultante antes de confirmar", async () => {
    montar([produto()]);

    await screen.findByText("Ultraled Infinity H4");
    fireEvent.click(screen.getByRole("button", { name: "Repor" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    // 12 + 10 do padrão.
    expect(screen.getByText("22")).toBeInTheDocument();
  });

  it("envia a reposição com a quantidade escolhida", async () => {
    const chamadas = montar([produto()], (caminho) =>
      caminho === "/stock/led-1/restock"
        ? {
            ok: true,
            status: 200,
            corpo: {
              stock: {
                ledModelId: "led-1",
                sku: "SLL-140004",
                name: "Ultraled Infinity H4",
                stockQty: 62,
                stockMin: 5,
                belowMinimum: false,
              },
            },
          }
        : undefined
    );

    await screen.findByText("Ultraled Infinity H4");
    fireEvent.click(screen.getByRole("button", { name: "Repor" }));
    await screen.findByRole("dialog");

    fireEvent.click(screen.getByRole("button", { name: "50 un." }));
    fireEvent.click(screen.getByRole("button", { name: /Adicionar 50/ }));

    await waitFor(() => {
      expect(chamadas).toContain("POST /stock/led-1/restock");
    });
  });

  it("cadastra um produto novo", async () => {
    const chamadas = montar([], (caminho, init) =>
      caminho === "/catalog/led-models" && init?.method === "POST"
        ? {
            ok: true,
            status: 201,
            corpo: { ledModel: produto({ id: "led-novo", name: "LED novo" }) },
          }
        : undefined
    );

    await screen.findByText("O catálogo está vazio");
    fireEvent.click(screen.getByRole("button", { name: /Cadastrar produto/ }));
    await screen.findByRole("dialog");

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "LED novo" } });
    fireEvent.change(screen.getByLabelText("SKU"), { target: { value: "SLL-NOVO" } });
    fireEvent.change(screen.getByLabelText("Encaixe"), { target: { value: "H7" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar produto" }));

    await waitFor(() => {
      expect(chamadas).toContain("POST /catalog/led-models");
    });
  });

  it("cobra os campos obrigatórios antes de enviar", async () => {
    const chamadas = montar([]);

    await screen.findByText("O catálogo está vazio");
    fireEvent.click(screen.getByRole("button", { name: /Cadastrar produto/ }));
    await screen.findByRole("dialog");

    fireEvent.click(screen.getByRole("button", { name: "Criar produto" }));

    expect(await screen.findByText("Informe o nome do produto.")).toBeInTheDocument();
    expect(chamadas.filter((c) => c === "POST /catalog/led-models")).toHaveLength(0);
  });

  it("põe o 409 de SKU duplicado no próprio campo", async () => {
    montar([], (caminho, init) =>
      caminho === "/catalog/led-models" && init?.method === "POST"
        ? { ok: false, status: 409, corpo: { error: "SKU já cadastrado." } }
        : undefined
    );

    await screen.findByText("O catálogo está vazio");
    fireEvent.click(screen.getByRole("button", { name: /Cadastrar produto/ }));
    await screen.findByRole("dialog");

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "LED" } });
    fireEvent.change(screen.getByLabelText("SKU"), { target: { value: "SLL-140004" } });
    fireEvent.change(screen.getByLabelText("Encaixe"), { target: { value: "H4" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar produto" }));

    expect(await screen.findByText("SKU já cadastrado.")).toBeInTheDocument();
  });

  it("mostra o erro que a API devolveu", async () => {
    mockarApi((caminho) =>
      caminho === "/auth/me"
        ? sessaoDe("admin")
        : { ok: false, status: 500, corpo: { error: "Catálogo fora do ar." } }
    );
    renderizarComProvedores(<Stock />, { rota: "/painel/estoque" });

    expect(await screen.findByText("Catálogo fora do ar.")).toBeInTheDocument();
  });

  it("avisa quando o catálogo está vazio", async () => {
    montar([]);

    expect(await screen.findByText("O catálogo está vazio")).toBeInTheDocument();
  });
});
