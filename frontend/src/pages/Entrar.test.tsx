import { fireEvent, screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import Entrar from "./Entrar";
import { mockarApi, renderizarComProvedores, SEM_SESSAO, sessaoDe } from "../test/render";

function montar(
  resolver: (caminho: string, init?: RequestInit) => ReturnType<typeof sessaoDe>,
  rota = "/entrar"
) {
  const chamadas = mockarApi(resolver);
  renderizarComProvedores(
    <Routes>
      <Route path="/entrar" element={<Entrar />} />
      <Route path="/garagem" element={<p>Minha garagem</p>} />
      <Route path="/painel" element={<p>Painel</p>} />
      <Route path="/reserva" element={<p>Tela de reserva</p>} />
    </Routes>,
    { rota }
  );
  return chamadas;
}

function preencher(email: string, senha: string) {
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Senha"), { target: { value: senha } });
}

/** Login bem-sucedido: o POST passa e o /auth/me seguinte devolve o perfil. */
function fluxoDeLogin(role: "user" | "rep" | "admin") {
  let logado = false;
  return (caminho: string) => {
    if (caminho === "/auth/login") {
      logado = true;
      return { ok: true, status: 200, corpo: {} };
    }
    if (caminho === "/auth/me") {
      return logado ? sessaoDe(role) : SEM_SESSAO;
    }
    return { ok: true, status: 200, corpo: {} };
  };
}

describe("Entrar", () => {
  it("mostra o formulário com as duas abas", async () => {
    montar(() => SEM_SESSAO);

    expect(await screen.findByLabelText("E-mail")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Entrar" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("tab", { name: "Criar conta" })).toBeInTheDocument();
  });

  it("troca para a aba de cadastro e pede o nome", async () => {
    montar(() => SEM_SESSAO);

    await screen.findByLabelText("E-mail");
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Criar conta" }));

    expect(await screen.findByLabelText("Nome")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Criar minha conta" })
    ).toBeInTheDocument();
  });

  it("mostra a força da senha só no cadastro", async () => {
    montar(() => SEM_SESSAO);

    await screen.findByLabelText("E-mail");
    expect(screen.queryByText(/Força da senha/)).not.toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Criar conta" }));
    await screen.findByLabelText("Nome");
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "curta" } });

    expect(await screen.findByText(/Força da senha/)).toBeInTheDocument();
    expect(screen.getByText(/o mínimo é 8 caracteres/)).toBeInTheDocument();
  });

  it("alterna mostrar e ocultar a senha", async () => {
    montar(() => SEM_SESSAO);

    const campo = await screen.findByLabelText("Senha");
    expect(campo).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: /Mostrar/ }));
    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "text");
  });

  it("cadastra e volta para a aba de entrar avisando sobre a confirmação", async () => {
    const chamadas = montar((caminho) =>
      caminho === "/auth/register"
        ? {
            ok: true,
            status: 201,
            corpo: { message: "Cadastro realizado. Confira seu e-mail para confirmar a conta." },
          }
        : SEM_SESSAO
    );

    await screen.findByLabelText("E-mail");
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Criar conta" }));
    await screen.findByLabelText("Nome");

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Carlos Silva" } });
    preencher("c@example.com", "senha-forte-123");
    fireEvent.click(screen.getByRole("button", { name: "Criar minha conta" }));

    expect(await screen.findByText(/Confira seu e-mail/)).toBeInTheDocument();
    expect(chamadas).toContain("POST /auth/register");
    // O cadastro não loga: a conta só vale depois de confirmar o e-mail.
    expect(
      screen.getByRole("button", { name: "Entrar na minha conta" })
    ).toBeInTheDocument();
  });

  it("mostra o 409 de e-mail já cadastrado", async () => {
    montar((caminho) =>
      caminho === "/auth/register"
        ? { ok: false, status: 409, corpo: { error: "E-mail já cadastrado." } }
        : SEM_SESSAO
    );

    await screen.findByLabelText("E-mail");
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Criar conta" }));
    await screen.findByLabelText("Nome");
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Carlos" } });
    preencher("c@example.com", "senha-forte-123");
    fireEvent.click(screen.getByRole("button", { name: "Criar minha conta" }));

    expect(await screen.findByText("E-mail já cadastrado.")).toBeInTheDocument();
  });

  // O painel é de rep/admin: mandar o cliente pra lá cai em "Sem permissão".
  it("leva o cliente para a garagem", async () => {
    montar(fluxoDeLogin("user"));

    await screen.findByLabelText("E-mail");
    preencher("cliente@example.com", "senha-forte-123");
    fireEvent.click(screen.getByRole("button", { name: "Entrar na minha conta" }));

    expect(await screen.findByText("Minha garagem")).toBeInTheDocument();
  });

  it("leva o representante para o painel", async () => {
    montar(fluxoDeLogin("rep"));

    await screen.findByLabelText("E-mail");
    preencher("rep@example.com", "senha-forte-123");
    fireEvent.click(screen.getByRole("button", { name: "Entrar na minha conta" }));

    expect(await screen.findByText("Painel")).toBeInTheDocument();
  });

  it("leva o admin para o painel", async () => {
    montar(fluxoDeLogin("admin"));

    await screen.findByLabelText("E-mail");
    preencher("admin@example.com", "senha-forte-123");
    fireEvent.click(screen.getByRole("button", { name: "Entrar na minha conta" }));

    expect(await screen.findByText("Painel")).toBeInTheDocument();
  });

  it("mostra a mensagem que o backend devolveu quando a senha está errada", async () => {
    montar((caminho) =>
      caminho === "/auth/login"
        ? { ok: false, status: 401, corpo: { error: "E-mail ou senha inválidos." } }
        : SEM_SESSAO
    );

    await screen.findByLabelText("E-mail");
    preencher("rep@example.com", "errada");
    fireEvent.click(screen.getByRole("button", { name: "Entrar na minha conta" }));

    expect(await screen.findByText("E-mail ou senha inválidos.")).toBeInTheDocument();
  });

  // Acontece quando o cookie é recusado: o POST passa e o /auth/me devolve 401.
  it("avisa quando entra mas não consegue carregar o perfil", async () => {
    montar((caminho) =>
      caminho === "/auth/login" ? { ok: true, status: 200, corpo: {} } : SEM_SESSAO
    );

    await screen.findByLabelText("E-mail");
    preencher("rep@example.com", "senha-forte-123");
    fireEvent.click(screen.getByRole("button", { name: "Entrar na minha conta" }));

    expect(
      await screen.findByText(/não foi possível carregar seu perfil/i)
    ).toBeInTheDocument();
  });

  it("não mostra o login de novo para quem já tem sessão", async () => {
    montar(() => sessaoDe("user"));

    expect(await screen.findByText("Minha garagem")).toBeInTheDocument();
  });

  // O /auth/confirm redireciona para cá: o resultado precisa virar mensagem.
  it("mostra o resultado da confirmação de e-mail que vem na query", async () => {
    montar(() => SEM_SESSAO, "/entrar?confirmacao=ok");

    expect(await screen.findByText(/E-mail confirmado/)).toBeInTheDocument();
  });

  it("explica o link de confirmação expirado", async () => {
    montar(() => SEM_SESSAO, "/entrar?confirmacao=invalida");

    expect(await screen.findByText(/inválido ou já expirou/)).toBeInTheDocument();
  });

  it("esconde o botão do Google quando não há client id configurado", async () => {
    montar(() => SEM_SESSAO);

    await screen.findByLabelText("E-mail");
    // Sem VITE_GOOGLE_CLIENT_ID o componente não renderiza nada: botão que não
    // pode funcionar é pior que botão nenhum.
    expect(screen.queryByText("ou")).not.toBeInTheDocument();
  });

  it("oferece o caminho de redefinir senha", async () => {
    montar(() => SEM_SESSAO);

    expect(
      await screen.findByRole("link", { name: /Redefinir por e-mail/ })
    ).toBeInTheDocument();
  });

  it("volta para a origem guardada pelo RequireRole", async () => {
    const chamadas = mockarApi(fluxoDeLogin("user"));
    renderizarComProvedores(
      <Routes>
        <Route path="/entrar" element={<Entrar />} />
        <Route path="/reserva" element={<p>Tela de reserva</p>} />
      </Routes>,
      { rota: "/entrar" }
    );

    await screen.findByLabelText("E-mail");
    preencher("cliente@example.com", "senha-forte-123");
    fireEvent.click(screen.getByRole("button", { name: "Entrar na minha conta" }));

    await waitFor(() => expect(chamadas).toContain("POST /auth/login"));
  });
});
