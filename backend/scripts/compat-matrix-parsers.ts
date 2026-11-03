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

// Faixa plausível para um veículo de rua. Serve para pegar erro de digitação
// da planilha (ex: "2012 > 215") que, sem isso, vira ano válido pro Number().
const MIN_YEAR = 1950;
const MAX_YEAR = 2100;

export class InvalidYearRangeError extends Error {
  constructor(raw: string, motivo: string) {
    super(`Formato de ano inválido: "${raw}" — ${motivo}`);
    this.name = "InvalidYearRangeError";
  }
}

// Regex ancorada por formato: só casa a forma inteira, então "2012 > 215" não
// entra por nenhuma delas. O parse antigo fatiava no ">" e deixava Number()
// decidir, e Number("") é 0 — era assim que "2015 >" virava yearEnd 0.
// A planilha costuma trazer espaço não separável colado no número.
export const ESPACO_NAO_SEPARAVEL = new RegExp(String.fromCharCode(0x00a0), "g");

const FORMATO_ANO_UNICO = /^(\d{4})$/;
const FORMATO_INTERVALO = /^(\d{4})\s*>\s*(\d{4})$/;
const FORMATO_A_PARTIR_SUFIXO = /^(\d{4})\s*>$/;
const FORMATO_A_PARTIR_PREFIXO = /^>\s*(\d{4})$/;
const FORMATO_ATE = /^<\s*(\d{4})$/;

function anoValido(raw: string, valor: string): number {
  const ano = Number(valor);
  if (ano < MIN_YEAR || ano > MAX_YEAR) {
    throw new InvalidYearRangeError(raw, `ano ${ano} fora da faixa ${MIN_YEAR}–${MAX_YEAR}`);
  }
  return ano;
}

/**
 * Trata os 5 formatos de ano da planilha real. O ">" significa "a partir de" em
 * qualquer posição; quem marca "até" é o "<", que aparece em 1 linha de 2596.
 *
 *   "AAAA"         ano único         -> { AAAA, AAAA }
 *   "AAAA > BBBB"  intervalo fechado -> { AAAA, BBBB }
 *   "AAAA >"       a partir de AAAA  -> { AAAA, 9999 }
 *   "> AAAA"       a partir de AAAA  -> { AAAA, 9999 }
 *   "< AAAA"       até AAAA          -> { 0, AAAA }
 *
 * Ler ">" como "até" foi testado e descartado: as 120 linhas "> AAAA" são
 * carros recentes (R8 V10 Plus, XC60, Defender TDI), e sob "até" um Passat 1979
 * casava com o Passat Highline "> 2016" e recebia o farol dele.
 *
 * Nada é corrigido em silêncio: valor fora de forma ou fora da faixa de anos
 * lança, para a linha aparecer no relatório de importação em vez de virar
 * veículo que nunca casa com busca nenhuma.
 */
export function parseYearRange(raw: string): { yearStart: number; yearEnd: number } {
  const value = raw.replace(ESPACO_NAO_SEPARAVEL, " ").trim();

  if (value === "") {
    throw new InvalidYearRangeError(raw, "valor vazio");
  }

  const unico = FORMATO_ANO_UNICO.exec(value);
  if (unico) {
    const ano = anoValido(raw, unico[1]);
    return { yearStart: ano, yearEnd: ano };
  }

  const intervalo = FORMATO_INTERVALO.exec(value);
  if (intervalo) {
    const yearStart = anoValido(raw, intervalo[1]);
    const yearEnd = anoValido(raw, intervalo[2]);
    if (yearStart > yearEnd) {
      throw new InvalidYearRangeError(raw, `inicio ${yearStart} maior que fim ${yearEnd}`);
    }
    return { yearStart, yearEnd };
  }

  const aPartir =
    FORMATO_A_PARTIR_SUFIXO.exec(value) ?? FORMATO_A_PARTIR_PREFIXO.exec(value);
  if (aPartir) {
    return { yearStart: anoValido(raw, aPartir[1]), yearEnd: OPEN_ENDED_UPPER_YEAR };
  }

  const ate = FORMATO_ATE.exec(value);
  if (ate) {
    return { yearStart: OPEN_ENDED_LOWER_YEAR, yearEnd: anoValido(raw, ate[1]) };
  }

  throw new InvalidYearRangeError(raw, "nao corresponde a nenhum formato conhecido");
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
