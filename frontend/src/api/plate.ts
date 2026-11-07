import { api, ApiError } from "./client";

export interface VeiculoDaPlaca {
  make: string;
  model: string;
  year: number;
}

/**
 * RN02: a placa vai no corpo do POST, nunca no caminho da URL — caminho entra
 * em log de acesso, log de proxy e histórico do navegador. Ela morre aqui: o
 * que sai desta função é marca, modelo e ano, e é só isso que pode ir para a
 * URL, para o estado ou para qualquer lugar que persista.
 */
export function consultarPlaca(placa: string): Promise<VeiculoDaPlaca> {
  return api<VeiculoDaPlaca>("/plate", { method: "POST", body: { placa } });
}

export type MotivoFalhaPlaca =
  | "nao-encontrada"
  | "indisponivel"
  | "demorou"
  | "cota"
  | "rede"
  | "desconhecido";

export interface FalhaPlaca {
  motivo: MotivoFalhaPlaca;
  mensagem: string;
}

/**
 * Traduz a falha para o motorista e sinaliza que o caminho manual assume.
 * Nenhuma dessas situações é erro do usuário, então nenhuma fala como se fosse.
 */
export function interpretarFalhaDePlaca(erro: unknown): FalhaPlaca {
  if (!(erro instanceof ApiError)) {
    return {
      motivo: "desconhecido",
      mensagem: "Não conseguimos consultar a placa agora. Informe o veículo abaixo.",
    };
  }

  switch (erro.status) {
    case 404:
      return {
        motivo: "nao-encontrada",
        mensagem: "Não achamos essa placa. Confira os caracteres ou informe o veículo abaixo.",
      };
    case 403:
      return {
        motivo: "cota",
        mensagem: erro.message || "Você atingiu o limite de consultas por placa. Use a busca manual.",
      };
    case 503:
      return {
        motivo: "indisponivel",
        mensagem: "A consulta por placa está fora do ar. Informe o veículo abaixo.",
      };
    case 504:
      return {
        motivo: "demorou",
        mensagem: "A consulta por placa demorou demais. Informe o veículo abaixo.",
      };
    case 0:
      return {
        motivo: "rede",
        mensagem: "Sem conexão com o servidor. Informe o veículo abaixo.",
      };
    default:
      return {
        motivo: "desconhecido",
        mensagem: erro.message || "Não conseguimos consultar a placa. Informe o veículo abaixo.",
      };
  }
}
