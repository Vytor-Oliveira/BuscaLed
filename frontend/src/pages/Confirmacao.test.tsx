import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import Confirmacao from "./Confirmacao";

const perfil = { id: "u-1", name: "Carlos Silva", email: "carlos@example.com", role: "user" as const };

const selecao = {
  veiculo: { make: "VOLKSWAGEN", model: "GOL", year: 2018 },
  itens: [
    {
      position: "FAROL_BAIXO",
      led: {
        ledModelId: "led-1",
        sku: "SHK-S14-H4",
        name: "Headlight S14",
        socketCode: "H4",
        inStock: true,
      },
    },
  ],
};

function mockApi(
  resolver: (url: string, init?: RequestInit) => { ok: boolean; status: number; corpo: unknown }
): Array<{ rota: string; corpo: unknown }> {
  const chamadas: Array<{ rota: string; corpo: unknown }> = [];
  globalThis.fetch = ((url: string, init?: RequestInit) => {
    chamadas.push({
      rota: `${init?.method ?? "GET"} ${new URL(String(url)).pathname}`,
      corpo: init?.body ? JSON.parse(String(init.body)) : null,
    });
    const r = resolver(String(url), init);
    return Promise.resolve({ ok: r.ok, status: r.status, json: () => Promise.resolve(r.corpo) });
  }) as unknown as typeof fetch;
  return chamadas;
}

const sessao = { ok: true, status: 200, corpo: { user: perfil } };

function montar(state: unknown = selecao) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[{ pathname: "/confirmar", state }]}>
        <Routes>
          <Route path="/confirmar" element={<Confirmacao />} />
          <Route path="/" element={<p>Home</p>} />
          <Route path="/pedidos" element={<p>Meus Pedidos</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

describe("Confirmacao", () => {
  it("resume o que foi escolhido e o veículo", async () => {
    mockApi(() => sessao);
    montar();

    expect(await screen.findByText("Headlight S14")).toBeInTheDocument();
    expect(screen.getByText("VOLKSWAGEN GOL 2018")).toBeInTheDocument();
    expect(screen.getByText("Farol baixo")).toBeInTheDocument();
  });

  it("preenche nome e e-mail da sessão, sem deixar editar", async () => {
    mockApi(() => sessao);
    montar();

    await waitFor(() => expect(screen.getByLabelText("Nome")).toHaveValue("Carlos Silva"));
    expect(screen.getByLabelText("E-mail")).toHaveValue("carlos@example.com");
    expect(screen.getByLabelText("Nome")).toHaveAttribute("readonly");
  });

  it("envia o pedido com os itens escolhidos e o telefone", async () => {
    const chamadas = mockApi((_url, init) =>
      init?.method === "POST"
        ? { ok: true, status: 201, corpo: { ticket: { id: "3f8a1b2c-0000-0000-0000-00000000ab12" } } }
        : sessao
    );
    montar();

    await screen.findByText("Headlight S14");
    fireEvent.change(screen.getByLabelText(/Telefone/), { target: { value: "47999990000" } });
    fireEvent.click(screen.getByRole("button", { name: /Confirmar e enviar/ }));

    await waitFor(() => expect(screen.getByText("Pedido enviado!")).toBeInTheDocument());

    const envio = chamadas.find((c) => c.rota === "POST /tickets");
    expect(envio?.corpo).toEqual({
      items: [{ ledModelId: "led-1", position: "FAROL_BAIXO", quantity: 1 }],
      customerPhone: "47999990000",
    });
  });

  // Sem telefone o painel só não mostra o botão de WhatsApp, então o campo
  // não pode virar obrigatório.
  it("deixa enviar sem telefone", async () => {
    const chamadas = mockApi((_url, init) =>
      init?.method === "POST"
        ? { ok: true, status: 201, corpo: { ticket: { id: "3f8a1b2c-0000-0000-0000-00000000ab12" } } }
        : sessao
    );
    montar();

    await screen.findByText("Headlight S14");
    fireEvent.click(screen.getByRole("button", { name: /Confirmar e enviar/ }));

    await waitFor(() => expect(screen.getByText("Pedido enviado!")).toBeInTheDocument());
    expect(chamadas.find((c) => c.rota === "POST /tickets")?.corpo).not.toHaveProperty(
      "customerPhone"
    );
  });

  it("mostra o número do pedido e o caminho para Meus Pedidos", async () => {
    mockApi((_url, init) =>
      init?.method === "POST"
        ? { ok: true, status: 201, corpo: { ticket: { id: "3f8a1b2c-0000-0000-0000-00000000ab12" } } }
        : sessao
    );
    montar();

    await screen.findByText("Headlight S14");
    fireEvent.click(screen.getByRole("button", { name: /Confirmar e enviar/ }));

    expect(await screen.findByText("TKT-AB12")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver Meus Pedidos/ })).toBeInTheDocument();
  });

  it("mostra o erro que a API devolveu", async () => {
    mockApi((_url, init) =>
      init?.method === "POST"
        ? { ok: false, status: 409, corpo: { error: "Produto sem estoque." } }
        : sessao
    );
    montar();

    await screen.findByText("Headlight S14");
    fireEvent.click(screen.getByRole("button", { name: /Confirmar e enviar/ }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Produto sem estoque.");
    });
  });

  // Recarregar a página perde o estado da navegação; cair num formulário
  // vazio seria pior que voltar para o início.
  it("volta para a home quando não há seleção", async () => {
    mockApi(() => sessao);
    montar(null);

    expect(await screen.findByText("Home")).toBeInTheDocument();
  });
});
