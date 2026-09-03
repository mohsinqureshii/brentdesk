import type { ComponentType } from "react";
import { Link } from "wouter";
import { Linkedin, Instagram, Youtube, Mail } from "lucide-react";
import { publication } from "@shared/publication";
import { Wordmark, useWordmark } from "@/components/layout/Header";
import { useT } from "@/lib/i18n";
import type { UiKey } from "@shared/uiStrings";

/** X (Twitter) glyph — lucide has no current X logo. */
function XIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/**
 * Links carry a translation key rather than a label. The href stays in
 * English because the route does — /ar/construction is the Arabic page for
 * the same category, and wouter's locale base prefixes it — so only the word
 * a reader sees changes with the language.
 */
type FooterLink = { key: UiKey; href: string };

const editorialLinks: FooterLink[] = [
  { key: "cat.construction", href: "/construction" },
  { key: "cat.infrastructure", href: "/infrastructure" },
  { key: "cat.energy", href: "/energy" },
  { key: "cat.manufacturing", href: "/manufacturing" },
  { key: "cat.logistics", href: "/logistics" },
  { key: "cat.real-estate", href: "/real-estate" },
  { key: "cat.transportation", href: "/transportation" },
  { key: "cat.industrial-technology", href: "/industrial-technology" },
];

const publicationLinks: FooterLink[] = [
  { key: "footer.aboutUs", href: "/about" },
  { key: "footer.contactUs", href: "/contact" },
  { key: "footer.advertise", href: "/advertise" },
  { key: "nav.newsletter", href: "/newsletter" },
  { key: "nav.jobs", href: "/jobs" },
];

const companyLinks: FooterLink[] = [
  { key: "nav.companies", href: "/companies" },
  { key: "nav.people", href: "/people" },
  { key: "nav.events", href: "/events" },
  { key: "footer.termsOfService", href: "/terms" },
  { key: "footer.privacyPolicy", href: "/privacy" },
  { key: "footer.sitemap", href: "/sitemap" },
];

export function Footer() {
  const t = useT();
  // Without the trailing dot: this is the name as a heading, not the mark.
  const brand = useWordmark().replace(/\.$/, "");

  // Platform names stay as they are written — "LinkedIn" is LinkedIn in every
  // language. Only "Email" is a word rather than a name, so only it translates.
  const socialLinks: {
    label: string;
    href: string;
    Icon: ComponentType<{ className?: string }>;
  }[] = [
    { label: "X (Twitter)", href: publication.social.x, Icon: XIcon },
    { label: "LinkedIn", href: publication.social.linkedin, Icon: Linkedin },
    { label: "Instagram", href: publication.social.instagram, Icon: Instagram },
    { label: "YouTube", href: publication.social.youtube, Icon: Youtube },
    { label: t("footer.email"), href: `mailto:${publication.emails.hello}`, Icon: Mail },
  ];

  return (
    <footer className="bg-card border-t border-border mt-12">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Brand column */}
          <div className="md:col-span-4">
            <Link href="/" aria-label={t("nav.siteHome", { site: publication.name })}>
              <Wordmark className="text-foreground text-2xl" />
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground max-w-sm">
              {t("footer.description", { site: publication.name })}
            </p>
            <div className="mt-5 flex items-center gap-2">
              {socialLinks.map(({ label, href, Icon }) => (
                <a
                  key={href}
                  href={href}
                  target={href.startsWith("mailto:") ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="h-9 w-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-8">
            <nav aria-label={publication.name}>
              {/* The heading is the brand itself, so it takes the mark for
                  the language being read. `uppercase` leaves the English
                  identical to the literal it replaced; Arabic has no case,
                  so it simply reads as the Arabic name. */}
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
                {brand}
              </h3>
              <ul className="space-y-2.5">
                {publicationLinks.map((link) => (
                  <li key={link.key}>
                    <Link href={link.href} className="text-sm text-foreground/80 hover:text-primary transition-colors">
                      {t(link.key)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label={t("footer.categories")}>
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
                {t("footer.categories")}
              </h3>
              <ul className="space-y-2.5">
                {editorialLinks.map((link) => (
                  <li key={link.key}>
                    <Link href={link.href} className="text-sm text-foreground/80 hover:text-primary transition-colors">
                      {t(link.key)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label={t("footer.company")}>
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
                {t("footer.company")}
              </h3>
              <ul className="space-y-2.5">
                {companyLinks.map((link) => (
                  <li key={link.key}>
                    <Link href={link.href} className="text-sm text-foreground/80 hover:text-primary transition-colors">
                      {t(link.key)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {publication.legalName}. {t("footer.allRightsReserved")}
          </p>
          <p className="text-xs text-muted-foreground">{t("footer.tagline")}</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
