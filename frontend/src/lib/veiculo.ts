import type { VehicleModelOption } from "../api/compatibility";

/**
 * A matriz usa faixas abertas: `yearStart: 0` significa "desde sempre" e
 * `yearEnd: 9999`, "até hoje". Mostrar isso cru ofereceria o ano 0 e o ano
 * 9999 no seletor, então as pontas são aparadas.
 */
export const PRIMEIRO_ANO = 1950;

export function ultimoAno(): number {
  // O ano-modelo seguinte já é vendido no ano corrente.
  return new Date().getFullYear() + 1;
}

/** Nomes distintos, em ordem. O mesmo modelo pode vir em várias faixas. */
export function nomesDeModelo(modelos: VehicleModelOption[]): string[] {
  return [...new Set(modelos.map((m) => m.model))].sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );
}

/** Rótulo legível da faixa, já com as pontas abertas traduzidas. */
export function rotuloDaFaixa(modelo: VehicleModelOption): string {
  const inicioAberto = modelo.yearStart <= PRIMEIRO_ANO;
  const fimAberto = modelo.yearEnd >= ultimoAno();

  if (inicioAberto && fimAberto) {
    return "todos os anos";
  }
  if (inicioAberto) {
    return `até ${modelo.yearEnd}`;
  }
  if (fimAberto) {
    return `${modelo.yearStart} em diante`;
  }
  if (modelo.yearStart === modelo.yearEnd) {
    return String(modelo.yearStart);
  }
  return `${modelo.yearStart}–${modelo.yearEnd}`;
}

/**
 * Anos oferecidos para um modelo, do mais recente para o mais antigo. Une as
 * faixas quando o mesmo nome aparece mais de uma vez e apara as pontas
 * abertas, para o seletor nunca oferecer ano 0 nem 9999.
 */
export function anosDoModelo(
  modelos: VehicleModelOption[],
  modelo: string
): number[] {
  const faixas = modelos.filter((m) => m.model === modelo);
  if (faixas.length === 0) {
    return [];
  }

  const inicio = Math.max(PRIMEIRO_ANO, Math.min(...faixas.map((f) => f.yearStart)));
  const fim = Math.min(ultimoAno(), Math.max(...faixas.map((f) => f.yearEnd)));

  if (fim < inicio) {
    return [];
  }

  const anos: number[] = [];
  for (let ano = fim; ano >= inicio; ano -= 1) {
    anos.push(ano);
  }
  return anos;
}
