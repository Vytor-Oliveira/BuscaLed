import "dotenv/config";
import request from "supertest";
import { createApp } from "../../app";
import { prisma } from "../../db/prisma";
import { closeNotificationQueue } from "../../queue/notification.bootstrap";

const app = createApp();

/**
 * Testes de integração reais: HTTP -> rota -> serviço -> repositório ->
 * Postgres de verdade. Sem mock. Cada teste semeia os próprios dados
 * (VehicleModel, VehicleFitting, LedModel) e limpa no final.
 */
describe("Compatibility routes (integração real — Postgres, sem mocks)", () => {
  const createdVehicleModelIds: string[] = [];
  const createdLedModelIds: string[] = [];
  // Toda busca agora grava historico, inclusive as dos testes que ja existiam.
  const buscasRegistradas: string[] = ["INEXISTENTE", "TESTE"];

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
    if (buscasRegistradas.length > 0) {
      await prisma.searchHistory.deleteMany({ where: { make: { in: buscasRegistradas } } });
    }
    await prisma.$disconnect();
    await closeNotificationQueue();
    // Limpeza em tabelas grandes: 5s (padrao do Jest) estoura com o
    // container frio e deixa o CI vermelho sem motivo real.
  }, 30_000);

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
  // O dashboard de demanda (M5) depende desse registro. Sem placa e sem userId:
  // o historico e agregado e anonimo por desenho (RN02).
  it("registra a busca no historico, inclusive quando nao encontra o veiculo", async () => {
    const runId = Date.now();
    const makeSemResultado = `TESTEHIST-VAZIO-${runId}`;
    const makeComResultado = `TESTEHIST-OK-${runId}`;
    buscasRegistradas.push(makeSemResultado, makeComResultado);

    // 1) veiculo que nao existe na matriz -> 404, mas tem de ficar registrado
    const semResultado = await request(app).get(
      `/compatibility?make=${makeSemResultado}&model=QUALQUER&year=2020`
    );
    expect(semResultado.status).toBe(404);

    const registroVazio = await prisma.searchHistory.findFirstOrThrow({
      where: { make: makeSemResultado },
    });
    expect(registroVazio.resultCount).toBe(0);
    expect(registroVazio.year).toBe(2020);

    // 2) veiculo com produto cadastrado -> conta quantos produtos achou
    const socket = `TESTEHIST-${runId}`;
    const vehicle = await prisma.vehicleModel.create({
      data: { make: makeComResultado, model: "MODELO-HIST", yearStart: 2020, yearEnd: 2021 },
    });
    createdVehicleModelIds.push(vehicle.id);
    await prisma.vehicleFitting.create({
      data: { vehicleModelId: vehicle.id, position: "FAROL_BAIXO", socketCode: socket },
    });
    const led = await prisma.ledModel.create({
      data: { sku: `TESTEHIST-LED-${runId}`, name: "LED hist", socketCode: socket, stockQty: 1 },
    });
    createdLedModelIds.push(led.id);

    const comResultado = await request(app).get(
      `/compatibility?make=${makeComResultado}&model=MODELO-HIST&year=2020`
    );
    expect(comResultado.status).toBe(200);

    const registroOk = await prisma.searchHistory.findFirstOrThrow({
      where: { make: makeComResultado },
    });
    expect(registroOk.resultCount).toBe(1);
  });

  // Alimentam os seletores da Home: sem eles a pessoa teria que acertar a
  // grafia exata de um catalogo com ~1900 modelos.
  describe("listagem para os seletores de veiculo", () => {
    it("devolve as marcas em ordem alfabetica e sem repetir", async () => {
      const res = await request(app).get("/compatibility/makes");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.makes)).toBe(true);
      expect(res.body.makes.length).toBeGreaterThan(0);

      const marcas: string[] = res.body.makes;
      expect([...new Set(marcas)]).toHaveLength(marcas.length);
      expect([...marcas].sort((a, b) => a.localeCompare(b))).toEqual(marcas);
    });

    it("devolve os modelos da marca com a faixa de ano", async () => {
      const marca = `TESTE-SELETOR-${Date.now()}`;
      const criado = await prisma.vehicleModel.create({
        data: { make: marca, model: "MODELO SELETOR", yearStart: 2012, yearEnd: 2015 },
      });
      createdVehicleModelIds.push(criado.id);

      const res = await request(app).get(`/compatibility/models?make=${marca}`);

      expect(res.status).toBe(200);
      expect(res.body.models).toEqual([
        { model: "MODELO SELETOR", yearStart: 2012, yearEnd: 2015 },
      ]);
    });

    it("nao devolve modelo de outra marca", async () => {
      const res = await request(app).get("/compatibility/models?make=MARCA-QUE-NAO-EXISTE");

      expect(res.status).toBe(200);
      expect(res.body.models).toEqual([]);
    });

    it("recusa listagem de modelos sem a marca", async () => {
      const semMarca = await request(app).get("/compatibility/models");
      expect(semMarca.status).toBe(400);

      const vazia = await request(app).get("/compatibility/models?make=");
      expect(vazia.status).toBe(400);
    });
  });

  it("casa o modelo pelo nome base quando a API devolve texto de acabamento", async () => {
    // Mesma forma de uma consulta real da API, onde a API devolve "NOVA SAVEIRO RB
    // MBVS" e a matriz guarda "Saveiro Robust 1.6 MSI CD (Flex)". Marca
    // sintética para não colidir com a matriz real já importada no banco.
    const runId = Date.now();
    const make = `TESTEBASE${runId}`;
    const socket = `TESTE-BASE-${runId}`;

    const vehicle = await prisma.vehicleModel.create({
      data: {
        make,
        model: "Saveiro Robust 1.6 MSI CD (Flex)",
        yearStart: 2019,
        yearEnd: 2020,
      },
    });
    createdVehicleModelIds.push(vehicle.id);

    await prisma.vehicleFitting.create({
      data: { vehicleModelId: vehicle.id, position: "FAROL_BAIXO", socketCode: socket },
    });

    const res = await request(app).get(
      `/compatibility?make=${make}&model=NOVA%20SAVEIRO%20RB%20MBVS&year=2020`
    );

    expect(res.status).toBe(200);
    const farolBaixo = res.body.positions.find(
      (p: { position: string }) => p.position === "FAROL_BAIXO"
    );
    expect(farolBaixo.socketCodes).toContain(socket);
  });

  it("retorna 409 com as versões quando acabamentos do mesmo carro têm iluminação diferente", async () => {
    const runId = Date.now();
    const make = `TESTEAMB${runId}`;

    const comH4 = await prisma.vehicleModel.create({
      data: { make, model: `Ambiguo Base 1.0 ${runId}`, yearStart: 2020, yearEnd: 2021 },
    });
    const comH7 = await prisma.vehicleModel.create({
      data: { make, model: `Ambiguo Top 2.0 ${runId}`, yearStart: 2020, yearEnd: 2021 },
    });
    createdVehicleModelIds.push(comH4.id, comH7.id);

    await prisma.vehicleFitting.createMany({
      data: [
        { vehicleModelId: comH4.id, position: "FAROL_BAIXO", socketCode: `AMB-H4-${runId}` },
        { vehicleModelId: comH7.id, position: "FAROL_BAIXO", socketCode: `AMB-H7-${runId}` },
      ],
    });

    const res = await request(app).get(`/compatibility?make=${make}&model=AMBIGUO&year=2020`);

    expect(res.status).toBe(409);
    expect(res.body.candidates).toHaveLength(2);
  });

  it("une as posições quando uma falta num acabamento (lacuna da planilha, não contradição)", async () => {
    // Caso real do Onix 2020: todos os acabamentos concordam no farol, mas só
    // alguns têm a célula de PLACA preenchida na planilha da Shocklight.
    const runId = Date.now();
    const make = `TESTELACUNA${runId}`;
    const farol = `LAC-FAROL-${runId}`;
    const placa = `LAC-PLACA-${runId}`;

    const completo = await prisma.vehicleModel.create({
      data: { make, model: `Lacuna Completo 1.0 ${runId}`, yearStart: 2020, yearEnd: 2021 },
    });
    const semPlaca = await prisma.vehicleModel.create({
      data: { make, model: `Lacuna Parcial 1.0 ${runId}`, yearStart: 2020, yearEnd: 2021 },
    });
    createdVehicleModelIds.push(completo.id, semPlaca.id);

    await prisma.vehicleFitting.createMany({
      data: [
        { vehicleModelId: completo.id, position: "FAROL_BAIXO", socketCode: farol },
        { vehicleModelId: completo.id, position: "PLACA", socketCode: placa },
        { vehicleModelId: semPlaca.id, position: "FAROL_BAIXO", socketCode: farol },
      ],
    });

    const res = await request(app).get(`/compatibility?make=${make}&model=LACUNA&year=2020`);

    expect(res.status).toBe(200);
    const positions = res.body.positions as Array<{ position: string; socketCodes: string[] }>;
    expect(positions.find((p) => p.position === "FAROL_BAIXO")?.socketCodes).toEqual([farol]);
    expect(positions.find((p) => p.position === "PLACA")?.socketCodes).toEqual([placa]);
  });

  it("responde normalmente quando os acabamentos empatados têm a mesma iluminação", async () => {
    const runId = Date.now();
    const make = `TESTEIGUAL${runId}`;
    const socket = `IGUAL-${runId}`;

    const primeiro = await prisma.vehicleModel.create({
      data: { make, model: `Igual Base 1.0 ${runId}`, yearStart: 2020, yearEnd: 2021 },
    });
    const segundo = await prisma.vehicleModel.create({
      data: { make, model: `Igual Top 2.0 ${runId}`, yearStart: 2020, yearEnd: 2021 },
    });
    createdVehicleModelIds.push(primeiro.id, segundo.id);

    await prisma.vehicleFitting.createMany({
      data: [
        { vehicleModelId: primeiro.id, position: "FAROL_BAIXO", socketCode: socket },
        { vehicleModelId: segundo.id, position: "FAROL_BAIXO", socketCode: socket },
      ],
    });

    const res = await request(app).get(`/compatibility?make=${make}&model=IGUAL&year=2020`);

    expect(res.status).toBe(200);
    const farolBaixo = res.body.positions.find(
      (p: { position: string }) => p.position === "FAROL_BAIXO"
    );
    expect(farolBaixo.socketCodes).toEqual([socket]);
  });
  // Faixa aberta à esquerda vem do formato "> AAAA" (= até AAAA). O yearStart 0
  // não pode virar curinga: o filtro é yearStart <= ano && yearEnd >= ano, e o
  // teste existe para que mexer nesse filtro não transforme isso em match.
  // Uma marca por faixa: na mesma marca, o match por início de token faria um
  // modelo responder pela busca do outro e esconderia o filtro de ano.
  it("faixa aberta não casa fora do lado fechado (yearStart 0 não é curinga)", async () => {
    const runId = Date.now();
    const makeAte = `TESTEATE${runId}`;
    const makeApartir = `TESTEAPARTIR${runId}`;
    const soqueteAte = `FAIXA-ATE-${runId}`;
    const soqueteApartir = `FAIXA-APARTIR-${runId}`;
    buscasRegistradas.push(makeAte, makeApartir);

    const ate2016 = await prisma.vehicleModel.create({
      data: { make: makeAte, model: `Faixa 1.0 ${runId}`, yearStart: 0, yearEnd: 2016 },
    });
    const apartir2015 = await prisma.vehicleModel.create({
      data: { make: makeApartir, model: `Faixa 1.0 ${runId}`, yearStart: 2015, yearEnd: 9999 },
    });
    createdVehicleModelIds.push(ate2016.id, apartir2015.id);

    await prisma.vehicleFitting.createMany({
      data: [
        { vehicleModelId: ate2016.id, position: "FAROL_BAIXO", socketCode: soqueteAte },
        { vehicleModelId: apartir2015.id, position: "FAROL_BAIXO", socketCode: soqueteApartir },
      ],
    });

    const soquetes = async (make: string, year: number): Promise<string[] | null> => {
      const res = await request(app).get(`/compatibility?make=${make}&model=FAIXA&year=${year}`);
      if (res.status === 404) {
        return null;
      }
      expect(res.status).toBe(200);
      const positions = res.body.positions as Array<{ position: string; socketCodes: string[] }>;
      return positions.find((p) => p.position === "FAROL_BAIXO")?.socketCodes ?? [];
    };

    // "até 2016": 2022 está fora, 1996 e 2016 estão dentro.
    expect(await soquetes(makeAte, 2022)).toBeNull();
    expect(await soquetes(makeAte, 1996)).toEqual([soqueteAte]);
    expect(await soquetes(makeAte, 2016)).toEqual([soqueteAte]);

    // Espelho: "a partir de 2015" casa 2022, não casa 2010.
    expect(await soquetes(makeApartir, 2022)).toEqual([soqueteApartir]);
    expect(await soquetes(makeApartir, 2010)).toBeNull();
  });
});
