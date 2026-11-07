import {
  clientePodeCancelar,
  estadoFinal,
  numeroTicket,
  ROTULO_STATUS,
} from "./ticket";

describe("numeroTicket", () => {
  it("encurta o UUID num rótulo legível", () => {
    expect(numeroTicket("3f8a1b2c-0000-0000-0000-00000000ab12")).toBe("TKT-AB12");
  });

  it("usa os quatro últimos caracteres, não os primeiros", () => {
    // Dois ids com o mesmo começo não podem virar o mesmo rótulo.
    expect(numeroTicket("aaaa1111-0000-0000-0000-000000001234")).toBe("TKT-1234");
    expect(numeroTicket("aaaa1111-0000-0000-0000-000000005678")).toBe("TKT-5678");
  });
});

describe("ROTULO_STATUS", () => {
  it("traduz o status do backend para a palavra que o painel mostra", () => {
    expect(ROTULO_STATUS.PENDENTE).toBe("Novo");
    expect(ROTULO_STATUS.CONFIRMADO).toBe("Em atendimento");
    expect(ROTULO_STATUS.CONCLUIDO).toBe("Concluído");
    expect(ROTULO_STATUS.CANCELADO).toBe("Cancelado");
  });
});

describe("clientePodeCancelar", () => {
  // RN14: o cliente cancela enquanto o pedido ainda está em andamento.
  it("libera cancelamento em pedido novo ou em atendimento", () => {
    expect(clientePodeCancelar("PENDENTE")).toBe(true);
    expect(clientePodeCancelar("CONFIRMADO")).toBe(true);
  });

  it("bloqueia cancelamento em pedido já encerrado", () => {
    expect(clientePodeCancelar("CONCLUIDO")).toBe(false);
    expect(clientePodeCancelar("CANCELADO")).toBe(false);
  });
});

describe("estadoFinal", () => {
  it("reconhece concluído e cancelado como fim de fluxo (RN10)", () => {
    expect(estadoFinal("CONCLUIDO")).toBe(true);
    expect(estadoFinal("CANCELADO")).toBe(true);
    expect(estadoFinal("PENDENTE")).toBe(false);
    expect(estadoFinal("CONFIRMADO")).toBe(false);
  });
});
