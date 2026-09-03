import { useState, useMemo } from "react";
import { fmtNumber } from "@/lib/dates";
import { Link } from "wouter";
import { useParams } from "wouter";
import { publication } from "@shared/publication";
import { useBrowsingTracker } from "@/hooks/useBrowsingTracker";
import { useAuth } from "@/_core/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { LeaderboardAd, SidebarAd, MobileStickyAd } from "@/components/ads/AdUnit";
import { useToast } from "@/hooks/use-toast";
import {
  Globe,
  Linkedin,
  Twitter,
  MapPin,
  Users,
  Calendar,
  Building2,
  Briefcase,
  ExternalLink,
  DollarSign,
  Target,
  Award,
  ChevronRight,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Mail,
  Sparkles,
  UserPlus,
  Heart,
  Code2,
  Layers,
  BarChart3,
  FileText,
  Share2,
  Phone,
  Instagram,
  Youtube,
  Facebook,
  Shield,
  CheckCircle2,
  Rocket,
  Package,
  Newspaper,
  MessageSquare,
  Download,
  Play,
  Star,
  Zap,
  Eye,
  ArrowUpRight,
  Milestone,
  BookOpen,
  GraduationCap,
  Handshake,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useT } from "@/lib/i18n";
import type { UiKey } from "@shared/uiStrings";
import { ClaimProfileButton } from "@/components/ClaimProfileButton";
import SEO from "@/components/SEO";
import { JsonLd } from "@/components/JsonLd";

const roleTypeKeys: Record<string, UiKey> = {
  full_time: "job.fullTime",
  part_time: "job.partTime",
  contract: "job.contract",
  internship: "job.internship",
  freelance: "job.freelance",
};

type Translate = ReturnType<typeof useT>;

function formatCurrency(amount: string | number | null, currency = "USD") {
  if (!amount) return null;
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return null;
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
  return `$${fmtNumber(num)}`;
}

function timeAgo(dateStr: string | null, t: Translate) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return t("time.today");
  if (days === 1) return t("time.yesterday");
  if (days < 30) return t("time.daysAgo", { n: days });
  if (days < 365) return t("time.monthsAgo", { n: Math.floor(days / 30) });
  return t("time.yearsAgo", { n: Math.floor(days / 365) });
}

// Profile completeness calculator
function calcCompleteness(c: any): number {
  let score = 0;
  const checks = [
    c.name, c.tagline, c.description, c.logo, c.website, c.industry,
    c.location, c.foundedYear, c.employeeCount, c.totalFunding,
    c.mission, c.vision, c.coverImage, c.linkedIn, c.twitter,
    c.email, c.phone, c.stage, c.shortDescription,
    c.keyPeople && (c.keyPeople as any[]).length > 0,
    c.techStack && (c.techStack as any[]).length > 0,
  ];
  checks.forEach(v => { if (v) score += 1; });
  return Math.round((score / checks.length) * 100);
}

