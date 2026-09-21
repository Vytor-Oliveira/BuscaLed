import { LightingPosition } from "@prisma/client";

// Ordem das 13 colunas de posição na planilha da Shocklight — fonte única
// de verdade pro mapeamento índice→posição.
export const POSITION_COLUMNS: LightingPosition[] = [
  "FAROL_BAIXO",
  "FAROL_ALTO",
  "NEBLINA",
  "LANTERNA_DIANTEIRA",
  "PISCA_DIANTEIRO",
  "PISCA_LATERAL",
  "LANTERNA_TRASEIRA",
  "PISCA_TRASEIRO",
  "LUZ_FREIO",
  "RE",
  "TETO",
  "PLACA",
  "DRL",
];

// Guarda de consistência: a ordem de POSITION_COLUMNS é significativa (mapeia
// índice de coluna da planilha) e por isso não pode ser derivada automaticamente
// da ordem do enum LightingPosition em schema.prisma (que não tem esse
// contrato). Em vez disso, falha alto e cedo se alguém adicionar/remover um
// valor do enum sem atualizar esta lista em conjunto.
{
  const enumValues = new Set(Object.values(LightingPosition));
  const columnValues = new Set(POSITION_COLUMNS);
  const missingFromColumns = [...enumValues].filter((v) => !columnValues.has(v));
  const extraInColumns = [...columnValues].filter((v) => !enumValues.has(v));
  if (missingFromColumns.length > 0 || extraInColumns.length > 0) {
    throw new Error(
      "POSITION_COLUMNS está desincronizado do enum LightingPosition (schema.prisma). " +
        `Faltando: [${missingFromColumns.join(", ")}]. A mais: [${extraInColumns.join(", ")}].`
    );
  }
}

const OPEN_ENDED_UPPER_YEAR = 9999;
const OPEN_ENDED_LOWER_YEAR = 0;

export class InvalidYearRangeError extends Error {
  constructor(raw: string) {
    super(`Formato de ano não reconhecido: "${raw}"`);
    this.name = "InvalidYearRangeError";
  }
}

/**
 * Trata os 4 formatos de ano encontrados na planilha real:
 * "AAAA > AAAA", "AAAA", "> AAAA", "< AAAA".
 *
 * ATENÇÃO — suposição não validada com o parceiro (RFC Seção 7.2): "> AAAA"
 * é interpretado como "a partir de AAAA" (veículo ainda em produção — ex:
 * "XC 90 EXCELLENCE... > 2016"), não "até AAAA". Precisa confirmar com a
 * Shocklight antes de considerar definitivo.
 */
export function parseYearRange(raw: string): { yearStart: number; yearEnd: number } {
  const value = raw.trim();

  if (value.includes(">")) {
    const [left, right] = value.split(">").map((part) => part.trim());
    if (left === "") {
      return { yearStart: Number(right), yearEnd: OPEN_ENDED_UPPER_YEAR };
    }
    const yearStart = Number(left);
    const yearEnd = Number(right);
    if (Number.isNaN(yearStart) || Number.isNaN(yearEnd)) {
      throw new InvalidYearRangeError(raw);
    }
    return { yearStart, yearEnd };
  }

  if (value.includes("<")) {
    const right = value.replace("<", "").trim();
    const yearEnd = Number(right);
    if (Number.isNaN(yearEnd)) {
      throw new InvalidYearRangeError(raw);
    }
    return { yearStart: OPEN_ENDED_LOWER_YEAR, yearEnd };
  }

  const year = Number(value);
  if (Number.isNaN(year)) {
    throw new InvalidYearRangeError(raw);
  }
  return { yearStart: year, yearEnd: year };
}

/**
 * Extrai o "nome-base" do campo CARRO, que empacota várias variantes de
 * motorização/trim numa string só (ex: "LEGEND 3.2 3.5" -> "LEGEND").
 * Heurística aceita como limitação conhecida (docs/roteiro-tecnico.md) —
 * não tenta enumerar as variantes, só evitar contaminar o nome-base com
 * números de motorização.
 *
 * O primeiro token sempre entra no nome-base, mesmo se for numérico — vários
 * modelos reais da planilha são só um número (ex: Alfa Romeo "156", "166",
 * Audi "100", "80"). Só os tokens numéricos a partir do segundo são tratados
 * como motorização e cortam a extração (ex: "156 2.5 SPORT WAGON..." -> "156").
 */
export function extractBaseModel(raw: string): string {
  const tokens = raw.trim().split(/\s+/);
  if (tokens.length === 0) {
    return raw.trim();
  }

  const baseTokens: string[] = [tokens[0]];
  for (const token of tokens.slice(1)) {
    if (/^[\d.]+$/.test(token)) {
      break;
    }
    baseTokens.push(token);
  }

  return baseTokens.join(" ");
}

// Códigos de lâmpada de filamento duplo reais que contêm "/" no próprio
// código (ex: "P21/5W") — não são alternativas compostas, são um único
// soquete. Distingue de células genuinamente compostas como "H1 / HB3".
const DUAL_FILAMENT_PATTERN = /^[PW]\d{1,3}\/\d{1,2}W$/i;

/**
 * Retorna os soquetes válidos de uma célula de posição. "-" e "LED"
 * (veículo já sai de fábrica com LED, sem soquete de reposição padrão)
 * significam "não aplicável" e retornam lista vazia. Células compostas
 * como "H1 / HB3" retornam os dois soquetes.
 */
export function parsePositionCell(raw: string | null | undefined): string[] {
  if (!raw) {
    return [];
  }

  const trimmed = raw.trim();

  if (trimmed === "-") {
    return [];
  }

  if (DUAL_FILAMENT_PATTERN.test(trimmed)) {
    return [trimmed];
  }

  const parts = trimmed.includes("/")
    ? trimmed
        .split("/")
        .map((part) => part.trim())
        .filter(Boolean)
    : [trimmed];

  return parts.filter((part) => part.toUpperCase() !== "LED");
}
