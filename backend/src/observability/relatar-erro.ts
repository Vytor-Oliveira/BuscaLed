export interface AgenteNewRelic {
  noticeError: (erro: Error) => void;
}

/**
 * Em produção o agente já foi carregado por `node -r newrelic`, antes de
 * qualquer código nosso — pedir o módulo aqui devolve a mesma instância.
 *
 * A guarda pela license key existe para não carregá-lo em teste nem na CI,
 * onde ele não deve existir: sem a chave não há o que reportar de qualquer
 * forma, e importar o pacote subiria um agente só para ele se desligar.
 */
export function agentePadrao(): AgenteNewRelic | null {
  if (!process.env.NEW_RELIC_LICENSE_KEY) {
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const api = require("newrelic") as Partial<AgenteNewRelic>;
    return typeof api.noticeError === "function" ? (api as AgenteNewRelic) : null;
  } catch {
    return null;
  }
}

/**
 * Entrega o erro ao New Relic quando há agente no ar (RNF08). Falha do próprio
 * relato nunca pode derrubar a resposta: o tratador de erro é a última linha
 * antes do 500.
 */
export function relatarErro(erro: Error, agente = agentePadrao()): void {
  try {
    agente?.noticeError(erro);
  } catch {
    // Silêncio proposital: relatar um erro não pode gerar outro.
  }
}
