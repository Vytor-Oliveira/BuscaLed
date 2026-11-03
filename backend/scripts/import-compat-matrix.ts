import { LightingPosition, Prisma, PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import {
  ESPACO_NAO_SEPARAVEL,
  POSITION_COLUMNS,
  extractBaseModel,
  parsePositionCell,
  parseYearRange,
} from "./compat-matrix-parsers";

const prisma = new PrismaClient();
const BATCH_SIZE = 1000;

export interface RawRow {
  montadora: string;
  carro: string;
  ano: string;
  posicoes: Array<string | null>;
}

export interface RejectedRow {
  line: number;
  montadora: string;
  carro: string;
  ano: string;
  motivo: string;
}

export interface ImportSummary {
  rowsRead: number;
  uniqueVehicles: number;
  skippedCells: number;
  yearParseErrors: number;
  fittingsInserted: number;
  /** Quantas linhas por formato de ano, para conferir contra a planilha. */
  yearFormats: Record<string, number>;
  /** Linha a linha do que foi recusado, com o valor bruto para corrigir na origem. */
  rejected: RejectedRow[];
}

// Classifica so para o relatorio; quem decide se a linha entra e o parser.
function classificarFormatoAno(raw: string): string {
  const v = raw.replace(ESPACO_NAO_SEPARAVEL, " ").trim();
  if (/^\d{4}$/.test(v)) return "AAAA";
  if (/^\d{4}\s*>\s*\d{4}$/.test(v)) return "AAAA > AAAA";
  if (/^>\s*\d{4}$/.test(v)) return "> AAAA";
  if (/^\d{4}\s*>$/.test(v)) return "AAAA >";
  if (/^<\s*\d{4}$/.test(v)) return "< AAAA";
  return "fora de formato";
}

interface VehicleKey {
  make: string;
  model: string;
  yearStart: number;
  yearEnd: number;
}

function vehicleKeyToString(key: VehicleKey): string {
  return `${key.make}|${key.model}|${key.yearStart}|${key.yearEnd}`;
}

/**
 * Lógica de importação de verdade, separada da leitura de arquivo — recebe
 * as linhas já em memória, insere no banco (via o `prisma` compartilhado
 * deste módulo) e devolve um resumo. Testável diretamente com uma planilha
 * sintética pequena, sem depender do arquivo real do parceiro.
 */
export async function importCompatMatrix(rows: RawRow[]): Promise<ImportSummary> {
  const vehiclesByKey = new Map<string, VehicleKey>();
  const fittingsByVehicleKey = new Map<string, Array<{ position: LightingPosition; socketCode: string }>>();

  let skippedCells = 0;
  const rejected: RejectedRow[] = [];
  const yearFormats: Record<string, number> = {};

  for (const [index, row] of rows.entries()) {
    yearFormats[classificarFormatoAno(row.ano)] =
      (yearFormats[classificarFormatoAno(row.ano)] ?? 0) + 1;

    let yearRange: { yearStart: number; yearEnd: number };
    try {
      yearRange = parseYearRange(row.ano);
    } catch (error) {
      // Registra o suficiente pra achar a linha na planilha e corrigir na
      // origem — adivinhar aqui gravaria veiculo que nunca casa com busca.
      rejected.push({
        line: index + 1,
        montadora: row.montadora,
        carro: row.carro,
        ano: row.ano,
        motivo: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    const vehicleKey: VehicleKey = {
      make: row.montadora.trim().toUpperCase(),
      model: extractBaseModel(row.carro).toUpperCase(),
      yearStart: yearRange.yearStart,
      yearEnd: yearRange.yearEnd,
    };
    const key = vehicleKeyToString(vehicleKey);

    if (!vehiclesByKey.has(key)) {
      vehiclesByKey.set(key, vehicleKey);
    }

    const fittings = fittingsByVehicleKey.get(key) ?? [];
    row.posicoes.forEach((cell, index) => {
      const position = POSITION_COLUMNS[index];
      if (!position) {
        // Mais colunas de posição na linha do que POSITION_COLUMNS conhece —
        // a planilha do parceiro provavelmente ganhou uma coluna nova. Falha
        // aqui, no ponto exato da causa, em vez de inserir position:undefined
        // silenciosamente e só descobrir no erro de constraint do insert.
        throw new Error(
          `Linha com coluna de posição no índice ${index} sem posição conhecida ` +
            `(POSITION_COLUMNS só tem ${POSITION_COLUMNS.length}). ` +
            "A planilha do parceiro provavelmente ganhou uma coluna nova — " +
            "atualize POSITION_COLUMNS em compat-matrix-parsers.ts antes de reimportar."
        );
      }

      const socketCodes = parsePositionCell(cell);
      if (socketCodes.length === 0) {
        skippedCells += 1;
      }
      for (const socketCode of socketCodes) {
        fittings.push({ position, socketCode });
      }
    });
    fittingsByVehicleKey.set(key, fittings);
  }

  const vehicleValues = [...vehiclesByKey.values()];
  for (let i = 0; i < vehicleValues.length; i += BATCH_SIZE) {
    await prisma.vehicleModel.createMany({
      data: vehicleValues.slice(i, i + BATCH_SIZE),
      skipDuplicates: true,
    });
  }

  // Busca só os veículos desta execução (por chave exata), em vez da tabela
  // inteira — o script é re-executável (skipDuplicates acima), então rodar
  // de novo com a tabela já grande não deveria escalar com o total do banco,
  // só com o tamanho do arquivo importado.
  const idByKey = new Map<string, string>();
  for (let i = 0; i < vehicleValues.length; i += BATCH_SIZE) {
    const batch = vehicleValues.slice(i, i + BATCH_SIZE);
    const found = await prisma.vehicleModel.findMany({
      where: {
        OR: batch.map((v) => ({
          make: v.make,
          model: v.model,
          yearStart: v.yearStart,
          yearEnd: v.yearEnd,
        })),
      },
      select: { id: true, make: true, model: true, yearStart: true, yearEnd: true },
    });
    for (const vehicle of found) {
      idByKey.set(vehicleKeyToString(vehicle), vehicle.id);
    }
  }

  const fittingRows: Prisma.VehicleFittingCreateManyInput[] = [];
  for (const [key, fittings] of fittingsByVehicleKey) {
    const vehicleModelId = idByKey.get(key);
    if (!vehicleModelId) {
      continue;
    }

    const seen = new Set<string>();
    for (const fitting of fittings) {
      const dedupeKey = `${fitting.position}|${fitting.socketCode}`;
      if (seen.has(dedupeKey)) {
        continue;
      }
      seen.add(dedupeKey);
      fittingRows.push({ vehicleModelId, position: fitting.position, socketCode: fitting.socketCode });
    }
  }

  let fittingsInserted = 0;
  for (let i = 0; i < fittingRows.length; i += BATCH_SIZE) {
    const result = await prisma.vehicleFitting.createMany({
      data: fittingRows.slice(i, i + BATCH_SIZE),
      skipDuplicates: true,
    });
    fittingsInserted += result.count;
  }

  return {
    rowsRead: rows.length,
    uniqueVehicles: vehiclesByKey.size,
    skippedCells,
    yearParseErrors: rejected.length,
    fittingsInserted,
    yearFormats,
    rejected,
  };
}

async function main(): Promise<void> {
  const jsonPath =
    process.env.COMPAT_MATRIX_JSON ?? path.join(__dirname, "..", "data", "compat-matrix.json");

  if (!fs.existsSync(jsonPath)) {
    // eslint-disable-next-line no-console
    console.error(
      `Arquivo não encontrado: ${jsonPath}\n` +
        "Gere-o a partir da planilha original da Shocklight (conversão pontual, fora do projeto) antes de rodar este script."
    );
    process.exitCode = 1;
    return;
  }

  const permitirRejeitadas = process.argv.includes("--allow-rejects");

  const rows: RawRow[] = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  const summary = await importCompatMatrix(rows);

  const log = (linha: string): void => {
    // eslint-disable-next-line no-console
    console.log(linha);
  };

  log("=== Relatório de importação ===");
  log(`Linhas lidas: ${summary.rowsRead}`);
  log("Formatos de ano encontrados:");
  for (const [formato, total] of Object.entries(summary.yearFormats).sort((a, b) => b[1] - a[1])) {
    log(`  ${formato.padEnd(18)} ${total}`);
  }
  log(`Veículos únicos gravados (após deduplicação): ${summary.uniqueVehicles}`);
  log(`Fittings inseridos: ${summary.fittingsInserted}`);
  log(`Células puladas ("-" ou "LED"): ${summary.skippedCells}`);
  log(`Linhas rejeitadas: ${summary.rejected.length}`);

  for (const r of summary.rejected) {
    log(`  linha ${r.line} | ${r.montadora} | ${r.carro} | ano="${r.ano}"`);
    log(`    ${r.motivo}`);
  }

  if (summary.rejected.length > 0 && !permitirRejeitadas) {
    log("");
    log(
      "Importação terminou com linhas rejeitadas. Corrija a planilha na origem " +
        "ou rode de novo com --allow-rejects para aceitar a importação parcial."
    );
    process.exitCode = 1;
    return;
  }

  log("Importação concluída.");
}

if (require.main === module) {
  main()
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
