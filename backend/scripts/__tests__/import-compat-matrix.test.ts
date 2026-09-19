import "dotenv/config";
import { RawRow, importCompatMatrix } from "../import-compat-matrix";
import { prisma } from "../../src/db/prisma";

// Planilha sintética cobrindo: linha normal, célula "-", célula "LED",
// célula composta "H1 / HB3", e um exemplo de cada formato de ano.
const SAMPLE_ROWS: RawRow[] = [
  {
    montadora: "TESTEMARCA",
    carro: "MODELO A 1.8",
    ano: "1991 > 1998",
    posicoes: ["H4", "H4", "H3", "-", "P21W", null, null, null, null, null, null, null, null],
  },
  {
    montadora: "TESTEMARCA",
    carro: "MODELO B",
    ano: "2020",
    posicoes: ["H1 / HB3", "H7", "-", "LED", "-", null, null, null, null, null, null, null, null],
  },
  {
    montadora: "TESTEMARCA",
    carro: "MODELO C",
    ano: "> 2016",
    posicoes: ["D1S", "D1S", null, null, null, null, null, null, null, null, null, null, null],
  },
  {
    montadora: "TESTEMARCA",
    carro: "MODELO D",
    ano: "< 1996",
    posicoes: ["HB1", "HB1", null, null, null, null, null, null, null, null, null, null, null],
  },
];

describe("importCompatMatrix (integração real — Postgres, sem mocks)", () => {
  afterAll(async () => {
    const testVehicles = await prisma.vehicleModel.findMany({ where: { make: "TESTEMARCA" } });
    const ids = testVehicles.map((v) => v.id);
    await prisma.vehicleFitting.deleteMany({ where: { vehicleModelId: { in: ids } } });
    await prisma.vehicleModel.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it("importa a planilha sintética corretamente, pulando células '-'/'LED' e separando compostas", async () => {
    const summary = await importCompatMatrix(SAMPLE_ROWS);

    expect(summary.rowsRead).toBe(4);
    expect(summary.uniqueVehicles).toBe(4);
    expect(summary.yearParseErrors).toBe(0);

    const vehicles = await prisma.vehicleModel.findMany({
      where: { make: "TESTEMARCA" },
      include: { fittings: true },
    });
    expect(vehicles).toHaveLength(4);

    // MODELO A 1.8 -> nome-base "MODELO" (corta em "A"? não, "A" não é numérico -- mantém "MODELO A")
    const modeloA = vehicles.find((v) => v.model === "MODELO A");
    expect(modeloA).toBeDefined();
    expect(modeloA?.yearStart).toBe(1991);
    expect(modeloA?.yearEnd).toBe(1998);

    // MODELO B -> célula composta "H1 / HB3" vira dois fittings na mesma posição
    const modeloB = vehicles.find((v) => v.model === "MODELO B");
    const farolBaixoB = modeloB?.fittings.filter((f) => f.position === "FAROL_BAIXO") ?? [];
    expect(farolBaixoB.map((f) => f.socketCode).sort()).toEqual(["H1", "HB3"]);
    // "LED" na posição LANTERNA_DIANTEIRA foi pulada (não vira fitting)
    expect(modeloB?.fittings.some((f) => f.position === "LANTERNA_DIANTEIRA")).toBe(false);

    // MODELO C -> "> 2016" interpretado como a partir de 2016 (aberto)
    const modeloC = vehicles.find((v) => v.model === "MODELO C");
    expect(modeloC?.yearStart).toBe(2016);
    expect(modeloC?.yearEnd).toBe(9999);

    // MODELO D -> "< 1996" interpretado como até 1996 (aberto pra trás)
    const modeloD = vehicles.find((v) => v.model === "MODELO D");
    expect(modeloD?.yearStart).toBe(0);
    expect(modeloD?.yearEnd).toBe(1996);
  });
});
