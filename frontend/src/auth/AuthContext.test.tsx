import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";

const perfil = { id: "u-1", name: "Rep Teste", email: "rep@example.com", role: "rep" as const };

interface Resposta {
  ok: boolean;
  status: number;
  corpo: unknown;
}

// Guarda as chamadas para conferir o contrato: a sessão vem do backend,
// nunca de leitura de cookie (o cookie é httpOnly).
function mockFetch(porRota: (url: string) => Resposta): string[] {
  const chamadas: string[] = [];
  globalThis.fetch = ((url: string, init?: RequestInit) => {
    chamadas.push(`${init?.method ?? "GET"} ${new URL(String(url)).pathname}`);
    const r = porRota(String(url));
    return Promise.resolve({
      ok: r.ok,
      status: r.status,
      json: () => Promise.resolve(r.corpo),
    });
  }) as unknown as typeof fetch;
  return chamadas;
}

function Sonda() {
  const { user, loading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="estado">
        {loading ? "carregando" : user ? `${user.name} (${user.role})` : "sem sessao"}
      </span>
      <button type="button" onClick={() => login("rep@example.com", "senha-forte-123")}>
        entrar
      </button>
      <button type="button" onClick={() => logout()}>
        sair
      </button>
    </div>
  );
}

function montar() {
  return render(
    <AuthProvider>
      <Sonda />
    </AuthProvider>
  );
}

describe("AuthProvider", () => {
  it("pergunta a sessão ao backend e expõe o perfil", async () => {
    const chamadas = mockFetch(() => ({ ok: true, status: 200, corpo: { user: perfil } }));
    montar();

    await waitFor(() =>
      expect(screen.getByTestId("estado")).toHaveTextContent("Rep Teste (rep)")
    );
    expect(chamadas).toContain("GET /auth/me");
  });

  it("trata 401 como visitante, não como erro", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch(() => ({ ok: false, status: 401, corpo: { error: "Não autenticado." } }));
    montar();

    await waitFor(() => expect(screen.getByTestId("estado")).toHaveTextContent("sem sessao"));
    // Visitante sem sessão é o caso normal — não polui o console.
    expect(erro).not.toHaveBeenCalled();
    erro.mockRestore();
  });

  it("registra no console quando a falha não é 401", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch(() => ({ ok: false, status: 500, corpo: { error: "Falha interna." } }));
    montar();

    await waitFor(() => expect(erro).toHaveBeenCalled());
    expect(screen.getByTestId("estado")).toHaveTextContent("sem sessao");
    erro.mockRestore();
  });

  it("recarrega a sessão depois do login, em vez de confiar na resposta", async () => {
    let logado = false;
    const chamadas = mockFetch((url) => {
      if (url.includes("/auth/login")) {
        logado = true;
        return { ok: true, status: 200, corpo: {} };
      }
      return logado
        ? { ok: true, status: 200, corpo: { user: perfil } }
        : { ok: false, status: 401, corpo: { error: "Não autenticado." } };
    });

    montar();
    await waitFor(() => expect(screen.getByTestId("estado")).toHaveTextContent("sem sessao"));

    screen.getByRole("button", { name: "entrar" }).click();

    await waitFor(() =>
      expect(screen.getByTestId("estado")).toHaveTextContent("Rep Teste (rep)")
    );
    expect(chamadas.filter((c) => c === "GET /auth/me")).toHaveLength(2);
    expect(chamadas).toContain("POST /auth/login");
  });

  it("limpa a sessão no logout", async () => {
    const chamadas = mockFetch((url) =>
      url.includes("/auth/logout")
        ? { ok: true, status: 204, corpo: null }
        : { ok: true, status: 200, corpo: { user: perfil } }
    );

    montar();
    await waitFor(() =>
      expect(screen.getByTestId("estado")).toHaveTextContent("Rep Teste (rep)")
    );

    screen.getByRole("button", { name: "sair" }).click();

    await waitFor(() => expect(screen.getByTestId("estado")).toHaveTextContent("sem sessao"));
    expect(chamadas).toContain("POST /auth/logout");
  });
});

describe("useAuth", () => {
  it("recusa uso fora do AuthProvider, que seria sessão silenciosamente vazia", () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Sonda />)).toThrow(/AuthProvider/);
    erro.mockRestore();
  });
});
