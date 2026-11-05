import { AnalyticsRepository, DemandSummary } from "./types";

const DEFAULT_LIMIT = 10;
const DEFAULT_PERIOD_DAYS = 30;

export class AnalyticsService {
  constructor(private readonly repository: AnalyticsRepository) {}

  async getDemandSummary(
    limit: number = DEFAULT_LIMIT,
    periodDays: number = DEFAULT_PERIOD_DAYS
  ): Promise<DemandSummary> {
    const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    const [topProducts, criticalStock, topVehicles, totals, searchesPerDay] = await Promise.all([
      this.repository.findTopProducts(limit),
      this.repository.findCriticalStock(limit),
      this.repository.findTopVehicles(limit),
      this.repository.findTotals(since),
      this.repository.findSearchesPerDay(since),
    ]);

    return {
      periodDays,
      totals: {
        ...totals,
        conversionRate: totals.searches === 0 ? 0 : totals.tickets / totals.searches,
      },
      searchesPerDay,
      topProducts,
      criticalStock,
      topVehicles,
    };
  }
}
