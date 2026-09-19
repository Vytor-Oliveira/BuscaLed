import "dotenv/config";
import request from "supertest";
import { createApp } from "../../app";
import { prisma } from "../../db/prisma";

const app = createApp();

/**
 * Testes de integração reais: HTTP -> rota -> serviço -> repositório ->
 * Postgres de verdade. Sem mock. Cada teste semeia os próprios dados
 * (VehicleModel, VehicleFitting, LedModel) e limpa no final.
 */
describe("Compatibility routes (integração real — Postgres, sem mocks)", () => {
  const createdVehicleModelIds: string[] = [];
  const createdLedModelIds: string[] = [];

  afterAll(async () => {
    if (createdVehicleModelIds.length > 0) {
      await prisma.vehicleFitting.deleteMany({
        where: { vehicleModelId: { in: createdVehicleModelIds } },
      });
      await prisma.vehicleModel.deleteMany({ where: { id: { in: createdVehicleModelIds } } });
    }
    if (createdLedModelIds.length > 0) {
      await prisma.ledModel.deleteMany({ where: { id: { in: createdLedModelIds } } });
    }
    await prisma.$disconnect();
  });

  it("retorna 400 quando faltam parâmetros", async () => {
    const res = await request(app).get("/compatibility");
    expect(res.status).toBe(400);
  });

  it("retorna 404 quando o veículo não está cadastrado", async () => {
    const res = await request(app).get("/compatibility?make=INEXISTENTE&model=XPTO&year=2099");
    expect(res.status).toBe(404);
  });

  it("agrupa por posição: dois soquetes na mesma posição (célula composta) e um soquete sem produto", async () => {
    // Soquetes sintéticos, únicos por execução: o catálogo real (seed +
    // planilha importada) já tem produtos H1/HB3/P21W de verdade, então usar
    // esses códigos aqui faria o teste depender do que mais existe no banco.
    // Com códigos garantidamente exclusivos deste teste, o resultado fica
    // isolado e as asserções de contagem exata continuam válidas.
    const runId = Date.now();
    const socketA = `TESTE-A-${runId}`;
    const socketB = `TESTE-B-${runId}`;
    const socketSemProduto = `TESTE-C-${runId}`;

    const vehicle = await prisma.vehicleModel.create({
      data: { make: "TESTE", model: "MODELO-M3", yearStart: 2020, yearEnd: 2022 },
    });
    createdVehicleModelIds.push(vehicle.id);

    // Farol baixo com dois soquetes válidos (simula célula composta "H1 / HB3")
    await prisma.vehicleFitting.createMany({
      data: [
        { vehicleModelId: vehicle.id, position: "FAROL_BAIXO", socketCode: socketA },
        { vehicleModelId: vehicle.id, position: "FAROL_BAIXO", socketCode: socketB },
        // Posição com soquete sem nenhum produto cadastrado ainda
        { vehicleModelId: vehicle.id, position: "PISCA_DIANTEIRO", socketCode: socketSemProduto },
      ],
    });

    const ledModel = await prisma.ledModel.create({
      data: {
        sku: `TESTE-LED-${runId}`,
        name: "LED de teste soquete A",
        socketCode: socketA,
        stockQty: 5,
      },
    });
    createdLedModelIds.push(ledModel.id);

    const res = await request(app).get(
      `/compatibility?make=${vehicle.make}&model=${vehicle.model}&year=2021`
    );

    expect(res.status).toBe(200);
    const { positions } = res.body;

    const farolBaixo = positions.find((p: { position: string }) => p.position === "FAROL_BAIXO");
    expect(farolBaixo.socketCodes.sort()).toEqual([socketA, socketB].sort());
    expect(farolBaixo.models).toHaveLength(1);
    expect(farolBaixo.models[0].sku).toBe(ledModel.sku);

    const piscaDianteiro = positions.find(
      (p: { position: string }) => p.position === "PISCA_DIANTEIRO"
    );
    expect(piscaDianteiro.socketCodes).toEqual([socketSemProduto]);
    expect(piscaDianteiro.models).toEqual([]);
  });
});
