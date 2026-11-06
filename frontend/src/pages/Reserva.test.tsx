import { fireEvent, screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import Reserva from "./Reserva";
import { mockarApi, renderizarComProvedores, sessaoDe } from "../test/render";

const CARRINHO = {
  veiculo: { make: "VOLKSWAGEN", model: "GOL", year: 2018 },
  itens: [
    {
      ledModelId: "led-1",
      position: "FAROL_BAIXO",
      sku: "SLL-140004",
      nome: "Ultraled Infinity H4",
      socketCode: "H4",
      imageUrl: "/leds/SLL-140004.jpg",
      precoCents: 12990,
      unidadesPorKit: 2,
      quantidade: 2,
    },
  ],
};

const TICKET = {
  id: "aaaa1111-0000-0000-0000-00000000ab12",
  userId: "u-1",
  userEmail: "cliente@example.com",
  customerPhone: "47999990000",
  vehicle: { make: "VOLKSWAGEN", model: "GOL", year: 2018 },
  status: "PENDENTE",
  createdAt: "2026-11-05T12:00:00.000Z",
  updatedAt: "2026-11-05T12:00:00.000Z",
  items: [],
};

function montar(
  carrinho: unknown = CARRINHO,
  resposta?: { ok: boolean; status: number; corpo: unknown }
) {
  const chamadas = mockarApi((caminho, init) => {
    if (caminho === "/auth/me") {
      return sessaoDe("user");
    }
    if (caminho === "/tickets" && init?.method === "POST") {
      return resposta ?? { ok: true, status: 201, corpo: { ticket: TICKET } };
    }
    return { ok: true, status: 200, corpo: {} };
  });

  renderizarComProvedores(
    <Routes>
      <Route path="/reserva" element={<Reserva />} />
      <Route path="/" element={<p>Página inicial</p>} />
      <Route path="/pedidos" element={<p>Meus pedidos</p>} />
    </Routes>,
    { rota: "/reserva", carrinho }
  );
  return chamadas;
}

function corpoEnviado(init?: RequestInit): Record<string, unknown> {
  return JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
}

describe("Reserva", () => {
  it("resume o que foi escolhido e o veículo", async () => {
    montar();

    expect(await screen.findByText("Ultraled Infinity H4")).toBeInTheDocument();
    expect(screen.getByText(/VOLKSWAGEN GOL 2018/)).toBeInTheDocument();
    expect(screen.getByText("Farol baixo")).toBeInTheDocument();
  });

  it("deixa editar a quantidade antes de enviar", async () => {
    montar();

    await screen.findByText("Ultraled Infinity H4");
    fireEvent.click(
      screen.getByRole("button", { name: "Aumentar quantidade de Ultraled Infinity H4" })
    );

    expect(screen.getByLabelText("Quantidade de Ultraled Infinity H4")).toHaveTextContent("3");
  });

  it("deixa remover um item", async () => {
    montar();

    await screen.findByText("Ultraled Infinity H4");
    fireEvent.click(screen.getByRole("button", { name: "Remover Ultraled Infinity H4" }));

    expect(await screen.findByText("Sua reserva está vazia")).toBeInTheDocument();
  });

  // RN04: reserva não é compra. O aviso fica no caminho da ação.
  it("avisa que a reserva não gera cobrança", async () => {
    montar();

    expect(
      await screen.findByText(/não é compra e não gera cobrança/)
    ).toBeInTheDocument();
    expect(await screen.findByText(/valores são de referência/i)).toBeInTheDocument();
  });

  it("mostra o preço unitário e o subtotal de cada item", async () => {
    montar();

    await screen.findByText("Ultraled Infinity H4");
    // 2 × R$ 129,90.
    expect(screen.getByText(/R\$ 129,90 o kit/)).toBeInTheDocument();
    expect(screen.getAllByText("R$ 259,80").length).toBeGreaterThan(0);
  });

  it("explica o item sem preço em vez de somar zero calado", async () => {
    montar({
      ...CARRINHO,
      itens: [{ ...CARRINHO.itens[0], precoCents: null }],
    });

    await screen.findByText("Ultraled Infinity H4");
    expect(screen.getByText(/Sem preço no catálogo/)).toBeInTheDocument();
    expect(screen.queryByText(/Total estimado/)).not.toBeInTheDocument();
  });

  it("chama o total de parcial quando um item está sem preço", async () => {
    montar({
      ...CARRINHO,
      itens: [
        CARRINHO.itens[0],
        {
          ...CARRINHO.itens[0],
          ledModelId: "led-2",
          position: "NEBLINA",
          nome: "S14X HB4",
          precoCents: null,
        },
      ],
    });

    await screen.findByText("S14X HB4");
    expect(screen.getByText("Parcial")).toBeInTheDocument();
    expect(screen.getByText(/ainda não têm preço no catálogo/)).toBeInTheDocument();
  });

  it("envia o pedido com os itens escolhidos e o veículo", async () => {
    let enviado: RequestInit | undefined;
    mockarApi((caminho, init) => {
      if (caminho === "/auth/me") {
        return sessaoDe("user");
      }
      if (caminho === "/tickets" && init?.method === "POST") {
        enviado = init;
        return { ok: true, status: 201, corpo: { ticket: TICKET } };
      }
      return { ok: true, status: 200, corpo: {} };
    });
    renderizarComProvedores(
      <Routes>
        <Route path="/reserva" element={<Reserva />} />
      </Routes>,
      { rota: "/reserva", carrinho: CARRINHO }
    );

    await screen.findByText("Ultraled Infinity H4");
    fireEvent.click(screen.getByRole("button", { name: "Gerar reserva" }));

    await waitFor(() => expect(enviado).toBeDefined());
    const corpo = corpoEnviado(enviado);
    expect(corpo.items).toEqual([
      { ledModelId: "led-1", position: "FAROL_BAIXO", quantity: 2 },
    ]);
    expect(corpo.vehicle).toEqual({ make: "VOLKSWAGEN", model: "GOL", year: 2018 });
  });

  it("manda o telefone só com dígitos quando informado", async () => {
    let enviado: RequestInit | undefined;
    mockarApi((caminho, init) => {
      if (caminho === "/auth/me") {
        return sessaoDe("user");
      }
      if (caminho === "/tickets" && init?.method === "POST") {
        enviado = init;
        return { ok: true, status: 201, corpo: { ticket: TICKET } };
      }
      return { ok: true, status: 200, corpo: {} };
    });
    renderizarComProvedores(
      <Routes>
        <Route path="/reserva" element={<Reserva />} />
      </Routes>,
      { rota: "/reserva", carrinho: CARRINHO }
    );

    await screen.findByText("Ultraled Infinity H4");
    fireEvent.change(screen.getByLabelText(/WhatsApp para contato/), {
      target: { value: "47999990000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Gerar reserva" }));

    await waitFor(() => expect(enviado).toBeDefined());
    expect(corpoEnviado(enviado).customerPhone).toBe("47999990000");
  });

  it("deixa enviar sem telefone, e aí não manda o campo", async () => {
    let enviado: RequestInit | undefined;
    mockarApi((caminho, init) => {
      if (caminho === "/auth/me") {
        return sessaoDe("user");
      }
      if (caminho === "/tickets" && init?.method === "POST") {
        enviado = init;
        return { ok: true, status: 201, corpo: { ticket: TICKET } };
      }
      return { ok: true, status: 200, corpo: {} };
    });
    renderizarComProvedores(
      <Routes>
        <Route path="/reserva" element={<Reserva />} />
      </Routes>,
      { rota: "/reserva", carrinho: CARRINHO }
    );

    await screen.findByText("Ultraled Infinity H4");
    fireEvent.click(screen.getByRole("button", { name: "Gerar reserva" }));

    await waitFor(() => expect(enviado).toBeDefined());
    expect(corpoEnviado(enviado)).not.toHaveProperty("customerPhone");
  });

  it("recusa telefone incompleto antes de chamar a API", async () => {
    const chamadas = montar();

    await screen.findByText("Ultraled Infinity H4");
    fireEvent.change(screen.getByLabelText(/WhatsApp para contato/), {
      target: { value: "4799" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Gerar reserva" }));

    expect(await screen.findByText(/Informe DDD e número/)).toBeInTheDocument();
    expect(chamadas.filter((c) => c === "POST /tickets")).toHaveLength(0);
  });

  it("mostra o número do pedido e o caminho para Meus Pedidos", async () => {
    montar();

    await screen.findByText("Ultraled Infinity H4");
    fireEvent.click(screen.getByRole("button", { name: "Gerar reserva" }));

    expect(await screen.findByText("Reserva gerada")).toBeInTheDocument();
    expect(screen.getByText("TKT-AB12")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Acompanhar em Meus pedidos/ })
    ).toBeInTheDocument();
  });

  it("mostra o erro que a API devolveu", async () => {
    montar(CARRINHO, { ok: false, status: 409, corpo: { error: "Sem estoque." } });

    await screen.findByText("Ultraled Infinity H4");
    fireEvent.click(screen.getByRole("button", { name: "Gerar reserva" }));

    expect(await screen.findByText("Sem estoque.")).toBeInTheDocument();
  });

  it("manda buscar veículo quando não há seleção", async () => {
    montar({ veiculo: null, itens: [] });

    expect(await screen.findByText("Sua reserva está vazia")).toBeInTheDocument();
  });

  // RN02: o carrinho guardado não pode carregar placa.
  it("não guarda placa no carrinho em sessionStorage", async () => {
    montar();
    await screen.findByText("Ultraled Infinity H4");

    const cru = sessionStorage.getItem("buscaled:reserva") ?? "";
    expect(cru.toLowerCase()).not.toContain("plate");
    expect(cru.toLowerCase()).not.toContain("placa");
  });
});
