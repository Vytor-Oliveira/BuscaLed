import { enderecoSemPorta } from "../rate-limit";

describe("enderecoSemPorta", () => {
  it("descarta a porta que o App Service anexa ao IPv4", () => {
    expect(enderecoSemPorta("179.155.193.139:55411")).toBe("179.155.193.139");
  });

  it("descarta a porta do IPv6 entre colchetes", () => {
    expect(enderecoSemPorta("[2804:14d:1::1]:55411")).toBe("2804:14d:1::1");
  });

  it("devolve o IPv4 sem porta como está", () => {
    expect(enderecoSemPorta("179.155.193.139")).toBe("179.155.193.139");
  });

  it("não confunde os dois-pontos de um IPv6 cru com separador de porta", () => {
    expect(enderecoSemPorta("2804:14d:1::1")).toBe("2804:14d:1::1");
  });

  it("devolve vazio quando o endereço não veio", () => {
    expect(enderecoSemPorta("")).toBe("");
  });
});
