import { fireEvent, screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import Landing from "./Landing";
import { useLocation } from "react-router-dom";
import { mockarApi, renderizarComProvedores, SEM_SESSAO } from "../test/render";

function MostraBusca() {
  const { search } = useLocation();
  return <p data-testid="busca">{search.replace(/^\?/, "")}</p>;
}

const MARCAS = { makes: ["VOLKSWAGEN", "CHEVROLET"] };
const MODELOS = {
  models: [
    { model: "GOL", yearStart: 2008, yearEnd: 2016 },
    { model: "SAVEIRO", yearStart: 0, yearEnd: 9999 },
  ],
};

function montar(extra?: (caminho: string) => unknown) {
  const chamadas = mockarApi((caminho) => {
    if (caminho === "/auth/me") {
      return SEM_SESSAO;
    }
    if (caminho === "/compatibility/makes") {
      return { ok: true, status: 200, corpo: MARCAS };
    }
    if (caminho === "/compatibility/models") {
      return { ok: true, status: 200, corpo: MODELOS };
    }
    const resposta = extra?.(caminho);
    if (resposta) {
      return resposta as { ok: boolean; status: number; corpo: unknown };
    }
    return { ok: true, status: 200, corpo: {} };
  });

  renderizarComProvedores(
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/resultado" element={<p>Tela de resultado</p>} />
    </Routes>,
    { rota: "/" }
  );
  return chamadas;
}

describe("Landing", () => {
  it("mostra a manchete e a proposta do BuscaLED", () => {
    montar();

    expect(
      screen.getByRole("heading", { level: 1, name: /Descubra qual LED serve no seu carro/ })
    ).toBeInTheDocument();
    expect(screen.getByText(/encaixes diferentes no farol baixo/)).toBeInTheDocument();
  });

  it("põe o buscador na primeira dobra, não como âncora", () => {
    montar();

    // O campo de placa existe na carga inicial da página.
    expect(screen.getByLabelText("Placa do veículo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Buscar" })).toBeInTheDocument();
  });

  it("começa na aba da placa e troca para marca, modelo e ano", async () => {
    montar();

    expect(screen.getByRole("tab", { name: "Pela placa" })).toHaveAttribute(
      "aria-selected",
      "true"
    );

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Marca, modelo e ano" }));
    expect(await screen.findByRole("combobox", { name: "Marca" })).toBeInTheDocument();
  });

  it("recusa placa com tamanho inválido em vez de buscar", () => {
    const chamadas = montar();

    fireEvent.change(screen.getByLabelText("Placa do veículo"), {
      target: { value: "ABC" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Confira a placa");
    expect(chamadas.some((c) => c.includes("/plate"))).toBe(false);
  });

  it("aceita placa Mercosul e placa antiga", () => {
    montar();
    const campo = screen.getByLabelText("Placa do veículo");

    for (const placa of ["ABC1D23", "ABC1234"]) {
      fireEvent.change(campo, { target: { value: placa } });
      fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    }
  });

  // KPI de fallback automático: falha de placa move para o manual com aviso.
  it("cai para a busca manual quando a placa falha", async () => {
    montar((caminho) =>
      caminho === "/plate"
        ? { ok: false, status: 404, corpo: { error: "Placa não encontrada." } }
        : undefined
    );

    fireEvent.change(screen.getByLabelText("Placa do veículo"), {
      target: { value: "ABC1D23" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    expect(await screen.findByText(/Não achamos essa placa/)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Marca, modelo e ano" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("explica que a placa não é armazenada", () => {
    montar();

    expect(screen.getByText(/Sua placa não é armazenada/)).toBeInTheDocument();
  });

  it("oferece marca e modelo com dados reais da matriz", async () => {
    montar();

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Marca, modelo e ano" }));
    const marca = await screen.findByRole("combobox", { name: "Marca" });
    // O gatilho fica desabilitado enquanto a lista de marcas não chega.
    await waitFor(() => expect(marca).not.toBeDisabled());

    fireEvent.click(marca);
    expect(await screen.findByRole("option", { name: /VOLKSWAGEN/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /CHEVROLET/ })).toBeInTheDocument();
  });

  it("cobra marca, modelo e ano antes de buscar", async () => {
    montar();

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Marca, modelo e ano" }));
    await screen.findByRole("combobox", { name: "Marca" });

    fireEvent.click(screen.getByRole("button", { name: "Ver LEDs compatíveis" }));
    expect(await screen.findByText("Escolha marca, modelo e ano.")).toBeInTheDocument();
  });

  it("lista os três passos como sequência numerada", () => {
    montar();

    expect(screen.getByText("Informe o carro")).toBeInTheDocument();
    expect(screen.getByText("Veja posição por posição")).toBeInTheDocument();
    expect(screen.getByText("Gere a reserva")).toBeInTheDocument();
  });

  it("lista as treze posições que a matriz cobre", () => {
    montar();

    expect(screen.getByRole("heading", { name: /As posições que a matriz cobre/ })).toBeInTheDocument();
    expect(screen.getByText("Farol baixo")).toBeInTheDocument();
    expect(screen.getByText("Luz de freio")).toBeInTheDocument();
    expect(screen.getByText("DRL")).toBeInTheDocument();
  });

  it("responde as dúvidas sem inventar número nenhum", () => {
    montar();

    expect(screen.getByText("Vocês guardam a minha placa?")).toBeInTheDocument();
    expect(screen.getByText(/Gerar uma reserva já é comprar/)).toBeInTheDocument();
    // Nenhuma estatística: as métricas reais exigem autenticação.
    expect(screen.queryByText(/\d+ clientes/)).not.toBeInTheDocument();
    expect(screen.queryByText(/mil/)).not.toBeInTheDocument();
  });

  // RN02: a placa resolve o veículo e morre ali. Só marca, modelo e ano seguem.
  it("não deixa a placa chegar na URL nem sobrar no campo", async () => {
    mockarApi((caminho) => {
      if (caminho === "/auth/me") {
        return SEM_SESSAO;
      }
      if (caminho === "/plate") {
        return {
          ok: true,
          status: 200,
          corpo: { make: "VOLKSWAGEN", model: "GOL", year: 2018 },
        };
      }
      return { ok: true, status: 200, corpo: {} };
    });

    renderizarComProvedores(
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/resultado" element={<MostraBusca />} />
      </Routes>,
      { rota: "/" }
    );

    const campo = screen.getByLabelText("Placa do veículo");
    fireEvent.change(campo, { target: { value: "ABC1D23" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    const busca = await screen.findByTestId("busca");
    const parametros = new URLSearchParams(busca.textContent ?? "");
    expect([...parametros.keys()].sort()).toEqual(["make", "model", "year"]);
    expect(busca.textContent).not.toContain("ABC1D23");

    // E a placa também não fica pendurada no estado do formulário.
    expect(sessionStorage.getItem("buscaled:reserva") ?? "").not.toContain("ABC1D23");
  });

  it("leva para o resultado quando a placa resolve", async () => {
    montar((caminho) =>
      caminho === "/plate"
        ? {
            ok: true,
            status: 200,
            corpo: { make: "VOLKSWAGEN", model: "GOL", year: 2018 },
          }
        : undefined
    );

    fireEvent.change(screen.getByLabelText("Placa do veículo"), {
      target: { value: "ABC1D23" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    await waitFor(() => {
      expect(screen.getByText("Tela de resultado")).toBeInTheDocument();
    });
  });
});
