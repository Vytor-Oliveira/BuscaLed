import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import type { PositionCompatibility } from "../api/compatibility";
import Resultado from "./Resultado";
import { mockarApi, renderizarComProvedores, SEM_SESSAO, sessaoDe } from "../test/render";

const ROTA = "/resultado?make=VOLKSWAGEN&model=GOL&year=2018";

const comProduto: PositionCompatibility = {
  position: "FAROL_BAIXO",
  socketCodes: ["H4"],
  models: [
    {
      ledModelId: "led-1",
      sku: "SLL-140004",
      name: "Ultraled Infinity H4",
      socketCode: "H4",
      imageUrl: "/leds/SLL-140004.jpg",
      priceCents: 12990,
      unitsPerKit: 2,
      inStock: true,
    },
    {
      ledModelId: "led-2",
      sku: "SLL-140001X",
      name: "S14X H4",
      socketCode: "H4",
      imageUrl: null,
      priceCents: null,
      unitsPerKit: 2,
      inStock: false,
    },
  ],
};

const semProduto: PositionCompatibility = {
  position: "PISCA_DIANTEIRO",
  socketCodes: ["PY21W"],
  models: [],
};

function montar(
  positions: PositionCompatibility[],
  { logado = false, status = 200, corpo }: { logado?: boolean; status?: number; corpo?: unknown } = {}
) {
  const chamadas = mockarApi((caminho) => {
    if (caminho === "/auth/me") {
      return logado ? sessaoDe("user") : SEM_SESSAO;
    }
    if (caminho === "/compatibility") {
      return status === 200
        ? { ok: true, status: 200, corpo: { positions } }
        : { ok: false, status, corpo: corpo ?? { error: "Falhou." } };
    }
    return { ok: true, status: 200, corpo: {} };
  });

  renderizarComProvedores(
    <Routes>
      <Route path="/resultado" element={<Resultado />} />
      <Route path="/reserva" element={<p>Tela de reserva</p>} />
      <Route path="/" element={<p>Página inicial</p>} />
    </Routes>,
    { rota: ROTA }
  );
  return chamadas;
}

// O mesmo modelo/ano pode ter saido de fabrica com farol halogeno (H7) e
// xenon (D3S). A matriz devolve os dois, e o catalogo so tem produto para um.
const comAlternativa: PositionCompatibility = {
  position: "FAROL_BAIXO",
  socketCodes: ["H7", "D3S"],
  models: [
    {
      ledModelId: "led-1",
      sku: "SHK-S14-H7",
      name: "Headlight S14 Nano H7",
      socketCode: "H7",
      imageUrl: null,
      priceCents: 17182,
      unitsPerKit: 2,
      inStock: true,
    },
  ],
};

describe("Resultado — posição com mais de um encaixe", () => {
  it("apresenta os encaixes como alternativas, não como lista do que o carro tem", async () => {
    montar([comAlternativa]);

    await screen.findByRole("heading", { name: "Farol baixo" });
    expect(screen.getByRole("button", { name: "H7" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "D3S" })).toBeInTheDocument();
    expect(screen.getByText("ou")).toBeInTheDocument();
  });

  it("avisa que o modelo saiu em mais de uma versão de farol", async () => {
    montar([comAlternativa]);

    expect(
      await screen.findByText(/saiu de fábrica com mais de um tipo de farol/)
    ).toBeInTheDocument();
  });

  // O risco real: quem tem xênon veria quatro produtos H7 e nenhum serve.
  it("diz qual encaixe ficou sem produto no catálogo", async () => {
    montar([comAlternativa]);

    await screen.findByRole("heading", { name: "Farol baixo" });
    expect(screen.getByText(/ainda não temos LED para/)).toBeInTheDocument();
    expect(screen.getByText("D3S", { selector: "strong" })).toBeInTheDocument();
  });

  it("destaca o encaixe de cada produto quando há alternativa", async () => {
    montar([comAlternativa]);

    expect(await screen.findByText("serve no encaixe H7")).toBeInTheDocument();
  });

  it("não avisa nada quando a posição tem um encaixe só", async () => {
    montar([comProduto]);

    await screen.findByRole("heading", { name: "Farol baixo" });
    expect(
      screen.queryByText(/saiu de fábrica com mais de um tipo de farol/)
    ).not.toBeInTheDocument();
    // Os dois modelos desta posição usam H4, então a linha aparece duas vezes.
    expect(screen.getAllByText("encaixe H4")).toHaveLength(2);
  });
});

