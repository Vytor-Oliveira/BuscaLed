import { centavosDoTexto, formatarPreco, textoDeCentavos } from "./formato";

describe("centavosDoTexto", () => {
  it("lê o decimal com vírgula, como o admin digita em pt-BR", () => {
    expect(centavosDoTexto("129,90")).toBe(12990);
    expect(centavosDoTexto("129,9")).toBe(12990);
    expect(centavosDoTexto("0,99")).toBe(99);
  });

  // O defeito que motivou este arquivo: o ponto era sempre tratado como milhar,
  // então "129.90" salvava R$ 12.990,00 — cem vezes o preço, sem erro na tela.
  it("lê o decimal com ponto, de teclado numérico ou de planilha", () => {
    expect(centavosDoTexto("129.90")).toBe(12990);
    expect(centavosDoTexto("74.5")).toBe(7450);
  });

  it("trata três dígitos depois do separador como milhar", () => {
    expect(centavosDoTexto("1.299")).toBe(129900);
    expect(centavosDoTexto("1,299")).toBe(129900);
  });

  it("aceita milhar e decimal na mesma string", () => {
    expect(centavosDoTexto("1.234,56")).toBe(123456);
    expect(centavosDoTexto("12.345,00")).toBe(1234500);
  });

  it("ignora o que não é dígito nem separador", () => {
    expect(centavosDoTexto("R$ 199,00")).toBe(19900);
    expect(centavosDoTexto(" 89,90 ")).toBe(8990);
  });

  it("devolve null quando não há dígito nenhum", () => {
    expect(centavosDoTexto("")).toBeNull();
    expect(centavosDoTexto("abc")).toBeNull();
    expect(centavosDoTexto(",")).toBeNull();
    expect(centavosDoTexto("R$")).toBeNull();
  });

  it("aceita zero, que é um preço, e recusa número grande demais para ser preço", () => {
    expect(centavosDoTexto("0")).toBe(0);
    expect(centavosDoTexto("0,00")).toBe(0);
    expect(centavosDoTexto("9".repeat(20))).toBeNull();
  });

  it("volta pelo mesmo caminho: centavos → texto → centavos", () => {
    for (const centavos of [0, 99, 12990, 123456, 1234500]) {
      expect(centavosDoTexto(textoDeCentavos(centavos))).toBe(centavos);
    }
  });
});

describe("formatarPreco", () => {
  it("formata centavos em real", () => {
    // O Intl separa símbolo e número por espaço estreito sem quebra, então a
    // comparação normaliza o espaço antes de olhar o texto.
    expect(formatarPreco(12990)?.replace(/\s/g, " ")).toBe("R$ 129,90");
    expect(formatarPreco(0)?.replace(/\s/g, " ")).toBe("R$ 0,00");
  });

  it("devolve null para preço ausente, para a tela dizer 'sem preço'", () => {
    expect(formatarPreco(null)).toBeNull();
    expect(formatarPreco(undefined)).toBeNull();
  });
});
