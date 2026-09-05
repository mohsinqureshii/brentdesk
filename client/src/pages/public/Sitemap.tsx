/**
 * /sitemap
 *
 * Two audiences, one page.
 *
 * A search engine wants the XML. That is what the first block is: the
 * index, every sub-sitemap under it with a live URL count, robots.txt
 * and the feeds — the exact set of addresses to paste into Google Search
 * Console or Bing Webmaster Tools, with a copy button on each. The
 * counts come from the database through /api/sitemaps, so this page
 * cannot drift from what the crawler actually receives; the old version
 * was a hand-kept list that still advertised /article/:id years after
 * articles moved to /<beat>/<slug>.
 *
 * A reader wants the site. That is the rest: the beats with how much is
 * behind each, the topics, and the standing pages — all read from the
 * newsroom rather than typed here, so a beat added in the admin appears
 * without a deploy.
 */

import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Check, Copy, FileCode2, Rss } from "lucide-react";
import { fmtDate } from "@/lib/dates";
import { publication } from "@shared/publication";
import { SEO } from "@/components/SEO";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { SectionHead } from "@/components/editorial";
import { trpc } from "@/lib/trpc";
import { useT } from "@/lib/i18n";
import type { UiKey } from "@shared/uiStrings";

interface SitemapEntry {
  name: string;
  description: string;
  urlCount: number;
  path: string;
  url: string;
}

interface Manifest {
  index: string;
  robots: string;
  feeds: { name: string; url: string }[];
  totalUrls: number;
  lastRegenerated: string;
  sitemaps: SitemapEntry[];
}

/** Copy-to-clipboard that says so. The whole point of this page is that
 *  somebody is pasting these URLs into another window. */
function CopyUrl({ url }: { url: string }) {
  const t = useT();
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const id = setTimeout(() => setDone(false), 1600);
    return () => clearTimeout(id);
  }, [done]);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(url).then(() => setDone(true)).catch(() => {});
      }}
      className="shrink-0 inline-flex items-center gap-1.5 bd-display text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-foreground/60 hover:text-primary transition-colors"
    >
      {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
      {done ? t("sitemap.copied") : t("sitemap.copy")}
    </button>
  );
}

function UrlRow({ url, label, count }: { url: string; label: string; count?: number }) {
  const t = useT();
  return (
    <li className="flex items-center gap-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="bd-display text-[0.8125rem] font-bold uppercase tracking-[0.06em] text-foreground">
          {label}
          {typeof count === "number" && (
            <span className="ms-2 font-medium normal-case tracking-normal text-muted-foreground tabular-nums">
              {t("sitemap.urlCount", { n: count })}
            </span>
          )}
        </div>
        <a
          href={url}
          className="block truncate text-[0.8125rem] text-primary hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          {url}
        </a>
      </div>
      <CopyUrl url={url} />
    </li>
  );
}

/** The standing pages, in the order a reader would look for them. */
const PAGES: { href: string; key: UiKey }[] = [
  { href: "/", key: "sitemap.newsHomepage" },
  { href: "/news", key: "list.latestNews" },
  { href: "/companies", key: "nav.companies" },
  { href: "/people", key: "nav.people" },
  { href: "/events", key: "nav.events" },
  { href: "/jobs", key: "nav.jobs" },
  { href: "/newsletter", key: "nav.newsletter" },
];

const COMPANY_PAGES: { href: string; key: UiKey }[] = [
  { href: "/about", key: "footer.aboutUs" },
  { href: "/contact", key: "footer.contactUs" },
  { href: "/advertise", key: "footer.advertise" },
];

const LEGAL_PAGES: { href: string; key: UiKey }[] = [
  { href: "/privacy", key: "footer.privacyPolicy" },
  { href: "/terms", key: "footer.termsOfService" },
  { href: "/cookies", key: "cookies.cookiePolicy" },
];

