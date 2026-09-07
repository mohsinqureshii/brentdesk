import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { SEO } from "@/components/SEO";
import {
  Mail,
  Shield,
  CheckCircle2,
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
  Zap,
  Factory,
  Compass,
  Coins,
  MapPin,
  Sparkles,
  BookOpen,
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
    {
      name: "Construction",
      slug: "construction",
      count: "Mega-projects & EPC",
      icon: Building2,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20 group-hover:border-amber-500/50 group-hover:bg-amber-500/15",
    },
    {
      name: "Infrastructure",
      slug: "infrastructure",
      count: "Transport & Civil",
      icon: Compass,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20 group-hover:border-blue-500/50 group-hover:bg-blue-500/15",
    },
    {
      name: "Energy",
      slug: "energy",
      count: "Power & Transition",
      icon: Zap,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20 group-hover:border-emerald-500/50 group-hover:bg-emerald-500/15",
    },
    {
      name: "Oil & Gas",
      slug: "oil-gas",
      count: "Upstream & Downstream",
      icon: TrendingUp,
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-500/10 border-orange-500/20 group-hover:border-orange-500/50 group-hover:bg-orange-500/15",
    },
    {
      name: "Manufacturing",
      slug: "manufacturing",
      count: "Heavy Industry",
      icon: Factory,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-500/10 border-indigo-500/20 group-hover:border-indigo-500/50 group-hover:bg-indigo-500/15",
    },
    {
      name: "Logistics",
      slug: "logistics",
      count: "Ports & Supply Chain",
      icon: Layers,
      color: "text-teal-600 dark:text-teal-400",
      bg: "bg-teal-500/10 border-teal-500/20 group-hover:border-teal-500/50 group-hover:bg-teal-500/15",
    },
    {
      name: "Transportation",
      slug: "transportation",
      count: "Rail & Aviation",
      icon: Globe,
      color: "text-sky-600 dark:text-sky-400",
      bg: "bg-sky-500/10 border-sky-500/20 group-hover:border-sky-500/50 group-hover:bg-sky-500/15",
    },
    {
      name: "Mining",
      slug: "mining",
      count: "Metals & Minerals",
      icon: Coins,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-500/10 border-purple-500/20 group-hover:border-purple-500/50 group-hover:bg-purple-500/15",
    },
    {
      name: "Utilities",
      slug: "utilities",
      count: "Water & Desalination",
      icon: Shield,
      color: "text-cyan-600 dark:text-cyan-400",
      bg: "bg-cyan-500/10 border-cyan-500/20 group-hover:border-cyan-500/50 group-hover:bg-cyan-500/15",
    },
  ];

  const standardsPillars = [
    {
      icon: Shield,
      title: t("about.independence"),
      description: t("about.independenceBody"),
      border: "border-l-4 border-l-blue-600",
      iconBox: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
    },
    {
      icon: CheckCircle2,
      title: t("about.accuracy"),
      description: t("about.accuracyBody"),
      border: "border-l-4 border-l-emerald-600",
      iconBox: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    },
    {
      icon: TrendingUp,
      title: t("about.depth"),
      description: t("about.depthBody"),
      border: "border-l-4 border-l-amber-600",
      iconBox: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    },
    {
      icon: Scale,
      title: t("about.fairness"),
      description: t("about.fairnessBody"),
      border: "border-l-4 border-l-purple-600",
      iconBox: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20",
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
            <span className="bd-eyebrow px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 tracking-widest font-bold text-xs">
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

          {/* Metric Bar (Vibrant Bloomberg / FT style with rich color & interactivity) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10 pt-8 border-t border-border">
            <div className="group rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/[0.08] to-card p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-t-4 border-t-blue-600">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
                  <Layers className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  SECTORS
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-blue-600 dark:text-blue-400 mb-1">9</div>
              <div className="text-xs font-bold text-foreground uppercase tracking-wider">
                {t("about.statsBeats")}
              </div>
            </div>

            <div className="group rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.08] to-card p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-t-4 border-t-emerald-600">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 group-hover:scale-105 transition-transform">
                  <Globe className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  LANGUAGES
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mb-1">EN · AR</div>
              <div className="text-xs font-bold text-foreground uppercase tracking-wider">
                {t("about.statsBilingual")}
              </div>
            </div>

            <div className="group rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/[0.08] to-card p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-t-4 border-t-amber-600">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/25 group-hover:scale-105 transition-transform">
                  <MapPin className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  HEADQUARTERS
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 mb-1">Riyadh</div>
              <div className="text-xs font-bold text-foreground uppercase tracking-wider">
                {t("about.statsRegional")}
              </div>
            </div>

            <div className="group rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/[0.08] to-card p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-t-4 border-t-purple-600">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/25 group-hover:scale-105 transition-transform">
                  <Shield className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  CHARTER
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-purple-600 dark:text-purple-400 mb-1">100%</div>
              <div className="text-xs font-bold text-foreground uppercase tracking-wider">
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

              {/* Taxonomy Cards with Rich Colors & Icons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-2">
                {keySectors.map((sector) => {
                  const Icon = sector.icon;
                  return (
                    <Link
                      key={sector.slug}
                      href={`/${sector.slug}`}
                      className="group rounded-xl border border-border/80 bg-card p-4 hover:border-primary/60 hover:-translate-y-1 hover:shadow-md transition-all duration-300 block relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${sector.bg} ${sector.color} transition-colors`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <span className="font-bold text-foreground text-sm group-hover:text-primary transition-colors block mb-1">
                        {sector.name}
                      </span>
                      <span className="text-[11px] text-muted-foreground block">
                        {sector.count}
                      </span>
                    </Link>
                  );
                })}
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
                  <div
                    key={idx}
                    className={`rounded-xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all ${pillar.border}`}
                  >
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${pillar.iconBox}`}>
                        <pillar.icon className="w-4 h-4" />
                      </div>
                      <h3 className="bd-headline text-base font-bold text-foreground">
                        {pillar.title}
                      </h3>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pl-1">
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
