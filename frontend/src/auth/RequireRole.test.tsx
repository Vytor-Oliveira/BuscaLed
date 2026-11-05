import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import { RequireRole } from "./RequireRole";

function mockMe(resposta: { ok: boolean; status: number; corpo: unknown }, atraso = 0) {
  globalThis.fetch = (() =>
    new Promise((resolve) =>
      setTimeout(
        () =>
          resolve({
            ok: resposta.ok,
            status: resposta.status,
            json: () => Promise.resolve(resposta.corpo),
          }),
        atraso
      )
    )) as unknown as typeof fetch;
}

function montar(roles: Array<"user" | "rep" | "admin">) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/painel"]}>
        <Routes>
          <Route
            path="/painel"
            element={
              <RequireRole roles={roles}>
                <p>Área restrita</p>
              </RequireRole>
            }
          />
          <Route path="/login" element={<p>Tela de login</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

const usuario = (role: "user" | "rep" | "admin") => ({
  ok: true,
  status: 200,
  corpo: { user: { id: "u-1", name: "Teste", email: "t@example.com", role } },
});

describe("RequireRole", () => {
  it("deixa passar quem tem o papel exigido", async () => {
    mockMe(usuario("admin"));
    montar(["rep", "admin"]);

    expect(await screen.findByText("Área restrita")).toBeInTheDocument();
  });

  it("manda para o login quem não tem sessão", async () => {
    mockMe({ ok: false, status: 401, corpo: { error: "Não autenticado." } });
    montar(["rep", "admin"]);

    expect(await screen.findByText("Tela de login")).toBeInTheDocument();
  });

  it("barra quem está logado mas não tem o papel, sem mandar para o login", async () => {
    mockMe(usuario("user"));
    montar(["rep", "admin"]);

    expect(await screen.findByText("Sem permissão")).toBeInTheDocument();
    expect(screen.queryByText("Tela de login")).not.toBeInTheDocument();
    expect(screen.queryByText("Área restrita")).not.toBeInTheDocument();
  });

  // Decidir antes da resposta do /auth/me jogaria quem está logado para o
  // login a cada recarregamento da página.
  it("não decide nada enquanto a sessão carrega", async () => {
    mockMe(usuario("admin"), 50);
    montar(["rep", "admin"]);

    expect(screen.getByText("Carregando…")).toBeInTheDocument();
    expect(screen.queryByText("Tela de login")).not.toBeInTheDocument();

    expect(await screen.findByText("Área restrita")).toBeInTheDocument();
  });
});