export default function CompanyProfile() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("overview");
  const [showFullAbout, setShowFullAbout] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();

  // Follow (bookmark) system
  const bookmarkToggle = trpc.bookmarks.toggle.useMutation();
  const [isFollowing, setIsFollowing] = useState(false);

  const { data: company, isLoading, error } = trpc.companies.getBySlug.useQuery(
    { slug: id || "" },
    { enabled: !!id }
  );

  useBrowsingTracker(
    company
      ? {
          contentType: "company",
          contentId: company.id,
          contentTitle: company.name,
          contentSlug: company.slug,
          contentCategory: (company as any).industry || "",
        }
      : null
  );

  const profileStrength = useMemo(() => company ? calcCompleteness(company) : 0, [company]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <SEO title={t("state.companyNotFound")} noindex />
        <Header />
        <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-4">{t("state.companyNotFound")}</h1>
          <p className="text-muted-foreground mb-6">{t("state.companyNotFoundBody")}</p>
          <Link href="/companies">
            <Button>{t("state.backToCompanies")}</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const c = company as any;
  const keyPeople = c.keyPeople as Array<{ name: string; role: string; linkedIn?: string; category?: string }> | null;
  const shortDescription = c.shortDescription as string | null;
  const locationText = company.location || (company.regions && company.regions.length > 0 ? company.regions.map((r: any) => r.name).join(", ") : null);
  const timeline = c.timeline as Array<{ year: number; title: string; description?: string }> | null;
  const notableCustomers = c.notableCustomers as Array<{ name: string; logo?: string }> | null;
  const partnerships = c.partnerships as Array<{ name: string; logo?: string; description?: string }> | null;
  const certifications = c.certifications as Array<{ name: string; year?: number; issuer?: string }> | null;
  const whitepapers = c.whitepapers as Array<{ title: string; url: string; description?: string }> | null;
  const caseStudies = c.caseStudies as Array<{ title: string; url: string; description?: string; client?: string }> | null;
  const teamMembers = c.teamMembers || [];
  const openJobs = c.openJobs || [];
  const relatedArticles = c.relatedArticles || [];
  const products = c.products || [];
  const awards = c.awards || [];
  const updates = c.updates || [];
  const similarCompanies = c.similarCompanies || [];
  const verificationLevel = c.verificationLevel || "basic";
  const dataSource = c.dataSource || "editorial";

  // Determine tab counts for badges
  const jobCount = openJobs.length;
  const newsCount = relatedArticles.length;
  const peopleCount = teamMembers.length + (keyPeople?.length || 0);
  const productCount = products.length;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEO
        title={`${company.name} - ${t("company.profile")} | ${publication.name}`}
        description={shortDescription || company.tagline || company.description || t("company.profileMeta", { name: company.name, site: publication.name })}
        canonical={`${publication.siteUrl}/companies/${company.slug}`}
        ogImage={company.logo || undefined}
      />
      <JsonLd
        type="Organization"
        data={{
          name: company.name,
          url: company.website || `${publication.siteUrl}/companies/${company.slug}`,
          logo: company.logo || undefined,
          description: shortDescription || company.tagline || company.description || undefined,
          // foundingDate not supported in schema
          // numberOfEmployees not supported in schema
        }}
      />
      <Header />

      {/* Inline Edit Banner for profile owners */}
      <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 mt-3">
              </div>

      {/* ═══════════════════════════════════════════════════════════════
          MODULE 1: HEADER PROFILE — Identity Layer (White Background)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="relative bg-white dark:bg-card">
        {/* Subtle gradient banner - smaller when no cover */}
        {c.coverImage ? (
          <div className="h-24 sm:h-32 w-full overflow-hidden">
            <img src={c.coverImage} alt={t("company.coverAlt", { name: company.name })} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-white/80 dark:from-card/80 via-transparent to-transparent" />
          </div>
        ) : (
          <div className="h-24 sm:h-32 w-full bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900" />
        )}

        <div className="relative w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 -mt-14 sm:-mt-16">
          <div className="flex flex-col md:flex-row gap-5 md:gap-6 items-start">
            {/* Logo */}
            <div className="relative shrink-0 z-10">
              <div className="rounded-2xl overflow-hidden shadow-lg border-4 border-white dark:border-card bg-white dark:bg-card w-28 h-28 sm:w-36 sm:h-36">
                {company.logo ? (
                  <img src={company.logo} alt={company.name} className="w-full h-full object-contain p-3" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 flex items-center justify-center">
                    <span className="text-4xl sm:text-5xl font-bold text-blue-600 dark:text-blue-400">
                      {company.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Company Info */}
            <div className="flex-1 min-w-0 pt-2">
              <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
                  {company.name}
                </h1>
                {verificationLevel === "verified" && (
                  <Badge className="gap-1 bg-blue-500 text-white hover:bg-blue-500 border-0 text-xs">
                    <CheckCircle2 className="h-3 w-3" />
                    {t("company.verified")}
                  </Badge>
                )}
                {company.isFeatured ? (
                  <Badge className="gap-1 bg-amber-500 text-white hover:bg-amber-500 border-0 text-xs">
                    <Star className="h-3 w-3" />
                    {t("list.featured")}
                  </Badge>
                ) : null}
                {c.hiringActively ? (
                  <Badge className="gap-1 bg-green-500 text-white hover:bg-green-500 border-0 text-xs">
                    <Zap className="h-3 w-3" />
                    {t("company.hiring")}
                  </Badge>
                ) : null}
              </div>

              <p className="text-base sm:text-lg text-muted-foreground mb-2.5 line-clamp-2">
                {company.tagline || shortDescription || ""}
              </p>

              {/* Quick Fact Chips */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground mb-3">
                {company.industry && (
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    {company.industry}
                  </span>
                )}
                {locationText && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {locationText}
                  </span>
                )}
                {company.foundedYear && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {t("company.established", { year: company.foundedYear })}
                  </span>
                )}
                {company.employeeCount && (
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {company.employeeCount}
                  </span>
                )}
              </div>

              {/* Sector Tags */}
              <div className="flex flex-wrap gap-1.5">
                {company.sectors?.map((s: any) => (
                  <Badge key={s.id} variant="secondary" className="rounded-full text-xs">
                    {s.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Action Sidebar (desktop) */}
            <div className="hidden lg:flex flex-col gap-2.5 w-[220px] shrink-0 pt-2">
              {company.website && (
                <a href={company.website} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full gap-2 bg-foreground text-background hover:bg-foreground/90 h-10">
                    <Globe className="h-4 w-4" />
                    {t("company.visitWebsite")}
                    <ExternalLink className="h-3 w-3 ml-auto" />
                  </Button>
                </a>
              )}
              <Button
                variant="outline"
                className={`w-full gap-2 h-9 text-sm ${isFollowing ? 'bg-primary/10 border-primary text-primary' : ''}`}
                onClick={() => {
                  if (!user) { toast({ title: t("auth.signInRequired"), description: t("company.signInToFollow") }); return; }
                  bookmarkToggle.mutate(
                    { contentType: "company" as any, contentId: company.id, contentTitle: company.name, contentSlug: company.slug },
                    { onSuccess: (res) => { setIsFollowing(res.bookmarked); toast({ title: res.bookmarked ? t("company.nowFollowing", { name: company.name }) : t("company.unfollowed", { name: company.name }) }); } }
                  );
                }}
              >
                <UserPlus className="h-4 w-4" />
                {isFollowing ? t("common.following") : t("common.follow")}
              </Button>
              <Button variant="outline" className="w-full gap-2 h-9 text-sm" onClick={() => setContactOpen(true)}>
                <Mail className="h-4 w-4" />
                {t("company.contact")}
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2 h-9 text-sm"
                onClick={() => {
                  const url = `${window.location.origin}/companies/${company.slug}`;
                  navigator.clipboard.writeText(url).then(() => toast({ title: t("company.linkCopied") }));
                }}
              >
                <Share2 className="h-4 w-4" />
                {t("company.shareProfile")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Action Buttons */}
      <div className="lg:hidden border-b border-border bg-white dark:bg-card">
        <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 py-3 flex flex-wrap gap-2">
          {company.website && (
            <a href={company.website} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button className="w-full gap-2 bg-foreground text-background hover:bg-foreground/90 h-9 text-sm">
                <Globe className="h-4 w-4" />
                {t("company.website")}
              </Button>
            </a>
          )}
          <Button
            variant="outline"
            className={`flex-1 gap-2 h-9 text-sm ${isFollowing ? 'bg-primary/10 border-primary text-primary' : ''}`}
            onClick={() => {
              if (!user) { toast({ title: t("auth.signInRequired"), description: t("company.signInToFollow") }); return; }
              bookmarkToggle.mutate(
                { contentType: "company" as any, contentId: company.id, contentTitle: company.name, contentSlug: company.slug },
                { onSuccess: (res) => { setIsFollowing(res.bookmarked); toast({ title: res.bookmarked ? t("company.nowFollowing", { name: company.name }) : t("company.unfollowed", { name: company.name }) }); } }
              );
            }}
          >
            <UserPlus className="h-4 w-4" />
            {isFollowing ? t("common.following") : t("common.follow")}
          </Button>
          <Button
            variant="outline"
            className="gap-2 h-9 text-sm"
            onClick={() => {
              const url = `${window.location.origin}/companies/${company.slug}`;
              navigator.clipboard.writeText(url).then(() => toast({ title: t("company.linkCopied") }));
            }}
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Contact Dialog */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("company.contactTitle", { name: company.name })}</DialogTitle>
            <DialogDescription>{t("company.contactDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t("common.yourEmail")}</label>
              <Input placeholder="your@email.com" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t("common.message")}</label>
              <Textarea placeholder={t("company.messagePlaceholder")} rows={4} value={contactMessage} onChange={(e) => setContactMessage(e.target.value)} />
            </div>
            <Button className="w-full" onClick={() => { toast({ title: t("company.messageSent"), description: t("company.messageSentBody") }); setContactOpen(false); setContactMessage(""); setContactEmail(""); }}>
              <Mail className="h-4 w-4 mr-2" />
              {t("company.sendMessage")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════
          TABBED CONTENT LAYER
          ═══════════════════════════════════════════════════════════════ */}
      <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 mt-6 pb-12">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b border-border mb-6 overflow-x-auto">
            <TabsList className="bg-transparent h-auto p-0 gap-0 w-auto">
              <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium">
                {t("company.tabOverview")}
              </TabsTrigger>
              <TabsTrigger value="news" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium">
                {t("nav.news")} {newsCount > 0 && <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">{newsCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="jobs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium">
                {t("nav.jobs")} {jobCount > 0 && <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">{jobCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="people" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium">
                {t("nav.people")} {peopleCount > 0 && <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">{peopleCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="products" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium">
                {t("company.tabProducts")} {productCount > 0 && <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">{productCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="press" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium">
                {t("company.tabPress")}
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="grid lg:grid-cols-[1fr_340px] gap-8 items-start">
            {/* ═══════════ LEFT COLUMN ═══════════ */}
            <div>
              {/* ─── TAB: OVERVIEW ─── */}
              <TabsContent value="overview" className="mt-0 space-y-6">
                {/* Overview Stats */}
                <div className="grid grid-cols-2 gap-3">
                  {company.employeeCount && (
                    <div className="rounded-xl bg-white dark:bg-card border border-border p-4 text-center">
                      <Users className="h-5 w-5 mx-auto mb-1.5 text-muted-foreground" />
                      <div className="text-lg font-bold text-foreground">{company.employeeCount}</div>
                      <div className="text-[11px] text-muted-foreground">{t("company.employees")}</div>
                    </div>
                  )}
                  <div className="rounded-xl bg-white dark:bg-card border border-border p-4 text-center">
                    <Eye className="h-5 w-5 mx-auto mb-1.5 text-muted-foreground" />
                    <div className="text-lg font-bold text-foreground">{fmtNumber((company.viewCount || 0))}</div>
                    <div className="text-[11px] text-muted-foreground">{t("company.profileViews")}</div>
                  </div>
                </div>

                {/* Key Metrics Row (if available) */}
                {(c.countriesServed || c.clientsCount) && (
                  <Card className="border border-border">
                    <CardContent className="p-5">
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-4">
                        <BarChart3 className="h-4 w-4 text-blue-500" />
                        {t("company.keyMetrics")}
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        {c.countriesServed && (
                          <div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wider">{t("company.countries")}</div>
                            <div className="text-sm font-semibold text-foreground mt-0.5">{c.countriesServed}</div>
                          </div>
                        )}
                        {c.clientsCount && (
                          <div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wider">{t("company.clients")}</div>
                            <div className="text-sm font-semibold text-foreground mt-0.5">{fmtNumber(c.clientsCount)}</div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* MODULE 2: COMPANY STORY — About */}
                {(company.description || c.mission || c.vision || c.problemSolved) && (
                  <Card className="border border-border">
                    <CardContent className="p-5 sm:p-6">
                      <h2 className="text-lg font-semibold text-foreground mb-3">{t("company.aboutName", { name: company.name })}</h2>
                      <div className={`text-sm text-muted-foreground leading-relaxed whitespace-pre-line ${!showFullAbout && company.description && company.description.length > 500 ? "line-clamp-6" : ""}`}>
                        {company.description || company.tagline || t("company.noDescription")}
                      </div>
                      {company.description && company.description.length > 500 && (
                        <button
                          onClick={() => setShowFullAbout(!showFullAbout)}
                          className="text-sm text-primary font-medium mt-2 flex items-center gap-1 hover:underline"
                        >
                          {showFullAbout ? t("common.showLess") : t("article.readMore")}
                          {showFullAbout ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      )}

                      {/* Mission / Vision / Problem */}
                      {(c.mission || c.vision || c.problemSolved || c.marketServed) && (
                        <div className="grid sm:grid-cols-2 gap-4 mt-5 pt-5 border-t border-border">
                          {c.mission && (
                            <div>
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                                <Target className="h-3.5 w-3.5" />
                                {t("company.mission")}
                              </div>
                              <p className="text-sm text-foreground leading-relaxed">{c.mission}</p>
                            </div>
                          )}
                          {c.vision && (
                            <div>
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                                <Rocket className="h-3.5 w-3.5" />
                                {t("company.vision")}
                              </div>
                              <p className="text-sm text-foreground leading-relaxed">{c.vision}</p>
                            </div>
                          )}
                          {c.problemSolved && (
                            <div>
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                                <Zap className="h-3.5 w-3.5" />
                                {t("company.problemSolved")}
                              </div>
                              <p className="text-sm text-foreground leading-relaxed">{c.problemSolved}</p>
                            </div>
                          )}
                          {c.marketServed && (
                            <div>
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                                <Globe className="h-3.5 w-3.5" />
                                {t("company.marketServed")}
                              </div>
                              <p className="text-sm text-foreground leading-relaxed">{c.marketServed}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Details & Focus Areas - Side by Side */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {!!(company.industry || locationText || company.foundedYear || company.employeeCount || c.countriesServed) && (
                    <Card className="border border-border">
                      <CardContent className="p-5">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-4">
                          <span className="h-2 w-2 rounded-full bg-blue-500" />
                          {t("company.details")}
                        </h3>
                        <div className="space-y-3">
                          {company.industry && <DetailRow label={t("company.industry")} value={company.industry} />}
                          {locationText && <DetailRow label={t("company.headquarters")} value={locationText} />}
                          {company.foundedYear && <DetailRow label={t("company.founded")} value={String(company.foundedYear)} />}
                          {company.employeeCount && <DetailRow label={t("company.teamSize")} value={t("company.nEmployees", { n: company.employeeCount })} />}
                          {c.countriesServed && <DetailRow label={t("company.countries")} value={String(c.countriesServed)} />}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {!!((company.sectors && company.sectors.length > 0) || (company.regions && company.regions.length > 0) || (certifications && certifications.length > 0)) && (
                    <Card className="border border-border">
                      <CardContent className="p-5">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-4">
                          <span className="h-2 w-2 rounded-full bg-amber-500" />
                          {t("company.focusAreas")}
                        </h3>
                        <div className="space-y-3">
                          {company.sectors && company.sectors.length > 0 && (
                            <div>
                              <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">{t("company.sectors")}</div>
                              <div className="flex flex-wrap gap-1.5">
                                {company.sectors.map((s: any) => (
                                  <Badge key={s.id} variant="secondary" className="rounded-full text-xs">{s.name}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {company.regions && company.regions.length > 0 && (
                            <div>
                              <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">{t("company.regions")}</div>
                              <div className="flex flex-wrap gap-1.5">
                                {company.regions.map((r: any) => (
                                  <Badge key={r.id} variant="outline" className="rounded-full text-xs">{r.name}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {certifications && certifications.length > 0 && (
                            <div>
                              <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">{t("company.certifications")}</div>
                              <div className="flex flex-wrap gap-1.5">
                                {certifications.map((cert, i) => (
                                  <Badge key={i} variant="outline" className="rounded-full text-xs gap-1">
                                    <Shield className="h-3 w-3" />
                                    {cert.name}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Timeline */}
                {timeline && timeline.length > 0 && (
                  <Card className="border border-border">
                    <CardContent className="p-5 sm:p-6">
                      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-5">
                        <Milestone className="h-5 w-5 text-muted-foreground" />
                        {t("company.timeline")}
                      </h2>
                      <div className="relative pl-6 border-l-2 border-border space-y-5">
                        {timeline.map((item, i) => (
                          <div key={i} className="relative">
                            <div className="absolute -left-[29px] w-4 h-4 rounded-full bg-primary border-2 border-background" />
                            <div className="text-xs font-semibold text-primary mb-0.5">{item.year}</div>
                            <div className="text-sm font-semibold text-foreground">{item.title}</div>
                            {item.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Notable Customers & Partnerships */}
                {((notableCustomers && notableCustomers.length > 0) || (partnerships && partnerships.length > 0)) && (
                  <Card className="border border-border">
                    <CardContent className="p-5 sm:p-6">
                      {notableCustomers && notableCustomers.length > 0 && (
                        <div className="mb-5">
                          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                            <Handshake className="h-4 w-4 text-muted-foreground" />
                            {t("company.notableCustomers")}
                          </h3>
                          <div className="flex flex-wrap gap-3">
                            {notableCustomers.map((cust, i) => (
                              <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-muted/30 text-sm">
                                {cust.logo && <img src={cust.logo} alt={cust.name} className="h-5 w-5 rounded-full object-cover" />}
                                <span className="text-foreground font-medium">{cust.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {partnerships && partnerships.length > 0 && (
                        <div>
                          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                            <Handshake className="h-4 w-4 text-muted-foreground" />
                            {t("company.partnerships")}
                          </h3>
                          <div className="grid sm:grid-cols-2 gap-3">
                            {partnerships.map((p, i) => (
                              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                                {p.logo && <img src={p.logo} alt={p.name} className="h-8 w-8 rounded object-cover shrink-0" />}
                                <div>
                                  <div className="text-sm font-semibold text-foreground">{p.name}</div>
                                  {p.description && <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* MODULE 10: Company Updates Feed */}
                {updates.length > 0 && (
                  <Card className="border border-border">
                    <CardContent className="p-5 sm:p-6">
                      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
                        <MessageSquare className="h-5 w-5 text-muted-foreground" />
                        {t("company.recentUpdates")}
                      </h2>
                      <div className="space-y-4">
                        {updates.slice(0, 5).map((update: any) => (
                          <div key={update.id} className="flex gap-3 pb-4 border-b border-border last:border-0 last:pb-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                              update.type === "milestone" ? "bg-amber-100 dark:bg-amber-900/30" :
                              update.type === "product_launch" ? "bg-blue-100 dark:bg-blue-900/30" :
                              "bg-muted"
                            }`}>
                              {update.type === "milestone" ? <Star className="h-4 w-4 text-amber-600" /> :
                               update.type === "product_launch" ? <Rocket className="h-4 w-4 text-blue-600" /> :
                               update.type === "event" ? <Calendar className="h-4 w-4 text-purple-600" /> :
                               <MessageSquare className="h-4 w-4 text-muted-foreground" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              {update.title && <div className="text-sm font-semibold text-foreground">{update.title}</div>}
                              {update.content && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{update.content}</p>}
                              {update.image && <img src={update.image} alt="" className="mt-2 rounded-lg max-h-40 object-cover" />}
                              <div className="text-[11px] text-muted-foreground mt-1.5">{timeAgo(update.createdAt, t)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ─── TAB: NEWS & MEDIA ─── */}
              <TabsContent value="news" className="mt-0 space-y-6">
                {/* Awards */}
                {awards.length > 0 && (
                  <Card className="border border-border">
                    <CardContent className="p-5 sm:p-6">
                      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
                        <Award className="h-5 w-5 text-amber-500" />
                        {t("company.awards")}
                      </h2>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {awards.map((award: any) => (
                          <div key={award.id} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                              <Award className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-foreground">{award.title}</div>
                              <div className="text-xs text-muted-foreground">{award.organization}{award.year ? ` · ${award.year}` : ""}</div>
                              {award.description && <p className="text-xs text-muted-foreground mt-1">{award.description}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Related Articles */}
                {relatedArticles.length > 0 ? (
                  <Card className="border border-border">
                    <CardContent className="p-5 sm:p-6">
                      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
                        <Newspaper className="h-5 w-5 text-muted-foreground" />
                        {t("company.newsCoverage")}
                      </h2>
                      <div className="space-y-3">
                        {relatedArticles.map((article: any) => (
                          <Link key={article.id} href={`/news/${article.slug}`}>
                            <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer">
                              <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                                <FileText className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-foreground line-clamp-1">{article.title}</div>
                                {article.excerpt && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{article.excerpt}</p>}
                                <div className="flex items-center gap-2 mt-1.5">
                                  <Badge variant="outline" className="text-[10px] rounded-full">{article.mentionType}</Badge>
                                  <span className="text-[11px] text-muted-foreground">{timeAgo(article.publishedAt, t)}</span>
                                </div>
                              </div>
                              <ArrowUpRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border border-border">
                    <CardContent className="p-8 text-center">
                      <Newspaper className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <h3 className="text-sm font-semibold text-foreground mb-1">{t("company.noNews")}</h3>
                      <p className="text-xs text-muted-foreground">{t("company.noNewsBody", { name: company.name })}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ─── TAB: JOBS ─── */}
              <TabsContent value="jobs" className="mt-0 space-y-6">
                {openJobs.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-lg font-semibold text-foreground">
                        {t("company.openPositions", { n: openJobs.length })}
                      </h2>
                    </div>
                    {openJobs.map((job: any) => (
                      <Link key={job.id} href={`/jobs/${job.slug}`}>
                        <Card className="border border-border hover:border-primary/30 transition-colors cursor-pointer">
                          <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-foreground">{job.title}</div>
                              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                                {job.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {job.location}
                                  </span>
                                )}
                                {job.roleType && (
                                  <Badge variant="secondary" className="text-[10px] rounded-full">{roleTypeKeys[job.roleType] ? t(roleTypeKeys[job.roleType]) : job.roleType}</Badge>
                                )}
                                {job.isRemote ? <Badge variant="outline" className="text-[10px] rounded-full">{t("job.remote")}</Badge> : null}
                                {(job.salaryMin || job.salaryMax) && (
                                  <span className="flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    {formatCurrency(job.salaryMin, job.salaryCurrency)} - {formatCurrency(job.salaryMax, job.salaryCurrency)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Card className="border border-border">
                    <CardContent className="p-8 text-center">
                      <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <h3 className="text-sm font-semibold text-foreground mb-1">{t("company.noJobs")}</h3>
                      <p className="text-xs text-muted-foreground">{t("company.noJobsBody", { name: company.name })}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ─── TAB: PEOPLE ─── */}
              <TabsContent value="people" className="mt-0 space-y-6">
                {/* Key People (from JSON) */}
                {keyPeople && keyPeople.length > 0 && (
                  <Card className="border border-border">
                    <CardContent className="p-5 sm:p-6">
                      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        {t("company.leadership")}
                      </h2>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {keyPeople.map((person, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center shrink-0">
                              <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">{person.name.charAt(0)}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-sm text-foreground truncate">{person.name}</div>
                              <div className="text-xs text-muted-foreground truncate">{person.role}</div>
                              {person.category && (
                                <Badge variant="outline" className="text-[10px] rounded-full mt-1">{person.category}</Badge>
                              )}
                            </div>
                            {person.linkedIn && (
                              <a href={person.linkedIn} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                <Linkedin className="h-4 w-4 text-muted-foreground hover:text-primary" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Team Members (from people table) */}
                {teamMembers.length > 0 && (
                  <Card className="border border-border">
                    <CardContent className="p-5 sm:p-6">
                      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        {t("company.teamOn", { site: publication.name })}
                      </h2>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {teamMembers.map((member: any) => (
                          <Link key={member.id} href={`/people/${member.slug}`}>
                            <div className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors cursor-pointer">
                              {member.avatar ? (
                                <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                                  <span className="text-sm font-semibold text-muted-foreground">{member.name.charAt(0)}</span>
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-semibold text-sm text-foreground truncate">{member.name}</div>
                                <div className="text-xs text-muted-foreground truncate">{member.title}</div>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {!keyPeople?.length && teamMembers.length === 0 && (
                  <Card className="border border-border">
                    <CardContent className="p-8 text-center">
                      <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <h3 className="text-sm font-semibold text-foreground mb-1">{t("company.noTeam")}</h3>
                      <p className="text-xs text-muted-foreground">{t("company.noTeamBody", { name: company.name })}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ─── TAB: PRODUCTS ─── */}
              <TabsContent value="products" className="mt-0 space-y-6">
                {products.length > 0 ? (
                  <div className="space-y-4">
                    {products.map((product: any) => (
                      <Card key={product.id} className="border border-border">
                        <CardContent className="p-5 sm:p-6">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="text-base font-semibold text-foreground">{product.name}</h3>
                              {product.category && (
                                <Badge variant="secondary" className="text-xs rounded-full mt-1">{product.category}</Badge>
                              )}
                            </div>
                            {product.pricingModel && (
                              <Badge variant="outline" className="text-xs rounded-full">
                                {product.pricingModel}
                              </Badge>
                            )}
                          </div>
                          {product.description && (
                            <p className="text-sm text-muted-foreground leading-relaxed mb-3">{product.description}</p>
                          )}
                          {product.screenshots && (product.screenshots as string[]).length > 0 && (
                            <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
                              {(product.screenshots as string[]).map((ss: string, i: number) => (
                                <img key={i} src={ss} alt={t("company.screenshotAlt", { name: product.name, n: i + 1 })} className="h-32 rounded-lg border border-border object-cover shrink-0" />
                              ))}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {product.demoVideo && (
                              <a href={product.demoVideo} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-full">
                                  <Play className="h-3 w-3" />
                                  {t("company.watchDemo")}
                                </Button>
                              </a>
                            )}
                            {product.integrations && (product.integrations as string[]).map((intg: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-[10px] rounded-full">{intg}</Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="border border-border">
                    <CardContent className="p-8 text-center">
                      <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <h3 className="text-sm font-semibold text-foreground mb-1">{t("company.noProducts")}</h3>
                      <p className="text-xs text-muted-foreground">{t("company.noProductsBody", { name: company.name })}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ─── TAB: PRESS & RESOURCES ─── */}
              <TabsContent value="press" className="mt-0 space-y-6">
                {/* Press & PR */}
                <Card className="border border-border">
                  <CardContent className="p-5 sm:p-6">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      {t("company.pressPr")}
                    </h2>
                    {c.boilerplate && (
                      <div className="mb-4">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{t("company.boilerplate")}</div>
                        <p className="text-sm text-muted-foreground leading-relaxed bg-muted/30 rounded-lg p-3 border border-border">{c.boilerplate}</p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {c.mediaKit && (
                        <a href={c.mediaKit} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-full">
                            <Download className="h-3 w-3" />
                            {t("company.mediaKit")}
                          </Button>
                        </a>
                      )}
                      {c.logoPack && (
                        <a href={c.logoPack} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-full">
                            <Download className="h-3 w-3" />
                            {t("company.logoPack")}
                          </Button>
                        </a>
                      )}
                      {c.prContactEmail && (
                        <a href={`mailto:${c.prContactEmail}`}>
                          <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-full">
                            <Mail className="h-3 w-3" />
                            {t("company.prContact")}
                          </Button>
                        </a>
                      )}
                    </div>
                    {!c.boilerplate && !c.mediaKit && !c.logoPack && !c.prContactEmail && (
                      <p className="text-sm text-muted-foreground italic">{t("company.noPress")}</p>
                    )}
                  </CardContent>
                </Card>

                {/* Resources: Whitepapers & Case Studies */}
                {((whitepapers && whitepapers.length > 0) || (caseStudies && caseStudies.length > 0)) && (
                  <Card className="border border-border">
                    <CardContent className="p-5 sm:p-6">
                      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
                        <BookOpen className="h-5 w-5 text-muted-foreground" />
                        {t("company.resources")}
                      </h2>
                      {whitepapers && whitepapers.length > 0 && (
                        <div className="mb-4">
                          <h3 className="text-sm font-semibold text-foreground mb-2">{t("company.whitepapers")}</h3>
                          <div className="space-y-2">
                            {whitepapers.map((wp, i) => (
                              <a key={i} href={wp.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                                <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-foreground truncate">{wp.title}</div>
                                  {wp.description && <p className="text-xs text-muted-foreground truncate">{wp.description}</p>}
                                </div>
                                <Download className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      {caseStudies && caseStudies.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-foreground mb-2">{t("company.caseStudies")}</h3>
                          <div className="space-y-2">
                            {caseStudies.map((cs, i) => (
                              <a key={i} href={cs.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                                <GraduationCap className="h-4 w-4 text-emerald-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-foreground truncate">{cs.title}</div>
                                  {cs.client && <p className="text-xs text-muted-foreground">{t("company.clientLabel", { name: cs.client })}</p>}
                                </div>
                                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </div>

            {/* ═══════════ RIGHT SIDEBAR ═══════════ */}
            <div className="space-y-5">
              {/* Profile Strength */}
              <Card className="border border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("company.profileStrength")}</span>
                    <span className="text-sm font-bold text-foreground">{profileStrength}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        profileStrength >= 80 ? "bg-emerald-500" :
                        profileStrength >= 50 ? "bg-amber-500" :
                        "bg-red-500"
                      }`}
                      style={{ width: `${profileStrength}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1.5">
                    {profileStrength >= 80 ? t("company.strengthHigh") :
                     profileStrength >= 50 ? t("company.strengthMedium") :
                     t("company.strengthLow")}
                  </div>
                </CardContent>
              </Card>

              {/* MODULE 11: Social & Links */}
              {(company.website || company.linkedIn || company.twitter || c.facebook || c.instagram || c.youtube || company.email || company.phone) && (
                <Card className="border border-border">
                  <CardContent className="p-4">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("company.connect")}</h3>
                    <div className="space-y-2">
                      {company.website && (
                        <a href={company.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-sm text-foreground hover:text-primary transition-colors">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate">{company.website.replace(/^https?:\/\//, "")}</span>
                        </a>
                      )}
                      {company.linkedIn && (
                        <a href={company.linkedIn} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-sm text-foreground hover:text-primary transition-colors">
                          <Linkedin className="h-4 w-4 text-[#0A66C2]" />
                          <span>LinkedIn</span>
                        </a>
                      )}
                      {company.twitter && (
                        <a href={company.twitter} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-sm text-foreground hover:text-primary transition-colors">
                          <Twitter className="h-4 w-4 text-muted-foreground" />
                          <span>X / Twitter</span>
                        </a>
                      )}
                      {c.facebook && (
                        <a href={c.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-sm text-foreground hover:text-primary transition-colors">
                          <Facebook className="h-4 w-4 text-[#1877F2]" />
                          <span>Facebook</span>
                        </a>
                      )}
                      {c.instagram && (
                        <a href={c.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-sm text-foreground hover:text-primary transition-colors">
                          <Instagram className="h-4 w-4 text-[#E4405F]" />
                          <span>Instagram</span>
                        </a>
                      )}
                      {c.youtube && (
                        <a href={c.youtube} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-sm text-foreground hover:text-primary transition-colors">
                          <Youtube className="h-4 w-4 text-[#FF0000]" />
                          <span>YouTube</span>
                        </a>
                      )}
                      {company.email && (
                        <a href={`mailto:${company.email}`} className="flex items-center gap-2.5 text-sm text-foreground hover:text-primary transition-colors">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate">{company.email}</span>
                        </a>
                      )}
                      {company.phone && (
                        <a href={`tel:${company.phone}`} className="flex items-center gap-2.5 text-sm text-foreground hover:text-primary transition-colors">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{company.phone}</span>
                        </a>
                      )}
                    </div>
                    {/* App Store Links */}
                    {(c.appStoreLink || c.playStoreLink) && (
                      <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-2">
                        {c.appStoreLink && (
                          <a href={c.appStoreLink} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-full h-7">
                              App Store
                            </Button>
                          </a>
                        )}
                        {c.playStoreLink && (
                          <a href={c.playStoreLink} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-full h-7">
                              Play Store
                            </Button>
                          </a>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <SidebarAd slotKey="detail-sidebar-top" />

              {/* Claim Profile */}
              <Card className="border border-border bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                      <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">{t("company.isThisYours")}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t("company.claimPrompt")}
                      </p>
                    </div>
                  </div>
                  <ClaimProfileButton
                    entityType="company"
                    entityId={company.id}
                    entityName={company.name}
                    className="w-full"
                  />
                </CardContent>
              </Card>

              {/* Data Transparency */}
              <Card className="border border-border">
                <CardContent className="p-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t("company.dataTransparency")}</h3>
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>{t("company.lastUpdated")}</span>
                      <span className="text-foreground font-medium">{timeAgo(company.updatedAt, t)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{t("company.dataSource")}</span>
                      <Badge variant="outline" className="text-[10px] rounded-full capitalize">{dataSource}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{t("company.verification")}</span>
                      <Badge variant="outline" className="text-[10px] rounded-full capitalize">{verificationLevel}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <SidebarAd slotKey="detail-sidebar-bottom" />
            </div>
          </div>
        </Tabs>

        {/* MODULE 12: Similar Companies */}
        {similarCompanies.length > 0 && (
          <div className="mt-10">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
              <Layers className="h-5 w-5 text-muted-foreground" />
              {t("company.similar")}
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
              {similarCompanies.map((sim: any) => (
                <Link key={sim.id} href={`/companies/${sim.slug}`}>
                  <Card className="border border-border hover:border-primary/30 transition-colors cursor-pointer w-[220px] shrink-0">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-2">
                        {sim.logo ? (
                          <img src={sim.logo} alt={sim.name} className="w-10 h-10 rounded-lg object-contain bg-white border border-border p-1" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <span className="text-sm font-bold text-muted-foreground">{sim.name.charAt(0)}</span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground truncate">{sim.name}</div>
                          {sim.industry && <div className="text-[11px] text-muted-foreground truncate">{sim.industry}</div>}
                        </div>
                      </div>
                      {sim.tagline && <p className="text-xs text-muted-foreground line-clamp-2">{sim.tagline}</p>}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />
      <MobileStickyAd slotKey="mobile-sticky-bottom" />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}
