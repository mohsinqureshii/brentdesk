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
    },
    {
      id: "projects-weekly",
      badge: "CAPEX & TENDERS",
      icon: Building2,
      name: t("newsletter.projectsWeekly"),
      frequency: t("newsletter.weekly"),
      description: t("newsletter.projectsDetail"),
      topics: ["Giga-Projects", "EPC Contracts", "Procurement"],
    },
    {
      id: "energy-brief",
      badge: "OIL & TRANSITION",
      icon: Zap,
      name: t("newsletter.energyBrief"),
      frequency: t("newsletter.weekly"),
      description: t("newsletter.energyDetail"),
      topics: ["Upstream & Refining", "Renewables", "Hydrogen & Power"],
    },
    {
      id: "jobs-alerts",
      badge: "CAREERS",
      icon: Briefcase,
      name: t("newsletter.jobAlerts"),
      frequency: t("newsletter.asPosted"),
      description: t("newsletter.jobsDetail"),
      topics: ["Executive Roles", "Senior Engineering", "Operations"],
    },
    {
      id: "event-updates",
      badge: "SUMMITS",
      icon: Calendar,
      name: t("newsletter.eventUpdates"),
      frequency: t("newsletter.monthly"),
      description: t("newsletter.eventsDetail"),
      topics: ["Industry Summits", "Trade Delegations", "Webinars"],
    },
  ];

  const newsroomGuarantees = [
    {
      icon: ShieldCheck,
      title: t("newsletter.benefitHuman"),
      description: t("newsletter.benefitHumanDesc"),
    },
    {
      icon: Lock,
      title: t("newsletter.benefitNoSpam"),
      description: t("newsletter.benefitNoSpamDesc"),
    },
    {
      icon: Sliders,
      title: t("newsletter.benefitOneClick"),
      description: t("newsletter.benefitOneClickDesc"),
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
              <div className="p-6 sm:p-7 rounded-xl border border-border/80 bg-card shadow-sm mb-6">
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
                        className="pl-10 h-12 bg-background border-border text-foreground placeholder:text-muted-foreground text-sm rounded-lg focus-visible:ring-primary"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={subscribe.isPending}
                      className="h-12 px-7 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold tracking-wide rounded-lg flex items-center justify-center gap-2 shrink-0 transition-colors"
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
                      <ShieldCheck className="w-3 h-3 text-primary inline" />
                      {t("newsletter.noSpam")} · {t("newsletter.unsubscribeAnytimeShort")}
                    </span>
                  </p>
                </form>
              </div>

              {/* Trust & Frequency Strip */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm bg-muted text-xs font-medium text-foreground border border-border">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                  {t("newsletter.byOurNewsroom")}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm bg-muted text-xs font-medium text-foreground border border-border">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                  {t("newsletter.freeToRead")}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm bg-muted text-xs font-medium text-foreground border border-border">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                  {t("newsletter.unsubscribeAnytimeShort")}
                </span>
              </div>
            </div>

            {/* Right Interactive Mockup Snapshot */}
            <div className="lg:col-span-5">
              <div className="rounded-xl border border-border/90 bg-card overflow-hidden shadow-lg">
                {/* Email Client Header */}
                <div className="bg-muted/70 px-4 py-3 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest">
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
                      <span className="text-[10px] font-mono text-primary font-bold">
                        AST 06:30
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Issue #482 · Saudi Arabia & GCC Industrial Brief
                    </p>
                  </div>

                  {/* Market Snapshot Ticker Strip */}
                  <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded bg-muted/50 border border-border/50 text-[11px] font-mono">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">BRENT</span>
                      <span className="font-bold text-foreground">$82.40</span>{" "}
                      <span className="text-emerald-500 text-[10px]">+1.2%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">TASI</span>
                      <span className="font-bold text-foreground">12,450</span>{" "}
                      <span className="text-emerald-500 text-[10px]">+0.4%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">REBAR</span>
                      <span className="font-bold text-foreground">$680/t</span>{" "}
                      <span className="text-muted-foreground text-[10px]">steady</span>
                    </div>
                  </div>

                  {/* Top Story */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary uppercase tracking-wide">
                        {t("list.topStory")}
                      </span>
                      <span className="text-[10px] text-muted-foreground">Riyadh Infra</span>
                    </div>
                    <h3 className="font-bold text-sm text-foreground leading-snug">
                      {t("newsletter.sampleHeadline")}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed text-[11px]">
                      {t("newsletter.sampleLede")}
                    </p>
                  </div>

                  {/* Secondary Highlights */}
                  <div className="pt-2 border-t border-border/60 space-y-2">
                    <div className="p-2.5 rounded-lg bg-background/80 border border-border/60 flex items-start gap-2.5">
                      <Zap className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground text-[11px]">
                          {t("newsletter.sampleEnergy")}
                        </p>
                        <p className="text-muted-foreground text-[10px]">
                          {t("newsletter.sampleEnergySub")}
                        </p>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-background/80 border border-border/60 flex items-start gap-2.5">
                      <Users className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground text-[11px]">
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
                  className={`group relative p-6 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "border-primary bg-primary/[0.03] shadow-sm"
                      : "border-border/80 bg-card hover:border-primary/40"
                  }`}
                >
                  <div>
                    {/* Top Row: Badge, Frequency & Checkbox */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                        {newsletter.badge}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-medium">
                          {newsletter.frequency}
                        </span>
                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-muted-foreground/30 group-hover:border-primary/60"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    </div>

                    {/* Icon + Title */}
                    <div className="flex items-center gap-3 mb-2.5">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-base text-foreground leading-tight">
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
                        className="text-[10px] px-2 py-0.5 rounded bg-muted/60 text-muted-foreground"
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
          <div className="mt-8 p-5 sm:p-6 rounded-xl border border-border/80 bg-card flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-sm text-foreground">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
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
              className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-6 py-2.5 text-xs tracking-wide rounded-lg flex items-center justify-center gap-2"
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
                  className="p-6 rounded-xl border border-border/80 bg-card space-y-3"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
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
          <div className="rounded-xl border border-border/80 bg-muted/40 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center md:text-left">
              <h3 className="font-bold text-lg text-foreground">
                Corporate & Bureau Subscriptions
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
                Looking to equip your entire procurement, engineering, or executive team with custom briefing distributions and API feeds?
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Button asChild variant="outline" className="border-border text-foreground text-xs font-semibold px-4 py-2">
                <Link href="/advertise">{t("footer.advertise")}</Link>
              </Button>
              <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold px-4 py-2">
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

