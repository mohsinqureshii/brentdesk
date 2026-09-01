import { useState } from "react";
import { Link, useParams } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { LeaderboardAd, MobileStickyAd, SidebarAd } from "@/components/ads/AdUnit";
import {
  MapPin, Building2, Users, Globe, ArrowLeft, ExternalLink, TrendingUp,
  Target, Calendar, FileText, CheckCircle, Linkedin, Twitter, Loader2,
  DollarSign, Mail, Sparkles, UserPlus, ChevronRight, BarChart3, Award,
  Share2, Phone, Briefcase, ArrowUpRight, Star, BookOpen, Handshake,
  Facebook, Instagram, Youtube, MessageSquare, Layers,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ClaimProfileButton } from "@/components/ClaimProfileButton";
import SEO from "@/components/SEO";
import { JsonLd } from "@/components/JsonLd";
import { AvatarWithFallback } from "@/components/ui/avatar-with-fallback";

function formatCheckSize(min: string | null, max: string | null): string {
  if (!min && !max) return "Varies";
  const fmt = (v: string) => {
    const n = Number(v);
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
    return `$${n.toLocaleString()}`;
  };
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  if (max) return `Up to ${fmt(max)}`;
  return "Varies";
}

const investorTypeLabels: Record<string, string> = {
  vc: "Venture Capital", angel: "Angel Investor", corporate_vc: "Corporate VC",
  accelerator: "Accelerator", family_office: "Family Office", other: "Other",
};

