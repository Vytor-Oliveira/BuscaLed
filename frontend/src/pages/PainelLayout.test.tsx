import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import PainelLayout from "./PainelLayout";

function mockSessao(role: "rep" | "admin"): string[] {
  const chamadas: string[] = [];
  globalThis.fetch = ((url: string, init?: RequestInit) => {
    chamadas.push(`${init?.method ?? "GET"} ${new URL(String(url)).pathname}`);
    if (String(url).includes("/auth/logout")) {
      return Promise.resolve({ ok: true, status: 204, json: () => Promise.resolve(null) });
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({ user: { id: "u-1", name: "Rep Teste", email: "r@example.com", role } }),
    });
  }) as unknown as typeof fetch;
  return chamadas;
}

function montar() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/painel/tickets"]}>
        <Routes>
          <Route path="/painel" element={<PainelLayout />}>
            <Route path="tickets" element={<p>Conteúdo da fila</p>} />
          </Route>
          <Route path="/login" element={<p>Tela de login</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

describe("PainelLayout", () => {
  it("monta a sidebar com a navegação e o conteúdo da rota", async () => {
    mockSessao("admin");
    montar();

    expect(await screen.findByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fila de Pedidos" })).toBeInTheDocument();
    expect(screen.getByText("Conteúdo da fila")).toBeInTheDocument();
  });

  // RN06 — estoque e catálogo são exclusivos do admin, e o backend também
  // responde 403 para o representante nessas rotas.
  it("esconde o Catálogo do representante", async () => {
    mockSessao("rep");
    montar();

    await screen.findByRole("link", { name: "Fila de Pedidos" });
    expect(screen.queryByRole("link", { name: "Catálogo" })).not.toBeInTheDocument();
  });

  it("mostra o Catálogo para o admin", async () => {
    mockSessao("admin");
    montar();

    expect(await screen.findByRole("link", { name: "Catálogo" })).toBeInTheDocument();
  });

  it("marca a rota atual como ativa", async () => {
    mockSessao("admin");
    montar();

    const atual = await screen.findByRole("link", { name: "Fila de Pedidos" });
    expect(atual).toHaveClass("ativo");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveClass("ativo");
  });

  it("encerra a sessão e volta para o login", async () => {
    const chamadas = mockSessao("admin");
    montar();

    const sair = await screen.findByRole("button", { name: /Sair/ });
    sair.click();

    await waitFor(() => expect(screen.getByText("Tela de login")).toBeInTheDocument());
    expect(chamadas).toContain("POST /auth/logout");
  });
});
