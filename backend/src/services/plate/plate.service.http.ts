import {
  PlateInfo,
  PlateNotFoundError,
  PlateService,
  PlateServiceTimeoutError,
} from "./types";

const TIMEOUT_MS = 5000; // RNF13
const BASE_URL = "https://api.puxaplaca.app";

interface PuxaPlacaBasicoDados {
  marca: string;
  modelo: string;
  ano: string; // API real retorna string (ex: "1979"), apesar da doc dizer integer
  cor: string;
}

interface PuxaPlacaResponse {
  error: boolean;
  message: string;
  basico?: {
    error: boolean;
    message: string;
    dados?: PuxaPlacaBasicoDados;
  };
}

/**
 * Implementação real da PuxaPlaca (ex-apiplacas.com.br, RF04). Contrato
 * validado com uma consulta real em 2026-08-24 (endpoint /v2/consulta/:placa,
 * token via header, `ano` vem como string apesar da doc dizer integer). O
 * token usado só tem a permissão "Básica" habilitada, então a API nem chega
 * a devolver chassi/renavam/roubo-furto/FIPE — só basico.dados é extraído,
 * no mesmo espírito de RN02.
 */
export class HttpPlateService implements PlateService {
  constructor(private readonly token: string) {}

  async resolvePlate(plate: string): Promise<PlateInfo> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(`${BASE_URL}/v2/consulta/${encodeURIComponent(plate)}`, {
        headers: { token: this.token, Accept: "application/json" },
        signal: controller.signal,
      });

      if (response.status === 404 || response.status === 406) {
        throw new PlateNotFoundError(plate);
      }

      if (!response.ok) {
        throw new Error(`PuxaPlaca respondeu com status ${response.status}`);
      }

      const data = (await response.json()) as PuxaPlacaResponse;
      const dados = data.basico?.dados;

      if (data.error || data.basico?.error || !dados) {
        throw new PlateNotFoundError(plate);
      }

      return {
        make: dados.marca,
        model: dados.modelo,
        year: Number(dados.ano),
        color: dados.cor,
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new PlateServiceTimeoutError();
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
