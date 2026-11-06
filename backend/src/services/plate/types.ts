export interface PlateInfo {
  make: string;
  model: string;
  year: number;
  color: string;
}

export interface PlateService {
  /**
   * Resolve os dados do veículo a partir da placa.
   * A placa nunca pode ser gravada vinculada a um usuário, sessão ou à Garagem
   * (RF05/RN02). O PlateLookupService a usa como chave de um cache anônimo;
   * fora disso, quem chama descarta a placa logo em seguida.
   */
  resolvePlate(plate: string): Promise<PlateInfo>;
}

export class PlateNotFoundError extends Error {
  constructor(plate: string) {
    super(`Placa não encontrada: ${plate}`);
    this.name = "PlateNotFoundError";
  }
}

export class PlateServiceTimeoutError extends Error {
  constructor() {
    super("Timeout ao consultar a PuxaPlaca");
    this.name = "PlateServiceTimeoutError";
  }
}

/**
 * A PuxaPlaca respondeu algo que não é "achei" nem "não achei": sem saldo
 * (402), token revogado (401), throttle (429), fora do ar (5xx), ou a rede
 * caiu. Nada disso é defeito do BuscaLED, então não pode sair como 500 —
 * quem consultou precisa saber que o caminho manual continua aberto.
 */
export class PlateProviderUnavailableError extends Error {
  constructor(readonly motivo: string) {
    super(`Fornecedor de consulta de placa indisponível: ${motivo}`);
    this.name = "PlateProviderUnavailableError";
  }
}

export class PlateLookupLimitExceededError extends Error {
  constructor(max: number, dias: number) {
    super(
      `Limite de ${max} consultas de placa a cada ${dias} dias atingido. ` +
        "Cadastre o veículo manualmente (marca/modelo/ano)."
    );
    this.name = "PlateLookupLimitExceededError";
  }
}
