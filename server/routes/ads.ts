/**
 * Ads Routes
 * Serves ads.txt at the domain root for Google AdSense verification
 * and provides the AdSense script injection endpoint.
 *
 * IMPORTANT: this file must be extremely failure-tolerant. ads.txt is
 * how Google authorizes ad serving for the whole domain — serving an
 * error (or worse, HTML) here throttles AdSense revenue account-wide.
 * Everything falls back to the known-good publisher line.
 */
import { Router } from "express";
import { getDb } from "../db";
import { adsenseSettings } from "../../drizzle/schema";
import { publication } from "../../shared/publication";

const router = Router();

/**
 * The line served when nothing overrides it.
 *
 * It used to be "# No authorized sellers configured" unless an env var
 * was set, which meant a fresh deployment served an ads.txt that told
 * Google nobody was authorised to sell this inventory — the exact
 * condition AdSense reports as "Earnings at risk". The publisher line is
 * a public identifier and lives in the brand config, so the default is
 * now the real one; the env var and the database row still override it,
 * in that order of increasing specificity.
 */
export const DEFAULT_ADS_TXT = process.env.ADSENSE_PUBLISHER_ID
  ? `google.com, ${process.env.ADSENSE_PUBLISHER_ID}, DIRECT, f08c47fec0942fa0`
  : publication.adsense.adsTxtLine;

// Cache ads.txt content for 5 minutes to reduce DB hits. On DB errors
// we serve the last cached value (or the default) — never an error page.
let adsTxtCache: { content: string; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

async function getAdsTxtContent(): Promise<string> {
  if (adsTxtCache && Date.now() - adsTxtCache.timestamp < CACHE_TTL) {
    return adsTxtCache.content;
  }

  try {
    const db = await getDb();
    if (db) {
      const [row] = await db
        .select({ adsTxtContent: adsenseSettings.adsTxtContent })
        .from(adsenseSettings)
        .limit(1);
      if (row?.adsTxtContent) {
        adsTxtCache = { content: row.adsTxtContent, timestamp: Date.now() };
        return row.adsTxtContent;
      }
    }
  } catch (err) {
    console.error("[ads.txt] DB read failed, serving fallback:", (err as Error).message);
    // Serve stale cache if we have one — better than flapping content.
    if (adsTxtCache) return adsTxtCache.content;
  }

  adsTxtCache = { content: DEFAULT_ADS_TXT, timestamp: Date.now() };
  return DEFAULT_ADS_TXT;
}

// Serve ads.txt at domain root AND under /api (the Cloudflare SEO
// worker fetches /api/ads.txt first; without this route it received the
// SPA's HTML and served a garbage ads.txt at the edge).
router.get(["/ads.txt", "/api/ads.txt"], async (_req, res) => {
  const content = await getAdsTxtContent().catch(() => DEFAULT_ADS_TXT);
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.setHeader("X-Robots-Tag", "noindex");
  res.send(content);
});

// Endpoint to get AdSense configuration (used by frontend)
router.get("/api/adsense-config", async (_req, res) => {
  try {
    const db = await getDb();
    if (db) {
      const [row] = await db.select().from(adsenseSettings).limit(1);
      if (row) {
        return res.json({
          publisherId: row.publisherId,
          autoAdsEnabled: !!row.autoAdsEnabled,
          adsenseEnabled: !!row.adsenseEnabled,
          globalKillSwitch: !!row.globalKillSwitch,
        });
      }
    }
  } catch (err) {
    console.error("[adsense-config] Error:", (err as Error).message);
  }
  // No row in the database yet.
  //
  // The publisher ID is still known — it is in the brand config, which
  // is a deliberate act: nobody commits their AdSense publisher ID
  // unless they intend to sell inventory. So the default is on rather
  // than off. The alternative was a site that passed Google's review and
  // then served nothing, because serving depended on a switch in an
  // admin screen nobody had been told to visit.
  //
  // Nothing about this bypasses the reader: the tag is loaded paused and
  // in denied Consent Mode, and AdSenseScript releases it only once the
  // reader has agreed to advertising. Once a row exists it wins outright
  // — including its kill switch.
  res.json({
    publisherId: publication.adsense.publisherId,
    autoAdsEnabled: true,
    adsenseEnabled: true,
    globalKillSwitch: false,
  });
});

export { router as adsRoutes };
