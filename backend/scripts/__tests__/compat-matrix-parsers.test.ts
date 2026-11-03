import {
  InvalidYearRangeError,
  extractBaseModel,
  parsePositionCell,
  parseYearRange,
} from "../compat-matrix-parsers";

describe("parseYearRange", () => {
  it("trata o formato de intervalo 'AAAA > AAAA'", () => {
    expect(parseYearRange("1985 > 1989")).toEqual({ yearStart: 1985, yearEnd: 1989 });
  });

  it("trata o formato de ano único 'AAAA'", () => {
    expect(parseYearRange("2020")).toEqual({ yearStart: 2020, yearEnd: 2020 });
  });

  // '>' é 'a partir de' nas duas posições — as duas formas dão a mesma faixa.
  it("trata '> AAAA' como 'a partir de AAAA', igual a 'AAAA >'", () => {
    expect(parseYearRange("> 2016")).toEqual({ yearStart: 2016, yearEnd: 9999 });
    expect(parseYearRange("> 2016")).toEqual(parseYearRange("2016 >"));
  });

  it("trata '< AAAA' como 'até AAAA' — o único formato que abre o início", () => {
    expect(parseYearRange("< 1996")).toEqual({ yearStart: 0, yearEnd: 1996 });
  });

  // Formato que o parser antigo gravava como yearEnd 0, porque fatiava no ">"
  // e Number("") e 0, nao NaN. Eram 37 modelos invisiveis em qualquer busca.
  it("trata 'AAAA >' como 'a partir de AAAA'", () => {
    expect(parseYearRange("2015 >")).toEqual({ yearStart: 2015, yearEnd: 9999 });
  });

  it("aceita espaços extras ao redor dos valores", () => {
    expect(parseYearRange("  1991 > 1998  ")).toEqual({ yearStart: 1991, yearEnd: 1998 });
    expect(parseYearRange("  2015 > ")).toEqual({ yearStart: 2015, yearEnd: 9999 });
  });

  it("aceita espaço não separável, que a planilha costuma trazer", () => {
    const nbsp = String.fromCharCode(0x00a0);
    expect(parseYearRange(`${nbsp}2015${nbsp}>${nbsp}`)).toEqual({
      yearStart: 2015,
      yearEnd: 9999,
    });
  });

  it("lança InvalidYearRangeError para um formato não reconhecido", () => {
    expect(() => parseYearRange("depende do motor")).toThrow(InvalidYearRangeError);
    expect(() => parseYearRange("abc")).toThrow(InvalidYearRangeError);
  });

  it("recusa valor vazio em vez de virar ano 0", () => {
    expect(() => parseYearRange("")).toThrow(InvalidYearRangeError);
    expect(() => parseYearRange("   ")).toThrow(InvalidYearRangeError);
  });

  // Erro de digitação real da planilha: CHEVROLET CRUZE 1.8 FLEX, "2012 > 215".
  // Nao e corrigido em silencio — tem que aparecer no relatorio de importacao.
  it("recusa ano fora da faixa plausível, como o '215' do Cruze", () => {
    expect(() => parseYearRange("2012 > 215")).toThrow(InvalidYearRangeError);
    expect(() => parseYearRange("1800")).toThrow(InvalidYearRangeError);
    expect(() => parseYearRange("> 2200")).toThrow(InvalidYearRangeError);
  });

  it("recusa intervalo invertido", () => {
    expect(() => parseYearRange("2015 > 2010")).toThrow(InvalidYearRangeError);
  });

  it("explica o motivo na mensagem, com o valor bruto", () => {
    expect(() => parseYearRange("2012 > 215")).toThrow(/"2012 > 215"/);
    expect(() => parseYearRange("1800")).toThrow(/fora da faixa/);
  });
});

describe("extractBaseModel", () => {
  it("corta no primeiro token puramente numérico (motorização)", () => {
    expect(extractBaseModel("LEGEND 3.2 3.5")).toBe("LEGEND");
    expect(extractBaseModel("MARRUÁ 2.8 4X4 100 Cd")).toBe("MARRUÁ");
  });

  it("mantém a string inteira quando não há token puramente numérico", () => {
    expect(extractBaseModel("INTEGRA GS1.8")).toBe("INTEGRA GS1.8");
  });

  it("remove espaços nas pontas", () => {
    expect(extractBaseModel("  NSX 3.0  ")).toBe("NSX");
  });
});

describe("parsePositionCell", () => {
  it("retorna lista vazia para célula '-' (não aplicável)", () => {
    expect(parsePositionCell("-")).toEqual([]);
  });

  it("retorna lista vazia para célula 'LED' (já sai de fábrica com LED)", () => {
    expect(parsePositionCell("LED")).toEqual([]);
  });

  it("retorna lista vazia para célula nula/vazia", () => {
    expect(parsePositionCell(null)).toEqual([]);
    expect(parsePositionCell(undefined)).toEqual([]);
  });

  it("retorna um único soquete pro caso normal", () => {
    expect(parsePositionCell("H4")).toEqual(["H4"]);
  });

  it("NÃO separa códigos reais de filamento duplo que contêm '/'", () => {
    expect(parsePositionCell("P21/5W")).toEqual(["P21/5W"]);
    expect(parsePositionCell("P21/4W")).toEqual(["P21/4W"]);
  });

  it("separa células compostas com dois soquetes alternativos", () => {
    expect(parsePositionCell("H1 / HB3")).toEqual(["H1", "HB3"]);
    expect(parsePositionCell("D3S/D4S")).toEqual(["D3S", "D4S"]);
  });

  it("remove 'LED' de dentro de uma célula composta, mantendo o soquete real", () => {
    expect(parsePositionCell("LED / W16W")).toEqual(["W16W"]);
  });
});
