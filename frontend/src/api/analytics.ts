import { api } from "./client";

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
  conversionRate: number;
}

export interface SearchesPerDay {
  day: string;
  count: number;
}

export interface DemandSummary {
  periodDays: number;
  totals: DemandTotals;
  searchesPerDay: SearchesPerDay[];
  topProducts: TopProduct[];
  criticalStock: CriticalStockItem[];
  topVehicles: TopVehicle[];
}

export function getDemandSummary(days = 30, limit = 10): Promise<{ summary: DemandSummary }> {
  return api<{ summary: DemandSummary }>("/analytics/summary", { query: { limit, days } });
}
