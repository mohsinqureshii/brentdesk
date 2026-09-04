import { describe, expect, it } from "vitest";
import { SeoService } from "./services/seo.service";
import { isPrivateNoindexPath, knownStaticPages } from "./_core/ssrServe";
import { publication } from "../shared/publication";

describe("search-engine launch safeguards", () => {
  it("keeps Googlebot-specific groups from bypassing private-route rules", () => {
    const robots = new SeoService(publication.siteUrl).generateRobotsTxt();
    for (const agent of ["Googlebot", "Googlebot-News", "Googlebot-Image"]) {
      const group = robots.split(`User-agent: ${agent}\n`)[1]?.split("\n\n")[0] ?? "";
      expect(group).toContain("Disallow: /admin/");
      expect(group).toContain("Disallow: /profile");
    }
  });

  it("marks authenticated, workflow and duplicate mobile routes noindex", () => {
    for (const path of [
      "/admin/seo", "/signin", "/dashboard/my-content", "/me/applications",
      "/assess/token", "/live-console/12", "/events/launch/tickets/success",
      "/jobs/42/applicants", "/search-mobile", "/explore",
    ]) expect(isPrivateNoindexPath(path)).toBe(true);

    for (const path of ["/", "/news", "/companies/acme", "/events/launch"])
      expect(isPrivateNoindexPath(path)).toBe(false);
  });

  it("routes the human sitemap through metadata generation", () => {
    expect(knownStaticPages.has("/sitemap")).toBe(true);
  });
});
