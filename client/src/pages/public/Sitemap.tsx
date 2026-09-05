import { Link } from "wouter";
import { fmtDate } from "@/lib/dates";
import { publication } from "@shared/publication";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useT } from "@/lib/i18n";
import {
  Home,
  Briefcase,
  Building2,
  Users,
  Calendar,
  Newspaper,
  Mail,
  Info,
  Shield,
  FileText,
  Gift,
  Wrench,
  BookOpen,
  Award,
  Calculator,
  Megaphone
} from "lucide-react";

// Centralized route configuration for auto-update
const siteRoutes = {
  main: {
    titleKey: "sitemap.mainPages",
    icon: Home,
    links: [
      { labelKey: "sitemap.newsHomepage", href: "/", descKey: "sitemap.newsHomepageDesc" },
      { labelKey: "nav.dashboard", href: "/dashboard", descKey: "sitemap.dashboardDesc" },
      { labelKey: "nav.profile", href: "/profile", descKey: "sitemap.profileDesc" },
    ]
  },
  ecosystem: {
    titleKey: "explore.ecosystem",
    icon: Building2,
    links: [
      { labelKey: "nav.jobs", href: "/jobs", descKey: "sitemap.jobsDesc" },
      { labelKey: "nav.companies", href: "/companies", descKey: "directory.companies" },
      { labelKey: "nav.people", href: "/people", descKey: "sitemap.peopleDesc" },
      { labelKey: "nav.events", href: "/events", descKey: "sitemap.eventsDesc" },
    ]
  },
  company: {
    titleKey: "footer.company",
    icon: Info,
    links: [
      { labelKey: "footer.aboutUs", href: "/about", descKey: "sitemap.aboutDesc" },
      { labelKey: "footer.contact", href: "/contact", descKey: "sitemap.contactDesc" },
      { labelKey: "nav.newsletter", href: "/newsletter", descKey: "sitemap.newsletterDesc" },
      { labelKey: "footer.advertise", href: "/advertise", descKey: "sitemap.advertiseDesc" },
    ]
  },
  legal: {
    titleKey: "sitemap.legal",
    icon: Shield,
    links: [
      { labelKey: "footer.privacyPolicy", href: "/privacy", descKey: "sitemap.privacyDesc" },
      { labelKey: "footer.termsOfService", href: "/terms", descKey: "sitemap.termsDesc" },
    ]
  }
} as const;

const Sitemap = () => {
  const t = useT();
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      
      {/* Hero Section */}
      <section className="w-full bg-foreground">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-12 sm:py-16">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-background mb-4">
            {t("footer.sitemap")}
          </h1>
          <p className="text-background/70 text-lg max-w-2xl">
            {t("sitemap.intro", { site: publication.name })}
          </p>
        </div>
      </section>

      {/* Sitemap Content */}
      <section className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
          {Object.entries(siteRoutes).map(([key, section]) => {
            const IconComponent = section.icon;
            return (
              <div key={key} className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-border">
                  <div className="p-2 rounded-lg bg-muted">
                    <IconComponent className="h-5 w-5 text-foreground" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">{t(section.titleKey)}</h2>
                </div>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link 
                        href={link.href}
                        className="group block"
                      >
                        <span className="text-base font-medium text-foreground group-hover:text-primary transition-colors">
                          {t(link.labelKey)}
                        </span>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {t(link.descKey, { site: publication.name })}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Dynamic Pages Note */}
        <div className="mt-16 p-6 bg-muted/50 rounded-sm border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-3">{t("sitemap.dynamicPages")}</h3>
          <p className="text-muted-foreground mb-4">
            {t("sitemap.dynamicPagesIntro", { site: publication.name })}
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <li className="flex items-start gap-2">
              <Newspaper className="h-4 w-4 text-primary mt-1 shrink-0" />
              <div>
                <span className="font-medium text-foreground">{t("common.articles")}</span>
                <p className="text-sm text-muted-foreground">/article/:id</p>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <Briefcase className="h-4 w-4 text-primary mt-1 shrink-0" />
              <div>
                <span className="font-medium text-foreground">{t("sitemap.jobDetails")}</span>
                <p className="text-sm text-muted-foreground">/jobs/:id</p>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <Building2 className="h-4 w-4 text-primary mt-1 shrink-0" />
              <div>
                <span className="font-medium text-foreground">{t("sitemap.companyProfiles")}</span>
                <p className="text-sm text-muted-foreground">/companies/:id</p>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <Users className="h-4 w-4 text-primary mt-1 shrink-0" />
              <div>
                <span className="font-medium text-foreground">{t("sitemap.peopleProfiles")}</span>
                <p className="text-sm text-muted-foreground">/people/:id</p>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-primary mt-1 shrink-0" />
              <div>
                <span className="font-medium text-foreground">{t("sitemap.eventDetails")}</span>
                <p className="text-sm text-muted-foreground">/events/:id</p>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <Users className="h-4 w-4 text-primary mt-1 shrink-0" />
              <div>
                <span className="font-medium text-foreground">{t("sitemap.authorPages")}</span>
                <p className="text-sm text-muted-foreground">/author/:slug</p>
              </div>
            </li>
          </ul>
        </div>

        {/* Last Updated */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>{t("common.lastUpdated")}: {fmtDate(new Date(), { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Sitemap;
