import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import MeusPedidos from "./MeusPedidos";

const perfil = { id: "u-1", name: "Carlos Silva", email: "c@example.com", role: "user" as const };

const item = {
  id: "i-1",
  ledModelId: "led-1",
  ledModelSku: "SHK-S14-H4",
  ledModelName: "Headlight S14",
  originalLedModelId: null,
  position: "FAROL_BAIXO",
  quantity: 2,
};

const pedidos = [
  {
    id: "3f8a1b2c-0000-0000-0000-00000000ab12",
    userId: "u-1",
    userEmail: "c@example.com",
    customerPhone: "47999990000",
    status: "PENDENTE" as const,
    createdAt: "2026-10-20T14:37:00.000Z",
    updatedAt: "2026-10-20T14:37:00.000Z",
    items: [item],
  },
  {
    id: "11112222-0000-0000-0000-00000000cd34",
    userId: "u-1",
    userEmail: "c@example.com",
    customerPhone: null,
    status: "CONCLUIDO" as const,
    createdAt: "2026-10-10T09:15:00.000Z",
    updatedAt: "2026-10-10T09:15:00.000Z",
    items: [{ ...item, id: "i-2", originalLedModelId: "led-9" }],
  },
];

function mockApi(
  resolver: (url: string, init?: RequestInit) => { ok: boolean; status: number; corpo: unknown }
) {
  globalThis.fetch = ((url: string, init?: RequestInit) => {
    const r = resolver(String(url), init);
    return Promise.resolve({ ok: r.ok, status: r.status, json: () => Promise.resolve(r.corpo) });
  }) as unknown as typeof fetch;
}

const sessao = { ok: true, status: 200, corpo: { user: perfil } };

function montar() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/pedidos"]}>
        <MeusPedidos />
      </MemoryRouter>
    </AuthProvider>
  );
}

describe("MeusPedidos", () => {
  it("lista os pedidos com número curto e status traduzido", async () => {
    mockApi((url) =>
      url.includes("/tickets") ? { ok: true, status: 200, corpo: { tickets: pedidos } } : sessao
    );
    montar();

    expect(await screen.findByText("TKT-AB12")).toBeInTheDocument();
    expect(screen.getByText("TKT-CD34")).toBeInTheDocument();
    expect(screen.getByText("Novo")).toBeInTheDocument();
    expect(screen.getByText("Concluído")).toBeInTheDocument();
    expect(screen.getAllByText(/2× Headlight S14/)).toHaveLength(2);
  });

  it("marca o pedido que o representante alterou", async () => {
    mockApi((url) =>
      url.includes("/tickets") ? { ok: true, status: 200, corpo: { tickets: pedidos } } : sessao
    );
    montar();

    await screen.findByText("TKT-AB12");
    expect(screen.getAllByText("Atualizado pelo representante")).toHaveLength(1);
  });

  // RN14 — só pedido aberto aceita cancelamento.
  it("oferece cancelar só no pedido aberto", async () => {
    mockApi((url) =>
      url.includes("/tickets") ? { ok: true, status: 200, corpo: { tickets: pedidos } } : sessao
    );
    montar();

    await screen.findByText("TKT-AB12");
    expect(screen.getAllByRole("button", { name: "Cancelar pedido" })).toHaveLength(1);
  });

  it("pede confirmação antes de cancelar e atualiza o status", async () => {
    mockApi((url, init) => {
      if (init?.method === "PATCH") {
        return {
          ok: true,
          status: 200,
          corpo: { ticket: { ...pedidos[0], status: "CANCELADO" } },
        };
      }
      return url.includes("/tickets")
        ? { ok: true, status: 200, corpo: { tickets: pedidos } }
        : sessao;
    });
    montar();

    await screen.findByText("TKT-AB12");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar pedido" }));

    expect(screen.getByRole("button", { name: "Confirmar cancelamento" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar cancelamento" }));

    await waitFor(() => expect(screen.getByText("Cancelado")).toBeInTheDocument());
  });

  it("avisa quando não há pedido nenhum", async () => {
    mockApi((url) =>
      url.includes("/tickets") ? { ok: true, status: 200, corpo: { tickets: [] } } : sessao
    );
    montar();

    expect(await screen.findByText(/ainda não fez nenhum pedido/)).toBeInTheDocument();
  });

  it("mostra o erro que a API devolveu", async () => {
    mockApi((url) =>
      url.includes("/tickets")
        ? { ok: false, status: 500, corpo: { error: "Falha interna." } }
        : sessao
    );
    montar();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Falha interna.");
    });
  });
});
