import { render, screen, waitFor } from "@testing-library/react";
import TicketQueue, { montarLinkWhatsApp, montarMensagem, numeroTicket } from "./TicketQueue";

const ticketBase = {
  id: "t-1",
  userId: "u-1",
  userEmail: "cliente@example.com",
  customerPhone: "47999990000",
  status: "PENDENTE" as const,
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
};

function mockFetch(resposta: unknown, ok = true, status = 200) {
  globalThis.fetch = (() =>
    Promise.resolve({
      ok,
      status,
      json: () => Promise.resolve(resposta),
    })) as unknown as typeof fetch;
}

describe("montarLinkWhatsApp", () => {
  it("acrescenta o código do país em número brasileiro", () => {
    expect(montarLinkWhatsApp("47999990000")).toBe("https://wa.me/5547999990000");
  });

  it("ignora pontuação que a pessoa digitou", () => {
    expect(montarLinkWhatsApp("(47) 99999-0000")).toBe("https://wa.me/5547999990000");
  });

  it("não duplica o código do país quando já vem", () => {
    expect(montarLinkWhatsApp("5547999990000")).toBe("https://wa.me/5547999990000");
  });

  it("recusa número curto demais para ser válido", () => {
    expect(montarLinkWhatsApp("123")).toBeNull();
  });

  it("anexa a mensagem pré-formatada quando ela é passada (RF24)", () => {
    const link = montarLinkWhatsApp("47999990000", "Olá, tudo bem?");
    expect(link).toBe("https://wa.me/5547999990000?text=Ol%C3%A1%2C%20tudo%20bem%3F");
  });
});

describe("numeroTicket", () => {
  it("encurta o UUID num rótulo legível", () => {
    expect(numeroTicket("3f8a1b2c-0000-0000-0000-00000000ab12")).toBe("TKT-AB12");
  });
});

describe("montarMensagem", () => {
  it("cita o número do pedido e os produtos", () => {
    const mensagem = montarMensagem(ticketBase);
    expect(mensagem).toContain(numeroTicket(ticketBase.id));
    expect(mensagem).toContain("2x Ultraled S14 H4");
  });
});

describe("TicketQueue", () => {
  it("lista os pedidos devolvidos pela API com o status traduzido", async () => {
    mockFetch({ tickets: [ticketBase] });
    render(<TicketQueue />);

    expect(await screen.findByText("cliente@example.com")).toBeInTheDocument();
    expect(screen.getByText("Novo")).toBeInTheDocument();
    expect(screen.getByText(/Ultraled S14 H4/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /WhatsApp de cliente@example.com/ })
    ).toHaveAttribute("href", expect.stringContaining("https://wa.me/5547999990000?text="));
  });

  it("avisa quando não há pedido no filtro", async () => {
    mockFetch({ tickets: [] });
    render(<TicketQueue />);

    expect(await screen.findByText("Nenhum pedido neste filtro.")).toBeInTheDocument();
  });

  it("mostra a mensagem de erro que a API devolveu", async () => {
    mockFetch({ error: "Sem permissão para este recurso." }, false, 403);
    render(<TicketQueue />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Sem permissão para este recurso.");
    });
  });

  it("abre o modal de troca e lista só os modelos que o backend ofereceu", async () => {
    const alternativas = [
      { id: "led-9", sku: "SHK-S16-H4", name: "Ultraled S16", socketCode: "H4", stockQty: 7 },
    ];
    globalThis.fetch = ((url: string) =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve(
            String(url).includes("/alternatives")
              ? { alternatives: alternativas }
              : { tickets: [ticketBase] }
          ),
      })) as unknown as typeof fetch;

    render(<TicketQueue />);
    const botao = await screen.findByRole("button", { name: /Editar produto do pedido/ });
    botao.click();

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(await screen.findByText("Ultraled S16")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Usar este" })).toBeInTheDocument();
  });

  it("oferece cancelar ao representante, com segunda confirmação (RF12)", async () => {
    mockFetch({ tickets: [ticketBase] });
    render(<TicketQueue />);

    const cancelar = await screen.findByRole("button", { name: "Cancelar" });
    cancelar.click();

    expect(
      await screen.findByRole("button", { name: "Confirmar cancelamento" })
    ).toBeInTheDocument();
    // O passo de recuo tem que existir: cancelar é irreversível (RN10).
    expect(screen.getByRole("button", { name: "Não" })).toBeInTheDocument();
  });

  it("não oferece cancelar em ticket já fechado", async () => {
    mockFetch({ tickets: [{ ...ticketBase, status: "CONCLUIDO" as const }] });
    render(<TicketQueue />);

    await screen.findByText("cliente@example.com");
    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();
  });

  it("não deixa editar produto de ticket já concluído (RN14)", async () => {
    mockFetch({ tickets: [{ ...ticketBase, status: "CONCLUIDO" as const }] });
    render(<TicketQueue />);

    const botao = await screen.findByRole("button", { name: /Editar produto do pedido/ });
    expect(botao).toBeDisabled();
  });

  it("não mostra o botão de WhatsApp quando o cliente não informou telefone", async () => {
    mockFetch({ tickets: [{ ...ticketBase, customerPhone: null }] });
    render(<TicketQueue />);

    expect(await screen.findByText("cliente@example.com")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /WhatsApp de/ })).not.toBeInTheDocument();
  });
});
