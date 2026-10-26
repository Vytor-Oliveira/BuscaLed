export interface TopProduct {
  ledModelId: string;
  sku: string;
  name: string;
  totalReserved: number;
}

export interface CriticalStockItem {
  ledModelId: string;
  sku: string;
  name: string;
  stockQty: number;
  stockMin: number;
}

export interface TopVehicle {
  make: string;
  model: string;
  searchCount: number;
  withoutResultCount: number;
}

export interface DemandTotals {
  searches: number;
  searchesWithoutResult: number;
  tickets: number;
  /**
   * Razão entre os dois volumes do período, não atribuição busca a busca —
   * não existe hoje vínculo entre a busca e o ticket que ela gerou.
   */
  conversionRate: number;
}

export interface SearchesPerDay {
  day: string;
  count: number;
}

/**
 * O dashboard de demanda (M5 / Tela 8 do RFC). `withoutResultCount` é o que
 * aponta lacuna na matriz de compatibilidade: veículo procurado que não achou
 * LED nenhum. `totals` e `searchesPerDay` recortam por período; os rankings
 * são do histórico inteiro.
 */
export interface DemandSummary {
  periodDays: number;
  totals: DemandTotals;
  searchesPerDay: SearchesPerDay[];
  topProducts: TopProduct[];
  criticalStock: CriticalStockItem[];
  topVehicles: TopVehicle[];
}

export interface AnalyticsRepository {
  findTopProducts(limit: number): Promise<TopProduct[]>;
  findCriticalStock(limit: number): Promise<CriticalStockItem[]>;
  findTopVehicles(limit: number): Promise<TopVehicle[]>;
  findTotals(since: Date): Promise<Omit<DemandTotals, "conversionRate">>;
  findSearchesPerDay(since: Date): Promise<SearchesPerDay[]>;
}
