/**
 * Google AdSense Reporting client.
 *
 * Pulls revenue, RPM, page views, fill rate, click count, and the daily
 * trend for the last N days. Used by Dashboard → Revenue tab.
 *
 * Requires AdSense Reporting API enabled in the GCP project + the
 * service account added as a user on the AdSense account with
 * Reporting access. Both happen in the AdSense dashboard, NOT in
 * Google Cloud Console.
 */

import { getEffectiveConfig } from "./integrationConfig.service";
import { getGoogleAccessToken, GOOGLE_SCOPES } from "./googleAuth.service";

const ADSENSE_BASE = "https://adsense.googleapis.com/v2";

interface AdsenseConfig {
  publisherId: string;       // pub-XXXXXXXXXXXXXXXX
  serviceAccountJson: string;
}

async function resolveConfig(): Promise<AdsenseConfig | null> {
  const cfg = await getEffectiveConfig("adsense-api");
  if (!cfg) return null;
  const publisherId = cfg.publicConfig.publisherId;
  const sa = cfg.secrets.serviceAccountJson;
  if (!publisherId || !sa) return null;
  return { publisherId, serviceAccountJson: typeof sa === "string" ? sa : JSON.stringify(sa) };
}

function todayMinus(days: number): { y: number; m: number; d: number } {
  const dt = new Date(Date.now() - days * 86_400_000);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

export interface RevenueSummary {
  totalRevenue: number;
  currency: string;
  pageViews: number;
  clicks: number;
  ctr: number;
  rpm: number;       // revenue per 1000 impressions
  daily: Array<{ date: string; revenue: number; pageviews: number }>;
}

/** Pulls a 7-metric report for the last `days` days, dimensioned by date. */
export async function getRevenueSummary(days: number = 30): Promise<RevenueSummary | null> {
  const cfg = await resolveConfig();
  if (!cfg) return null;
  const token = await getGoogleAccessToken(cfg.serviceAccountJson, GOOGLE_SCOPES.adsenseRead);

  const start = todayMinus(days);
  const end   = todayMinus(0);

  const params = new URLSearchParams();
  params.append("dateRange", "CUSTOM");
  params.append("startDate.year", String(start.y));
  params.append("startDate.month", String(start.m));
  params.append("startDate.day", String(start.d));
  params.append("endDate.year", String(end.y));
  params.append("endDate.month", String(end.m));
  params.append("endDate.day", String(end.d));
  params.append("dimensions", "DATE");
  for (const m of ["ESTIMATED_EARNINGS", "PAGE_VIEWS", "CLICKS", "PAGE_VIEWS_CTR", "PAGE_VIEWS_RPM"]) {
    params.append("metrics", m);
  }
  params.append("orderBy", "+DATE");

  const url = `${ADSENSE_BASE}/accounts/${encodeURIComponent(cfg.publisherId)}/reports:generate?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AdSense ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as any;

  const rows = (data.rows || []) as any[];
  const headers = (data.headers || []) as unknown as Array<{ name: string; type: string; currencyCode?: string }>;
  const earningsHeader = headers.find(h => h.name === "ESTIMATED_EARNINGS");
  const currency = earningsHeader?.currencyCode || "USD";

  const idx = (name: string) => headers.findIndex(h => h.name === name);
  const iEarn = idx("ESTIMATED_EARNINGS");
  const iPV   = idx("PAGE_VIEWS");
  const iClk  = idx("CLICKS");
  const iCTR  = idx("PAGE_VIEWS_CTR");
  const iRPM  = idx("PAGE_VIEWS_RPM");

  let totalRevenue = 0, pageViews = 0, clicks = 0, sumCtr = 0, sumRpm = 0;
  const daily: RevenueSummary["daily"] = [];

  for (const r of rows) {
    const cells = r.cells || [];
    const date = cells[0]?.value || "";
    const earn = parseFloat(cells[iEarn]?.value || "0");
    const pv   = parseInt(cells[iPV]?.value || "0", 10);
    const clk  = parseInt(cells[iClk]?.value || "0", 10);
    const ctr  = parseFloat(cells[iCTR]?.value || "0");
    const rpm  = parseFloat(cells[iRPM]?.value || "0");
    totalRevenue += earn;
    pageViews += pv;
    clicks += clk;
    sumCtr += ctr;
    sumRpm += rpm;
    daily.push({ date, revenue: earn, pageviews: pv });
  }
  const n = Math.max(rows.length, 1);

  return {
    totalRevenue,
    currency,
    pageViews,
    clicks,
    ctr: sumCtr / n,
    rpm: sumRpm / n,
    daily,
  };
}
