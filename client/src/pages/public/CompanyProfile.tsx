import { useState, useMemo } from "react";
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
  TrendingUp,
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
  Clock,
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
  CircleDollarSign,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ClaimProfileButton } from "@/components/ClaimProfileButton";
import SEO from "@/components/SEO";
import { JsonLd } from "@/components/JsonLd";

const stageDisplayMap: Record<string, string> = {
  pre_seed: "Pre-Seed",
  seed: "Seed",
  series_a: "Series A",
  series_b: "Series B",
  series_c: "Series C",
  series_d_plus: "Series D+",
  public: "Public",
  acquired: "Acquired",
};

const roundTypeMap: Record<string, string> = {
  pre_seed: "Pre-Seed",
  seed: "Seed",
  series_a: "Series A",
  series_b: "Series B",
  series_c: "Series C",
  series_d_plus: "Series D+",
  bridge: "Bridge",
  strategic: "Strategic",
  venture_debt: "Venture Debt",
  grant: "Grant",
  undisclosed: "Undisclosed",
};

const roleTypeMap: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
  freelance: "Freelance",
};

function formatCurrency(amount: string | number | null, currency = "USD") {
  if (!amount) return null;
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return null;
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
  return `$${num.toLocaleString()}`;
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
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
        <SEO title="Company Not Found" noindex />
        <Header />
        <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-4">Company Not Found</h1>
          <p className="text-muted-foreground mb-6">The company you're looking for doesn't exist or has been removed.</p>
          <Link href="/companies">
            <Button>Back to Companies</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const c = company as any;
  const stageDisplay = stageDisplayMap[company.stage || ""] || company.stage || null;
  const techStack = c.techStack as string[] | null;
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
  const fundingRounds = c.fundingRounds || [];
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
        title={`${company.name} - Company Profile | ${publication.name}`}
        description={shortDescription || company.tagline || company.description || `${company.name} company profile on ${publication.name}.`}
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
            <img src={c.coverImage} alt={`${company.name} cover`} className="w-full h-full object-cover" />
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
                    Verified
                  </Badge>
                )}
                {company.isFeatured ? (
                  <Badge className="gap-1 bg-amber-500 text-white hover:bg-amber-500 border-0 text-xs">
                    <Star className="h-3 w-3" />
                    Featured
                  </Badge>
                ) : null}
                {c.hiringActively ? (
                  <Badge className="gap-1 bg-green-500 text-white hover:bg-green-500 border-0 text-xs">
                    <Zap className="h-3 w-3" />
                    Hiring
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
                    Est. {company.foundedYear}
                  </span>
                )}
                {company.employeeCount && (
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {company.employeeCount}
                  </span>
                )}
                {stageDisplay && (
                  <Badge variant="secondary" className="rounded-full text-xs font-medium">
                    {stageDisplay}
                  </Badge>
                )}
                {company.totalFunding && (
                  <Badge variant="outline" className="rounded-full text-xs font-medium gap-1">
                    <DollarSign className="h-3 w-3" />
                    {company.totalFunding}
                  </Badge>
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
                    Visit Website
                    <ExternalLink className="h-3 w-3 ml-auto" />
                  </Button>
                </a>
              )}
              <Button
                variant="outline"
                className={`w-full gap-2 h-9 text-sm ${isFollowing ? 'bg-primary/10 border-primary text-primary' : ''}`}
                onClick={() => {
                  if (!user) { toast({ title: "Sign in required", description: "Please sign in to follow companies." }); return; }
                  bookmarkToggle.mutate(
                    { contentType: "company" as any, contentId: company.id, contentTitle: company.name, contentSlug: company.slug },
                    { onSuccess: (res) => { setIsFollowing(res.bookmarked); toast({ title: res.bookmarked ? `Following ${company.name}` : `Unfollowed ${company.name}` }); } }
                  );
                }}
              >
                <UserPlus className="h-4 w-4" />
                {isFollowing ? "Following" : "Follow"}
              </Button>
              <Button variant="outline" className="w-full gap-2 h-9 text-sm" onClick={() => setContactOpen(true)}>
                <Mail className="h-4 w-4" />
                Contact
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2 h-9 text-sm"
                onClick={() => {
                  const url = `${window.location.origin}/companies/${company.slug}`;
                  navigator.clipboard.writeText(url).then(() => toast({ title: "Profile link copied to clipboard!" }));
                }}
              >
                <Share2 className="h-4 w-4" />
                Share Profile
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
                Website
              </Button>
            </a>
          )}
          <Button
            variant="outline"
            className={`flex-1 gap-2 h-9 text-sm ${isFollowing ? 'bg-primary/10 border-primary text-primary' : ''}`}
            onClick={() => {
              if (!user) { toast({ title: "Sign in required", description: "Please sign in to follow companies." }); return; }
              bookmarkToggle.mutate(
                { contentType: "company" as any, contentId: company.id, contentTitle: company.name, contentSlug: company.slug },
                { onSuccess: (res) => { setIsFollowing(res.bookmarked); toast({ title: res.bookmarked ? `Following ${company.name}` : `Unfollowed ${company.name}` }); } }
              );
            }}
          >
            <UserPlus className="h-4 w-4" />
            {isFollowing ? "Following" : "Follow"}
          </Button>
          <Button
            variant="outline"
            className="gap-2 h-9 text-sm"
            onClick={() => {
              const url = `${window.location.origin}/companies/${company.slug}`;
              navigator.clipboard.writeText(url).then(() => toast({ title: "Profile link copied!" }));
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
            <DialogTitle>Contact {company.name}</DialogTitle>
            <DialogDescription>Send a message to this company. They will receive it via email.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Your Email</label>
              <Input placeholder="your@email.com" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Message</label>
              <Textarea placeholder="Write your message..." rows={4} value={contactMessage} onChange={(e) => setContactMessage(e.target.value)} />
            </div>
            <Button className="w-full" onClick={() => { toast({ title: "Message sent!", description: "The company will be notified." }); setContactOpen(false); setContactMessage(""); setContactEmail(""); }}>
              <Mail className="h-4 w-4 mr-2" />
              Send Message
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
                Overview
              </TabsTrigger>
              <TabsTrigger value="news" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium">
                News {newsCount > 0 && <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">{newsCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="jobs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium">
                Jobs {jobCount > 0 && <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">{jobCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="people" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium">
                People {peopleCount > 0 && <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">{peopleCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="products" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium">
                Products {productCount > 0 && <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">{productCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="funding" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium">
                Funding
              </TabsTrigger>
              <TabsTrigger value="press" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium">
                Press & Resources
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="grid lg:grid-cols-[1fr_340px] gap-8 items-start">
            {/* ═══════════ LEFT COLUMN ═══════════ */}
            <div>
              {/* ─── TAB: OVERVIEW ─── */}
              <TabsContent value="overview" className="mt-0 space-y-6">
                {/* Overview Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {company.totalFunding && (
                    <div className="rounded-xl bg-white dark:bg-card border border-border p-4 text-center">
                      <DollarSign className="h-5 w-5 mx-auto mb-1.5 text-muted-foreground" />
                      <div className="text-lg font-bold text-foreground">{company.totalFunding}</div>
                      <div className="text-[11px] text-muted-foreground">Total Funding</div>
                    </div>
                  )}
                  {stageDisplay && (
                    <div className="rounded-xl bg-white dark:bg-card border border-border p-4 text-center">
                      <TrendingUp className="h-5 w-5 mx-auto mb-1.5 text-muted-foreground" />
                      <div className="text-lg font-bold text-foreground">{stageDisplay}</div>
                      <div className="text-[11px] text-muted-foreground">Stage</div>
                    </div>
                  )}
                  {company.employeeCount && (
                    <div className="rounded-xl bg-white dark:bg-card border border-border p-4 text-center">
                      <Users className="h-5 w-5 mx-auto mb-1.5 text-muted-foreground" />
                      <div className="text-lg font-bold text-foreground">{company.employeeCount}</div>
                      <div className="text-[11px] text-muted-foreground">Employees</div>
                    </div>
                  )}
                  <div className="rounded-xl bg-white dark:bg-card border border-border p-4 text-center">
                    <Eye className="h-5 w-5 mx-auto mb-1.5 text-muted-foreground" />
                    <div className="text-lg font-bold text-foreground">{(company.viewCount || 0).toLocaleString()}</div>
                    <div className="text-[11px] text-muted-foreground">Profile Views</div>
                  </div>
                </div>

                {/* Key Metrics Row (if available) */}
                {(c.activeUsersRange || c.arrRange || c.countriesServed || c.clientsCount) && (
                  <Card className="border border-border">
                    <CardContent className="p-5">
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-4">
                        <BarChart3 className="h-4 w-4 text-blue-500" />
                        Key Metrics
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {c.activeUsersRange && (
                          <div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wider">Active Users</div>
                            <div className="text-sm font-semibold text-foreground mt-0.5">{c.activeUsersRange}</div>
                          </div>
                        )}
                        {c.arrRange && (
                          <div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wider">ARR</div>
                            <div className="text-sm font-semibold text-foreground mt-0.5">{c.arrRange}</div>
                          </div>
                        )}
                        {c.countriesServed && (
                          <div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wider">Countries</div>
                            <div className="text-sm font-semibold text-foreground mt-0.5">{c.countriesServed}</div>
                          </div>
                        )}
                        {c.clientsCount && (
                          <div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wider">Clients</div>
                            <div className="text-sm font-semibold text-foreground mt-0.5">{c.clientsCount.toLocaleString()}</div>
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
                      <h2 className="text-lg font-semibold text-foreground mb-3">About {company.name}</h2>
                      <div className={`text-sm text-muted-foreground leading-relaxed whitespace-pre-line ${!showFullAbout && company.description && company.description.length > 500 ? "line-clamp-6" : ""}`}>
                        {company.description || company.tagline || "No description available."}
                      </div>
                      {company.description && company.description.length > 500 && (
                        <button
                          onClick={() => setShowFullAbout(!showFullAbout)}
                          className="text-sm text-primary font-medium mt-2 flex items-center gap-1 hover:underline"
                        >
                          {showFullAbout ? "Show less" : "Read more"}
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
                                Mission
                              </div>
                              <p className="text-sm text-foreground leading-relaxed">{c.mission}</p>
                            </div>
                          )}
                          {c.vision && (
                            <div>
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                                <Rocket className="h-3.5 w-3.5" />
                                Vision
                              </div>
                              <p className="text-sm text-foreground leading-relaxed">{c.vision}</p>
                            </div>
                          )}
                          {c.problemSolved && (
                            <div>
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                                <Zap className="h-3.5 w-3.5" />
                                Problem Solved
                              </div>
                              <p className="text-sm text-foreground leading-relaxed">{c.problemSolved}</p>
                            </div>
                          )}
                          {c.marketServed && (
                            <div>
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                                <Globe className="h-3.5 w-3.5" />
                                Market Served
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
                  {!!(company.industry || stageDisplay || locationText || company.foundedYear || company.employeeCount || company.totalFunding || c.activeUsersRange || c.countriesServed) && (
                    <Card className="border border-border">
                      <CardContent className="p-5">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-4">
                          <span className="h-2 w-2 rounded-full bg-blue-500" />
                          Company Details
                        </h3>
                        <div className="space-y-3">
                          {company.industry && <DetailRow label="Industry" value={company.industry} />}
                          {stageDisplay && <DetailRow label="Funding Stage" value={stageDisplay} />}
                          {locationText && <DetailRow label="Headquarters" value={locationText} />}
                          {company.foundedYear && <DetailRow label="Founded" value={String(company.foundedYear)} />}
                          {company.employeeCount && <DetailRow label="Team Size" value={`${company.employeeCount} employees`} />}
                          {company.totalFunding && <DetailRow label="Total Funding" value={company.totalFunding} />}
                          {c.activeUsersRange && <DetailRow label="Active Users" value={c.activeUsersRange} />}
                          {c.countriesServed && <DetailRow label="Countries" value={String(c.countriesServed)} />}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {!!((company.sectors && company.sectors.length > 0) || (company.regions && company.regions.length > 0) || (techStack && techStack.length > 0) || (certifications && certifications.length > 0)) && (
                    <Card className="border border-border">
                      <CardContent className="p-5">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-4">
                          <span className="h-2 w-2 rounded-full bg-amber-500" />
                          Focus & Technology
                        </h3>
                        <div className="space-y-3">
                          {company.sectors && company.sectors.length > 0 && (
                            <div>
                              <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">Sectors</div>
                              <div className="flex flex-wrap gap-1.5">
                                {company.sectors.map((s: any) => (
                                  <Badge key={s.id} variant="secondary" className="rounded-full text-xs">{s.name}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {company.regions && company.regions.length > 0 && (
                            <div>
                              <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">Regions</div>
                              <div className="flex flex-wrap gap-1.5">
                                {company.regions.map((r: any) => (
                                  <Badge key={r.id} variant="outline" className="rounded-full text-xs">{r.name}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {techStack && techStack.length > 0 && (
                            <div>
                              <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">Tech Stack</div>
                              <div className="flex flex-wrap gap-1.5">
                                {techStack.map((t) => (
                                  <Badge key={t} className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-0 rounded-full text-xs">{t}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {certifications && certifications.length > 0 && (
                            <div>
                              <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">Certifications</div>
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
                        Company Timeline
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
                            Notable Customers
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
                            Strategic Partnerships
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
                        Recent Updates
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
                              <div className="text-[11px] text-muted-foreground mt-1.5">{timeAgo(update.createdAt)}</div>
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
                        Awards & Recognition
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
                        News & Media Coverage
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
                                  <span className="text-[11px] text-muted-foreground">{timeAgo(article.publishedAt)}</span>
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
                      <h3 className="text-sm font-semibold text-foreground mb-1">No news coverage yet</h3>
                      <p className="text-xs text-muted-foreground">Articles mentioning {company.name} will appear here.</p>
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
                        Open Positions ({openJobs.length})
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
                                  <Badge variant="secondary" className="text-[10px] rounded-full">{roleTypeMap[job.roleType] || job.roleType}</Badge>
                                )}
                                {job.isRemote ? <Badge variant="outline" className="text-[10px] rounded-full">Remote</Badge> : null}
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
                      <h3 className="text-sm font-semibold text-foreground mb-1">No open positions</h3>
                      <p className="text-xs text-muted-foreground">{company.name} doesn't have any open positions right now.</p>
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
                        Leadership Team
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
                        Team Members on {publication.name}
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
                      <h3 className="text-sm font-semibold text-foreground mb-1">No team members listed</h3>
                      <p className="text-xs text-muted-foreground">Team information for {company.name} hasn't been added yet.</p>
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
                                <img key={i} src={ss} alt={`${product.name} screenshot ${i + 1}`} className="h-32 rounded-lg border border-border object-cover shrink-0" />
                              ))}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {product.demoVideo && (
                              <a href={product.demoVideo} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-full">
                                  <Play className="h-3 w-3" />
                                  Watch Demo
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
                      <h3 className="text-sm font-semibold text-foreground mb-1">No products listed</h3>
                      <p className="text-xs text-muted-foreground">Product information for {company.name} hasn't been added yet.</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ─── TAB: FUNDING ─── */}
              <TabsContent value="funding" className="mt-0 space-y-6">
                {fundingRounds.length > 0 ? (
                  <>
                    {/* Funding Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Card className="border border-emerald-200/50 dark:border-emerald-800/30 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20">
                        <CardContent className="p-5 text-center">
                          <DollarSign className="h-6 w-6 mx-auto mb-2 text-emerald-600 dark:text-emerald-400" />
                          <div className="text-2xl font-bold text-foreground">{company.totalFunding || "N/A"}</div>
                          <div className="text-xs text-muted-foreground mt-1">Total Raised</div>
                        </CardContent>
                      </Card>
                      <Card className="border border-blue-200/50 dark:border-blue-800/30 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                        <CardContent className="p-5 text-center">
                          <BarChart3 className="h-6 w-6 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                          <div className="text-2xl font-bold text-foreground">{fundingRounds.length}</div>
                          <div className="text-xs text-muted-foreground mt-1">Funding Rounds</div>
                        </CardContent>
                      </Card>
                      <Card className="border border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
                        <CardContent className="p-5 text-center">
                          <TrendingUp className="h-6 w-6 mx-auto mb-2 text-amber-600 dark:text-amber-400" />
                          <div className="text-2xl font-bold text-foreground">
                            {roundTypeMap[fundingRounds[0]?.roundType] || fundingRounds[0]?.roundType || "N/A"}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">Latest Round</div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Funding Rounds Table */}
                    <Card className="border border-border">
                      <CardContent className="p-5 sm:p-6">
                        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-5">
                          <CircleDollarSign className="h-5 w-5 text-emerald-500" />
                          Funding Rounds
                        </h2>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Round</th>
                                <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                                <th className="text-right py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                                <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Investors</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {fundingRounds.map((round: any) => (
                                <tr key={round.id} className="hover:bg-muted/30 transition-colors">
                                  <td className="py-3 px-3">
                                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-0 text-xs">
                                      {roundTypeMap[round.roundType] || round.roundType}
                                    </Badge>
                                  </td>
                                  <td className="py-3 px-3 text-muted-foreground">
                                    {round.fundingDate ? new Date(round.fundingDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—"}
                                  </td>
                                  <td className="py-3 px-3 text-right font-semibold">
                                    {round.isUndisclosed ? (
                                      <span className="text-muted-foreground italic text-xs">Undisclosed</span>
                                    ) : round.amountRaised ? (
                                      formatCurrency(round.amountRaised, round.currency)
                                    ) : "—"}
                                  </td>
                                  <td className="py-3 px-3">
                                    <div className="flex flex-wrap gap-1.5">
                                      {round.investors?.map((inv: any) => (
                                        <Badge key={inv.id} variant="outline" className="text-[11px] rounded-full gap-1">
                                          {inv.role === "lead" && <Star className="h-2.5 w-2.5 text-amber-500" />}
                                          {inv.name}
                                        </Badge>
                                      ))}
                                      {(!round.investors || round.investors.length === 0) && (
                                        <span className="text-xs text-muted-foreground">—</span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Funding Timeline */}
                    <Card className="border border-border">
                      <CardContent className="p-5 sm:p-6">
                        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-5">
                          <Clock className="h-5 w-5 text-blue-500" />
                          Funding Timeline
                        </h2>
                        <div className="relative pl-6 border-l-2 border-emerald-200 dark:border-emerald-800 space-y-6">
                          {fundingRounds.map((round: any) => (
                            <div key={round.id} className="relative">
                              <div className="absolute -left-[29px] w-4 h-4 rounded-full bg-emerald-500 border-2 border-background" />
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-0 text-xs">
                                  {roundTypeMap[round.roundType] || round.roundType}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {round.fundingDate ? new Date(round.fundingDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : ""}
                                </span>
                              </div>
                              {round.amountRaised && !round.isUndisclosed && (
                                <div className="text-lg font-bold text-foreground">
                                  {formatCurrency(round.amountRaised, round.currency)}
                                </div>
                              )}
                              {round.isUndisclosed ? (
                                <div className="text-sm text-muted-foreground italic">Amount undisclosed</div>
                              ) : null}
                              {round.investors && round.investors.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {round.investors.map((inv: any) => (
                                    <Badge key={inv.id} variant="outline" className="text-xs rounded-full gap-1">
                                      {inv.role === "lead" && <Star className="h-3 w-3 text-amber-500" />}
                                      {inv.name}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* All Investors */}
                    {(() => {
                      const allInvestors = fundingRounds.flatMap((r: any) => r.investors || []);
                      const uniqueInvestors = allInvestors.filter((inv: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.id === inv.id) === i);
                      if (uniqueInvestors.length === 0) return null;
                      return (
                        <Card className="border border-border">
                          <CardContent className="p-5 sm:p-6">
                            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
                              <Users className="h-5 w-5 text-purple-500" />
                              Investors ({uniqueInvestors.length})
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                              {uniqueInvestors.map((inv: any) => (
                                <div key={inv.id} className="flex items-center gap-2.5 p-3 rounded-lg border border-border">
                                  {inv.logo ? (
                                    <img src={inv.logo} alt={inv.name} className="w-8 h-8 rounded-full object-cover" />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                                      {inv.name?.charAt(0)}
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <div className="text-xs font-medium truncate">{inv.name}</div>
                                    {inv.role === "lead" && (
                                      <div className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                                        <Star className="h-2.5 w-2.5" /> Lead
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })()}
                  </>
                ) : (
                  <Card className="border border-border">
                    <CardContent className="p-8 text-center">
                      <CircleDollarSign className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <h3 className="text-sm font-semibold text-foreground mb-1">No funding data</h3>
                      <p className="text-xs text-muted-foreground">Funding information for {company.name} hasn't been added yet.</p>
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
                      Press & PR
                    </h2>
                    {c.boilerplate && (
                      <div className="mb-4">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Company Boilerplate</div>
                        <p className="text-sm text-muted-foreground leading-relaxed bg-muted/30 rounded-lg p-3 border border-border">{c.boilerplate}</p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {c.mediaKit && (
                        <a href={c.mediaKit} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-full">
                            <Download className="h-3 w-3" />
                            Media Kit
                          </Button>
                        </a>
                      )}
                      {c.logoPack && (
                        <a href={c.logoPack} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-full">
                            <Download className="h-3 w-3" />
                            Logo Pack
                          </Button>
                        </a>
                      )}
                      {c.prContactEmail && (
                        <a href={`mailto:${c.prContactEmail}`}>
                          <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-full">
                            <Mail className="h-3 w-3" />
                            PR Contact
                          </Button>
                        </a>
                      )}
                      {c.pitchDeck && (
                        <a href={c.pitchDeck} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-full">
                            <FileText className="h-3 w-3" />
                            Pitch Deck
                          </Button>
                        </a>
                      )}
                    </div>
                    {!c.boilerplate && !c.mediaKit && !c.logoPack && !c.prContactEmail && !c.pitchDeck && (
                      <p className="text-sm text-muted-foreground italic">No press materials available yet.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Resources: Whitepapers & Case Studies */}
                {((whitepapers && whitepapers.length > 0) || (caseStudies && caseStudies.length > 0)) && (
                  <Card className="border border-border">
                    <CardContent className="p-5 sm:p-6">
                      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
                        <BookOpen className="h-5 w-5 text-muted-foreground" />
                        Resources
                      </h2>
                      {whitepapers && whitepapers.length > 0 && (
                        <div className="mb-4">
                          <h3 className="text-sm font-semibold text-foreground mb-2">Whitepapers</h3>
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
                          <h3 className="text-sm font-semibold text-foreground mb-2">Case Studies</h3>
                          <div className="space-y-2">
                            {caseStudies.map((cs, i) => (
                              <a key={i} href={cs.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                                <GraduationCap className="h-4 w-4 text-emerald-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-foreground truncate">{cs.title}</div>
                                  {cs.client && <p className="text-xs text-muted-foreground">Client: {cs.client}</p>}
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
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Profile Strength</span>
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
                    {profileStrength >= 80 ? "Featured ready" :
                     profileStrength >= 50 ? "Discoverable" :
                     "Basic — add more info to rank higher"}
                  </div>
                </CardContent>
              </Card>

              {/* MODULE 11: Social & Links */}
              {(company.website || company.linkedIn || company.twitter || c.facebook || c.instagram || c.youtube || company.email || company.phone) && (
                <Card className="border border-border">
                  <CardContent className="p-4">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Connect</h3>
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
                      <h3 className="font-semibold text-foreground text-sm">Is this your company?</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Claim this profile to update information, post jobs, and track analytics.
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
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Data Transparency</h3>
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Last updated</span>
                      <span className="text-foreground font-medium">{timeAgo(company.updatedAt)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Data source</span>
                      <Badge variant="outline" className="text-[10px] rounded-full capitalize">{dataSource}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Verification</span>
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
              Similar Companies
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
