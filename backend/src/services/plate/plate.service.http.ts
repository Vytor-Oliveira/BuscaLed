import {
  PlateInfo,
  PlateNotFoundError,
  PlateService,
  PlateServiceTimeoutError,
} from "./types";

const TIMEOUT_MS = 5000; // RNF13

interface ApiplacasResponse {
  marca: string;
  modelo: string;
  ano: number;
  cor: string;
}

/**
 * Implementação real da apiplacas.com.br (RF04). Ainda não validada contra
 * a API de verdade — o formato exato da resposta (ApiplacasResponse) deve
 * ser conferido assim que o cadastro for aprovado e o token estiver disponível.
 */
export class HttpPlateService implements PlateService {
  constructor(private readonly token: string) {}

  async resolvePlate(plate: string): Promise<PlateInfo> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(
        `https://apiplacas.com.br/api/v1/placa/${encodeURIComponent(plate)}?token=${this.token}`,
        { signal: controller.signal }
      );

      if (response.status === 404) {
        throw new PlateNotFoundError(plate);
      }

      if (!response.ok) {
        throw new Error(`apiplacas.com.br respondeu com status ${response.status}`);
      }

      const data = (await response.json()) as ApiplacasResponse;

      return {
        make: data.marca,
        model: data.modelo,
        year: data.ano,
        color: data.cor,
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
