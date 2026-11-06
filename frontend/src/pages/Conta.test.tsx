import { fireEvent, screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import Conta from "./Conta";
import NaoEncontrada from "./NaoEncontrada";
import { mockarApi, renderizarComProvedores, SEM_SESSAO, sessaoDe } from "../test/render";

function montar(role: "user" | "rep" | "admin") {
  const chamadas = mockarApi((caminho) =>
    caminho === "/auth/logout"
      ? { ok: true, status: 204, corpo: null }
      : sessaoDe(role)
  );
  renderizarComProvedores(
    <Routes>
      <Route path="/conta" element={<Conta />} />
      <Route path="/" element={<p>Página inicial</p>} />
    </Routes>,
    { rota: "/conta" }
  );
  return chamadas;
}

describe("Conta", () => {
  it("mostra nome, e-mail e perfil de quem está logado", async () => {
    montar("rep");

    // O e-mail aparece no cartão de resumo e na lista de dados.
    expect(await screen.findAllByText("t@example.com")).toHaveLength(2);
    expect(screen.getAllByText("Teste Silva")).toHaveLength(2);
    expect(screen.getByText("Representante")).toBeInTheDocument();
    expect(screen.getByText(/Atende a fila de pedidos/)).toBeInTheDocument();
  });

  it("explica o papel de cada perfil, não só o rótulo", async () => {
    montar("admin");

    expect(await screen.findByText("Administrador")).toBeInTheDocument();
    expect(screen.getByText(/Mantém o catálogo, o estoque/)).toBeInTheDocument();
  });

  it("descreve o cliente sem jargão", async () => {
    montar("user");

    expect(await screen.findByText("Cliente")).toBeInTheDocument();
    expect(screen.getByText(/salva veículos e gera reservas/)).toBeInTheDocument();
  });

  it("encerra a sessão e volta para a home", async () => {
    const chamadas = montar("user");

    fireEvent.click(await screen.findByRole("button", { name: /Sair da conta/ }));

    await waitFor(() => expect(chamadas).toContain("POST /auth/logout"));
    expect(await screen.findByText("Página inicial")).toBeInTheDocument();
  });

  it("não renderiza nada sem sessão", async () => {
    mockarApi(() => SEM_SESSAO);
    const { container } = renderizarComProvedores(
      <Routes>
        <Route path="/conta" element={<Conta />} />
      </Routes>,
      { rota: "/conta" }
    );

    await waitFor(() => expect(container.querySelector("main")).toBeNull());
  });
});

describe("NaoEncontrada", () => {
  it("explica o 404 e oferece o caminho de volta", async () => {
    mockarApi(() => SEM_SESSAO);
    renderizarComProvedores(
      <Routes>
        <Route path="*" element={<NaoEncontrada />} />
      </Routes>,
      { rota: "/rota-que-nao-existe" }
    );

    expect(await screen.findByText("Essa página não existe")).toBeInTheDocument();
    expect(screen.getByText("ERRO 404")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Buscar meu veículo/ })
    ).toBeInTheDocument();
  });
});
