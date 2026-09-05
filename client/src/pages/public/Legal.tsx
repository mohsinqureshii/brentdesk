/**
 * The legal pages — /privacy, /terms, /cookies.
 *
 * One component for all three. The documents themselves live in
 * shared/legal, in both languages; this only renders them, which is why
 * a new document is a data change rather than a new page.
 *
 * Set as a document: a standfirst, a contents rail that tracks where you
 * are, numbered sections with stable anchors — /privacy#rights lands in
 * the same place in Arabic as in English — and tables where a table is
 * the honest shape (the cookie inventory, the retention schedule). The
 * old pages carried a yellow "placeholder, to be reviewed by counsel"
 * banner over generic text; that banner is gone because the text under
 * it is no longer generic.
 */

import { useEffect, useState } from "react";
import { Link } from "wouter";
import { publication } from "@shared/publication";
import { getLegalDocument, LEGAL_SLUGS, type LegalBlock, type LegalSlug } from "@shared/legal";
import { SEO } from "@/components/SEO";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { fmtDate } from "@/lib/dates";
import { useT } from "@/lib/i18n";
import { useLocale } from "@/components/LocaleProvider";
import { triggerCookiePreferences } from "@/components/CookieConsentBanner";

const TITLE_KEY = {
  privacy: "footer.privacyPolicy",
  terms: "footer.termsOfService",
  cookies: "cookies.cookiePolicy",
} as const;

/** A bulleted item written as "Term — the rest of it" gets the term set
 *  in the display face. Legal lists are almost all defined terms, and
 *  the alternative is a wall of identical grey. */
function ListItem({ text }: { text: string }) {
  const split = text.match(/^([^—]{2,60})—\s*(.+)$/s);
  if (!split) return <span>{text}</span>;
  return (
    <>
      <strong className="bd-display font-bold text-foreground">{split[1].trim()}</strong>
      <span className="text-muted-foreground"> — {split[2]}</span>
    </>
  );
}

function Block({ block }: { block: LegalBlock }) {
  switch (block.kind) {
    case "p":
      return <p className="mt-4 text-[0.9375rem] leading-[1.75] text-muted-foreground">{block.text}</p>;

    case "note":
      return (
        <p className="mt-4 border-s-2 border-primary ps-4 text-[0.9375rem] leading-[1.75] text-foreground">
          {block.text}
        </p>
      );

    case "list":
      return (
        <ul className="mt-4 space-y-2.5">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3 text-[0.9375rem] leading-[1.75]">
              <span aria-hidden className="mt-[0.7em] h-1 w-1 shrink-0 bg-primary" />
              <span>
                <ListItem text={item} />
              </span>
            </li>
          ))}
        </ul>
      );

    case "table":
      return (
        <div className="mt-5 overflow-x-auto border border-border">
          <table className="w-full min-w-[36rem] border-collapse text-[0.8125rem]">
            <thead>
              <tr className="bg-muted/60">
                {block.head.map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="bd-display px-3 py-2.5 text-start font-bold uppercase tracking-[0.06em] text-foreground border-b border-border"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} className="align-top border-b border-border last:border-b-0">
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className={`px-3 py-2.5 leading-relaxed ${
                        j === 0 ? "font-semibold text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

export default function Legal({ slug }: { slug: LegalSlug }) {
  const t = useT();
  const locale = useLocale();
  const doc = getLegalDocument(slug, locale);
  const [active, setActive] = useState<string>(doc.sections[0]?.id ?? "");

  // Which section the reader is in, for the contents rail. Cheap enough
  // to do with an observer; the alternative is a rail that never moves
  // on a document this long.
  useEffect(() => {
    const headings = doc.sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => !!el);
    if (!headings.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: "-120px 0px -70% 0px" },
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [doc]);

  const updated = new Date(doc.updated);

  return (
    <div className="min-h-screen bg-background overflow-x-clip">
      <SEO
        title={doc.title}
        description={doc.standfirst}
        canonical={`${publication.siteUrl}/${slug}`}
      />
      <Header />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <header className="pb-6 border-b-2 border-foreground">
          <p className="bd-eyebrow">{t("sitemap.legal")}</p>
          <h1 className="bd-lede mt-2 text-[1.75rem] sm:text-[2.5rem] text-foreground">{doc.title}</h1>
          <p className="mt-3 max-w-3xl text-sm sm:text-base leading-relaxed text-muted-foreground">
            {doc.standfirst}
          </p>
          <p className="bd-meta mt-4">
            {t("common.lastUpdated")}:{" "}
            {fmtDate(updated, { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-x-12 gap-y-8 pt-8">
          {/* Contents */}
          <nav className="lg:sticky lg:top-28 lg:self-start" aria-label={t("legal.contents")}>
            <p className="bd-display text-[0.75rem] font-bold uppercase tracking-[0.1em] text-foreground pb-2 border-b border-foreground/85">
              {t("legal.contents")}
            </p>
            <ol className="mt-2">
              {doc.sections.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className={`flex gap-2 py-1.5 text-[0.8125rem] leading-snug transition-colors ${
                      active === s.id
                        ? "text-primary font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="tabular-nums opacity-60">{i + 1}.</span>
                    <span>{s.title}</span>
                  </a>
                </li>
              ))}
            </ol>

            {/* The other two documents, and the control this one is about */}
            <p className="bd-display mt-8 text-[0.75rem] font-bold uppercase tracking-[0.1em] text-foreground pb-2 border-b border-foreground/85">
              {t("legal.related")}
            </p>
            <ul className="mt-2">
              {LEGAL_SLUGS.filter((s) => s !== slug).map((s) => (
                <li key={s}>
                  <Link
                    href={`/${s}`}
                    className="block py-1.5 text-[0.8125rem] font-semibold text-foreground hover:text-primary transition-colors"
                  >
                    {t(TITLE_KEY[s])}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={triggerCookiePreferences}
                  className="block py-1.5 text-[0.8125rem] font-semibold text-primary hover:underline"
                >
                  {t("cookies.preferences")}
                </button>
              </li>
            </ul>
          </nav>

          {/* The document */}
          <article className="min-w-0 max-w-[46rem]">
            {doc.sections.map((s, i) => (
              <section key={s.id} className="pt-8 first:pt-0">
                <h2
                  id={s.id}
                  className="bd-display scroll-mt-32 text-[1.125rem] font-bold text-foreground border-b border-foreground/85 pb-2"
                >
                  <span className="text-primary tabular-nums">{i + 1}.</span> {s.title}
                </h2>
                {s.blocks.map((b, j) => (
                  <Block key={j} block={b} />
                ))}
              </section>
            ))}

            <p className="mt-12 border-t border-border pt-5 bd-meta">
              {t("legal.notAdvice", { legalName: publication.legalName })}
            </p>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
}
