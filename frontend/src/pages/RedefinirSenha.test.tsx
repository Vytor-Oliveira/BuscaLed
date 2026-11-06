import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import RedefinirSenha from "./RedefinirSenha";

function mockApi(resposta: { ok: boolean; status: number; corpo: unknown }) {
  const corpos: unknown[] = [];
  globalThis.fetch = ((_url: string, init?: RequestInit) => {
    corpos.push(init?.body ? JSON.parse(String(init.body)) : null);
    return Promise.resolve({
      ok: resposta.ok,
      status: resposta.status,
      json: () => Promise.resolve(resposta.corpo),
    });
  }) as unknown as typeof fetch;
  return corpos;
}

function montar(busca = "?token=abc123") {
  return render(
    <MemoryRouter initialEntries={[`/redefinir-senha${busca}`]}>
      <Routes>
        <Route path="/redefinir-senha" element={<RedefinirSenha />} />
        <Route path="/login" element={<p>Tela de login</p>} />
      </Routes>
    </MemoryRouter>
  );
}

const preencher = (senha: string, confirmacao: string) => {
  fireEvent.change(screen.getByLabelText("Senha nova"), { target: { value: senha } });
  fireEvent.change(screen.getByLabelText("Repita a senha"), { target: { value: confirmacao } });
};

const salvar = () => fireEvent.click(screen.getByRole("button", { name: /Salvar senha nova/ }));

describe("RedefinirSenha", () => {
  it("envia o token da URL junto com a senha nova", async () => {
    const corpos = mockApi({ ok: true, status: 200, corpo: { message: "ok" } });
    montar();

    preencher("senha-forte-123", "senha-forte-123");
    salvar();

    await waitFor(() => expect(screen.getByText(/Senha redefinida/)).toBeInTheDocument());
    expect(corpos[0]).toEqual({ token: "abc123", password: "senha-forte-123" });
  });

  // Errar a senha nova e só descobrir no login seguinte seria pior.
  it("recusa quando as duas senhas não batem, sem chamar a API", async () => {
    const corpos = mockApi({ ok: true, status: 200, corpo: { message: "ok" } });
    montar();

    preencher("senha-forte-123", "senha-diferente-456");
    salvar();

    expect(screen.getByRole("alert")).toHaveTextContent("não são iguais");
    expect(corpos).toHaveLength(0);
  });

  it("mostra o erro de token expirado que a API devolveu", async () => {
    mockApi({ ok: false, status: 400, corpo: { error: "Token inválido ou expirado." } });
    montar();

    preencher("senha-forte-123", "senha-forte-123");
    salvar();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Token inválido ou expirado.");
    });
  });

  it("avisa e bloqueia o envio quando o link vem sem token", () => {
    mockApi({ ok: true, status: 200, corpo: { message: "ok" } });
    montar("");

    expect(screen.getByRole("alert")).toHaveTextContent("falta o token");
    expect(screen.getByRole("button", { name: /Salvar senha nova/ })).toBeDisabled();
  });

  it("oferece o caminho para o login depois de redefinir", async () => {
    mockApi({ ok: true, status: 200, corpo: { message: "ok" } });
    montar();

    preencher("senha-forte-123", "senha-forte-123");
    salvar();

    expect(await screen.findByRole("link", { name: /Ir para o login/ })).toBeInTheDocument();
  });
});
