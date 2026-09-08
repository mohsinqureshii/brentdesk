import { useState } from "react";
import { Link } from "wouter";
import {
  Mail,
  Zap,
  TrendingUp,
  Users,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Building2,
  Briefcase,
  Calendar,
  ShieldCheck,
  Sparkles,
  Clock,
  ExternalLink,
  ChevronRight,
  Sliders,
  Check,
  Lock,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { JsonLd } from "@/components/JsonLd";
import { SEO } from "@/components/SEO";
import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc";
import { publication } from "@shared/publication";
import { useT } from "@/lib/i18n";

const Newsletter = () => {
  const t = useT();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [selectedNewsletters, setSelectedNewsletters] = useState<string[]>([
    "daily-brief",
    "projects-weekly",
    "energy-brief",
  ]);

  const subscribe = trpc.submissions.newsletter.useMutation({
    onSuccess: (data) => {
      if (data.alreadySubscribed) {
        toast({
          title: t("newsletter.alreadySubscribed"),
          description: t("newsletter.alreadySubscribedBody"),
        });
      } else {
        toast({
          title: t("newsletter.youreIn"),
          description: t("newsletter.youreInBody"),
        });
      }
      setEmail("");
    },
    onError: (err) => {
      toast({
        title: t("newsletter.failed"),
        description: err.message || t("state.tryAgainMoment"),
        variant: "destructive",
      });
    },
  });

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ title: t("newsletter.needEmail"), variant: "destructive" });
      return;
    }
    subscribe.mutate({
      email: email.trim().toLowerCase(),
      newsletters: selectedNewsletters.length > 0 ? selectedNewsletters : ["daily-brief"],
      source: typeof window !== "undefined" ? window.location.pathname : undefined,
    });
  };

  const toggleNewsletter = (id: string) => {
    setSelectedNewsletters((prev) =>
      prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]
    );
  };

  const newsletters = [
    {
      id: "daily-brief",
      badge: "FLAGSHIP",
      icon: Mail,
      name: publication.newsletter.name,
      frequency: t("newsletter.everyMorning"),
      description: publication.newsletter.description,
      topics: ["Macro & Policy", "Tender Awards", "Executive Briefing"],
      topBorder: "border-t-4 border-t-blue-600",
      activeBorder: "border-blue-500 shadow-blue-500/10",
      accentBg: "bg-blue-500/10",
      accentText: "text-blue-600 dark:text-blue-400",
      badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-900/60",
      checkboxBg: "bg-blue-600 border-blue-600 text-white",
    },
    {
      id: "projects-weekly",
      badge: "CAPEX & TENDERS",
      icon: Building2,
      name: t("newsletter.projectsWeekly"),
      frequency: t("newsletter.weekly"),
      description: t("newsletter.projectsDetail"),
      topics: ["Giga-Projects", "EPC Contracts", "Procurement"],
      topBorder: "border-t-4 border-t-amber-600",
      activeBorder: "border-amber-500 shadow-amber-500/10",
      accentBg: "bg-amber-500/10",
      accentText: "text-amber-600 dark:text-amber-400",
      badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-900/60",
      checkboxBg: "bg-amber-600 border-amber-600 text-white",
    },
    {
      id: "energy-brief",
      badge: "OIL & TRANSITION",
      icon: Zap,
      name: t("newsletter.energyBrief"),
      frequency: t("newsletter.weekly"),
      description: t("newsletter.energyDetail"),
      topics: ["Upstream & Refining", "Renewables", "Hydrogen & Power"],
      topBorder: "border-t-4 border-t-emerald-600",
      activeBorder: "border-emerald-500 shadow-emerald-500/10",
      accentBg: "bg-emerald-500/10",
      accentText: "text-emerald-600 dark:text-emerald-400",
      badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60",
      checkboxBg: "bg-emerald-600 border-emerald-600 text-white",
    },
    {
      id: "jobs-alerts",
      badge: "CAREERS",
      icon: Briefcase,
      name: t("newsletter.jobAlerts"),
      frequency: t("newsletter.asPosted"),
      description: t("newsletter.jobsDetail"),
      topics: ["Executive Roles", "Senior Engineering", "Operations"],
      topBorder: "border-t-4 border-t-purple-600",
      activeBorder: "border-purple-500 shadow-purple-500/10",
      accentBg: "bg-purple-500/10",
      accentText: "text-purple-600 dark:text-purple-400",
      badgeClass: "bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-200 dark:border-purple-900/60",
      checkboxBg: "bg-purple-600 border-purple-600 text-white",
    },
    {
      id: "event-updates",
      badge: "SUMMITS",
      icon: Calendar,
      name: t("newsletter.eventUpdates"),
      frequency: t("newsletter.monthly"),
      description: t("newsletter.eventsDetail"),
      topics: ["Industry Summits", "Trade Delegations", "Webinars"],
      topBorder: "border-t-4 border-t-rose-600",
      activeBorder: "border-rose-500 shadow-rose-500/10",
      accentBg: "bg-rose-500/10",
      accentText: "text-rose-600 dark:text-rose-400",
      badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200 dark:border-rose-900/60",
      checkboxBg: "bg-rose-600 border-rose-600 text-white",
    },
  ];

  const newsroomGuarantees = [
    {
      icon: ShieldCheck,
      title: t("newsletter.benefitHuman"),
      description: t("newsletter.benefitHumanDesc"),
      topBorder: "border-t-2 border-t-blue-500",
      iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
    {
      icon: Lock,
      title: t("newsletter.benefitNoSpam"),
      description: t("newsletter.benefitNoSpamDesc"),
      topBorder: "border-t-2 border-t-emerald-500",
      iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    {
      icon: Sliders,
      title: t("newsletter.benefitOneClick"),
      description: t("newsletter.benefitOneClickDesc"),
      topBorder: "border-t-2 border-t-violet-500",
      iconBg: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO
        title={`${publication.newsletter.name} | ${t("newsletter.heroTitle")}`}
        description={`${publication.newsletter.description} ${t("newsletter.heroBody")}`}
        canonical={`${publication.siteUrl}/newsletter`}
      />
      <JsonLd
        type="BreadcrumbList"
        data={[
          { name: t("nav.home"), url: publication.siteUrl },
          { name: publication.newsletter.name, url: `${publication.siteUrl}/newsletter` },
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
              <BreadcrumbPage>{publication.newsletter.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {/* Editorial Hero Section */}
        <section className="pt-4 pb-14 border-b border-border">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Copy & Form */}
            <div className="lg:col-span-7">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="bd-eyebrow text-primary tracking-widest font-bold">
                  {t("newsletter.heroEyebrow")}
                </span>
                <span className="text-muted-foreground/40 text-xs">/</span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {t("newsletter.everyMorning")} · 06:30 AST
                </span>
              </div>

              <h1 className="bd-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-4">
                {t("newsletter.heroHeadline")}
              </h1>

              <p className="bd-lede text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed mb-8">
                {t("newsletter.heroSubtitle")}
              </p>

              {/* High-Impact Subscription Dispatch Box */}
              <div className="relative rounded-xl border border-border/80 bg-card shadow-lg overflow-hidden mb-6">
                <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500" />
                <div className="p-6 sm:p-7">
                  <form onSubmit={handleSubscribe} className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder={t("newsletter.emailPlaceholder")}
                          required
                          className="pl-10 h-12 bg-background border-border text-foreground placeholder:text-muted-foreground text-sm rounded-lg focus-visible:ring-primary shadow-sm"
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={subscribe.isPending}
                        className="h-12 px-7 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 text-white font-semibold tracking-wide rounded-lg flex items-center justify-center gap-2 shrink-0 shadow-md shadow-blue-500/20 transition-all hover:shadow-lg"
                      >
                        {subscribe.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{t("common.subscribing")}</span>
                          </>
                        ) : (
                          <>
                            <span>{t("newsletter.subscribe")}</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground/80 leading-relaxed">
                      {t("newsletter.consent")}{" "}
                      <span className="inline-flex items-center gap-1 font-medium text-foreground">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" />
                        {t("newsletter.noSpam")} · {t("newsletter.unsubscribeAnytimeShort")}
                      </span>
                    </p>
                  </form>
                </div>
              </div>

              {/* Trust & Frequency Strip */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-200/60 dark:border-blue-900/50">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  {t("newsletter.byOurNewsroom")}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200/60 dark:border-emerald-900/50">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  {t("newsletter.freeToRead")}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-semibold border border-amber-200/60 dark:border-amber-900/50">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  {t("newsletter.unsubscribeAnytimeShort")}
                </span>
              </div>
            </div>

            {/* Right Interactive Mockup Snapshot */}
            <div className="lg:col-span-5">
              <div className="rounded-xl border border-border/90 bg-card overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300">
                {/* Email Client Header */}
                <div className="bg-muted/70 px-4 py-3 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
                  </div>
                  <span className="text-[11px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/50">
                    Pre-Market Dispatch
                  </span>
                  <div className="w-6" />
                </div>

                {/* Email Content Preview */}
                <div className="p-5 sm:p-6 space-y-4 text-xs">
                  {/* Masthead */}
                  <div className="border-b border-border pb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold tracking-tight text-sm text-foreground font-mono">
                        {publication.name.toUpperCase()} INTELLIGENCE
                      </span>
                      <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200/50 dark:border-blue-800/40">
                        AST 06:30
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Issue #482 · Saudi Arabia & GCC Industrial Brief
                    </p>
                  </div>

                  {/* Market Snapshot Ticker Strip */}
                  <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-lg bg-card border border-border/70 shadow-sm text-[11px] font-mono">
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground block text-[10px]">BRENT</span>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-foreground">$82.40</span>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded">+1.2%</span>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground block text-[10px]">TASI</span>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-foreground">12,450</span>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded">+0.4%</span>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground block text-[10px]">REBAR</span>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-foreground">$680/t</span>
                        <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1 py-0.2 rounded">steady</span>
                      </div>
                    </div>
                  </div>

                  {/* Top Story */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white uppercase tracking-wider shadow-sm">
                        {t("list.topStory")}
                      </span>
                      <span className="text-[10px] font-semibold text-muted-foreground">Riyadh Infra</span>
                    </div>
                    <h3 className="font-bold text-sm text-foreground leading-snug hover:text-primary transition-colors cursor-pointer">
                      {t("newsletter.sampleHeadline")}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed text-[11px]">
                      {t("newsletter.sampleLede")}
                    </p>
                  </div>

                  {/* Secondary Highlights */}
                  <div className="pt-2 border-t border-border/60 space-y-2">
                    <div className="p-2.5 rounded-lg bg-amber-500/[0.04] border border-amber-500/20 flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Zap className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-[11px]">
                          {t("newsletter.sampleEnergy")}
                        </p>
                        <p className="text-muted-foreground text-[10px]">
                          {t("newsletter.sampleEnergySub")}
                        </p>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-violet-500/[0.04] border border-violet-500/20 flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-md bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-[11px]">
                          {t("newsletter.samplePeople")}
                        </p>
                        <p className="text-muted-foreground text-[10px]">
                          {t("newsletter.samplePeopleSub")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Curated Briefings Section */}
        <section className="py-14 border-b border-border">
          <div className="max-w-3xl mb-10">
            <span className="bd-eyebrow text-primary tracking-widest font-bold">
              {t("newsletter.selectLists")}
            </span>
            <h2 className="bd-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1 mb-3">
              {t("newsletter.browse")}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              {t("newsletter.selectListsBody")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {newsletters.map((newsletter) => {
              const isSelected = selectedNewsletters.includes(newsletter.id);
              const Icon = newsletter.icon;

              return (
                <div
                  key={newsletter.id}
                  onClick={() => toggleNewsletter(newsletter.id)}
                  className={`group relative p-6 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between hover:-translate-y-1 hover:shadow-lg ${
                    isSelected
                      ? `${newsletter.activeBorder} ${newsletter.topBorder} bg-card ring-1 ring-primary/20 shadow-md`
                      : `border-border/80 ${newsletter.topBorder} bg-card hover:border-primary/40`
                  }`}
                >
                  <div>
                    {/* Top Row: Badge, Frequency & Checkbox */}
                    <div className="flex items-center justify-between mb-4">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border ${newsletter.badgeClass}`}>
                        {newsletter.badge}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-medium">
                          {newsletter.frequency}
                        </span>
                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                            isSelected
                              ? newsletter.checkboxBg
                              : "border-muted-foreground/30 group-hover:border-primary/60 bg-background"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    </div>

                    {/* Icon + Title */}
                    <div className="flex items-center gap-3 mb-2.5">
                      <div className={`w-9 h-9 rounded-lg ${newsletter.accentBg} ${newsletter.accentText} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-base text-foreground leading-tight group-hover:text-primary transition-colors">
                        {newsletter.name}
                      </h3>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                      {newsletter.description}
                    </p>
                  </div>

                  {/* Topic Tags */}
                  <div className="pt-3 border-t border-border/50 flex flex-wrap gap-1.5">
                    {newsletter.topics.map((topic, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-0.5 rounded bg-muted/70 text-muted-foreground font-medium border border-border/40"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Selection Summary & Action Bar */}
          <div className="mt-8 p-5 sm:p-6 rounded-xl border border-border/80 bg-gradient-to-r from-card via-card to-primary/[0.03] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-sm text-foreground">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="font-medium">
                {t("newsletter.preferencesSavedBody", { n: selectedNewsletters.length })}
              </p>
            </div>
            <Button
              onClick={() => {
                if (!email) {
                  const inputEl = document.querySelector('input[type="email"]') as HTMLInputElement;
                  inputEl?.focus();
                  inputEl?.scrollIntoView({ behavior: "smooth", block: "center" });
                } else {
                  handleSubscribe({ preventDefault: () => {} } as React.FormEvent);
                }
              }}
              disabled={selectedNewsletters.length === 0}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 text-white font-semibold px-6 py-2.5 text-xs tracking-wide rounded-lg flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 hover:shadow-lg transition-all"
            >
              <span>{t("newsletter.subscribeToCount", { n: selectedNewsletters.length })}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </section>

        {/* The BrentDesk Newsroom Standard (Trust & Commitments) */}
        <section className="py-14 border-b border-border">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="bd-eyebrow text-primary tracking-widest font-bold">
              EDITORIAL INTEGRITY
            </span>
            <h2 className="bd-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1 mb-3">
              {t("newsletter.benefitsTitle")}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {newsroomGuarantees.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  className={`p-6 rounded-xl border border-border/80 ${item.topBorder} bg-card space-y-3 hover:-translate-y-1 hover:shadow-lg transition-all duration-200`}
                >
                  <div className={`w-10 h-10 rounded-lg ${item.iconBg} flex items-center justify-center`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-base text-foreground">{item.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Enterprise & Commercial Partnerships CTA Strip */}
        <section className="pt-14">
          <div className="relative rounded-xl border border-border/80 bg-gradient-to-r from-blue-600/[0.04] via-card to-amber-500/[0.04] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-amber-500" />
            <div className="space-y-1 text-center md:text-left">
              <h3 className="font-bold text-lg text-foreground">
                Corporate & Bureau Subscriptions
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
                Looking to equip your entire procurement, engineering, or executive team with custom briefing distributions and API feeds?
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Button asChild variant="outline" className="border-border text-foreground hover:bg-muted text-xs font-semibold px-4 py-2">
                <Link href="/advertise">{t("footer.advertise")}</Link>
              </Button>
              <Button asChild className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold px-5 py-2 shadow-sm">
                <Link href="/contact">{t("footer.contactUs")}</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Newsletter;

