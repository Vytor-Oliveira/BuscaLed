import type { VehicleModelOption } from "../api/compatibility";
import {
  anosDoModelo,
  nomesDeModelo,
  PRIMEIRO_ANO,
  rotuloDaFaixa,
  ultimoAno,
} from "./veiculo";

const faixa = (
  model: string,
  yearStart: number,
  yearEnd: number
): VehicleModelOption => ({ model, yearStart, yearEnd });

describe("nomesDeModelo", () => {
  it("não repete o nome quando o modelo vem em várias faixas", () => {
    const nomes = nomesDeModelo([
      faixa("GOL", 2008, 2012),
      faixa("GOL", 2013, 2016),
      faixa("SAVEIRO", 2010, 2020),
    ]);
    expect(nomes).toEqual(["GOL", "SAVEIRO"]);
  });
});

describe("rotuloDaFaixa", () => {
  it("mostra a faixa fechada com as duas pontas", () => {
    expect(rotuloDaFaixa(faixa("GOL", 2008, 2012))).toBe("2008–2012");
  });

  it("traduz a ponta esquerda aberta em vez de mostrar o ano 0", () => {
    expect(rotuloDaFaixa(faixa("GOL", 0, 2012))).toBe("até 2012");
  });

  it("traduz a ponta direita aberta em vez de mostrar 9999", () => {
    expect(rotuloDaFaixa(faixa("GOL", 2015, 9999))).toBe("2015 em diante");
  });

  it("diz todos os anos quando as duas pontas são abertas", () => {
    expect(rotuloDaFaixa(faixa("GOL", 0, 9999))).toBe("todos os anos");
  });

  it("mostra um único ano quando a faixa tem tamanho um", () => {
    expect(rotuloDaFaixa(faixa("GOL", 2019, 2019))).toBe("2019");
  });
});

describe("anosDoModelo", () => {
  const modelos = [
    faixa("GOL", 2008, 2012),
    faixa("GOL", 2013, 2016),
    faixa("ABERTO", 0, 9999),
    faixa("SO_INICIO", 0, 1975),
    faixa("SO_FIM", 2020, 9999),
  ];

  it("oferece exatamente os anos da faixa fechada, do mais novo ao mais antigo", () => {
    expect(anosDoModelo([faixa("GOL", 2008, 2010)], "GOL")).toEqual([2010, 2009, 2008]);
  });

  it("une as faixas quando o mesmo modelo aparece mais de uma vez", () => {
    const anos = anosDoModelo(modelos, "GOL");
    expect(anos[0]).toBe(2016);
    expect(anos[anos.length - 1]).toBe(2008);
    expect(anos).toHaveLength(9);
  });

  it("apara a ponta esquerda aberta, sem oferecer o ano 0", () => {
    const anos = anosDoModelo(modelos, "SO_INICIO");
    expect(anos[anos.length - 1]).toBe(PRIMEIRO_ANO);
    expect(anos).not.toContain(0);
  });

  it("apara a ponta direita aberta no ano-modelo seguinte, sem oferecer 9999", () => {
    const anos = anosDoModelo(modelos, "SO_FIM");
    expect(anos[0]).toBe(ultimoAno());
    expect(anos).not.toContain(9999);
  });

  it("não explode em faixa totalmente aberta", () => {
    const anos = anosDoModelo(modelos, "ABERTO");
    expect(anos[0]).toBe(ultimoAno());
    expect(anos[anos.length - 1]).toBe(PRIMEIRO_ANO);
    expect(anos).toHaveLength(ultimoAno() - PRIMEIRO_ANO + 1);
  });

  it("devolve vazio para modelo que não está na lista", () => {
    expect(anosDoModelo(modelos, "NAO_EXISTE")).toEqual([]);
  });
});
