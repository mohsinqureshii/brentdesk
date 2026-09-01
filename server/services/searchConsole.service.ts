/**
 * Google Search Console client.
 *
 * Pulls top queries / pages / countries with clicks, impressions, CTR,
 * and average position. Reuses the Indexing API service-account
 * credentials by default (the Search Console scope is additive).
 */

import { getBaseUrl } from "../../shared/publication";
import { getEffectiveConfig } from "./integrationConfig.service";
import { getGoogleAccessToken, GOOGLE_SCOPES } from "./googleAuth.service";

const GSC_BASE = "https://searchconsole.googleapis.com/webmasters/v3";

interface GSCConfig {
  siteUrl: string;
  serviceAccountJson: string;
}

async function resolveConfig(): Promise<GSCConfig | null> {
  // Prefer the dedicated GSC config; fall back to the Indexing API
  // service account since both APIs use the same JWT flow.
  const gsc = await getEffectiveConfig("search-console", {
    secrets: {
      serviceAccountJson: process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT,
    },
  });
  if (!gsc) return null;
  const siteUrl = gsc.publicConfig.siteUrl || `${getBaseUrl()}/`;
  const sa = gsc.secrets.serviceAccountJson;
  if (!sa) return null;
  return { siteUrl, serviceAccountJson: typeof sa === "string" ? sa : JSON.stringify(sa) };
}

function dateMinus(days: number): string {
  const d = new Date(Date.now() - days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export interface GSCSummary {
  totalClicks: number;
  totalImpressions: number;
  ctr: number;
  averagePosition: number;
  topQueries: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>;
  topPages: Array<{ page: string; clicks: number; impressions: number; ctr: number; position: number }>;
}

export async function getSearchConsoleSummary(days: number = 28): Promise<GSCSummary | null> {
  const cfg = await resolveConfig();
  if (!cfg) return null;
  const token = await getGoogleAccessToken(cfg.serviceAccountJson, GOOGLE_SCOPES.searchConsole);

  const startDate = dateMinus(days);
  const endDate = dateMinus(2); // GSC has 2-day delay

  async function query(dimensions: string[]): Promise<any> {
    const url = `${GSC_BASE}/sites/${encodeURIComponent(cfg!.siteUrl)}/searchAnalytics/query`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ startDate, endDate, dimensions, rowLimit: 25 }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`GSC ${res.status}: ${body.slice(0, 200)}`);
    }
    return await res.json();
  }

  const [headlineRaw, queriesRaw, pagesRaw] = await Promise.all([
    query([]),
    query(["query"]),
    query(["page"]),
  ]);

  const headline = (headlineRaw.rows || [])[0] || {};
  const totalClicks = headline.clicks || 0;
  const totalImpressions = headline.impressions || 0;
  const ctr = headline.ctr || 0;
  const averagePosition = headline.position || 0;

  const topQueries = ((queriesRaw.rows || []) as any[]).slice(0, 10).map((r) => ({
    query: r.keys?.[0] || "",
    clicks: r.clicks || 0,
    impressions: r.impressions || 0,
    ctr: r.ctr || 0,
    position: r.position || 0,
  }));
  const topPages = ((pagesRaw.rows || []) as any[]).slice(0, 10).map((r) => ({
    page: r.keys?.[0] || "",
    clicks: r.clicks || 0,
    impressions: r.impressions || 0,
    ctr: r.ctr || 0,
    position: r.position || 0,
  }));

  return { totalClicks, totalImpressions, ctr, averagePosition, topQueries, topPages };
}
