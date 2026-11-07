import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import type { Ticket } from "../../../api/tickets";
import TicketQueue from "../../../pages/TicketQueue";
import { mockarApi, renderizarComProvedores, sessaoDe } from "../../../test/render";

const ID = "aaaa1111-0000-0000-0000-00000000ab12";

function ticket(sobrescreve: Partial<Ticket> = {}): Ticket {
  return {
    id: ID,
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

function montar(
  tickets: Ticket[],
  extra?: (caminho: string, init?: RequestInit) => unknown
) {
  const chamadas = mockarApi((caminho, init) => {
    if (caminho === "/auth/me") {
      return sessaoDe("rep");
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
      <Route path="/painel/tickets" element={<TicketQueue />} />
      <Route path="/painel/tickets/:id" element={<TicketQueue />} />
    </Routes>,
    { rota: `/painel/tickets/${ID}` }
  );
  return chamadas;
}

function noDetalhe() {
  return within(screen.getByRole("dialog"));
}

describe("DetalheDoPedido", () => {
  it("abre com os dados do cliente, veículo e itens", async () => {
    montar([ticket()]);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    const detalhe = noDetalhe();
    expect(detalhe.getByText("cliente@example.com")).toBeInTheDocument();
    expect(detalhe.getByText("47999990000")).toBeInTheDocument();
    expect(detalhe.getByText("VOLKSWAGEN GOL 2018")).toBeInTheDocument();
    expect(detalhe.getByText("Ultraled Infinity H4")).toBeInTheDocument();
  });

  it("explica a ausência de telefone em vez de deixar vazio", async () => {
    montar([ticket({ customerPhone: null })]);

    await screen.findByRole("dialog");
    expect(noDetalhe().getByText(/Não informado/)).toBeInTheDocument();
    expect(
      noDetalhe().queryByRole("link", { name: /Falar no WhatsApp/ })
    ).not.toBeInTheDocument();
  });

  it("explica o pedido sem veículo em vez de mostrar um traço solto", async () => {
    montar([ticket({ vehicle: null })]);

    await screen.findByRole("dialog");
    expect(
      noDetalhe().getByText(/antes de o veículo passar a ser guardado/)
    ).toBeInTheDocument();
  });

  it("marca o item que foi substituído", async () => {
    montar([
      ticket({
        items: [
          {
            id: "i-1",
            ledModelId: "led-9",
            ledModelSku: "SLL-X",
            ledModelName: "S14X H4",
            originalLedModelId: "led-1",
            position: "FAROL_BAIXO",
            quantity: 2,
          },
        ],
      }),
    ]);

    await screen.findByRole("dialog");
    expect(noDetalhe().getByText("Substituído pelo representante")).toBeInTheDocument();
  });

  it("confirma o pedido novo", async () => {
    const chamadas = montar([ticket()], (caminho) =>
      caminho === `/tickets/${ID}/confirm`
        ? { ok: true, status: 200, corpo: { ticket: ticket({ status: "CONFIRMADO" }) } }
        : undefined
    );

    await screen.findByRole("dialog");
    fireEvent.click(noDetalhe().getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(chamadas).toContain(`PATCH /tickets/${ID}/confirm`));
  });

  // RN12: concluir é o que baixa o estoque, e isso é dito antes do clique.
  it("avisa que concluir baixa o estoque e conclui", async () => {
    const chamadas = montar([ticket({ status: "CONFIRMADO" })], (caminho) =>
      caminho === `/tickets/${ID}/complete`
        ? { ok: true, status: 200, corpo: { ticket: ticket({ status: "CONCLUIDO" }) } }
        : undefined
    );

    await screen.findByRole("dialog");
    expect(noDetalhe().getByText(/baixa a quantidade dos itens no estoque/)).toBeInTheDocument();

    fireEvent.click(noDetalhe().getByRole("button", { name: "Concluir" }));
    await waitFor(() => expect(chamadas).toContain(`PATCH /tickets/${ID}/complete`));
  });

  // RN10: cancelado é imutável, então exige segunda confirmação.
  it("exige confirmação antes de cancelar", async () => {
    const chamadas = montar([ticket()]);

    await screen.findByRole("dialog");
    fireEvent.click(noDetalhe().getByRole("button", { name: /Cancelar pedido/ }));

    expect(await screen.findByText("Cancelar este pedido?")).toBeInTheDocument();
    expect(chamadas.some((c) => c.includes("/cancel"))).toBe(false);
  });

  it("cancela depois de confirmar", async () => {
    const chamadas = montar([ticket()], (caminho) =>
      caminho === `/tickets/${ID}/cancel`
        ? { ok: true, status: 200, corpo: { ticket: ticket({ status: "CANCELADO" }) } }
        : undefined
    );

    await screen.findByRole("dialog");
    fireEvent.click(noDetalhe().getByRole("button", { name: /Cancelar pedido/ }));
    await screen.findByText("Cancelar este pedido?");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar o pedido" }));

    await waitFor(() => expect(chamadas).toContain(`PATCH /tickets/${ID}/cancel`));
  });

  it("não oferece ação nenhuma em pedido já encerrado", async () => {
    montar([ticket({ status: "CONCLUIDO" })]);

    await screen.findByRole("dialog");
    expect(noDetalhe().queryByRole("button", { name: "Confirmar" })).not.toBeInTheDocument();
    expect(noDetalhe().queryByRole("button", { name: "Concluir" })).not.toBeInTheDocument();
    expect(
      noDetalhe().queryByRole("button", { name: /Cancelar pedido/ })
    ).not.toBeInTheDocument();
  });

  it("desfaz a mudança otimista quando a API recusa", async () => {
    montar([ticket()], (caminho) =>
      caminho === `/tickets/${ID}/confirm`
        ? { ok: false, status: 409, corpo: { error: "Estoque insuficiente." } }
        : undefined
    );

    await screen.findByRole("dialog");
    fireEvent.click(noDetalhe().getByRole("button", { name: "Confirmar" }));

    // O toast conta o que aconteceu e a fila volta ao estado anterior.
    expect(await screen.findByText("Estoque insuficiente.")).toBeInTheDocument();
    expect(await screen.findByText("A ação não foi aplicada")).toBeInTheDocument();
  });

  it("monta o link do WhatsApp com a mensagem do pedido", async () => {
    montar([ticket()]);

    await screen.findByRole("dialog");
    const link = noDetalhe().getByRole("link", { name: /Falar no WhatsApp/ });
    expect(link).toHaveAttribute("href", expect.stringContaining("wa.me/5547999990000"));
    expect(link).toHaveAttribute("href", expect.stringContaining("TKT-AB12"));
  });
});

describe("ModalTrocaProduto", () => {
  const ALTERNATIVA = {
    id: "led-2",
    sku: "SLL-140001X",
    name: "S14X H4",
    socketCode: "H4",
    stockQty: 7,
  };

  function abrirTroca(
    tickets: Ticket[],
    extra?: (caminho: string, init?: RequestInit) => unknown
  ) {
    const chamadas = montar(tickets, extra);
    return chamadas;
  }

  it("pula a escolha do item quando o pedido tem um só e lista as alternativas", async () => {
    abrirTroca([ticket()], (caminho) =>
      caminho === `/tickets/${ID}/items/i-1/alternatives`
        ? { ok: true, status: 200, corpo: { alternatives: [ALTERNATIVA] } }
        : undefined
    );

    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: /Trocar produto/ }));

    const troca = within(await screen.findByRole("dialog", { name: "Escolha o substituto" }));
    expect(await troca.findByText("S14X H4")).toBeInTheDocument();
    expect(troca.getByText("7 em estoque")).toBeInTheDocument();
  });

  it("pede para escolher o item quando o pedido tem mais de um", async () => {
    abrirTroca([
      ticket({
        items: [
          ticket().items[0],
          {
            id: "i-2",
            ledModelId: "led-3",
            ledModelSku: "SLL-OUTRO",
            ledModelName: "S16 T10",
            originalLedModelId: null,
            position: "LANTERNA_DIANTEIRA",
            quantity: 2,
          },
        ],
      }),
    ]);

    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: /Trocar produto/ }));

    const troca = within(
      await screen.findByRole("dialog", { name: "Qual item vai ser trocado?" })
    );
    expect(troca.getByText("S16 T10")).toBeInTheDocument();
    expect(troca.getByText("Ultraled Infinity H4")).toBeInTheDocument();
  });

  // RN11: só o mesmo encaixe e com estoque — o backend já filtra.
  it("explica quando não há alternativa no mesmo encaixe", async () => {
    abrirTroca([ticket()], (caminho) =>
      caminho === `/tickets/${ID}/items/i-1/alternatives`
        ? { ok: true, status: 200, corpo: { alternatives: [] } }
        : undefined
    );

    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: /Trocar produto/ }));

    expect(await screen.findByText("Nenhuma alternativa disponível")).toBeInTheDocument();
    expect(screen.getByText(/mesmo encaixe e estoque suficiente/)).toBeInTheDocument();
  });

  it("troca o produto e avisa que o cliente será notificado", async () => {
    const chamadas = abrirTroca([ticket()], (caminho, init) => {
      if (caminho === `/tickets/${ID}/items/i-1/alternatives`) {
        return { ok: true, status: 200, corpo: { alternatives: [ALTERNATIVA] } };
      }
      if (caminho === `/tickets/${ID}/items/i-1` && init?.method === "PATCH") {
        return { ok: true, status: 200, corpo: { ticket: ticket() } };
      }
      return undefined;
    });

    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: /Trocar produto/ }));
    const troca = within(await screen.findByRole("dialog", { name: "Escolha o substituto" }));
    await troca.findByText("S14X H4");

    expect(troca.getByText(/cliente é notificado por e-mail/)).toBeInTheDocument();
    fireEvent.click(troca.getByRole("button", { name: /Trocar por S14X H4/ }));

    await waitFor(() => expect(chamadas).toContain(`PATCH /tickets/${ID}/items/i-1`));
    expect(await screen.findByText("O cliente foi notificado por e-mail.")).toBeInTheDocument();
  });

  it("mostra o erro que a API devolveu ao carregar alternativas", async () => {
    abrirTroca([ticket()], (caminho) =>
      caminho === `/tickets/${ID}/items/i-1/alternatives`
        ? { ok: false, status: 500, corpo: { error: "Falha ao buscar alternativas." } }
        : undefined
    );

    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: /Trocar produto/ }));

    expect(await screen.findByText("Falha ao buscar alternativas.")).toBeInTheDocument();
  });
});
