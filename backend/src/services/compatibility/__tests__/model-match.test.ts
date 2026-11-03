import { matchModelCandidates } from "../model-match";

function candidates(...models: string[]): Array<{ id: string; model: string }> {
  return models.map((model, index) => ({ id: `id-${index}`, model }));
}

function matchedModels(query: string, models: string[]): string[] {
  return matchModelCandidates(query, candidates(...models)).map((c) => c.model);
}

describe("matchModelCandidates", () => {
  it("casa o nome base com o texto de acabamento que a API devolve", () => {
    // consulta real da API de placa
    expect(
      matchedModels("NOVA SAVEIRO RB MBVS", [
        "Saveiro Robust 1.6 MSI CD (Flex)",
        "Gol 1.0 (Flex)",
      ])
    ).toEqual(["Saveiro Robust 1.6 MSI CD (Flex)"]);
  });

  it("casa o Civic de uma placa real com a linha longa da matriz", () => {
    // consulta real da API de placa
    expect(
      matchedModels("CIVIC LX", ["CIVIC SEDAN EX/EXS/LX/LXL/LXB 1.6/1.7 16V 4P", "FIT LX 1.4"])
    ).toEqual(["CIVIC SEDAN EX/EXS/LX/LXL/LXB 1.6/1.7 16V 4P"]);
  });

  it("não casa GOL quando o carro é GOLF", () => {
    expect(matchedModels("GOLF 1.6 GTI", ["Gol 1.0 (Flex)", "Golf GTI 2.0 TSI"])).toEqual([
      "Golf GTI 2.0 TSI",
    ]);
  });

  it("não casa FOX quando o carro é CROSSFOX", () => {
    expect(matchedModels("CROSSFOX 1.6", ["Fox 1.0", "Crossfox 1.6 (Flex)"])).toEqual([
      "Crossfox 1.6 (Flex)",
    ]);
  });

  it("não casa VOYAGE quando o carro é VOYAGER", () => {
    expect(matchedModels("VOYAGER GRAND SE", ["Voyage 1.6", "Voyager Grand SE 3.3"])).toEqual([
      "Voyager Grand SE 3.3",
    ]);
  });

  it("casa nome composto de duas palavras", () => {
    expect(matchedModels("SANTA FE GLS 3.5", ["Santa Fe GLS 3.5 V6", "Tucson GLS 2.0"])).toEqual([
      "Santa Fe GLS 3.5 V6",
    ]);
  });

  it("prefere o nome base que aparece mais no começo quando o tamanho empata", () => {
    // "CL" existe na matriz como nome base, mas o carro é um Gol
    expect(matchedModels("GOL 1.0 CL", ["Gol 1.0 (Flex)", "CL/CLI 1.8"])).toEqual([
      "Gol 1.0 (Flex)",
    ]);
  });

  it("prioriza igualdade exata, para o cadastro manual", () => {
    expect(matchedModels("Gol 1.0 (Flex)", ["Gol 1.0 (Flex)", "Gol 1.6 Power"])).toEqual([
      "Gol 1.0 (Flex)",
    ]);
  });

  it("devolve todos os acabamentos empatados, para o serviço decidir", () => {
    const result = matchedModels("NOVA SAVEIRO RB MBVS", [
      "Saveiro Robust 1.6 MSI CD (Flex)",
      "Saveiro Cross 1.6 16v MSI CD (Flex)",
    ]);
    expect(result).toHaveLength(2);
  });

  it("casa nome colado no acabamento sem espaço", () => {
    // consulta real da API de placa: a API devolve "C63AMGP30 COUPE" num token só
    expect(
      matchedModels("C63AMGP30 COUPE", [
        "C63 AMG/BLACK SERIES/COUPÉ/ TOURING 6.2/6.3",
        "C180 CGI CLASSIC",
      ])
    ).toEqual(["C63 AMG/BLACK SERIES/COUPÉ/ TOURING 6.2/6.3"]);
  });

  it("não deixa o match por início casar GOL num GOLF, mesmo sem GOLF entre os candidatos", () => {
    // O ano consultado não tem linha de Golf cadastrada, mas a marca tem —
    // então prefixo segue bloqueado e o resultado é vazio, não o Gol errado.
    const result = matchModelCandidates("GOLF 1.6 GTI", candidates("Gol 1.0 (Flex)"), [
      "Gol 1.0 (Flex)",
      "Golf GTI 2.0 TSI",
    ]);
    expect(result).toEqual([]);
  });

  it("no match por início, o nome base mais longo ganha", () => {
    expect(matchedModels("KADETTGSI 2.0", ["KA SE SEL PLUS", "KADETT GSI/SL/E"])).toEqual([
      "KADETT GSI/SL/E",
    ]);
  });

  it("prefere o nome no começo do texto, não o acabamento que casa exato", () => {
    // "COUPE" é nome base de outra linha e casa exato no 2º token, mas o carro
    // é o C63 — que só casa por início, no 1º token
    expect(matchedModels("C63AMGP30 COUPE", ["C63 AMG 6.2", "Coupe Sport 2.0"])).toEqual([
      "C63 AMG 6.2",
    ]);
  });

  it("devolve vazio quando nenhum nome base aparece", () => {
    expect(matchedModels("XPTO 9000", ["Gol 1.0 (Flex)", "Onix LT 1.0"])).toEqual([]);
  });

  it("ignora acento e caixa", () => {
    expect(matchedModels("CITROEN C3 PICASSO", ["C3 Picasso 1.6 16V"])).toEqual([
      "C3 Picasso 1.6 16V",
    ]);
  });
});
