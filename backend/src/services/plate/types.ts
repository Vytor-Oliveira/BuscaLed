export interface PlateInfo {
  make: string;
  model: string;
  year: number;
  color: string;
}

export interface PlateService {
  /**
   * Resolve os dados do veículo a partir da placa.
   * A placa em si nunca deve ser retida após a chamada (RF05/RN02) —
   * quem chama este método é responsável por descartá-la logo em seguida.
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
    super("Timeout ao consultar apiplacas.com.br");
    this.name = "PlateServiceTimeoutError";
  }
}
