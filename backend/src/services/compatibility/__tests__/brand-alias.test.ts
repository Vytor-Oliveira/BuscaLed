import { resolveCanonicalMake } from "../brand-alias";

describe("resolveCanonicalMake", () => {
  it("traduz os códigos abreviados confirmados do registro nacional", () => {
    expect(resolveCanonicalMake("VW")).toBe("VOLKSWAGEN");
    expect(resolveCanonicalMake("CHEV")).toBe("CHEVROLET");
    expect(resolveCanonicalMake("GM")).toBe("CHEVROLET");
    expect(resolveCanonicalMake("MMC")).toBe("MITSUBISHI");
  });

  it("traduz código com pontuação", () => {
    expect(resolveCanonicalMake("M.BENZ")).toBe("MERCEDES-BENZ");
  });

  it("repõe o acento que o registro não tem", () => {
    expect(resolveCanonicalMake("CITROEN")).toBe("CITROËN");
  });

  it("corrige a grafia errada que aparece no registro", () => {
    expect(resolveCanonicalMake("HYUNDAY")).toBe("HYUNDAI");
  });

  it("deixa passar a marca que já vem com o nome completo", () => {
    expect(resolveCanonicalMake("HONDA")).toBe("HONDA");
    expect(resolveCanonicalMake("FIAT")).toBe("FIAT");
    expect(resolveCanonicalMake("ALFA ROMEO")).toBe("ALFA ROMEO");
  });

  it("normaliza caixa e espaço de sobra", () => {
    expect(resolveCanonicalMake(" honda ")).toBe("HONDA");
    expect(resolveCanonicalMake("vw")).toBe("VOLKSWAGEN");
  });

  it("não inventa marca sem código confirmado", () => {
    expect(resolveCanonicalMake("TROLLER")).toBe("TROLLER");
    expect(resolveCanonicalMake("XPTO")).toBe("XPTO");
  });
});
