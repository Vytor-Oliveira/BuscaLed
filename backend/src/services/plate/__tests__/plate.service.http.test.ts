import { HttpPlateService } from "../plate.service.http";
import { PlateNotFoundError, PlateServiceTimeoutError } from "../types";

function mockFetchOnce(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  global.fetch = jest.fn().mockResolvedValue(response) as unknown as typeof fetch;
}

describe("HttpPlateService", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("chama o endpoint /v2/consulta com o token no header e retorna os dados básicos", async () => {
    mockFetchOnce({
      ok: true,
      status: 200,
      json: async () => ({
        error: false,
        message: "ok",
        basico: {
          error: false,
          message: "ok",
          // `ano` vem como string na API real, apesar da doc dizer integer
          dados: { marca: "VOLKSWAGEN", modelo: "GOL", ano: "2018", cor: "PRATA" },
        },
      }),
    });

    const service = new HttpPlateService("token-de-teste");
    const result = await service.resolvePlate("ABC1D23");

    expect(fetch).toHaveBeenCalledWith(
      "https://api.puxaplaca.app/v2/consulta/ABC1D23",
      expect.objectContaining({
        headers: { token: "token-de-teste", Accept: "application/json" },
      })
    );
    expect(result).toEqual({ make: "VOLKSWAGEN", model: "GOL", year: 2018, color: "PRATA" });
  });

  it("converte o campo ano (string) para number, replicando uma resposta real da API", async () => {
    // Fixture capturada de uma consulta real em 24/08/2026 (placa de exemplo ABC1D23, token com permissão Básica)
    mockFetchOnce({
      ok: true,
      status: 200,
      json: async () => ({
        basico: {
          error: false,
          message: "",
          dados: {
            marca: "VW",
            modelo: "PASSAT TS",
            cor: "AZUL",
            ano: "1979",
            anoModelo: "1979",
            municipio: "Curitiba",
            uf: "PR",
          },
          execucao: "0.0065",
        },
        execucao_total: "0.0263",
        error: false,
        message: "Consulta efetuada com sucesso",
      }),
    });

    const service = new HttpPlateService("token-de-teste");
    const result = await service.resolvePlate("ABC1D23");

    expect(result).toEqual({ make: "VW", model: "PASSAT TS", year: 1979, color: "AZUL" });
  });

  it("lança PlateNotFoundError quando a API responde 404", async () => {
    mockFetchOnce({ ok: false, status: 404 });

    const service = new HttpPlateService("token-de-teste");

    await expect(service.resolvePlate("ABC1D23")).rejects.toBeInstanceOf(PlateNotFoundError);
  });

  it("lança PlateNotFoundError quando a API responde 406 (placa inválida)", async () => {
    mockFetchOnce({ ok: false, status: 406 });

    const service = new HttpPlateService("token-de-teste");

    await expect(service.resolvePlate("XX")).rejects.toBeInstanceOf(PlateNotFoundError);
  });

  it("lança PlateNotFoundError quando o corpo vem com error=true mesmo em 200", async () => {
    mockFetchOnce({
      ok: true,
      status: 200,
      json: async () => ({ error: true, message: "saldo insuficiente" }),
    });

    const service = new HttpPlateService("token-de-teste");

    await expect(service.resolvePlate("ABC1D23")).rejects.toBeInstanceOf(PlateNotFoundError);
  });

  it("lança erro genérico quando a API responde com status inesperado (ex: 401)", async () => {
    mockFetchOnce({ ok: false, status: 401 });

    const service = new HttpPlateService("token-de-teste");

    await expect(service.resolvePlate("ABC1D23")).rejects.toThrow("PuxaPlaca respondeu com status 401");
  });

  it("lança PlateServiceTimeoutError quando o fetch é abortado por timeout", async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new DOMException("Aborted", "AbortError")) as unknown as typeof fetch;

    const service = new HttpPlateService("token-de-teste");

    await expect(service.resolvePlate("ABC1D23")).rejects.toBeInstanceOf(PlateServiceTimeoutError);
  });
});