describe("Resultado", () => {
  it("agrupa os LEDs por posição de farol", async () => {
    montar([comProduto]);

    expect(await screen.findByRole("heading", { name: "Farol baixo" })).toBeInTheDocument();
    expect(screen.getByText("Ultraled Infinity H4")).toBeInTheDocument();
    expect(screen.getByText("S14X H4")).toBeInTheDocument();
  });

  it("mostra o veículo identificado no cabeçalho", async () => {
    montar([comProduto]);

    expect(
      await screen.findByRole("heading", { level: 1, name: "VOLKSWAGEN GOL" })
    ).toBeInTheDocument();
    expect(screen.getByText(/Ano 2018/)).toBeInTheDocument();
  });

  it("mostra o encaixe da posição", async () => {
    montar([comProduto]);

    await screen.findByRole("heading", { name: "Farol baixo" });
    expect(screen.getByRole("button", { name: "H4" })).toBeInTheDocument();
  });

  // A lacuna é informação: aparece recolhida, nunca escondida.
  it("lista a posição sem produto como encaixe, sem virar cartão de compra", async () => {
    montar([comProduto, semProduto]);

    await screen.findByRole("heading", { name: "Farol baixo" });
    expect(
      screen.getByText(/1 posição existe no seu carro, mas ainda sem LED no catálogo/)
    ).toBeInTheDocument();
    expect(screen.getByText("Pisca dianteiro")).toBeInTheDocument();
    expect(screen.getByText("PY21W")).toBeInTheDocument();
  });

  it("mostra a foto do produto quando existe e o ícone quando não", async () => {
    montar([comProduto]);

    expect(await screen.findByAltText("Foto do Ultraled Infinity H4")).toBeInTheDocument();
    expect(screen.queryByAltText("Foto do S14X H4")).not.toBeInTheDocument();
  });

  it("distingue em estoque de sob consulta", async () => {
    montar([comProduto]);

    await screen.findByRole("heading", { name: "Farol baixo" });
    expect(screen.getByText("Em estoque")).toBeInTheDocument();
    expect(screen.getByText("Sob consulta")).toBeInTheDocument();
  });

  // O kit da Shocklight já vem com o par: pedir 2 daria quatro lâmpadas.
  it("escolhe o modelo com quantidade 1, porque o kit já é o par", async () => {
    montar([comProduto]);

    await screen.findByRole("heading", { name: "Farol baixo" });
    fireEvent.click(screen.getByRole("button", { name: /Ultraled Infinity H4/ }));

    expect(await screen.findByLabelText("Quantidade de Ultraled Infinity H4")).toHaveTextContent(
      "1"
    );
  });

  it("avisa que o kit já cobre os dois lados", async () => {
    montar([comProduto]);

    expect(await screen.findByText(/Cada kit já vem com 2 lâmpadas/)).toBeInTheDocument();
    expect(screen.getAllByText("o kit (par)").length).toBeGreaterThan(0);
  });

  // Torpedo é vendido avulso: a frase do par seria mentira para ele.
  it("trata o produto avulso como unidade, não como par", async () => {
    const torpedo: PositionCompatibility = {
      position: "PLACA",
      socketCodes: ["C5W"],
      models: [
        {
          ledModelId: "led-torpedo",
          sku: "SHK-C5W",
          name: "Torpedo C5W",
          socketCode: "C5W",
          imageUrl: null,
          priceCents: 4500,
          unitsPerKit: 1,
          inStock: true,
        },
      ],
    };
    montar([torpedo]);

    await screen.findByRole("heading", { name: "Placa" });
    expect(screen.getByText("a unidade")).toBeInTheDocument();
    // O aviso geral do par não pode aparecer numa lista que tem avulso.
    expect(screen.queryByText(/Cada kit já vem com/)).not.toBeInTheDocument();
  });

  it("deixa trocar a quantidade escolhida", async () => {
    montar([comProduto]);

    await screen.findByRole("heading", { name: "Farol baixo" });
    fireEvent.click(screen.getByRole("button", { name: /Ultraled Infinity H4/ }));
    await screen.findByLabelText("Quantidade de Ultraled Infinity H4");

    fireEvent.click(screen.getByRole("button", { name: "Aumentar quantidade" }));
    expect(screen.getByLabelText("Quantidade de Ultraled Infinity H4")).toHaveTextContent("2");
  });

  it("desmarca o modelo quando ele é clicado de novo", async () => {
    montar([comProduto]);

    await screen.findByRole("heading", { name: "Farol baixo" });
    const botao = screen.getByRole("button", { name: /Ultraled Infinity H4/ });
    fireEvent.click(botao);
    await screen.findByLabelText("Quantidade de Ultraled Infinity H4");

    fireEvent.click(botao);
    await waitFor(() => {
      expect(
        screen.queryByLabelText("Quantidade de Ultraled Infinity H4")
      ).not.toBeInTheDocument();
    });
  });

  it("acumula a seleção no resumo da reserva", async () => {
    montar([comProduto]);

    await screen.findByRole("heading", { name: "Farol baixo" });
    fireEvent.click(screen.getByRole("button", { name: /Ultraled Infinity H4/ }));

    const resumo = within(await screen.findByRole("complementary", { name: "Resumo da reserva" }));
    expect(resumo.getByText("Ultraled Infinity H4")).toBeInTheDocument();
    expect(resumo.getByText("1x")).toBeInTheDocument();
  });

  it("avisa que reserva não é compra antes de levar para a revisão", async () => {
    montar([comProduto]);

    await screen.findByRole("heading", { name: "Farol baixo" });
    fireEvent.click(screen.getByRole("button", { name: /Ultraled Infinity H4/ }));

    expect(
      await screen.findByText(/não é compra e não gera cobrança/)
    ).toBeInTheDocument();
  });

  it("mostra o preço de venda por unidade", async () => {
    montar([comProduto]);

    await screen.findByRole("heading", { name: "Farol baixo" });
    expect(screen.getByText("R$ 129,90")).toBeInTheDocument();
    // O segundo modelo não tem preço: nada é inventado no lugar.
    expect(screen.getAllByText(/R\$/).length).toBe(1);
  });

  it("soma o total da seleção no resumo", async () => {
    montar([comProduto]);

    await screen.findByRole("heading", { name: "Farol baixo" });
    fireEvent.click(screen.getByRole("button", { name: /Ultraled Infinity H4/ }));

    const resumo = within(await screen.findByRole("complementary", { name: "Resumo da reserva" }));
    // 1 kit × R$ 129,90 — o kit já é o par.
    expect(resumo.getByText("R$ 129,90")).toBeInTheDocument();
  });

  // O custo interno não pode chegar ao cliente por nenhuma rota.
  it("nunca expõe custo interno na tela do cliente", async () => {
    montar([comProduto]);

    await screen.findByRole("heading", { name: "Farol baixo" });
    expect(document.body.textContent).not.toMatch(/custo/i);
  });

  it("mostra o 404 do motor quando o veículo não está na matriz", async () => {
    montar([], { status: 404, corpo: { error: "Veículo não cadastrado." } });

    expect(
      await screen.findByText("Ainda não temos esse veículo na matriz")
    ).toBeInTheDocument();
  });

  it("mostra o erro que a API devolveu quando não é 404", async () => {
    montar([], { status: 500, corpo: { error: "Motor fora do ar." } });

    expect(await screen.findByText("Motor fora do ar.")).toBeInTheDocument();
  });

  it("cobra marca, modelo e ano antes de chamar a API", async () => {
    const chamadas = mockarApi(() => SEM_SESSAO);
    renderizarComProvedores(
      <Routes>
        <Route path="/resultado" element={<Resultado />} />
      </Routes>,
      { rota: "/resultado" }
    );

    expect(await screen.findByText("Faltou dizer qual carro")).toBeInTheDocument();
    expect(chamadas.some((c) => c.includes("/compatibility"))).toBe(false);
  });

  it("só oferece salvar na garagem para quem está logado", async () => {
    montar([comProduto], { logado: false });
    await screen.findByRole("heading", { name: "Farol baixo" });
    expect(
      screen.queryByRole("button", { name: /Salvar na garagem/ })
    ).not.toBeInTheDocument();
  });

  it("oferece salvar na garagem quando há sessão", async () => {
    montar([comProduto], { logado: true });

    expect(
      await screen.findByRole("button", { name: /Salvar na garagem/ })
    ).toBeInTheDocument();
  });

  // RN02: a placa nunca entra na URL nem no estado.
  it("não leva placa na URL — só marca, modelo e ano", async () => {
    montar([comProduto]);
    await screen.findByRole("heading", { name: "Farol baixo" });

    const parametros = new URLSearchParams(ROTA.split("?")[1]);
    expect([...parametros.keys()].sort()).toEqual(["make", "model", "year"]);
  });
});