function LinkColumn({ title, links }: { title: string; links: { href: string; key: UiKey }[] }) {
  const t = useT();
  return (
    <div>
      <SectionHead title={title} as="h2" compact />
      <ul className="bd-list">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="block py-2.5 text-[0.875rem] font-semibold text-foreground hover:text-primary transition-colors"
            >
              {t(l.key)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Sitemap() {
  const t = useT();
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [manifestFailed, setManifestFailed] = useState(false);

  // Plain fetch rather than a tRPC procedure: the manifest is served
  // beside the XML it describes, by the same router, so the two cannot
  // be configured apart.
  useEffect(() => {
    let live = true;
    fetch("/api/sitemaps")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: Manifest) => live && setManifest(d))
      .catch(() => live && setManifestFailed(true));
    return () => {
      live = false;
    };
  }, []);

  const { data: categories } = trpc.news.getAllCategoriesWithCounts.useQuery();
  const { data: tags } = trpc.news.getAllTagsWithCounts.useQuery();
  const beats = ((categories ?? []) as any[]).filter((c) => c.articleCount > 0);
  const topics = ((tags ?? []) as any[]).filter((x) => x.articleCount > 0).slice(0, 40);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEO
        title={t("footer.sitemap")}
        description={t("sitemap.intro", { site: publication.name })}
        canonical={`${publication.siteUrl}/sitemap`}
      />
      <Header />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <header className="pb-5 border-b-2 border-foreground">
          <h1 className="bd-lede text-[1.75rem] sm:text-[2.5rem] text-foreground">{t("footer.sitemap")}</h1>
          <p className="mt-3 max-w-3xl text-sm sm:text-base leading-relaxed text-muted-foreground">
            {t("sitemap.intro", { site: publication.name })}
          </p>
        </header>

        {/* ---------------------------------------------------------- */}
        {/* For search engines                                          */}
        {/* ---------------------------------------------------------- */}
        <section className="mt-10" aria-label={t("sitemap.forSearchEngines")}>
          <SectionHead title={t("sitemap.forSearchEngines")} as="h2" />
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {t("sitemap.forSearchEnginesBody", { site: publication.name })}
          </p>

          {manifestFailed && (
            <p className="mt-4 text-sm text-muted-foreground">{t("sitemap.manifestUnavailable")}</p>
          )}

          {manifest && (
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-8">
              <div>
                <div className="bd-card p-4">
                  <div className="flex items-center gap-2 border-b border-foreground/85 pb-2">
                    <FileCode2 className="h-4 w-4 text-primary" aria-hidden />
                    <h3 className="bd-display text-[0.8125rem] font-bold uppercase tracking-[0.1em] text-foreground">
                      {t("sitemap.submitThis")}
                    </h3>
                  </div>
                  <ul className="bd-list">
                    <UrlRow url={manifest.index} label={t("sitemap.sitemapIndex")} count={manifest.totalUrls} />
                  </ul>
                  <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted-foreground">
                    {t("sitemap.indexIsEnough")}
                  </p>
                </div>

                <div className="bd-card p-4 mt-6">
                  <div className="flex items-center gap-2 border-b border-foreground/85 pb-2">
                    <Rss className="h-4 w-4 text-primary" aria-hidden />
                    <h3 className="bd-display text-[0.8125rem] font-bold uppercase tracking-[0.1em] text-foreground">
                      {t("sitemap.feedsAndRobots")}
                    </h3>
                  </div>
                  <ul className="bd-list">
                    <UrlRow url={manifest.robots} label="robots.txt" />
                    {manifest.feeds.map((f) => (
                      <UrlRow key={f.url} url={f.url} label={f.name === "jobs" ? t("nav.jobs") : "RSS"} />
                    ))}
                  </ul>
                </div>
              </div>

              <div className="bd-card p-4">
                <div className="border-b border-foreground/85 pb-2">
                  <h3 className="bd-display text-[0.8125rem] font-bold uppercase tracking-[0.1em] text-foreground">
                    {t("sitemap.allSitemaps")}
                  </h3>
                </div>
                <ul className="bd-list">
                  {manifest.sitemaps.map((s) => (
                    <UrlRow key={s.path} url={s.url} label={s.name} count={s.urlCount} />
                  ))}
                </ul>
                <p className="mt-3 text-[0.8125rem] leading-relaxed text-muted-foreground">
                  {t("sitemap.regeneratedNote")}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* ---------------------------------------------------------- */}
        {/* For readers                                                 */}
        {/* ---------------------------------------------------------- */}
        <section className="mt-14" aria-label={t("sitemap.forReaders")}>
          <SectionHead title={t("sitemap.forReaders")} as="h2" />
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-8">
            <LinkColumn title={t("sitemap.mainPages")} links={PAGES} />
            <LinkColumn title={t("footer.company")} links={COMPANY_PAGES} />
            <LinkColumn title={t("sitemap.legal")} links={LEGAL_PAGES} />
            <div>
              <SectionHead title={t("list.browseCategories")} as="h2" compact />
              <ul className="bd-list">
                {beats.map((c: any) => (
                  <li key={c.id}>
                    <Link
                      href={`/${c.slug}`}
                      className="flex items-center justify-between gap-3 py-2.5 text-[0.875rem] font-semibold text-foreground hover:text-primary transition-colors"
                    >
                      <span className="truncate">{c.name}</span>
                      <span className="bd-meta tabular-nums">{c.articleCount}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {!!topics.length && (
            <div className="mt-10">
              <SectionHead title={t("list.popularTags")} as="h2" href="/news" />
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2.5">
                {topics.map((x: any) => (
                  <Link
                    key={x.id}
                    href={`/tag/${x.slug}`}
                    className="bd-display text-[0.75rem] font-bold uppercase tracking-[0.06em] text-foreground/70 hover:text-primary transition-colors"
                  >
                    {x.name}
                    <span className="ms-1 text-muted-foreground/70 tabular-nums">{x.articleCount}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>

        <p className="mt-12 bd-meta">
          {t("common.lastUpdated")}:{" "}
          {fmtDate(manifest?.lastRegenerated ? new Date(manifest.lastRegenerated) : new Date(), {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </main>

      <Footer />
    </div>
  );
}
