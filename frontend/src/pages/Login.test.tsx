import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import Login from "./Login";

const perfil = { id: "u-1", name: "Rep", email: "rep@example.com", role: "rep" as const };

function mockRotas(resolver: (url: string, init?: RequestInit) => unknown): string[] {
  const chamadas: string[] = [];
  globalThis.fetch = ((url: string, init?: RequestInit) => {
    chamadas.push(`${init?.method ?? "GET"} ${new URL(String(url)).pathname}`);
    const r = resolver(String(url), init) as {
      ok: boolean;
      status: number;
      corpo: unknown;
    };
    return Promise.resolve({
      ok: r.ok,
      status: r.status,
      json: () => Promise.resolve(r.corpo),
    });
  }) as unknown as typeof fetch;
  return chamadas;
}

const semSessao = { ok: false, status: 401, corpo: { error: "Não autenticado." } };

function montar() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/painel/tickets" element={<p>Fila de Pedidos</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

function preencher(email: string, senha: string) {
  const campoEmail = screen.getByLabelText("E-mail") as HTMLInputElement;
  const campoSenha = screen.getByLabelText("Senha") as HTMLInputElement;
  campoEmail.value = email;
  campoEmail.dispatchEvent(new Event("input", { bubbles: true }));
  campoSenha.value = senha;
  campoSenha.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("Login", () => {
  it("mostra a marca e o formulário com as abas", async () => {
    mockRotas(() => semSessao);
    montar();

    expect(await screen.findByLabelText("E-mail")).toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Entrar" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "Entrar na minha conta" })).toBeInTheDocument();
  });

  // O cadastro ainda não existe nesta tela; a aba fica visível mas inerte,
  // em vez de prometer um caminho que não leva a lugar nenhum.
  it("deixa a aba de cadastro desabilitada", async () => {
    mockRotas(() => semSessao);
    montar();

    expect(await screen.findByRole("tab", { name: "Criar conta" })).toBeDisabled();
  });

  it("envia as credenciais e leva para a fila ao entrar", async () => {
    let logado = false;
    const chamadas = mockRotas((url) => {
      if (url.includes("/auth/login")) {
        logado = true;
        return { ok: true, status: 200, corpo: {} };
      }
      return logado ? { ok: true, status: 200, corpo: { user: perfil } } : semSessao;
    });

    montar();
    await screen.findByLabelText("E-mail");
    preencher("rep@example.com", "senha-forte-123");
    screen.getByRole("button", { name: "Entrar na minha conta" }).click();

    expect(await screen.findByText("Fila de Pedidos")).toBeInTheDocument();
    expect(chamadas).toContain("POST /auth/login");
  });

  it("mostra a mensagem que o backend devolveu quando a senha está errada", async () => {
    mockRotas((url) =>
      url.includes("/auth/login")
        ? { ok: false, status: 401, corpo: { error: "E-mail ou senha inválidos." } }
        : semSessao
    );

    montar();
    await screen.findByLabelText("E-mail");
    preencher("rep@example.com", "errada");
    screen.getByRole("button", { name: "Entrar na minha conta" }).click();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("E-mail ou senha inválidos.");
    });
    expect(screen.queryByText("Fila de Pedidos")).not.toBeInTheDocument();
  });

  it("não mostra o login de novo para quem já tem sessão", async () => {
    mockRotas(() => ({ ok: true, status: 200, corpo: { user: perfil } }));
    montar();

    expect(await screen.findByText("Fila de Pedidos")).toBeInTheDocument();
  });
});
