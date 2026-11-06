import { fireEvent, render, screen, within } from "@testing-library/react";
import { SeletorVeiculo, rotuloFaixa } from "./SeletorVeiculo";

const NORMAL = { model: "FOCUS", yearStart: 2012, yearEnd: 2015 };
const ATE = { model: "A3", yearStart: 0, yearEnd: 1996 };
const EM_DIANTE = { model: "RS3", yearStart: 2016, yearEnd: 9999 };

const ANO_MAXIMO = new Date().getFullYear() + 1;

function mockApi(modelos: Array<typeof NORMAL>) {
  globalThis.fetch = ((url: string) => {
    const u = String(url);
    const responder = (corpo: unknown) =>
      Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(corpo) });

    if (u.includes("/compatibility/makes")) return responder({ makes: ["FORD"] });
    if (u.includes("/compatibility/models")) return responder({ models: modelos });

    return responder({});
  }) as unknown as typeof fetch;
}

// Escolhe a marca e o primeiro modelo, devolvendo os anos oferecidos.
async function anosOferecidos(modelos: Array<typeof NORMAL>): Promise<string[]> {
  mockApi(modelos);
  render(<SeletorVeiculo aoEscolher={() => {}} />);

  fireEvent.change(await screen.findByLabelText("Marca"), { target: { value: "FORD" } });
  const modelo = await screen.findByLabelText("Modelo");
  await screen.findByRole("option", { name: new RegExp(modelos[0].model) });
  fireEvent.change(modelo, { target: { value: "0" } });

  const ano = screen.getByLabelText("Ano");
  return within(ano)
    .getAllByRole("option")
    .map((o) => o.textContent ?? "")
    .filter((texto) => !texto.startsWith("Selecione"));
}

describe("rotuloFaixa", () => {
  it("mostra a faixa fechada com as duas pontas", () => {
    expect(rotuloFaixa(NORMAL)).toBe("2012–2015");
  });

  // Sem isso a tela mostraria "A3 (0–1996)" e "RS3 (2016–9999)".
  it("traduz as faixas abertas em vez de mostrar 0 e 9999", () => {
    expect(rotuloFaixa(ATE)).toBe("até 1996");
    expect(rotuloFaixa(EM_DIANTE)).toBe("2016 em diante");
  });
});

describe("SeletorVeiculo — anos oferecidos", () => {
  it("oferece exatamente os anos da faixa fechada", async () => {
    expect(await anosOferecidos([NORMAL])).toEqual(["2015", "2014", "2013", "2012"]);
  });

  it("corta a faixa aberta à esquerda em 1950, sem oferecer ano 0", async () => {
    const anos = await anosOferecidos([ATE]);

    expect(anos[0]).toBe("1996");
    expect(anos[anos.length - 1]).toBe("1950");
    expect(anos).toHaveLength(1996 - 1950 + 1);
    expect(anos).not.toContain("0");
    expect(anos.every((a) => Number(a) >= 1950)).toBe(true);
  });

  it("corta a faixa aberta à direita no ano-modelo seguinte, sem oferecer 9999", async () => {
    const anos = await anosOferecidos([EM_DIANTE]);

    expect(anos[0]).toBe(String(ANO_MAXIMO));
    expect(anos[anos.length - 1]).toBe("2016");
    expect(anos).toHaveLength(ANO_MAXIMO - 2016 + 1);
    expect(anos).not.toContain("9999");
    expect(anos.every((a) => Number(a) <= ANO_MAXIMO)).toBe(true);
  });

  it("rotula a opção de modelo com a faixa traduzida", async () => {
    mockApi([ATE, EM_DIANTE, NORMAL]);
    render(<SeletorVeiculo aoEscolher={() => {}} />);

    fireEvent.change(await screen.findByLabelText("Marca"), { target: { value: "FORD" } });

    expect(await screen.findByRole("option", { name: "A3 (até 1996)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "RS3 (2016 em diante)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "FOCUS (2012–2015)" })).toBeInTheDocument();
  });
});
