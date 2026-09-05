/**
 * AdSense readiness.
 *
 * Google asks for the same publisher ID in three unrelated places — the
 * ads.txt line, a verification meta tag, and the ad tag's `client`
 * parameter — and a site is rejected, or silently stops earning, if any
 * one of them is missing or says something different from the others.
 * Two of the three live in a static HTML shell that cannot import the
 * brand config, so nothing but a test keeps them in step.
 *
 * The fourth thing Google needs is an ads.txt that names an authorised
 * seller. The default used to be the comment "# No authorized sellers
 * configured", which is what an account shows as "Earnings at risk".
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { publication } from "@shared/publication";
import { DEFAULT_ADS_TXT } from "./routes/ads";

const ROOT = path.resolve(import.meta.dirname, "..");
const indexHtml = readFileSync(path.join(ROOT, "client/index.html"), "utf8");
const robots = readFileSync(path.join(ROOT, "server/services/seo.service.ts"), "utf8");

/** The bare form Google writes in ads.txt: pub-… without the ca- prefix. */
const bareId = publication.adsense.publisherId.replace(/^ca-/, "");

describe("adsense readiness", () => {
  it("names one publisher, in the shape each place expects", () => {
    expect(publication.adsense.publisherId).toMatch(/^ca-pub-\d{16}$/);
    expect(publication.adsense.adsTxtLine).toBe(
      `google.com, ${bareId}, DIRECT, f08c47fec0942fa0`,
    );
  });

  it("carries the verification meta tag in the page shell", () => {
    expect(indexHtml).toContain(
      `<meta name="google-adsense-account" content="${publication.adsense.publisherId}" />`,
    );
  });

  it("loads the ad tag with the same client id", () => {
    expect(indexHtml).toContain(
      `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publication.adsense.publisherId}`,
    );
    expect(indexHtml).toContain('crossorigin="anonymous"');
  });

  it("requests no ad until something deliberately un-pauses it", () => {
    // Both guards must be set BEFORE the tag element, or the library has
    // already asked for an ad by the time they are read.
    const pause = indexHtml.indexOf("pauseAdRequests = 1");
    const consent = indexHtml.indexOf("gtag('consent', 'default'");
    const tag = indexHtml.indexOf("adsbygoogle.js?client=");
    expect(pause).toBeGreaterThan(-1);
    expect(consent).toBeGreaterThan(-1);
    expect(pause).toBeLessThan(tag);
    expect(consent).toBeLessThan(tag);
    // Denied by default, so a reader who never answers is never tracked.
    expect(indexHtml).toContain("ad_storage: 'denied'");
    expect(indexHtml).toContain("ad_user_data: 'denied'");
    expect(indexHtml).toContain("ad_personalization: 'denied'");
  });

  it("serves an ads.txt naming an authorised seller with no configuration", () => {
    // The value itself, not the source text: the fallback has to be a
    // real seller line, because the string it replaced — a comment
    // saying nobody was authorised — is what an AdSense account reports
    // as earnings at risk. A database row or the env var still wins.
    expect(DEFAULT_ADS_TXT).toMatch(/^google\.com, pub-\d{16}, DIRECT, [0-9a-f]{16}$/);
    expect(DEFAULT_ADS_TXT).not.toMatch(/^#/);
  });

  it("lets Google's ad crawlers read the site", () => {
    // AdsBot-Google obeys only a group that names it; falling through to
    // the wildcard group is not the same thing.
    for (const agent of ["Mediapartners-Google", "AdsBot-Google", "AdsBot-Google-Mobile"]) {
      expect(robots).toContain(`User-agent: ${agent}`);
    }
    expect(robots).toContain("Allow: /ads.txt");
  });

  it("keeps the pages an ad network checks for", () => {
    // AdSense review looks for a privacy policy that discloses
    // third-party advertising cookies, plus a way to reach the
    // publisher. All three are real pages, not placeholders.
    const app = readFileSync(path.join(ROOT, "client/src/App.tsx"), "utf8");
    for (const route of ["/privacy", "/cookies", "/contact", "/about"]) {
      expect(app).toContain(`path="${route}"`);
    }
  });
});
