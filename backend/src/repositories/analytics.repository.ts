import { LedModel, PrismaClient } from "@prisma/client";
import {
  AnalyticsRepository,
  CriticalStockItem,
  DemandTotals,
  SearchesPerDay,
  TopProduct,
  TopVehicle,
} from "../services/analytics/types";

interface TopVehicleRow {
  make: string;
  model: string;
  searchCount: bigint;
  withoutResultCount: bigint;
}

interface TotalsRow {
  searches: bigint;
  withoutResult: bigint;
}

interface PerDayRow {
  day: string;
  count: bigint;
}

export class PrismaAnalyticsRepository implements AnalyticsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findTopProducts(limit: number): Promise<TopProduct[]> {
    // Ticket cancelado não conta como demanda — o cliente desistiu.
    const grouped = await this.prisma.reservationItem.groupBy({
      by: ["ledModelId"],
      where: { reservation: { status: { not: "CANCELADO" } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: limit,
    });

    if (grouped.length === 0) {
      return [];
    }

    const models = await this.prisma.ledModel.findMany({
      where: { id: { in: grouped.map((row) => row.ledModelId) } },
      select: { id: true, sku: true, name: true },
    });
    const bySku = new Map(models.map((model) => [model.id, model]));

    return grouped.flatMap((row) => {
      const model = bySku.get(row.ledModelId);
      if (!model) {
        return [];
      }
      return [
        {
          ledModelId: model.id,
          sku: model.sku,
          name: model.name,
          totalReserved: row._sum.quantity ?? 0,
        },
      ];
    });
  }

  async findCriticalStock(limit: number): Promise<CriticalStockItem[]> {
    // O Prisma não compara duas colunas no `where`, então a comparação
    // stockQty <= stockMin vai em SQL parametrizado (mesmo recurso que o
    // decrementStock já usa em stock.repository.ts).
    const rows = await this.prisma.$queryRaw<LedModel[]>`
      SELECT *
      FROM "LedModel"
      WHERE "stockQty" <= "stockMin"
      ORDER BY "stockQty" ASC
      LIMIT ${limit}
    `;

    return rows.map((row) => ({
      ledModelId: row.id,
      sku: row.sku,
      name: row.name,
      stockQty: row.stockQty,
      stockMin: row.stockMin,
    }));
  }

  async findTopVehicles(limit: number): Promise<TopVehicle[]> {
    // COUNT devolve bigint no driver, que não serializa em JSON — convertido
    // para Number aqui, seguro porque é contagem de buscas.
    const rows = await this.prisma.$queryRaw<TopVehicleRow[]>`
      SELECT
        "make",
        "model",
        COUNT(*) AS "searchCount",
        COUNT(*) FILTER (WHERE "resultCount" = 0) AS "withoutResultCount"
      FROM "SearchHistory"
      GROUP BY "make", "model"
      ORDER BY COUNT(*) DESC
      LIMIT ${limit}
    `;

    return rows.map((row) => ({
      make: row.make,
      model: row.model,
      searchCount: Number(row.searchCount),
      withoutResultCount: Number(row.withoutResultCount),
    }));
  }

  async findTotals(since: Date): Promise<Omit<DemandTotals, "conversionRate">> {
    const [rows, tickets] = await Promise.all([
      this.prisma.$queryRaw<TotalsRow[]>`
        SELECT
          COUNT(*) AS "searches",
          COUNT(*) FILTER (WHERE "resultCount" = 0) AS "withoutResult"
        FROM "SearchHistory"
        WHERE "createdAt" >= ${since}
      `,
      this.prisma.reservation.count({
        where: { createdAt: { gte: since }, status: { not: "CANCELADO" } },
      }),
    ]);

    return {
      searches: Number(rows[0]?.searches ?? 0),
      searchesWithoutResult: Number(rows[0]?.withoutResult ?? 0),
      tickets,
    };
  }

  async findSearchesPerDay(since: Date): Promise<SearchesPerDay[]> {
    // Agrupa no banco porque a série pode cobrir 90 dias de histórico.
    //
    // O createdAt é gravado em UTC, e truncar o dia direto nele jogava toda
    // busca feita depois das 21h no dia seguinte do gráfico. A série de dias
    // vem de generate_series porque dia sem busca não aparece num GROUP BY —
    // e queda de demanda é exatamente o que o parceiro precisa ver.
    const rows = await this.prisma.$queryRaw<PerDayRow[]>`
      WITH dias AS (
        SELECT generate_series(
          date_trunc('day', (${since}::timestamp AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo'),
          date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo'),
          interval '1 day'
        ) AS dia
      )
      SELECT
        to_char(dias.dia, 'YYYY-MM-DD') AS "day",
        COUNT(busca.id) AS "count"
      FROM dias
      LEFT JOIN "SearchHistory" busca
        ON busca."createdAt" >= ${since}
       AND date_trunc('day', (busca."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo') = dias.dia
      GROUP BY 1
      ORDER BY 1
    `;

    return rows.map((row) => ({ day: row.day, count: Number(row.count) }));
  }
}