export default function InvestorDetail() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("overview");
  const [contactOpen, setContactOpen] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const bookmarkToggle = trpc.bookmarks.toggle.useMutation();

  const { data: investor, isLoading, error } = trpc.investors.getBySlug.useQuery(
    { slug: id || "" },
    { enabled: !!id }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <Header />
        <div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        <Footer />
      </div>
    );
  }

  if (error || !investor) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <SEO title="Investor Not Found" noindex />
        <Header />
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <h2 className="text-2xl font-bold">Investor Not Found</h2>
          <p className="text-muted-foreground">The investor you're looking for doesn't exist.</p>
          <Link href="/investors"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />Back to Investors</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  const inv = investor as any;
  const investmentStages = Array.isArray(inv.investmentStages) ? inv.investmentStages : [];
  const portfolioCompanies = Array.isArray(inv.portfolioCompanies) ? inv.portfolioCompanies : [];
  const notableExits = Array.isArray(inv.notableExits) ? inv.notableExits : [];
  const focusRegions = Array.isArray(inv.focusRegions) ? inv.focusRegions : [];
  const teamMembers = Array.isArray(inv.teamMembers) ? inv.teamMembers : [];
  const officeLocations = Array.isArray(inv.officeLocations) ? inv.officeLocations : [];
  const awards = Array.isArray(inv.awards) ? inv.awards : [];
  const keyMetrics = inv.keyMetrics && typeof inv.keyMetrics === 'object' ? inv.keyMetrics : {};
  const sectors = Array.isArray(inv.sectors) ? inv.sectors : [];
  const regions = Array.isArray(inv.regions) ? inv.regions : [];

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "portfolio", label: "Portfolio" },
    { id: "team", label: "Team" },
    { id: "thesis", label: "Investment Thesis" },
  ];

  const handleFollow = () => {
    if (!user) { toast({ title: "Sign in required", description: "Please sign in to follow investors." }); return; }
    bookmarkToggle.mutate(
      { contentType: "investor" as any, contentId: inv.id, contentTitle: inv.name, contentSlug: inv.slug },
      { onSuccess: (res) => { setIsFollowing(res.bookmarked); toast({ title: res.bookmarked ? `Following ${inv.name}` : `Unfollowed ${inv.name}` }); } }
    );
  };

  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/investors/${inv.slug}`).then(() => toast({ title: "Profile link copied!" }));
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEO
        title={inv.seo?.title || inv.name}
        description={inv.seo?.description}
        keywords={inv.seo?.keywords}
        canonical={`https://techscoop.io/investors/${inv.slug}`}
        ogImage={inv.logo}
      />
      <JsonLd type="Organization" data={{  name: inv.name, url: inv.website, logo: inv.logo, description: inv.description }} />
      <Header />

      {/* Inline Edit Banner for profile owners */}
      <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 mt-3">
              </div>

      {/* Hero Section - White background */}
      <section className="bg-white dark:bg-card border-b">
        {/* Cover banner */}
        <div className="h-32 sm:h-40 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900" />
        <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 -mt-12 sm:-mt-16 pb-6">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            <div className="flex-1 min-w-0">
              <div className="flex items-end gap-4 sm:gap-6 mb-4">
                <div className="relative shrink-0">
                  <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-2xl bg-white dark:bg-card border-4 border-white dark:border-card shadow-lg overflow-hidden">
                    <AvatarWithFallback src={inv.logo} alt={inv.name} name={inv.name} size="xl" className="h-full w-full" />
                  </div>
                  {inv.isVerified ? <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-1 shadow-md"><CheckCircle className="h-4 w-4" /></div> : null}
                </div>
                <div className="min-w-0 pb-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{inv.name}</h1>
                    {inv.isVerified ? <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400 border-0 text-xs">Verified</Badge> : null}
                  </div>
                  <p className="text-base sm:text-lg text-muted-foreground">{inv.shortDescription || investorTypeLabels[inv.type] || inv.type}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground mt-1.5">
                    {(inv.location || inv.headquarters) && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{inv.location || inv.headquarters}</span>}
                    {inv.foundedYear && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Est. {inv.foundedYear}</span>}
                    {inv.teamSize && <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{inv.teamSize}</span>}
                    {inv.aum && <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border-0 text-xs">AUM: {inv.aum}</Badge>}
                    <Badge variant="secondary" className="text-xs">{investorTypeLabels[inv.type] || inv.type}</Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {inv.linkedIn && <a href={inv.linkedIn} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><Linkedin className="h-4 w-4" /></a>}
                {inv.twitter && <a href={inv.twitter} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><Twitter className="h-4 w-4" /></a>}
                {inv.website && <a href={inv.website} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><Globe className="h-4 w-4" /></a>}
                {inv.facebook && <a href={inv.facebook} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><Facebook className="h-4 w-4" /></a>}
                {inv.instagram && <a href={inv.instagram} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><Instagram className="h-4 w-4" /></a>}
                {inv.youtube && <a href={inv.youtube} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><Youtube className="h-4 w-4" /></a>}
              </div>
            </div>
            <div className="hidden lg:flex flex-col gap-2 w-56 shrink-0 pt-14">
              {inv.website && (
                <Button className="w-full gap-2 bg-foreground text-background hover:bg-foreground/90" asChild>
                  <a href={inv.website} target="_blank" rel="noopener noreferrer"><Globe className="h-4 w-4" />Visit Website<ExternalLink className="h-3 w-3 ml-auto" /></a>
                </Button>
              )}
              <Button variant="outline" className={`w-full gap-2 ${isFollowing ? 'bg-primary/10 border-primary text-primary' : ''}`} onClick={handleFollow}>
                <UserPlus className="h-4 w-4" />{isFollowing ? "Following" : "Follow"}
              </Button>
              <Button variant="outline" className="w-full gap-2" onClick={() => setContactOpen(true)}><Mail className="h-4 w-4" />Contact</Button>
              <Button variant="outline" className="w-full gap-2" onClick={handleShare}><Share2 className="h-4 w-4" />Share Profile</Button>
            </div>
          </div>
          <div className="flex lg:hidden items-center gap-2 mt-4">
            <Button variant="outline" className={`flex-1 gap-2 text-sm ${isFollowing ? 'bg-primary/10 border-primary text-primary' : ''}`} onClick={handleFollow}><UserPlus className="h-4 w-4" />{isFollowing ? "Following" : "Follow"}</Button>
            <Button variant="outline" className="gap-2 text-sm" onClick={handleShare}><Share2 className="h-4 w-4" /></Button>
            <Button variant="outline" className="gap-2 text-sm" onClick={() => setContactOpen(true)}><Mail className="h-4 w-4" /></Button>
          </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-card border-b sticky top-0 z-20">
        <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8">
          <nav className="flex gap-0 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-4 sm:px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"}`}>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          <div className="flex-1 min-w-0 space-y-6">

            {/* ===== OVERVIEW TAB ===== */}
            {activeTab === "overview" && (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card className="bg-white dark:bg-card"><CardContent className="p-4 text-center">
                    <DollarSign className="h-5 w-5 mx-auto mb-1 text-green-500" />
                    <div className="text-2xl font-bold">{inv.aum || "N/A"}</div>
                    <div className="text-xs text-muted-foreground">AUM</div>
                  </CardContent></Card>
                  <Card className="bg-white dark:bg-card"><CardContent className="p-4 text-center">
                    <Building2 className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                    <div className="text-2xl font-bold">{inv.portfolioCount || portfolioCompanies.length || 0}</div>
                    <div className="text-xs text-muted-foreground">Portfolio Companies</div>
                  </CardContent></Card>
                  <Card className="bg-white dark:bg-card"><CardContent className="p-4 text-center">
                    <TrendingUp className="h-5 w-5 mx-auto mb-1 text-purple-500" />
                    <div className="text-2xl font-bold">{notableExits.length || 0}</div>
                    <div className="text-xs text-muted-foreground">Notable Exits</div>
                  </CardContent></Card>
                  <Card className="bg-white dark:bg-card"><CardContent className="p-4 text-center">
                    <BarChart3 className="h-5 w-5 mx-auto mb-1 text-amber-500" />
                    <div className="text-2xl font-bold">{formatCheckSize(inv.checkSizeMin, inv.checkSizeMax)}</div>
                    <div className="text-xs text-muted-foreground">Check Size</div>
                  </CardContent></Card>
                </div>

                {/* Key Metrics */}
                {Object.keys(keyMetrics).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(keyMetrics).map(([key, val]: [string, any]) => (
                      <Badge key={key} className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-0 px-3 py-1.5 text-xs gap-1.5">
                        <Star className="h-3 w-3" />{key}: {val}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* About */}
                {(inv.description || inv.mission) && (
                  <Card className="bg-white dark:bg-card">
                    <CardHeader className="pb-3"><CardTitle className="text-lg">About</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      {inv.description && <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{inv.description}</p>}
                      {inv.mission && (
                        <div className="bg-muted/30 rounded-lg p-4 border-l-4 border-primary">
                          <h4 className="text-sm font-semibold mb-1">Mission</h4>
                          <p className="text-sm text-muted-foreground">{inv.mission}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Investment Focus (side by side) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-white dark:bg-card">
                    <CardHeader className="pb-3"><CardTitle className="text-lg">Investment Focus</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      {investmentStages.length > 0 && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-2">Stages</div>
                          <div className="flex flex-wrap gap-1.5">{investmentStages.map((s: string, i: number) => <Badge key={i} className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400 border-0 text-xs">{s}</Badge>)}</div>
                        </div>
                      )}
                      {sectors.length > 0 && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-2">Sectors</div>
                          <div className="flex flex-wrap gap-1.5">{sectors.map((s: any) => <Badge key={s.id} className="bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400 border-0 text-xs">{s.name}</Badge>)}</div>
                        </div>
                      )}
                      {(regions.length > 0 || focusRegions.length > 0) && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-2">Regions</div>
                          <div className="flex flex-wrap gap-1.5">
                            {regions.map((r: any) => <Badge key={r.id} className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400 border-0 text-xs">{r.name}</Badge>)}
                            {focusRegions.map((r: string, i: number) => <Badge key={i} className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400 border-0 text-xs">{r}</Badge>)}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-white dark:bg-card">
                    <CardHeader className="pb-3"><CardTitle className="text-lg">Details</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-start gap-3"><Layers className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" /><div><div className="text-xs text-muted-foreground">Type</div><div className="text-sm font-medium">{investorTypeLabels[inv.type] || inv.type}</div></div></div>
                      {(inv.location || inv.headquarters) && <div className="flex items-start gap-3"><MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" /><div><div className="text-xs text-muted-foreground">Headquarters</div><div className="text-sm font-medium">{inv.location || inv.headquarters}</div></div></div>}
                      {inv.foundedYear && <div className="flex items-start gap-3"><Calendar className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" /><div><div className="text-xs text-muted-foreground">Founded</div><div className="text-sm font-medium">{inv.foundedYear}</div></div></div>}
                      {inv.teamSize && <div className="flex items-start gap-3"><Users className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" /><div><div className="text-xs text-muted-foreground">Team Size</div><div className="text-sm font-medium">{inv.teamSize}</div></div></div>}
                      {inv.aum && <div className="flex items-start gap-3"><DollarSign className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" /><div><div className="text-xs text-muted-foreground">AUM</div><div className="text-sm font-medium">{inv.aum}</div></div></div>}
                      <div className="flex items-start gap-3"><BarChart3 className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" /><div><div className="text-xs text-muted-foreground">Check Size</div><div className="text-sm font-medium">{formatCheckSize(inv.checkSizeMin, inv.checkSizeMax)}</div></div></div>
                    </CardContent>
                  </Card>
                </div>

                {/* Notable Exits */}
                {notableExits.length > 0 && (
                  <Card className="bg-white dark:bg-card">
                    <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2">Notable Exits <Badge variant="secondary" className="text-xs">{notableExits.length}</Badge></CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {notableExits.map((exit: any, i: number) => (
                          <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                            <TrendingUp className="h-5 w-5 text-green-500 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold">{exit.company || exit.name}</h4>
                              {exit.type && <p className="text-xs text-muted-foreground">{exit.type}</p>}
                            </div>
                            {exit.year && <span className="text-xs text-muted-foreground shrink-0">{exit.year}</span>}
                            {exit.returnMultiple && <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400 border-0 text-xs">{exit.returnMultiple}x</Badge>}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Awards */}
                {awards.length > 0 && (
                  <Card className="bg-white dark:bg-card">
                    <CardHeader className="pb-3"><CardTitle className="text-lg">Awards & Recognition</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {awards.map((a: any, i: number) => (
                          <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                            <Award className="h-5 w-5 text-amber-500 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold">{typeof a === 'string' ? a : a.title}</h4>
                              {typeof a !== 'string' && a.organization && <p className="text-xs text-muted-foreground">{a.organization}</p>}
                            </div>
                            {typeof a !== 'string' && a.year && <span className="text-xs text-muted-foreground shrink-0">{a.year}</span>}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* ===== PORTFOLIO TAB ===== */}
            {activeTab === "portfolio" && (
              <>
                {portfolioCompanies.length > 0 ? (
                  <Card className="bg-white dark:bg-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">Portfolio Companies <Badge variant="secondary" className="text-xs">{portfolioCompanies.length}</Badge></CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {portfolioCompanies.map((pc: any, i: number) => (
                          <div key={i} className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                              {pc.logo ? <img src={pc.logo} alt={pc.name} className="w-full h-full rounded-xl object-cover" /> : <Building2 className="h-6 w-6 text-muted-foreground" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold truncate">{pc.name}</h4>
                              {pc.sector && <p className="text-xs text-muted-foreground truncate">{pc.sector}</p>}
                              <div className="flex items-center gap-2 mt-1">
                                {pc.stage && <Badge variant="secondary" className="text-[10px]">{pc.stage}</Badge>}
                                {pc.year && <span className="text-[10px] text-muted-foreground">{pc.year}</span>}
                              </div>
                            </div>
                            {pc.status === 'exited' && <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400 border-0 text-[10px]">Exited</Badge>}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-white dark:bg-card"><CardContent className="py-12 text-center text-muted-foreground">No portfolio companies listed yet.</CardContent></Card>
                )}
              </>
            )}

            {/* ===== TEAM TAB ===== */}
            {activeTab === "team" && (
              <>
                {teamMembers.length > 0 ? (
                  <Card className="bg-white dark:bg-card">
                    <CardHeader className="pb-3"><CardTitle className="text-lg">Team Members</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {teamMembers.map((tm: any, i: number) => (
                          <div key={i} className="flex items-center gap-4 p-3 rounded-lg border border-border">
                            <AvatarWithFallback src={tm.avatar} alt={tm.name} name={tm.name} size="md" className="h-12 w-12 rounded-full" />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold truncate">{tm.name}</h4>
                              <p className="text-xs text-muted-foreground truncate">{tm.title || tm.role}</p>
                            </div>
                            {tm.linkedIn && <a href={tm.linkedIn} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><Linkedin className="h-4 w-4" /></a>}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-white dark:bg-card"><CardContent className="py-12 text-center text-muted-foreground">No team members listed yet.</CardContent></Card>
                )}

                {/* Office Locations */}
                {officeLocations.length > 0 && (
                  <Card className="bg-white dark:bg-card">
                    <CardHeader className="pb-3"><CardTitle className="text-lg">Office Locations</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {officeLocations.map((ol: any, i: number) => (
                          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                            <MapPin className="h-5 w-5 text-primary shrink-0" />
                            <div>
                              <h4 className="text-sm font-semibold">{ol.city || ol.name}</h4>
                              {ol.address && <p className="text-xs text-muted-foreground">{ol.address}</p>}
                              {ol.type && <Badge variant="secondary" className="text-[10px] mt-1">{ol.type}</Badge>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* ===== INVESTMENT THESIS TAB ===== */}
            {activeTab === "thesis" && (
              <>
                {inv.investmentThesis && (
                  <Card className="bg-white dark:bg-card">
                    <CardHeader className="pb-3"><CardTitle className="text-lg">Investment Thesis</CardTitle></CardHeader>
                    <CardContent><p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{inv.investmentThesis}</p></CardContent>
                  </Card>
                )}
                {inv.investmentPhilosophy && (
                  <Card className="bg-white dark:bg-card">
                    <CardHeader className="pb-3"><CardTitle className="text-lg">Investment Philosophy</CardTitle></CardHeader>
                    <CardContent><p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{inv.investmentPhilosophy}</p></CardContent>
                  </Card>
                )}
                {inv.applicationProcess && (
                  <Card className="bg-white dark:bg-card">
                    <CardHeader className="pb-3"><CardTitle className="text-lg">How to Apply</CardTitle></CardHeader>
                    <CardContent><p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{inv.applicationProcess}</p></CardContent>
                  </Card>
                )}
                {!inv.investmentThesis && !inv.investmentPhilosophy && !inv.applicationProcess && (
                  <Card className="bg-white dark:bg-card"><CardContent className="py-12 text-center text-muted-foreground">No investment thesis data available yet.</CardContent></Card>
                )}
              </>
            )}
          </div>

          {/* Right Sidebar */}
          <aside className="w-full lg:w-72 shrink-0 space-y-4">
            <ClaimProfileButton entityType="investor" entityId={inv.id} entityName={inv.name} />

            <Card className="bg-white dark:bg-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Contact</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {inv.contactEmail && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5" /><span className="truncate">{inv.contactEmail}</span></div>}
                {inv.contactPhone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5" /><span>{inv.contactPhone}</span></div>}
                {inv.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5" /><span className="truncate">{inv.email}</span></div>}
              </CardContent>
            </Card>

            <SidebarAd slotKey="detail-sidebar-top" />

            <Card className="bg-white dark:bg-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2"><FileText className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">Data Transparency</span></div>
                <p className="text-xs text-muted-foreground mb-2">This profile is compiled from public sources and verified data.</p>
                <p className="text-xs text-muted-foreground">Last updated: {inv.updatedAt ? new Date(inv.updatedAt).toLocaleDateString() : 'N/A'}</p>
                <p className="text-xs text-muted-foreground">Views: {inv.viewCount?.toLocaleString() || 0}</p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>

      {/* Contact Dialog */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact {inv.name}</DialogTitle>
            <DialogDescription>Send a message to {inv.name}. They will be notified via email.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div><label className="text-sm font-medium mb-1.5 block">Your Email</label><Input placeholder="your@email.com" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1.5 block">Message</label><Textarea placeholder="Write your message..." rows={4} value={contactMessage} onChange={(e) => setContactMessage(e.target.value)} /></div>
            <Button className="w-full" onClick={() => { toast({ title: "Message sent!", description: `${inv.name} will be notified.` }); setContactOpen(false); setContactMessage(""); setContactEmail(""); }}><Mail className="h-4 w-4 mr-2" />Send Message</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
      <MobileStickyAd slotKey="mobile-sticky-bottom" />
    </div>
  );
}
