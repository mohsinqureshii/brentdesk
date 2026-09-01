import { Link } from "wouter";
import { Linkedin, Instagram, Youtube, Mail } from "lucide-react";
import { publication } from "@shared/publication";
import { Wordmark } from "@/components/layout/Header";

/** X (Twitter) glyph — lucide has no current X logo. */
function XIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const editorialLinks = [
  { label: "Construction", href: "/construction" },
  { label: "Infrastructure", href: "/infrastructure" },
  { label: "Energy", href: "/energy" },
  { label: "Manufacturing", href: "/manufacturing" },
  { label: "Logistics", href: "/logistics" },
  { label: "Real Estate", href: "/real-estate" },
  { label: "Transportation", href: "/transportation" },
  { label: "Industrial Technology", href: "/industrial-technology" },
];

const publicationLinks = [
  { label: "About", href: "/about" },
  { label: "Contact Us", href: "/contact" },
  { label: "Advertise", href: "/advertise" },
  { label: "Newsletter", href: "/newsletter" },
  { label: "Jobs", href: "/jobs" },
];

const companyLinks = [
  { label: "Companies", href: "/companies" },
  { label: "People", href: "/people" },
  { label: "Events", href: "/events" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Sitemap", href: "/sitemap" },
];

const socialLinks = [
  { label: "X (Twitter)", href: publication.social.x, Icon: XIcon },
  { label: "LinkedIn", href: publication.social.linkedin, Icon: Linkedin },
  { label: "Instagram", href: publication.social.instagram, Icon: Instagram },
  { label: "YouTube", href: publication.social.youtube, Icon: Youtube },
  { label: "Email", href: `mailto:${publication.emails.hello}`, Icon: Mail },
];

export function Footer() {
  return (
    <footer className="bg-card border-t border-border mt-12">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Brand column */}
          <div className="md:col-span-4">
            <Link href="/" aria-label={`${publication.name} home`}>
              <Wordmark className="text-foreground text-2xl" />
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground max-w-sm">
              {publication.description}
            </p>
            <div className="mt-5 flex items-center gap-2">
              {socialLinks.map(({ label, href, Icon }) => (
                <a
                  key={label}
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
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
                {publication.name}
              </h3>
              <ul className="space-y-2.5">
                {publicationLinks.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-foreground/80 hover:text-primary transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="Categories">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
                Categories
              </h3>
              <ul className="space-y-2.5">
                {editorialLinks.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-foreground/80 hover:text-primary transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="Company">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
                Company
              </h3>
              <ul className="space-y-2.5">
                {companyLinks.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-foreground/80 hover:text-primary transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {publication.legalName}. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">{publication.tagline}</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
