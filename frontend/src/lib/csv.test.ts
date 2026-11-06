import type { Ticket } from "../api/tickets";
import { paraCsv } from "./csv";

function ticket(sobrescreve: Partial<Ticket> = {}): Ticket {
  return {
    id: "aaaa1111-0000-0000-0000-00000000ab12",
    userId: "u-1",
    userEmail: "cliente@example.com",
    customerPhone: "47999990000",
    vehicle: { make: "VOLKSWAGEN", model: "GOL", year: 2018 },
    status: "PENDENTE",
    createdAt: "2026-10-13T12:00:00.000Z",
    updatedAt: "2026-10-13T12:00:00.000Z",
    items: [
      {
        id: "i-1",
        ledModelId: "led-1",
        ledModelSku: "SHK-S14-H4",
        ledModelName: "Ultraled S14 H4",
        originalLedModelId: null,
        position: "FAROL_BAIXO",
        quantity: 2,
      },
    ],
    ...sobrescreve,
  };
}

describe("paraCsv", () => {
  it("usa ponto e vírgula como separador", () => {
    // O Excel em pt-BR usa vírgula como separador decimal: um CSV virgulado
    // abriria tudo numa coluna só.
    const linhas = paraCsv([ticket()]).split("\r\n");
    expect(linhas[0]).toBe(
      '"Ticket";"Cliente";"Telefone";"Veículo";"Produtos";"Data";"Status"'
    );
    expect(linhas[1].split(";")).toHaveLength(7);
  });

  it("escapa aspas duplicando", () => {
    const csv = paraCsv([ticket({ userEmail: 'ana "nina" silva@example.com' })]);
    expect(csv).toContain('"ana ""nina"" silva@example.com"');
  });

  it("neutraliza célula que o Excel leria como fórmula", () => {
    // Injeção de fórmula em CSV: as aspas não impedem o Excel de avaliar uma
    // célula que começa com = + - @. O apóstrofo força leitura como texto.
    const csv = paraCsv([
      ticket({ customerPhone: "=HYPERLINK(\"http://malicioso\",\"clique\")" }),
    ]);
    expect(csv).toContain("\"'=HYPERLINK");
  });

  it("protege também os prefixos + - @ e tab", () => {
    for (const perigoso of ["+1", "-1", "@SUM(A1)", "\tx"]) {
      const csv = paraCsv([ticket({ userEmail: perigoso })]);
      expect(csv).toContain(`"'${perigoso}"`);
    }
  });

  it("deixa o veículo em branco quando o pedido não tem", () => {
    const linhas = paraCsv([ticket({ vehicle: null })]).split("\r\n");
    expect(linhas[1]).toContain(';"";');
  });

  it("traz marca, modelo e ano quando o pedido tem veículo", () => {
    expect(paraCsv([ticket()])).toContain('"VOLKSWAGEN GOL 2018"');
  });

  it("nunca inclui placa — ela não existe no ticket (RN02)", () => {
    const csv = paraCsv([ticket()]);
    expect(csv.toLowerCase()).not.toContain("placa");
  });
});
