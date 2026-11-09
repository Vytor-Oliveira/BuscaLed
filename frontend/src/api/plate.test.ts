import { describe, expect, it } from "vitest";
import { ApiError } from "./client";
import { interpretarFalhaDePlaca } from "./plate";

describe("interpretarFalhaDePlaca", () => {
  it("convida a entrar quando a rota exige conta", () => {
    const falha = interpretarFalhaDePlaca(new ApiError(401, "Não autenticado."));

    expect(falha.motivo).toBe("precisa-entrar");
    // A mensagem crua da API não pode vazar para o motorista.
    expect(falha.mensagem).not.toMatch(/autenticado/i);
    expect(falha.mensagem).toMatch(/conta/i);
  });

  it("distingue placa inexistente de cota esgotada", () => {
    expect(interpretarFalhaDePlaca(new ApiError(404, "x")).motivo).toBe("nao-encontrada");
    expect(interpretarFalhaDePlaca(new ApiError(403, "x")).motivo).toBe("cota");
  });

  it("trata serviço fora do ar, demora e falta de rede", () => {
    expect(interpretarFalhaDePlaca(new ApiError(503, "x")).motivo).toBe("indisponivel");
    expect(interpretarFalhaDePlaca(new ApiError(504, "x")).motivo).toBe("demorou");
    expect(interpretarFalhaDePlaca(new ApiError(0, "x")).motivo).toBe("rede");
  });

  it("não quebra com erro que não veio da API", () => {
    const falha = interpretarFalhaDePlaca(new Error("qualquer coisa"));

    expect(falha.motivo).toBe("desconhecido");
    expect(falha.mensagem).toMatch(/informe o veículo abaixo/i);
  });
});
