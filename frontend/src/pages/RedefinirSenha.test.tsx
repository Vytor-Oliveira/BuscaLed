import { fireEvent, screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import RedefinirSenha from "./RedefinirSenha";
import { mockarApi, renderizarComProvedores } from "../test/render";

function montar(
  rota: string,
  resolver?: (caminho: string, init?: RequestInit) => unknown
) {
  const chamadas = mockarApi((caminho, init) => {
    const resposta = resolver?.(caminho, init);
    if (resposta) {
      return resposta as { ok: boolean; status: number; corpo: unknown };
    }
    return { ok: true, status: 200, corpo: { message: "Pronto." } };
  });

  renderizarComProvedores(
    <Routes>
      <Route path="/redefinir-senha" element={<RedefinirSenha />} />
      <Route path="/entrar" element={<p>Tela de login</p>} />
    </Routes>,
    { rota }
  );
  return chamadas;
}

function corpoEnviado(init?: RequestInit): Record<string, unknown> {
  return JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
}

describe("RedefinirSenha", () => {
  it("envia o token da URL junto com a senha nova", async () => {
    let enviado: RequestInit | undefined;
    montar("/redefinir-senha?token=abc123", (caminho, init) => {
      if (caminho === "/auth/reset-password") {
        enviado = init;
        return { ok: true, status: 200, corpo: { message: "Senha redefinida." } };
      }
      return undefined;
    });

    fireEvent.change(screen.getByLabelText("Senha nova"), {
      target: { value: "senha-forte-123" },
    });
    fireEvent.change(screen.getByLabelText("Repita a senha"), {
      target: { value: "senha-forte-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar senha nova" }));

    await waitFor(() => expect(enviado).toBeDefined());
    expect(corpoEnviado(enviado)).toEqual({
      token: "abc123",
      password: "senha-forte-123",
    });
  });

  it("recusa quando as duas senhas não batem, sem chamar a API", async () => {
    const chamadas = montar("/redefinir-senha?token=abc123");

    fireEvent.change(screen.getByLabelText("Senha nova"), {
      target: { value: "senha-forte-123" },
    });
    fireEvent.change(screen.getByLabelText("Repita a senha"), {
      target: { value: "outra-senha-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar senha nova" }));

    expect(await screen.findByText("As duas senhas não são iguais.")).toBeInTheDocument();
    expect(chamadas.filter((c) => c.includes("reset-password"))).toHaveLength(0);
  });

  it("mostra o erro de token expirado que a API devolveu", async () => {
    montar("/redefinir-senha?token=velho", (caminho) =>
      caminho === "/auth/reset-password"
        ? { ok: false, status: 400, corpo: { error: "Token inválido ou expirado." } }
        : undefined
    );

    fireEvent.change(screen.getByLabelText("Senha nova"), {
      target: { value: "senha-forte-123" },
    });
    fireEvent.change(screen.getByLabelText("Repita a senha"), {
      target: { value: "senha-forte-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar senha nova" }));

    expect(await screen.findByText("Token inválido ou expirado.")).toBeInTheDocument();
  });

  it("mostra a força da senha enquanto o usuário digita", () => {
    montar("/redefinir-senha?token=abc123");

    fireEvent.change(screen.getByLabelText("Senha nova"), { target: { value: "abc" } });

    expect(screen.getByText(/Força da senha/)).toBeInTheDocument();
    expect(screen.getByText(/o mínimo é 8 caracteres/)).toBeInTheDocument();
  });

  // Sem token, reclamar do link não resolve: a tela oferece pedir outro.
  it("oferece pedir novo link quando a URL vem sem token", () => {
    montar("/redefinir-senha");

    expect(screen.getByText(/Esse link não tem token/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar novo link" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Senha nova")).not.toBeInTheDocument();
  });

  it("pede novo link com o e-mail informado", async () => {
    const chamadas = montar("/redefinir-senha", (caminho) =>
      caminho === "/auth/forgot-password"
        ? {
            ok: true,
            status: 200,
            corpo: {
              message: "Se houver uma conta com esse e-mail, enviamos o link.",
            },
          }
        : undefined
    );

    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "c@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar novo link" }));

    expect(await screen.findByText(/Se houver uma conta/)).toBeInTheDocument();
    expect(chamadas).toContain("POST /auth/forgot-password");
  });

  it("oferece o caminho para o login depois de redefinir", async () => {
    montar("/redefinir-senha?token=abc123", (caminho) =>
      caminho === "/auth/reset-password"
        ? { ok: true, status: 200, corpo: { message: "Senha redefinida." } }
        : undefined
    );

    fireEvent.change(screen.getByLabelText("Senha nova"), {
      target: { value: "senha-forte-123" },
    });
    fireEvent.change(screen.getByLabelText("Repita a senha"), {
      target: { value: "senha-forte-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar senha nova" }));

    expect(await screen.findByText("Senha redefinida")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir para o login" })).toBeInTheDocument();
  });
});
