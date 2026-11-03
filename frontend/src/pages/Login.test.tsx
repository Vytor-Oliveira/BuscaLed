import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  it("troca para a aba de cadastro e pede o nome", async () => {
    mockRotas(() => semSessao);
    montar();

    fireEvent.click(await screen.findByRole("tab", { name: "Criar conta" }));

    expect(screen.getByLabelText("Nome")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Criar minha conta" })).toBeInTheDocument();
  });

  it("cadastra e volta para a aba de entrar avisando sobre a confirmação", async () => {
    const chamadas = mockRotas((url) =>
      url.includes("/auth/register")
        ? {
            ok: true,
            status: 201,
            corpo: { message: "Cadastro realizado. Confira seu e-mail para confirmar a conta." },
          }
        : semSessao
    );

    montar();
    fireEvent.click(await screen.findByRole("tab", { name: "Criar conta" }));
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Carlos Silva" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "c@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "senha-forte-123" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar minha conta" }));

    expect(await screen.findByText(/Confira seu e-mail/)).toBeInTheDocument();
    expect(chamadas).toContain("POST /auth/register");
    // O cadastro nao loga: a conta so vale depois de confirmar o e-mail.
    expect(screen.getByRole("button", { name: "Entrar na minha conta" })).toBeInTheDocument();
    expect(screen.queryByText("Fila de Pedidos")).not.toBeInTheDocument();
  });

  it("pede o link de redefinição com o e-mail digitado", async () => {
    const chamadas = mockRotas((url) =>
      url.includes("/auth/forgot-password")
        ? {
            ok: true,
            status: 200,
            corpo: {
              message: "Se houver uma conta com esse e-mail, enviamos o link de redefinição.",
            },
          }
        : semSessao
    );

    montar();
    fireEvent.change(await screen.findByLabelText("E-mail"), {
      target: { value: "c@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Esqueci minha senha" }));

    expect(await screen.findByText(/Se houver uma conta/)).toBeInTheDocument();
    expect(chamadas).toContain("POST /auth/forgot-password");
  });

  it("cobra o e-mail antes de pedir o link", async () => {
    const chamadas = mockRotas(() => semSessao);
    montar();

    fireEvent.click(await screen.findByRole("button", { name: "Esqueci minha senha" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Informe seu e-mail");
    expect(chamadas).not.toContain("POST /auth/forgot-password");
  });

  it("mostra o 409 de e-mail já cadastrado", async () => {
    mockRotas((url) =>
      url.includes("/auth/register")
        ? { ok: false, status: 409, corpo: { error: "E-mail já cadastrado." } }
        : semSessao
    );

    montar();
    fireEvent.click(await screen.findByRole("tab", { name: "Criar conta" }));
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Carlos" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "c@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "senha-forte-123" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar minha conta" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("E-mail já cadastrado.");
    });
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
