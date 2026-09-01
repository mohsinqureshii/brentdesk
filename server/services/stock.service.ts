/**
 * Stock Service
 * Fetches real stock prices from Yahoo Finance API with caching
 */

import { callDataApi } from "../_core/dataApi";
import { getDb } from "../db";
import { settings } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// Stock data types
export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  exchange: string;
}

export interface StockCategory {
  id: string;
  label: string;
  symbols: string[];
}

// Default stock categories with symbols
export const DEFAULT_STOCK_CATEGORIES: StockCategory[] = [
  {
    id: "global",
    label: "Global Tech",
    symbols: ["^GSPC", "^IXIC", "^DJI", "AAPL", "MSFT", "GOOGL"],
  },
  {
    id: "uae",
    label: "UAE Stocks",
    symbols: ["ETISALAT.AD", "FAB.AD", "EMAAR.DU", "DIB.DU", "ADNOCDIST.AD"],
  },
  {
    id: "saudi",
    label: "Saudi Stocks",
    symbols: ["2222.SR", "1120.SR", "7010.SR", "1180.SR", "2010.SR"],
  },
  {
    id: "qatar",
    label: "Qatar Stocks",
    symbols: ["QNBK.QA", "ORDS.QA", "QEWS.QA", "QIIK.QA"],
  },
];

// In-memory cache for stock data
interface CacheEntry {
  data: StockQuote[];
  timestamp: number;
}

const stockCache: Map<string, CacheEntry> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

/**
 * Get stock categories from settings or use defaults
 */
export async function getStockCategories(): Promise<StockCategory[]> {
  try {
    const db = await getDb();
    if (!db) return DEFAULT_STOCK_CATEGORIES;

    const result = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "stock_categories"))
      .limit(1);

    if (result[0]?.value) {
      return JSON.parse(result[0].value as string);
    }
  } catch (error) {
    console.error("Error fetching stock categories:", error);
  }
  return DEFAULT_STOCK_CATEGORIES;
}

/**
 * Save stock categories to settings
 */
export async function saveStockCategories(categories: StockCategory[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(settings)
    .where(eq(settings.key, "stock_categories"))
    .limit(1);

  if (existing[0]) {
    await db
      .update(settings)
      .set({ value: JSON.stringify(categories), updatedAt: new Date().toISOString() } as any)
      .where(eq(settings.key, "stock_categories"));
  } else {
    await db.insert(settings).values({
      key: "stock_categories",
      value: JSON.stringify(categories),
      type: "json",
      label: "Stock Ticker Categories",
      description: "Categories and symbols for the stock ticker",
    } as any);
  }
}

/**
 * Fetch stock quote from Yahoo Finance API
 */
async function fetchStockQuote(symbol: string): Promise<StockQuote | null> {
  try {
    const response = await callDataApi("YahooFinance/get_stock_chart", {
      query: {
        symbol,
        region: "US",
        interval: "1d",
        range: "1d",
        includeAdjustedClose: "true",
      },
    }) as unknown as { chart?: { result?: Array<{ meta?: Record<string, unknown> }> } };

    if (response?.chart?.result?.[0]?.meta) {
      const meta = response.chart.result[0].meta;
      const regularMarketPrice = meta.regularMarketPrice as number || 0;
      const previousClose = meta.previousClose as number || meta.chartPreviousClose as number || regularMarketPrice;
      const change = regularMarketPrice - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

      return {
        symbol: meta.symbol as string || symbol,
        name: (meta.longName as string) || (meta.shortName as string) || symbol,
        price: regularMarketPrice,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        currency: meta.currency as string || "USD",
        exchange: meta.exchangeName as string || "Unknown",
      };
    }
  } catch (error) {
    console.error(`Error fetching stock ${symbol}:`, error);
  }
  return null;
}

/**
 * Get stock quotes for a category with caching
 */
export async function getStockQuotes(categoryId: string): Promise<StockQuote[]> {
  // Check cache first
  const cached = stockCache.get(categoryId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Get categories
  const categories = await getStockCategories();
  const category = categories.find((c) => c.id === categoryId);
  if (!category) return [];

  // Fetch quotes for all symbols in parallel
  const quotes: StockQuote[] = [];
  const fetchPromises = category.symbols.map(async (symbol) => {
    const quote = await fetchStockQuote(symbol);
    if (quote) quotes.push(quote);
  });

  await Promise.all(fetchPromises);

  // Cache the results
  stockCache.set(categoryId, {
    data: quotes,
    timestamp: Date.now(),
  });

  return quotes;
}

/**
 * Get all stock quotes for all categories
 */
export async function getAllStockQuotes(): Promise<Record<string, StockQuote[]>> {
  const categories = await getStockCategories();
  const result: Record<string, StockQuote[]> = {};

  for (const category of categories) {
    result[category.id] = await getStockQuotes(category.id);
  }

  return result;
}

/**
 * Clear stock cache
 */
export function clearStockCache(): void {
  stockCache.clear();
}
