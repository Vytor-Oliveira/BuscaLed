import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import type { Ticket } from "../api/tickets";
import TicketQueue from "./TicketQueue";
import { mockarApi, renderizarComProvedores, sessaoDe } from "../test/render";

// A tela renderiza tabela (desktop) e cartões (celular) ao mesmo tempo, e o
// CSS que esconde um dos dois não existe no jsdom. Por isso as consultas são
// escopadas na tabela em vez de globais.
function naTabela() {
  return within(screen.getByRole("table"));
}

function ticket(sobrescreve: Partial<Ticket> = {}): Ticket {
  return {
    id: "aaaa1111-0000-0000-0000-00000000ab12",
    userId: "u-1",
    userEmail: "cliente@example.com",
    customerPhone: "47999990000",
    vehicle: { make: "VOLKSWAGEN", model: "GOL", year: 2018 },
    status: "PENDENTE",
    createdAt: "2026-10-13T12:00:00.000Z",
    updatedAt: "2026-10-13T12:00:00.000Z",
    items: [
      {
        id: "i-1",
        ledModelId: "led-1",
        ledModelSku: "SHK-S14-H4",
        ledModelName: "Ultraled S14 H4",
        originalLedModelId: null,
        position: "FAROL_BAIXO",
        quantity: 2,
      },
    ],
    ...sobrescreve,
  };
}

function montar(tickets: Ticket[]) {
  mockarApi((caminho) => {
    if (caminho === "/auth/me") {
      return sessaoDe("rep");
    }
    if (caminho === "/tickets") {
      return { ok: true, status: 200, corpo: { tickets } };
    }
    return { ok: true, status: 200, corpo: {} };
  });
  return renderizarComProvedores(<TicketQueue />, { rota: "/painel/tickets" });
}

describe("TicketQueue", () => {
  it("lista os pedidos com o status traduzido", async () => {
    montar([ticket()]);

    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());
    expect(naTabela().getByText("TKT-AB12")).toBeInTheDocument();
    expect(naTabela().getByText("cliente@example.com")).toBeInTheDocument();
    expect(naTabela().getByText("Novo")).toBeInTheDocument();
  });

  // O veículo passou a ser guardado no ticket; pedido antigo fica sem.
  it("mostra o veículo do pedido, e o traço só quando não há", async () => {
    montar([
      ticket(),
      ticket({ id: "bbbb2222-0000-0000-0000-00000000cd34", vehicle: null }),
    ]);

    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());
    expect(naTabela().getByText("VOLKSWAGEN GOL 2018")).toBeInTheDocument();
    expect(naTabela().getByText("—")).toBeInTheDocument();
  });

  it("conta os pedidos por situação nas abas", async () => {
    montar([
      ticket(),
      ticket({ id: "bbbb2222-0000-0000-0000-00000000cd34", status: "CONCLUIDO" }),
    ]);

    // Os contadores só existem depois que a fila chega.
    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());
    expect(screen.getByRole("tab", { name: /Todos/ })).toHaveTextContent("2");
    expect(screen.getByRole("tab", { name: /Novos/ })).toHaveTextContent("1");
    expect(screen.getByRole("tab", { name: /Concluídos/ })).toHaveTextContent("1");
  });

  it("filtra pela busca usando o nome do produto", async () => {
    montar([
      ticket(),
      ticket({
        id: "bbbb2222-0000-0000-0000-00000000cd34",
        userEmail: "outro@example.com",
        items: [
          {
            id: "i-2",
            ledModelId: "led-2",
            ledModelSku: "SHK-S16-H7",
            ledModelName: "Ultraled S16 H7",
            originalLedModelId: null,
            position: "NEBLINA",
            quantity: 1,
          },
        ],
      }),
    ]);

    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/Buscar pedido/i), {
      target: { value: "S16" },
    });

    await waitFor(() => {
      expect(naTabela().queryByText("TKT-AB12")).not.toBeInTheDocument();
    });
    expect(naTabela().getByText("TKT-CD34")).toBeInTheDocument();
  });

  it("avisa quando nenhum pedido passa pelo filtro", async () => {
    montar([ticket()]);
    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Buscar pedido/i), {
      target: { value: "nao-existe-nada-assim" },
    });

    expect(await screen.findByText("Nenhum pedido com esses filtros")).toBeInTheDocument();
  });

  it("mostra a mensagem de erro que a API devolveu", async () => {
    mockarApi((caminho) =>
      caminho === "/auth/me"
        ? sessaoDe("rep")
        : { ok: false, status: 500, corpo: { error: "Banco fora do ar." } }
    );
    renderizarComProvedores(<TicketQueue />, { rota: "/painel/tickets" });

    expect(await screen.findByText("Banco fora do ar.")).toBeInTheDocument();
  });

  it("esconde o atalho do WhatsApp quando o cliente não deu telefone", async () => {
    montar([ticket({ customerPhone: null })]);
    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());

    expect(naTabela().queryByRole("link")).not.toBeInTheDocument();
  });

  it("monta o link do WhatsApp com código do país e mensagem", async () => {
    montar([ticket()]);
    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());

    const link = naTabela().getByRole("link", { name: /WhatsApp/i });
    expect(link).toHaveAttribute("href", expect.stringContaining("wa.me/5547999990000"));
    expect(link).toHaveAttribute("href", expect.stringContaining("text="));
  });

  it("desabilita a exportação quando não há pedido para exportar", async () => {
    montar([]);

    expect(await screen.findByRole("button", { name: /Exportar CSV/i })).toBeDisabled();
  });

  it("não pagina enquanto cabe tudo numa página", async () => {
    montar([ticket()]);
    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());

    expect(screen.queryByRole("navigation", { name: /Paginação/i })).not.toBeInTheDocument();
  });

  it("pagina quando passa de quinze pedidos", async () => {
    const muitos = Array.from({ length: 17 }, (_, i) =>
      ticket({ id: `aaaa1111-0000-0000-0000-0000000${String(i).padStart(5, "0")}` })
    );
    montar(muitos);

    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());
    expect(screen.getByRole("navigation", { name: /Paginação/i })).toBeInTheDocument();
    // 15 por página: a primeira página não mostra os 17.
    expect(naTabela().getAllByRole("row")).toHaveLength(16);
  });
});
