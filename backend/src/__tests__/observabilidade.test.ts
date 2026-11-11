import { execFileSync } from "child_process";
import path from "path";
import { scripts } from "../../package.json";

const RAIZ = path.join(__dirname, "..", "..");

describe("Agente do New Relic (RNF08)", () => {
  // O agente instrumenta trocando funcoes do http, do Express e do Prisma por
  // versoes proprias. Carregado depois deles, nao ha mais o que trocar — por
  // isso -r, e nao um import no codigo.
  it("carrega antes da aplicacao no script de producao", () => {
    expect(scripts.start).toContain("node -r newrelic ");
  });

  // Em desenvolvimento e na CI a chave nao existe. Agente mal configurado pode
  // avisar, mas nunca derrubar o processo.
  it("nao impede o processo de subir sem license key", () => {
    const ambiente = { ...process.env };
    delete ambiente.NEW_RELIC_LICENSE_KEY;
    delete ambiente.NEW_RELIC_APP_NAME;

    const saida = execFileSync(
      process.execPath,
      ["-r", "newrelic", "-e", "require('express'); console.log('subiu');"],
      { cwd: RAIZ, env: ambiente, encoding: "utf-8", timeout: 60_000 }
    );

    expect(saida).toContain("subiu");
  });
});
