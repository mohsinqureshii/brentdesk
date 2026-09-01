/**
 * Google Analytics 4 Reporting client.
 *
 * Reads measurement_id + property_id (publicConfig) and the service-account
 * JSON (encrypted secret) from integration_configs. Returns a small,
 * normalised shape that the Dashboard → Audience tab consumes directly.
 *
 * If GA4 is not configured, every method returns null. The caller treats
 * null as "show the Connect via Integration Hub empty state".
 */

import { getEffectiveConfig } from "./integrationConfig.service";
import { getGoogleAccessToken, GOOGLE_SCOPES } from "./googleAuth.service";

const REPORTING_BASE = "https://analyticsdata.googleapis.com/v1beta/properties";

interface GA4Config {
  propertyId: string;
  serviceAccountJson: string;
}

async function resolveConfig(): Promise<GA4Config | null> {
  const cfg = await getEffectiveConfig("google-analytics");
  if (!cfg) return null;
  const propertyId = cfg.publicConfig.propertyId;
  const sa = cfg.secrets.serviceAccountJson;
  if (!propertyId || !sa) return null;
  return { propertyId, serviceAccountJson: typeof sa === "string" ? sa : JSON.stringify(sa) };
}

async function runReport<T = any>(body: unknown): Promise<T | null> {
  const cfg = await resolveConfig();
  if (!cfg) return null;
  const token = await getGoogleAccessToken(cfg.serviceAccountJson, GOOGLE_SCOPES.analyticsRead);
  const res = await fetch(`${REPORTING_BASE}/${cfg.propertyId}:runReport`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`GA4 ${res.status}: ${txt.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export interface AudienceSummary {
  totalUsers: number;
  newUsers: number;
  sessions: number;
  pageviews: number;
  averageEngagementSeconds: number;
  bounceRate: number;
  daily: Array<{ date: string; users: number; pageviews: number }>;
  topPages: Array<{ path: string; pageviews: number; users: number }>;
  topCountries: Array<{ country: string; users: number }>;
}

/**
 * Single fan-out call that pulls everything the Audience tab needs.
 * Three parallel reports — daily metrics, top pages, top countries.
 */
export async function getAudienceSummary(days: number = 30): Promise<AudienceSummary | null> {
  const dateRange = { startDate: `${days}daysAgo`, endDate: "today" };

  const [headlineRaw, topPagesRaw, topCountriesRaw] = await Promise.all([
    runReport({
      dateRanges: [dateRange],
      dimensions: [{ name: "date" }],
      metrics: [
        { name: "totalUsers" },
        { name: "newUsers" },
        { name: "sessions" },
        { name: "screenPageViews" },
        { name: "averageSessionDuration" },
        { name: "bounceRate" },
      ],
      orderBys: [{ dimension: { dimensionName: "date" } }],
    }),
    runReport({
      dateRanges: [dateRange],
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }, { name: "totalUsers" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 10,
    }),
    runReport({
      dateRanges: [dateRange],
      dimensions: [{ name: "country" }],
      metrics: [{ name: "totalUsers" }],
      orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
      limit: 10,
    }),
  ]);

  if (!headlineRaw) return null;  // not configured

  const rows = (headlineRaw.rows || []) as any[];
  let totalUsers = 0, newUsers = 0, sessions = 0, pageviews = 0;
  let sumEngagement = 0, sumBounce = 0;
  const daily: AudienceSummary["daily"] = [];

  for (const r of rows) {
    const date = r.dimensionValues?.[0]?.value || "";
    const u   = parseInt(r.metricValues?.[0]?.value || "0", 10);
    const nu  = parseInt(r.metricValues?.[1]?.value || "0", 10);
    const s   = parseInt(r.metricValues?.[2]?.value || "0", 10);
    const pv  = parseInt(r.metricValues?.[3]?.value || "0", 10);
    const avg = parseFloat(r.metricValues?.[4]?.value || "0");
    const br  = parseFloat(r.metricValues?.[5]?.value || "0");
    totalUsers += u;
    newUsers += nu;
    sessions += s;
    pageviews += pv;
    sumEngagement += avg;
    sumBounce += br;
    // GA4 returns date as YYYYMMDD — convert for the chart
    const fmt = date.length === 8 ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}` : date;
    daily.push({ date: fmt, users: u, pageviews: pv });
  }
  const n = Math.max(rows.length, 1);

  const topPages = ((topPagesRaw?.rows || []) as any[]).map(r => ({
    path: r.dimensionValues?.[0]?.value || "",
    pageviews: parseInt(r.metricValues?.[0]?.value || "0", 10),
    users:     parseInt(r.metricValues?.[1]?.value || "0", 10),
  }));
  const topCountries = ((topCountriesRaw?.rows || []) as any[]).map(r => ({
    country: r.dimensionValues?.[0]?.value || "Unknown",
    users:   parseInt(r.metricValues?.[0]?.value || "0", 10),
  }));

  return {
    totalUsers,
    newUsers,
    sessions,
    pageviews,
    averageEngagementSeconds: sumEngagement / n,
    bounceRate: sumBounce / n,
    daily,
    topPages,
    topCountries,
  };
}
