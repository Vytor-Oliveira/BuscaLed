import { LightingPosition, Prisma, PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { POSITION_COLUMNS, extractBaseModel, parsePositionCell, parseYearRange } from "./compat-matrix-parsers";

const prisma = new PrismaClient();
const BATCH_SIZE = 1000;

export interface RawRow {
  montadora: string;
  carro: string;
  ano: string;
  posicoes: Array<string | null>;
}

export interface ImportSummary {
  rowsRead: number;
  uniqueVehicles: number;
  skippedCells: number;
  yearParseErrors: number;
  fittingsInserted: number;
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
  let yearParseErrors = 0;

  for (const row of rows) {
    let yearRange: { yearStart: number; yearEnd: number };
    try {
      yearRange = parseYearRange(row.ano);
    } catch {
      yearParseErrors += 1;
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
      const socketCodes = parsePositionCell(cell);
      if (socketCodes.length === 0) {
        skippedCells += 1;
      }
      for (const socketCode of socketCodes) {
        fittings.push({ position: POSITION_COLUMNS[index], socketCode });
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

  const allVehicles = await prisma.vehicleModel.findMany();
  const idByKey = new Map<string, string>();
  for (const vehicle of allVehicles) {
    idByKey.set(
      vehicleKeyToString({
        make: vehicle.make,
        model: vehicle.model,
        yearStart: vehicle.yearStart,
        yearEnd: vehicle.yearEnd,
      }),
      vehicle.id
    );
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
    yearParseErrors,
    fittingsInserted,
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

  const rows: RawRow[] = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  const summary = await importCompatMatrix(rows);

  // eslint-disable-next-line no-console
  console.log(`Linhas lidas: ${summary.rowsRead}`);
  // eslint-disable-next-line no-console
  console.log(`Veículos únicos (após deduplicação): ${summary.uniqueVehicles}`);
  // eslint-disable-next-line no-console
  console.log(`Células puladas ("-" ou "LED"): ${summary.skippedCells}`);
  // eslint-disable-next-line no-console
  console.log(`Linhas com erro de formato de ano: ${summary.yearParseErrors}`);
  // eslint-disable-next-line no-console
  console.log(`Fittings inseridos: ${summary.fittingsInserted}`);
  // eslint-disable-next-line no-console
  console.log("Importação concluída.");
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
