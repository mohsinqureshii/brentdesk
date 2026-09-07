import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { SEO } from "@/components/SEO";
import {
  Mail,
  Shield,
  CheckCircle,
  FileText,
  Scale,
  Users,
  Building2,
  Globe,
  ArrowRight,
  TrendingUp,
  Bookmark,
  Layers,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { publication } from "@shared/publication";
import { useT } from "@/lib/i18n";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { JsonLd } from "@/components/JsonLd";

export default function About() {
  const t = useT();

  const keySectors = [
    { name: "Construction", slug: "construction", count: "Mega-projects & EPC" },
    { name: "Infrastructure", slug: "infrastructure", count: "Transport & Civil" },
    { name: "Energy", slug: "energy", count: "Power & Transition" },
    { name: "Oil & Gas", slug: "oil-gas", count: "Upstream & Downstream" },
    { name: "Manufacturing", slug: "manufacturing", count: "Heavy Industry" },
    { name: "Logistics", slug: "logistics", count: "Ports & Supply Chain" },
    { name: "Transportation", slug: "transportation", count: "Rail & Aviation" },
    { name: "Mining", slug: "mining", count: "Metals & Minerals" },
    { name: "Utilities", slug: "utilities", count: "Water & Desalination" },
  ];

  const standardsPillars = [
    {
      icon: Shield,
      title: t("about.independence"),
      description: t("about.independenceBody"),
    },
    {
      icon: CheckCircle,
      title: t("about.accuracy"),
      description: t("about.accuracyBody"),
    },
    {
      icon: TrendingUp,
      title: t("about.depth"),
      description: t("about.depthBody"),
    },
    {
      icon: Scale,
      title: t("about.fairness"),
      description: t("about.fairnessBody"),
    },
  ];

  const navAnchors = [
    { href: "#mission", label: t("about.mission") },
    { href: "#coverage", label: t("about.whatWeCover") },
    { href: "#editorial-policy", label: t("about.editorialPolicy") },
    { href: "#corrections", label: t("about.correctionsPolicy") },
    { href: "#fact-checking", label: t("about.factChecking") },
    { href: "#sources", label: t("about.anonymousSources") },
    { href: "#diversity", label: t("about.diversity") },
    { href: "#ownership", label: t("about.ownership") },
    { href: "#events", label: t("nav.events") },
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-clip text-foreground">
      <SEO
        title={`About | ${publication.name}`}
        description={publication.description}
        canonical={`${publication.siteUrl}/about`}
        keywords={publication.keywords}
        ogType="website"
      />
      <JsonLd
        type="BreadcrumbList"
        data={[
          { name: t("nav.home"), url: publication.siteUrl },
          { name: t("footer.about"), url: `${publication.siteUrl}/about` },
        ]}
      />
      <Header />

      {/* Visual Breadcrumb Bar */}
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">{t("nav.home")}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{t("footer.about")}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <main className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Editorial Masthead Hero */}
        <section className="pt-4 pb-12 border-b border-border">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="bd-eyebrow text-primary tracking-widest font-bold">
              EDITORIAL CHARTER & MISSION
            </span>
            <span className="text-muted-foreground/40 text-xs">/</span>
            <span className="text-xs font-semibold text-muted-foreground">
              FOUNDED {publication.foundedYear}
            </span>
          </div>

          <h1 className="bd-lede text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
            The Trade Publication for the Physical Economy
          </h1>

          <div className="space-y-4 max-w-4xl text-base sm:text-lg text-muted-foreground leading-relaxed">
            <p>{t("about.intro1", { site: publication.name })}</p>
            <p>{t("about.intro2")}</p>
            <p>{t("about.intro3", { site: publication.name })}</p>
          </div>

          {/* Metric Bar (Bloomberg / FT style) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10 pt-8 border-t border-border">
            <div className="bd-card p-5 bg-card">
              <div className="text-2xl sm:text-3xl font-bold text-foreground mb-1">9</div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("about.statsBeats")}
              </div>
            </div>
            <div className="bd-card p-5 bg-card">
              <div className="text-2xl sm:text-3xl font-bold text-foreground mb-1">EN · AR</div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("about.statsBilingual")}
              </div>
            </div>
            <div className="bd-card p-5 bg-card">
              <div className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Riyadh</div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("about.statsRegional")}
              </div>
            </div>
            <div className="bd-card p-5 bg-card">
              <div className="text-2xl sm:text-3xl font-bold text-foreground mb-1">100%</div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("about.statsIndependence")}
              </div>
            </div>
          </div>
        </section>

        {/* Two-Column Editorial Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 pt-10">
          {/* Sticky Left Rail Index (Desktop) */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-20 space-y-6">
              <div className="bd-card p-5 bg-card">
                <h3 className="bd-eyebrow text-foreground mb-3 font-bold">
                  {t("about.tableOfContents")}
                </h3>
                <nav className="space-y-1.5 text-xs">
                  {navAnchors.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      className="block py-1 px-2 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      {item.label}
                    </a>
                  ))}
                </nav>
              </div>

              {/* Policy Quick Links */}
              <div className="bd-card p-5 bg-muted/40">
                <h4 className="bd-eyebrow text-foreground mb-2 font-bold">Formal Documents</h4>
                <div className="space-y-2 text-xs">
                  <Link
                    href="/editorial"
                    className="block text-primary hover:underline font-semibold flex items-center justify-between"
                  >
                    <span>Editorial Standards</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                  <Link
                    href="/copyright"
                    className="block text-primary hover:underline font-semibold flex items-center justify-between"
                  >
                    <span>Copyright & Syndication</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                  <Link
                    href="/disclaimer"
                    className="block text-primary hover:underline font-semibold flex items-center justify-between"
                  >
                    <span>Market Data Disclaimer</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Editorial Column */}
          <div className="lg:col-span-9 space-y-12">
            {/* Section 1: Our Mission */}
            <section id="mission" className="scroll-mt-24">
              <div className="bd-section-head mb-4">
                <h2 className="bd-section-title">{t("about.mission")}</h2>
              </div>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p className="text-base sm:text-lg font-medium text-foreground">
                  {t("about.mission1", { site: publication.name })}
                </p>
                <p>{t("about.mission2")}</p>
                <p>{t("about.mission3")}</p>
              </div>
            </section>

            {/* Section 2: What We Cover & Taxonomy */}
            <section id="coverage" className="scroll-mt-24 pt-6 border-t border-border">
              <div className="bd-section-head mb-4">
                <h2 className="bd-section-title">{t("about.whatWeCover")}</h2>
              </div>
              <div className="space-y-4 text-muted-foreground leading-relaxed mb-6">
                <p>{t("about.cover1")}</p>
                <p>{t("about.cover2")}</p>
                <p>{t("about.cover3", { site: publication.name })}</p>
              </div>

              {/* Taxonomy Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                {keySectors.map((sector) => (
                  <Link
                    key={sector.slug}
                    href={`/${sector.slug}`}
                    className="bd-card p-4 hover:border-primary/50 transition-colors group block"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                        {sector.name}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <span className="text-[11px] text-muted-foreground block">
                      {sector.count}
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            {/* Section 3: Editorial Values & Ethics */}
            <section id="editorial-policy" className="scroll-mt-24 pt-6 border-t border-border">
              <div className="bd-section-head mb-4">
                <h2 className="bd-section-title">{t("about.editorialPolicy")}</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-6">
                {t("about.editorialIntro", { site: publication.name })}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {standardsPillars.map((pillar, idx) => (
                  <div key={idx} className="bd-card p-5 bg-card">
                    <div className="flex items-center gap-2 mb-2">
                      <pillar.icon className="w-4 h-4 text-primary" />
                      <h3 className="bd-headline text-base font-bold text-foreground">
                        {pillar.title}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {pillar.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 4: Corrections Policy */}
            <section id="corrections" className="scroll-mt-24 pt-6 border-t border-border">
              <div className="bd-section-head mb-4">
                <h2 className="bd-section-title">{t("about.correctionsPolicy")}</h2>
              </div>
              <div className="bd-card p-6 bg-card space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("about.correctionsBody")}
                </p>
                <div className="text-xs text-muted-foreground border-t border-border pt-3">
                  <span>{t("about.spottedError")} </span>
                  <a
                    href={`mailto:${publication.emails.hello}`}
                    className="text-primary hover:underline font-semibold"
                  >
                    {publication.emails.hello}
                  </a>{" "}
                  <span>{t("about.orUseOur")} </span>
                  <Link href="/contact" className="text-primary hover:underline font-semibold">
                    {t("about.contactForm")}
                  </Link>
                  . <span>{t("about.correctionsResponse")}</span>
                </div>
              </div>
            </section>

            {/* Section 5: Verification & Fact-Checking */}
            <section id="fact-checking" className="scroll-mt-24 pt-6 border-t border-border">
              <div className="bd-section-head mb-4">
                <h2 className="bd-section-title">{t("about.factChecking")}</h2>
              </div>
              <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                <p>{t("about.factChecking1", { site: publication.name })}</p>
                <p>{t("about.factChecking2")}</p>
              </div>
            </section>

            {/* Section 6: Anonymous Sources */}
            <section id="sources" className="scroll-mt-24 pt-6 border-t border-border">
              <div className="bd-section-head mb-4">
                <h2 className="bd-section-title">{t("about.anonymousSources")}</h2>
              </div>
              <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                <p>{t("about.anonymousSources1")}</p>
                <p>{t("about.anonymousSources2")}</p>
              </div>
            </section>

            {/* Section 7: Diversity */}
            <section id="diversity" className="scroll-mt-24 pt-6 border-t border-border">
              <div className="bd-section-head mb-4">
                <h2 className="bd-section-title">{t("about.diversity")}</h2>
              </div>
              <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                <p>{t("about.diversity1")}</p>
                <p>{t("about.diversity2")}</p>
              </div>
            </section>

            {/* Section 8: Ownership & Funding */}
            <section id="ownership" className="scroll-mt-24 pt-6 border-t border-border">
              <div className="bd-section-head mb-4">
                <h2 className="bd-section-title">{t("about.ownership")}</h2>
              </div>
              <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                <p>{t("about.ownership1", { site: publication.name, legalName: publication.legalName })}</p>
                <p>{t("about.ownership2", { site: publication.name })}</p>
              </div>
            </section>

            {/* Section 9: Events */}
            <section id="events" className="scroll-mt-24 pt-6 border-t border-border">
              <div className="bd-section-head mb-4">
                <h2 className="bd-section-title">{t("nav.events")}</h2>
              </div>
              <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                <p>{t("about.events1", { site: publication.name })}</p>
                <p>
                  {t("about.events2")}{" "}
                  <Link href="/contact" className="text-primary hover:underline font-semibold">
                    {t("advertise.contactPageLink")}
                  </Link>
                  .
                </p>
              </div>
            </section>

            {/* Contact & Commercial CTA */}
            <section className="pt-8 border-t border-border">
              <div className="bd-card p-6 sm:p-8 bg-muted/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div>
                  <h3 className="bd-headline text-xl font-bold text-foreground mb-1">
                    {t("about.getInTouch")}
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-lg leading-relaxed">
                    {t("about.getInTouchBody")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Link href="/contact">
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 py-2 rounded-sm gap-2">
                      <Mail className="h-4 w-4" />
                      {t("footer.contactUs")}
                    </Button>
                  </Link>
                  <Link href="/advertise">
                    <Button variant="outline" className="rounded-sm">
                      {t("about.advertiseWithUs")}
                    </Button>
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
