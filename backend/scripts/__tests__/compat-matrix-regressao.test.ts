import fs from "fs";
import path from "path";
import {
  InvalidYearRangeError,
  extractBaseModel,
  parseYearRange,
} from "../compat-matrix-parsers";
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

  // Modelo é a chave do banco: make + nome-base + faixa. Várias linhas da
  // planilha (acabamentos) colapsam no mesmo modelo, daí linha != modelo.
  function modelosDe(rowsFiltradas: RawRow[]): Set<string> {
    return new Set(
      rowsFiltradas.map((row) => {
        const faixa = parseYearRange(row.ano);
        const make = row.montadora.trim().toUpperCase();
        return `${make}|${extractBaseModel(row.carro).toUpperCase()}|${faixa.yearStart}|${faixa.yearEnd}`;
      })
    );
  }

  // 46 linhas na forma "AAAA >" mais 120 na forma "> AAAA": ">" é "a partir
  // de" nas duas posições. Era a forma "AAAA >" que gravava yearEnd 0.
  it("as 166 linhas 'a partir de' abrem a faixa à direita, em 144 modelos", () => {
    const abertas = linhas.filter((row) =>
      /^(\d{4}\s*>|>\s*\d{4})$/.test(row.ano.trim())
    );
    expect(abertas).toHaveLength(166);
    expect(modelosDe(abertas).size).toBe(144);

    for (const row of abertas) {
      const faixa = parseYearRange(row.ano);
      expect(faixa.yearEnd).toBe(9999);
      expect(faixa.yearStart).toBeGreaterThan(0);
    }
  });

  // Só o "< AAAA" abre o início, e a planilha tem uma linha só: AUDI A3.
  it("a única linha 'até AAAA' abre a faixa à esquerda, em 1 modelo", () => {
    const abertas = linhas.filter((row) => /^<\s*\d{4}$/.test(row.ano.trim()));
    expect(abertas).toHaveLength(1);
    expect(modelosDe(abertas).size).toBe(1);
    expect(parseYearRange(abertas[0].ano)).toEqual({ yearStart: 0, yearEnd: 1996 });
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
