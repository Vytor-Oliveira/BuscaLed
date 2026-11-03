import fs from "fs";
import path from "path";
import { InvalidYearRangeError, parseYearRange } from "../compat-matrix-parsers";
import { RawRow } from "../import-compat-matrix";

const MATRIZ = path.join(__dirname, "..", "..", "data", "compat-matrix.json");

/**
 * Regressão dos 37 modelos que ficavam invisíveis: o parser antigo gravava
 * yearEnd 0 para o formato "AAAA >", e a busca exige yearEnd >= ano, então
 * esses veículos não casavam com ano nenhum.
 *
 * Roda sobre a planilha real convertida, não sobre fixture sintética — era
 * justamente o dado real que expunha o caso. Sem banco: o defeito está no
 * parse, e o teste fica rápido e determinístico.
 */
const existeMatriz = fs.existsSync(MATRIZ);
const descreve = existeMatriz ? describe : describe.skip;

descreve("matriz real da Shocklight", () => {
  const linhas: RawRow[] = existeMatriz
    ? (JSON.parse(fs.readFileSync(MATRIZ, "utf-8")) as RawRow[])
    : [];

  function faixas(): Array<{ linha: number; yearStart: number; yearEnd: number }> {
    const out: Array<{ linha: number; yearStart: number; yearEnd: number }> = [];
    linhas.forEach((row, i) => {
      try {
        out.push({ linha: i + 1, ...parseYearRange(row.ano) });
      } catch {
        // Linha rejeitada entra no relatório de importação, não aqui.
      }
    });
    return out;
  }

  it("nenhuma faixa aceita tem fim menor que o início", () => {
    const invertidas = faixas().filter((f) => f.yearEnd < f.yearStart);
    expect(invertidas).toEqual([]);
  });

  // O que de fato quebrava: faixa válida na forma, mas impossível de casar.
  // Casar é ter interseção com os anos de um carro real — faixa inteira fora
  // de 1950–2100 deixa o veículo tão invisível quanto o yearEnd 0 deixava.
  it("toda faixa aceita cobre pelo menos um ano plausível", () => {
    const inalcancaveis = faixas().filter((f) => f.yearEnd < 1950 || f.yearStart > 2100);
    expect(inalcancaveis).toEqual([]);
  });

  it("as 46 linhas 'AAAA >' abrem a faixa à direita, não yearEnd 0", () => {
    const abertas = linhas.filter((row) => /^\d{4}\s*>$/.test(row.ano.trim()));
    expect(abertas).toHaveLength(46);

    for (const row of abertas) {
      const faixa = parseYearRange(row.ano);
      expect(faixa.yearEnd).toBe(9999);
      expect(faixa.yearStart).toBeGreaterThan(0);
    }
  });

  // 120 no formato "> AAAA" mais 1 no "< AAAA" (AUDI A3, "< 1996").
  it("as 121 linhas 'até AAAA' abrem a faixa à esquerda (yearStart 0)", () => {
    const abertas = linhas.filter((row) => /^[<>]\s*\d{4}$/.test(row.ano.trim()));
    expect(abertas).toHaveLength(121);

    for (const row of abertas) {
      const faixa = parseYearRange(row.ano);
      expect(faixa.yearStart).toBe(0);
      expect(faixa.yearEnd).toBeLessThan(9999);
    }
  });

  // O "2012 > 215" do Cruze foi corrigido na planilha de origem, então hoje a
  // matriz entra inteira. Qualquer rejeição nova aparece aqui com o valor bruto.
  it("nenhuma linha da matriz é rejeitada", () => {
    const rejeitadas = linhas.flatMap((row, i) => {
      try {
        parseYearRange(row.ano);
        return [];
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidYearRangeError);
        return [{ linha: i + 1, montadora: row.montadora, ano: row.ano }];
      }
    });

    expect(rejeitadas).toEqual([]);
  });
});
