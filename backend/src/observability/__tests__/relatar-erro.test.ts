import { agentePadrao, relatarErro } from "../relatar-erro";

describe("relatarErro", () => {
  it("entrega o erro ao agente", () => {
    const recebidos: Error[] = [];
    const erro = new Error("falhou");

    relatarErro(erro, { noticeError: (e) => recebidos.push(e) });

    expect(recebidos).toEqual([erro]);
  });

  // Em desenvolvimento e na CI nao ha agente: nao pode explodir.
  it("não faz nada sem agente", () => {
    expect(() => relatarErro(new Error("falhou"), null)).not.toThrow();
  });

  // O tratador de erro e a ultima linha antes do 500: relatar nao pode gerar
  // outro erro e derrubar a resposta.
  it("engole falha do próprio agente", () => {
    const quebrado = {
      noticeError: () => {
        throw new Error("agente quebrado");
      },
    };

    expect(() => relatarErro(new Error("falhou"), quebrado)).not.toThrow();
  });
});

describe("agentePadrao", () => {
  const original = process.env.NEW_RELIC_LICENSE_KEY;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEW_RELIC_LICENSE_KEY;
    } else {
      process.env.NEW_RELIC_LICENSE_KEY = original;
    }
  });

  // Sem a chave o pacote nem e carregado: e o que impede um agente de subir
  // durante a suite e na CI.
  it("não procura o agente quando não há license key", () => {
    delete process.env.NEW_RELIC_LICENSE_KEY;

    expect(agentePadrao()).toBeNull();
  });
});
