import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import PainelLayout from "./PainelLayout";
import { mockarApi, renderizarComProvedores, sessaoDe } from "../test/render";

// A sidebar do desktop e a gaveta do celular compartilham o mesmo interior, mas
// a gaveta só existe depois do clique no menu — então aqui há uma navegação só.
function naNavegacao() {
  return within(screen.getByRole("navigation", { name: "Seções do painel" }));
}

function montar(role: "rep" | "admin"): string[] {
  const chamadas = mockarApi((caminho) => {
    if (caminho === "/auth/logout") {
      return { ok: true, status: 204, corpo: null };
    }
    if (caminho === "/tickets") {
      return { ok: true, status: 200, corpo: { tickets: [] } };
    }
    return sessaoDe(role);
  });

  renderizarComProvedores(
    <Routes>
      <Route path="/painel" element={<PainelLayout />}>
        <Route path="tickets" element={<p>Conteúdo da fila</p>} />
      </Route>
      <Route path="/" element={<p>Site público</p>} />
    </Routes>,
    { rota: "/painel/tickets" }
  );

  return chamadas;
}

describe("PainelLayout", () => {
  it("monta a navegação e o conteúdo da rota", async () => {
    montar("admin");

    expect(await screen.findByRole("link", { name: "Demanda" })).toBeInTheDocument();
    expect(naNavegacao().getByRole("link", { name: "Fila de pedidos" })).toBeInTheDocument();
    expect(screen.getByText("Conteúdo da fila")).toBeInTheDocument();
  });

  it("usa o título da rota no cabeçalho", async () => {
    montar("rep");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Fila de pedidos" })
    ).toBeInTheDocument();
  });

  // O selo era a string ADMIN fixa: o representante aparecia como admin.
  it("mostra o papel de quem está logado, não ADMIN fixo", async () => {
    montar("rep");

    expect(await screen.findByText("Representante")).toBeInTheDocument();
    expect(screen.queryByText("Administrador")).not.toBeInTheDocument();
  });

  // RN06 — estoque e catálogo são exclusivos do admin, e o backend também
  // responde 403 para o representante nessas rotas.
  it("esconde o catálogo do representante", async () => {
    montar("rep");

    await screen.findByRole("link", { name: "Demanda" });
    expect(
      naNavegacao().queryByRole("link", { name: "Catálogo e estoque" })
    ).not.toBeInTheDocument();
  });

  it("mostra o catálogo para o admin", async () => {
    montar("admin");

    expect(
      await screen.findByRole("link", { name: "Catálogo e estoque" })
    ).toBeInTheDocument();
  });

  it("marca a rota atual como ativa", async () => {
    montar("admin");

    const atual = await screen.findByRole("link", { name: "Fila de pedidos" });
    // NavLink marca a rota corrente com aria-current.
    expect(atual).toHaveAttribute("aria-current", "page");
    expect(naNavegacao().getByRole("link", { name: "Demanda" })).not.toHaveAttribute(
      "aria-current"
    );
  });

  it("oferece o atalho para o site público", async () => {
    montar("rep");

    expect(await screen.findByRole("link", { name: /Ver o site/ })).toBeInTheDocument();
  });

  it("encerra a sessão e sai do painel", async () => {
    const chamadas = montar("admin");

    const abrirMenu = await screen.findByRole("button", { name: /Abrir menu da conta/ });
    // Radix abre o menu no pointerdown, não no click; pelo teclado o gatilho
    // responde a Enter, que é o caminho estável no jsdom.
    fireEvent.keyDown(abrirMenu, { key: "Enter" });

    const sair = await screen.findByRole("menuitem", { name: /Sair/ });
    fireEvent.click(sair);

    await waitFor(() => expect(chamadas).toContain("POST /auth/logout"));
  });

  it("mostra o contador de pedidos novos quando existem", async () => {
    mockarApi((caminho) => {
      if (caminho === "/tickets") {
        return {
          ok: true,
          status: 200,
          corpo: {
            tickets: [
              { id: "a", status: "PENDENTE", items: [] },
              { id: "b", status: "PENDENTE", items: [] },
            ],
          },
        };
      }
      return sessaoDe("rep");
    });

    renderizarComProvedores(
      <Routes>
        <Route path="/painel" element={<PainelLayout />}>
          <Route path="tickets" element={<p>Conteúdo da fila</p>} />
        </Route>
      </Routes>,
      { rota: "/painel/tickets" }
    );

    expect(await screen.findByLabelText("2 pedidos novos")).toBeInTheDocument();
  });
});
