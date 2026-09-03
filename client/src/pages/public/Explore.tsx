import { Link } from "wouter";
import {
  Building2, Users, Calendar,
  Briefcase, Newspaper, ArrowRight
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useT } from "@/lib/i18n";

const sections = [
  {
    titleKey: "explore.ecosystem",
    items: [
      { labelKey: "nav.companies", descKey: "explore.companiesDesc", icon: Building2, href: "/companies", color: "bg-blue-500/10 text-blue-500" },
      { labelKey: "nav.people", descKey: "directory.peopleSubtitle", icon: Users, href: "/people", color: "bg-purple-500/10 text-purple-500" },
    ]
  },
  {
    titleKey: "explore.discover",
    items: [
      { labelKey: "nav.events", descKey: "explore.eventsDesc", icon: Calendar, href: "/events", color: "bg-pink-500/10 text-pink-500" },
    ]
  },
  {
    titleKey: "explore.content",
    items: [
      { labelKey: "nav.news", descKey: "explore.newsDesc", icon: Newspaper, href: "/", color: "bg-red-500/10 text-red-500" },
      { labelKey: "nav.jobs", descKey: "explore.jobsDesc", icon: Briefcase, href: "/jobs", color: "bg-indigo-500/10 text-indigo-500" },
    ]
  }
] as const;

export default function Explore() {
  const t = useT();
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop: show normal header */}
      <div className="hidden md:block">
        <Header />
      </div>
      
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center h-12 px-4">
          <h1 className="text-lg font-bold text-foreground">{t("nav.explore")}</h1>
        </div>
      </div>

      <main className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-4 md:py-8">
        {sections.map((section) => (
          <div key={section.titleKey} className="mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">
              {t(section.titleKey)}
            </h2>
            <div className="space-y-1.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}>
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors cursor-pointer group">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${item.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{t(item.labelKey)}</p>
                        <p className="text-xs text-muted-foreground">{t(item.descKey)}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </main>

      {/* Desktop: show footer */}
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
