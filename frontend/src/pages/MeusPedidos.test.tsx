import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import type { Ticket } from "../api/tickets";
import MeusPedidos from "./MeusPedidos";
import { mockarApi, renderizarComProvedores, sessaoDe } from "../test/render";

function ticket(sobrescreve: Partial<Ticket> = {}): Ticket {
  return {
    id: "aaaa1111-0000-0000-0000-00000000ab12",
    userId: "u-1",
    userEmail: "cliente@example.com",
    customerPhone: "47999990000",
    vehicle: { make: "VOLKSWAGEN", model: "GOL", year: 2018 },
    status: "PENDENTE",
    createdAt: "2026-11-01T12:00:00.000Z",
    updatedAt: "2026-11-01T12:00:00.000Z",
    items: [
      {
        id: "i-1",
        ledModelId: "led-1",
        ledModelSku: "SLL-140004",
        ledModelName: "Ultraled Infinity H4",
        originalLedModelId: null,
        position: "FAROL_BAIXO",
        quantity: 2,
      },
    ],
    ...sobrescreve,
  };
}

function montar(tickets: Ticket[], extra?: (caminho: string, init?: RequestInit) => unknown) {
  const chamadas = mockarApi((caminho, init) => {
    if (caminho === "/auth/me") {
      return sessaoDe("user");
    }
    const resposta = extra?.(caminho, init);
    if (resposta) {
      return resposta as { ok: boolean; status: number; corpo: unknown };
    }
    if (caminho === "/tickets") {
      return { ok: true, status: 200, corpo: { tickets } };
    }
    return { ok: true, status: 200, corpo: {} };
  });

  renderizarComProvedores(
    <Routes>
      <Route path="/pedidos" element={<MeusPedidos />} />
      <Route path="/" element={<p>Página inicial</p>} />
    </Routes>,
    { rota: "/pedidos" }
  );
  return chamadas;
}

function naLista() {
  return within(screen.getByRole("list", { name: "Seus pedidos" }));
}

describe("MeusPedidos", () => {
  it("lista os pedidos do cliente com número, data e itens", async () => {
    montar([ticket()]);

    expect(await screen.findByText("TKT-AB12")).toBeInTheDocument();
    expect(naLista().getByText("Ultraled Infinity H4")).toBeInTheDocument();
    expect(naLista().getByText("Farol baixo")).toBeInTheDocument();
    expect(naLista().getByText("2x")).toBeInTheDocument();
  });

  it("mostra o veículo da busca que originou o pedido", async () => {
    montar([ticket()]);

    expect(await screen.findByText("VOLKSWAGEN GOL 2018")).toBeInTheDocument();
  });

  it("mostra o andamento em linha do tempo", async () => {
    montar([ticket({ status: "CONFIRMADO" })]);

    const trilha = within(await screen.findByRole("list", { name: "Andamento do pedido" }));
    expect(trilha.getByText("Novo")).toBeInTheDocument();
    expect(trilha.getByText("Em atendimento")).toBeInTheDocument();
    expect(trilha.getByText("Concluído")).toBeInTheDocument();
  });

  it("tira o cancelado da trilha em vez de fingir que é etapa", async () => {
    montar([ticket({ status: "CANCELADO" })]);

    await screen.findByText("TKT-AB12");
    expect(
      screen.queryByRole("list", { name: "Andamento do pedido" })
    ).not.toBeInTheDocument();
    expect(screen.getByText(/foi cancelado e não será atendido/)).toBeInTheDocument();
  });

  it("destaca o item que o representante substituiu", async () => {
    montar([
      ticket({
        items: [
          {
            id: "i-1",
            ledModelId: "led-9",
            ledModelSku: "SLL-OUTRO",
            ledModelName: "S14X H4",
            originalLedModelId: "led-1",
            position: "FAROL_BAIXO",
            quantity: 2,
          },
        ],
      }),
    ]);

    expect(
      await screen.findByText("O representante substituiu este item")
    ).toBeInTheDocument();
  });

  // RN14: cancelar só enquanto o pedido está em andamento.
  it("oferece cancelar em pedido novo e em atendimento", async () => {
    montar([
      ticket(),
      ticket({ id: "bbbb2222-0000-0000-0000-00000000cd34", status: "CONFIRMADO" }),
    ]);

    await screen.findByText("TKT-AB12");
    expect(screen.getAllByRole("button", { name: "Cancelar pedido" })).toHaveLength(2);
  });

  it("não oferece cancelar em pedido concluído nem cancelado", async () => {
    montar([
      ticket({ status: "CONCLUIDO" }),
      ticket({ id: "bbbb2222-0000-0000-0000-00000000cd34", status: "CANCELADO" }),
    ]);

    await screen.findByText("TKT-AB12");
    expect(
      screen.queryByRole("button", { name: "Cancelar pedido" })
    ).not.toBeInTheDocument();
  });

  it("pede confirmação antes de cancelar", async () => {
    const chamadas = montar([ticket()]);

    await screen.findByText("TKT-AB12");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar pedido" }));

    expect(await screen.findByText("Cancelar este pedido?")).toBeInTheDocument();
    expect(chamadas.some((c) => c.includes("/cancel"))).toBe(false);
  });

  it("cancela depois de confirmar", async () => {
    const chamadas = montar([ticket()], (caminho) =>
      caminho.endsWith("/cancel")
        ? { ok: true, status: 200, corpo: { ticket: ticket({ status: "CANCELADO" }) } }
        : undefined
    );

    await screen.findByText("TKT-AB12");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar pedido" }));
    await screen.findByText("Cancelar este pedido?");

    const dialogo = within(screen.getByRole("dialog"));
    fireEvent.click(dialogo.getByRole("button", { name: "Cancelar pedido" }));

    await waitFor(() => {
      expect(
        chamadas.some((c) => c === "PATCH /tickets/aaaa1111-0000-0000-0000-00000000ab12/cancel")
      ).toBe(true);
    });
  });

  it("avisa quando o cliente ainda não gerou reserva", async () => {
    montar([]);

    expect(
      await screen.findByText("Você ainda não gerou nenhuma reserva")
    ).toBeInTheDocument();
  });

  it("mostra o erro que a API devolveu", async () => {
    mockarApi((caminho) =>
      caminho === "/auth/me"
        ? sessaoDe("user")
        : { ok: false, status: 500, corpo: { error: "Pedidos fora do ar." } }
    );
    renderizarComProvedores(
      <Routes>
        <Route path="/pedidos" element={<MeusPedidos />} />
      </Routes>,
      { rota: "/pedidos" }
    );

    expect(await screen.findByText("Pedidos fora do ar.")).toBeInTheDocument();
  });
});
