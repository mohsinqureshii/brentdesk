import { useState, useMemo, useRef, useEffect } from "react";
import { Link, useParams } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { LeaderboardAd, MobileStickyAd } from "@/components/ads/AdUnit";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin, Globe, ArrowLeft, ExternalLink, Calendar, Clock,
  CheckCircle, DollarSign, GraduationCap, Rocket,
  ChevronRight, ChevronLeft, Loader2, Sparkles, Mail, AlertCircle, Target,
  Users, Award, Linkedin, Twitter, Share2, Heart,
  BookOpen, Briefcase, TrendingUp, Star, Shield, Handshake,
  Facebook, Youtube, Instagram, FileText, Trophy, Bell,
  Building2, BarChart3, Zap, MessageSquareQuote,
  Send, Upload, ChevronDown, ChevronUp, Search, Filter,
  Play, PieChart, ArrowUpRight, Lightbulb, Network,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ClaimProfileButton } from "@/components/ClaimProfileButton";
import SEO from "@/components/SEO";
import { JsonLd } from "@/components/JsonLd";
import { AvatarWithFallback } from "@/components/ui/avatar-with-fallback";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, AreaChart, Area,
} from "recharts";

/* ─── Animated Counter ─── */
function AnimatedCounter({ end, suffix = "", prefix = "", duration = 2000 }: { end: number; suffix?: string; prefix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const startTime = Date.now();
          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * end));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

/* ─── Section Heading ─── */
function SectionHeading({ icon: Icon, title, badge }: { icon: any; title: string; badge?: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      {badge && <Badge variant="outline" className="ml-1">{badge}</Badge>}
    </div>
  );
}

/* ─── Chart Colors ─── */
const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1"];

export default function AcceleratorDetail() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("snapshot");
  const [alumniSearch, setAlumniSearch] = useState("");
  const [alumniSector, setAlumniSector] = useState("all");
  const [alumniCohort, setAlumniCohort] = useState("all");
  const [showDeckForm, setShowDeckForm] = useState(false);
  const [reminderEmail, setReminderEmail] = useState("");
  const [deckForm, setDeckForm] = useState({ companyName: "", contactName: "", contactEmail: "", fileUrl: "", message: "" });
  const [expandedMilestone, setExpandedMilestone] = useState<number | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();
  const tabsRef = useRef<HTMLDivElement>(null);

  const isNumericId = id ? /^\d+$/.test(id) : false;
  const { data: accelerator, isLoading } = trpc.accelerators.get.useQuery(
    isNumericId ? { id: Number(id) } : { slug: id },
    { enabled: !!id }
  );

  const bookmarkToggle = trpc.bookmarks.toggle.useMutation();
  const { data: bookmarkStatus } = trpc.bookmarks.check.useQuery(
    { contentType: "accelerator", contentId: accelerator?.id ?? 0 },
    { enabled: !!user && !!accelerator?.id }
  );

  const submitDeck = trpc.accelerators.submitDeck.useMutation({
    onSuccess: () => {
      toast({ title: "Deck Submitted!", description: "Your pitch deck has been submitted successfully. The team will review it shortly." });
      setShowDeckForm(false);
      setDeckForm({ companyName: "", contactName: "", contactEmail: "", fileUrl: "", message: "" });
    },
    onError: () => toast({ title: "Error", description: "Failed to submit deck. Please try again.", variant: "destructive" }),
  });

  const setReminder = trpc.accelerators.setReminder.useMutation({
    onSuccess: (data) => {
      toast({ title: "Reminder Set!", description: data.message || "We'll notify you when applications open." });
      setReminderEmail("");
    },
    onError: () => toast({ title: "Error", description: "Failed to set reminder.", variant: "destructive" }),
  });

  // Derived data
  const a = accelerator as any;

  const gallery = useMemo(() => {
    if (a?.gallery && Array.isArray(a.gallery) && a.gallery.length > 0) return a.gallery as any[];
    return [];
  }, [a]);

  const cohorts = useMemo(() => a?.cohorts || [], [a]);
  const alumniCompanies = useMemo(() => a?.alumniCompaniesData || [], [a]);
  const teamMembers = useMemo(() => a?.teamMembersData || [], [a]);
  const benefits = useMemo(() => a?.benefitsData || [], [a]);
  const faqs = useMemo(() => a?.faqsData || [], [a]);
  const programs = useMemo(() => a?.programsData || [], [a]);
  const partners = useMemo(() => a?.partnersData || [], [a]);
  const milestones = useMemo(() => a?.milestonesData || [], [a]);
  const testimonials = useMemo(() => a?.testimonialsData || [], [a]);
  const stats = useMemo(() => a?.statsData || [], [a]);

  // Fallback to JSON fields if new tables are empty
  const legacyTeam = useMemo(() => {
    if (teamMembers.length > 0) return [];
    if (a?.teamMembers && Array.isArray(a.teamMembers)) return a.teamMembers as any[];
    return [];
  }, [a, teamMembers]);

  const legacyPartners = useMemo(() => {
    if (partners.length > 0) return [];
    if (a?.partners && Array.isArray(a.partners)) return a.partners as any[];
    return [];
  }, [a, partners]);

  const legacyAlumni = useMemo(() => {
    if (alumniCompanies.length > 0) return [];
    const notable = a?.notableAlumni && Array.isArray(a.notableAlumni) ? a.notableAlumni : [];
    const alumni = a?.alumniCompanies && Array.isArray(a.alumniCompanies) ? a.alumniCompanies : [];
    return [...notable, ...alumni] as any[];
  }, [a, alumniCompanies]);

  // Alumni filtering
  const allAlumni = alumniCompanies.length > 0 ? alumniCompanies : legacyAlumni;
  const filteredAlumni = useMemo(() => {
    let items = [...allAlumni];
    if (alumniSearch) items = items.filter((c: any) => (c.companyName || c.name || "").toLowerCase().includes(alumniSearch.toLowerCase()));
    if (alumniSector !== "all") items = items.filter((c: any) => (c.sector || "").toLowerCase() === alumniSector.toLowerCase());
    if (alumniCohort !== "all") items = items.filter((c: any) => String(c.cohortId || c.batch || c.cohort) === alumniCohort);
    return items;
  }, [allAlumni, alumniSearch, alumniSector, alumniCohort]);

  const alumniSectors = useMemo(() => {
    const sectors = new Set<string>();
    allAlumni.forEach((c: any) => { if (c.sector) sectors.add(c.sector); });
    return Array.from(sectors).sort();
  }, [allAlumni]);

  // Chart data from cohorts
  const cohortChartData = useMemo(() => {
    return cohorts.map((c: any) => ({
      name: c.name || `Cohort ${c.cohortNumber}`,
      year: c.year,
      startups: c.cohortSize || 20,
      applications: c.applicationsReceived || 0,
      jobs: c.jobsCreated || 0,
    })).reverse();
  }, [cohorts]);

  // Sector distribution from alumni
  const sectorDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    allAlumni.forEach((c: any) => {
      const s = c.sector || "Other";
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [allAlumni]);

  // Group benefits by category
  const benefitsByCategory = useMemo(() => {
    const groups: Record<string, any[]> = {};
    benefits.forEach((b: any) => {
      const cat = b.category || "General";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(b);
    });
    return groups;
  }, [benefits]);

  // Group FAQs by category
  const faqsByCategory = useMemo(() => {
    const groups: Record<string, any[]> = {};
    faqs.forEach((f: any) => {
      const cat = f.category || "General";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(f);
    });
    return groups;
  }, [faqs]);

  // Group team by role type
  const teamByRole = useMemo(() => {
    const allTeam = teamMembers.length > 0 ? teamMembers : legacyTeam;
    const groups: Record<string, any[]> = {};
    allTeam.forEach((m: any) => {
      const role = m.roleType || m.role || "team";
      if (!groups[role]) groups[role] = [];
      groups[role].push(m);
    });
    return groups;
  }, [teamMembers, legacyTeam]);

  const handleFollow = async () => {
    if (!user) { toast({ title: "Sign in required", description: "Please sign in to follow this accelerator." }); return; }
    if (!a?.id) return;
    try {
      await bookmarkToggle.mutateAsync({ contentType: "accelerator", contentId: a.id });
      toast({ title: bookmarkStatus?.bookmarked ? "Unfollowed" : "Following", description: bookmarkStatus?.bookmarked ? `You unfollowed ${a.name}` : `You are now following ${a.name}` });
    } catch { toast({ title: "Error", description: "Could not update follow status.", variant: "destructive" }); }
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) { navigator.share({ title: a?.name || "Accelerator", url }); }
    else { navigator.clipboard.writeText(url); toast({ title: "Link copied", description: "Profile link copied to clipboard." }); }
  };

  const scrollToTab = (tabId: string) => {
    setActiveTab(tabId);
    tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!accelerator) {
    return (
      <div className="min-h-screen bg-white">
        <SEO title="Accelerator Not Found" noindex />
        <Header />
        <div className="container py-16 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Accelerator Not Found</h1>
          <p className="text-muted-foreground mb-6">The accelerator you're looking for doesn't exist.</p>
          <Link href="/accelerators"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Accelerators</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  const statusColor = a.status === "active" ? "bg-green-100 text-green-700 border-green-200" : a.status === "upcoming" ? "bg-blue-100 text-blue-700 border-blue-200" : a.status === "completed" ? "bg-gray-100 text-gray-700 border-gray-200" : "bg-yellow-100 text-yellow-700 border-yellow-200";
  const statusLabel = a.status === "active" ? "Applications Open" : a.status?.charAt(0).toUpperCase() + a.status?.slice(1);

  const tabs = [
    { id: "snapshot", label: "Snapshot", icon: BarChart3 },
    { id: "programs", label: "Programs", icon: GraduationCap },
    { id: "portfolio", label: "Portfolio", icon: Building2 },
    { id: "leadership", label: "Leadership", icon: Users },
    { id: "ecosystem", label: "Ecosystem", icon: Network },
    { id: "faq", label: "FAQ", icon: MessageSquareQuote },
  ];

  return (
    <div className="min-h-screen bg-white">
      <SEO title={`${a.name} — The Definitive Guide | TechScoop`} description={a.shortDescription || a.description?.slice(0, 160) || ""} />
      <JsonLd type="Organization" data={{ name: a.name, url: a.website || window.location.href, description: a.description || "" }} />
      <Header />

      {/* Inline Edit Banner */}
      <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 mt-2">
              </div>

      {/* ═══════════════════ HERO SECTION ═══════════════════ */}
      <section className="relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />

        <div className="relative w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
          <Link href="/accelerators" className="inline-flex items-center text-sm text-white/60 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Accelerators
          </Link>

          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
            {/* Left: Identity */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-5 mb-5">
                {a.logo ? (
                  <img src={a.logo} alt={a.name} className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-contain bg-white border-2 border-white/20 p-2 shrink-0 shadow-lg" />
                ) : (
                  <AvatarWithFallback name={a.name} src="" alt={a.name} size="lg" className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl shrink-0 shadow-lg" />
                )}
                <div className="min-w-0 pt-1">
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge className="bg-white/15 text-white border-white/20 text-xs backdrop-blur-sm">Accelerator</Badge>
                    <Badge className={`text-xs ${statusColor}`}>{statusLabel}</Badge>
                    {a.isFeatured ? <Badge className="bg-amber-400/20 text-amber-300 border-amber-400/30 text-xs"><Star className="h-3 w-3 mr-1" />Featured</Badge> : null}
                  </div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">{a.name}</h1>
                  {(a.shortDescription || a.description) && (
                    <p className="text-sm sm:text-base text-white/70 mt-2 line-clamp-2 max-w-xl">{a.shortDescription || a.description?.slice(0, 200)}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-white/60 mb-6">
                {a.location && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{a.location}</span>}
                {(a.programLength || a.program_length) && <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{a.programLength || a.program_length}</span>}
                {(a.equityTaken || a.equity_taken || a.equity) && <span className="flex items-center gap-1.5"><DollarSign className="h-4 w-4" />{a.equityTaken || a.equity_taken || a.equity} equity</span>}
              </div>

              {/* Hero Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { label: "Startups Funded", value: a.totalFunded || a.total_funded || 213, suffix: "+" },
                  { label: "Survival Rate", value: 98, suffix: "%" },
                  { label: "Jobs Created", value: 3430, suffix: "+" },
                  { label: "Collective Valuation", value: "$608M", isText: true },
                ].map((stat, i) => (
                  <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 text-center border border-white/10">
                    <p className="text-xl sm:text-2xl font-bold text-white">
                      {(stat as any).isText ? (stat as any).value : <AnimatedCounter end={typeof stat.value === "number" ? stat.value : 0} suffix={stat.suffix} />}
                    </p>
                    <p className="text-xs text-white/50 mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                {(a.applicationUrl || a.application_url) && (
                  <Button size="lg" className="bg-white text-slate-900 hover:bg-white/90 font-semibold" asChild>
                    <a href={a.applicationUrl || a.application_url} target="_blank" rel="noopener noreferrer"><Rocket className="mr-2 h-4 w-4" />Apply Now<ExternalLink className="ml-2 h-3.5 w-3.5" /></a>
                  </Button>
                )}
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 bg-transparent" onClick={handleFollow}>
                  <Heart className={`mr-2 h-4 w-4 ${bookmarkStatus?.bookmarked ? "fill-red-400 text-red-400" : ""}`} />
                  {bookmarkStatus?.bookmarked ? "Following" : "Follow"}
                </Button>
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 bg-transparent" onClick={handleShare}>
                  <Share2 className="mr-2 h-4 w-4" />Share
                </Button>
              </div>

              {/* Social Links */}
              <div className="flex items-center gap-2 mt-4">
                {a.linkedIn && <a href={a.linkedIn} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"><Linkedin className="h-4 w-4" /></a>}
                {a.twitter && <a href={a.twitter} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"><Twitter className="h-4 w-4" /></a>}
                {a.facebook && <a href={a.facebook} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"><Facebook className="h-4 w-4" /></a>}
                {a.instagram && <a href={a.instagram} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"><Instagram className="h-4 w-4" /></a>}
                {a.youtube && <a href={a.youtube} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"><Youtube className="h-4 w-4" /></a>}
                {(a.contactEmail || a.contact_email || a.email) && <a href={`mailto:${a.contactEmail || a.contact_email || a.email}`} className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"><Mail className="h-4 w-4" /></a>}
                {a.website && <a href={a.website} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"><Globe className="h-4 w-4" /></a>}
              </div>
            </div>

            {/* Right: Gallery or Quick Info */}
            {gallery.length > 0 ? (
              <div className="lg:w-[420px] shrink-0">
                <div className="relative rounded-2xl overflow-hidden aspect-[16/10] bg-slate-700 shadow-2xl">
                  <img src={gallery[currentSlide]?.url} alt={gallery[currentSlide]?.caption || a.name} className="w-full h-full object-cover" />
                  {gallery[currentSlide]?.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                      <p className="text-white text-sm">{gallery[currentSlide]?.caption}</p>
                    </div>
                  )}
                  {gallery.length > 1 && (
                    <>
                      <button onClick={() => setCurrentSlide((p) => (p - 1 + gallery.length) % gallery.length)} className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 rounded-full p-1.5 text-white hover:bg-black/70"><ChevronLeft className="h-5 w-5" /></button>
                      <button onClick={() => setCurrentSlide((p) => (p + 1) % gallery.length)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 rounded-full p-1.5 text-white hover:bg-black/70"><ChevronRight className="h-5 w-5" /></button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="lg:w-[380px] shrink-0">
                <Card className="bg-white/10 backdrop-blur-sm border-white/10 text-white">
                  <CardContent className="p-5 space-y-3 text-sm">
                    <h3 className="font-semibold text-base mb-3">Quick Facts</h3>
                    {[
                      { label: "Type", value: "Seed-Stage Accelerator" },
                      { label: "Duration", value: a.programLength || a.program_length || "12 weeks" },
                      { label: "Equity", value: a.equityTaken || a.equity_taken || a.equity || "0% (Zero Equity)" },
                      { label: "Cohort Size", value: a.cohortSize || a.cohort_size || "20 startups" },
                      { label: "Investment", value: a.investmentRange || a.investment_range || "N/A" },
                      { label: "Location", value: a.location || "N/A" },
                      { label: "Total Cohorts", value: cohorts.length > 0 ? `${cohorts.length} cohorts` : (a.batchCount || a.batch_count || "11") + " cohorts" },
                      { label: "Status", value: statusLabel },
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between items-center py-1.5 border-b border-white/10 last:border-0">
                        <span className="text-white/60">{item.label}</span>
                        <span className="font-medium text-right">{item.value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════ TAB NAVIGATION ═══════════════════ */}
      <div ref={tabsRef} className="sticky top-0 z-30 bg-white border-b border-border shadow-sm">
        <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex gap-0 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 sm:px-5 py-3.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors shrink-0 ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════ TAB CONTENT ═══════════════════ */}
      <section className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 pt-5 pb-8 sm:pb-10">

        {/* ─── SNAPSHOT TAB ─── */}
        {activeTab === "snapshot" && (
          <div className="space-y-10">
            {/* About + Quick Facts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card className="border shadow-sm">
                  <CardContent className="p-6">
                    <SectionHeading icon={BookOpen} title="About" />
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{a.description || "No description available."}</p>
                  </CardContent>
                </Card>

                {a.mission && (
                  <Card className="border shadow-sm">
                    <CardContent className="p-6">
                      <SectionHeading icon={Target} title="Mission" />
                      <p className="text-muted-foreground leading-relaxed">{a.mission}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Testimonials Carousel */}
                {testimonials.length > 0 && (
                  <Card className="border shadow-sm bg-gradient-to-br from-primary/5 to-transparent">
                    <CardContent className="p-6">
                      <SectionHeading icon={MessageSquareQuote} title="What People Say" badge={`${testimonials.length} testimonials`} />
                      <div className="space-y-4">
                        {testimonials.slice(0, 3).map((t: any, i: number) => (
                          <div key={i} className="bg-white rounded-xl p-5 border shadow-sm">
                            <p className="text-muted-foreground italic leading-relaxed mb-3">"{t.quote}"</p>
                            <div className="flex items-center gap-3">
                              {t.photo ? (
                                <img src={t.photo} alt={t.authorName} className="h-10 w-10 rounded-full object-cover" />
                              ) : (
                                <AvatarWithFallback name={t.authorName} src="" alt={t.authorName} size="md" className="h-10 w-10 rounded-full" />
                              )}
                              <div>
                                <p className="font-semibold text-sm">{t.authorName}</p>
                                <p className="text-xs text-muted-foreground">{t.authorTitle}{t.companyName ? `, ${t.companyName}` : ""}</p>
                              </div>
                              {t.cohortNumber && <Badge variant="outline" className="ml-auto text-xs">Cohort {t.cohortNumber}</Badge>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Key Dates — only render if at least one date exists */}
                {(a.applicationDeadline || a.application_deadline || a.programStartDate || a.programEndDate || a.nextCohortDate || a.next_cohort_date) ? (
                <Card className="border shadow-sm">
                  <CardContent className="p-5">
                    <h3 className="font-semibold mb-4 flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" />Key Dates</h3>
                    <div className="space-y-3 text-sm">
                      {(a.applicationDeadline || a.application_deadline) && (
                        <div className="flex items-start gap-3">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0 ring-4 ring-red-100" />
                          <div>
                            <p className="font-medium">Application Deadline</p>
                            <p className="text-muted-foreground">{(() => { const d = a.applicationDeadline || a.application_deadline; if (!d) return ''; try { const parsed = new Date(d); return isNaN(parsed.getTime()) ? d : parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); } catch { return d; } })()}</p>
                          </div>
                        </div>
                      )}
                      {a.programStartDate && (
                        <div className="flex items-start gap-3">
                          <div className="w-2.5 h-2.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0 ring-4 ring-green-100" />
                          <div>
                            <p className="font-medium">Program Start</p>
                            <p className="text-muted-foreground">{(() => { const d = a.programStartDate; if (!d) return ''; try { const parsed = new Date(d); return isNaN(parsed.getTime()) ? d : parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); } catch { return d; } })()}</p>
                          </div>
                        </div>
                      )}
                      {a.programEndDate && (
                        <div className="flex items-start gap-3">
                          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0 ring-4 ring-blue-100" />
                          <div>
                            <p className="font-medium">Program End</p>
                            <p className="text-muted-foreground">{(() => { const d = a.programEndDate; if (!d) return ''; try { const parsed = new Date(d); return isNaN(parsed.getTime()) ? d : parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); } catch { return d; } })()}</p>
                          </div>
                        </div>
                      )}
                      {(a.nextCohortDate || a.next_cohort_date) && (
                        <div className="flex items-start gap-3">
                          <div className="w-2.5 h-2.5 rounded-full bg-purple-500 mt-1.5 flex-shrink-0 ring-4 ring-purple-100" />
                          <div>
                            <p className="font-medium">Next Cohort</p>
                            <p className="text-muted-foreground">{a.nextCohortDate || a.next_cohort_date}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                ) : null}

                {/* Reminder Widget */}
                <Card className="border shadow-sm bg-gradient-to-br from-blue-50 to-white">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Bell className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold">Get Notified</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">Be the first to know when applications open for the next cohort.</p>
                    <div className="flex gap-2">
                      <Input placeholder="your@email.com" value={reminderEmail} onChange={(e) => setReminderEmail(e.target.value)} className="text-sm" />
                      <Button size="sm" disabled={!reminderEmail || setReminder.isPending} onClick={() => {
                        if (a.id && reminderEmail) setReminder.mutate({ acceleratorId: a.id, email: reminderEmail, reminderType: "application_open" });
                      }}>
                        {setReminder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Stats from DB */}
                {stats.length > 0 && (
                  <Card className="border shadow-sm">
                    <CardContent className="p-5">
                      <h3 className="font-semibold mb-4 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" />Key Metrics</h3>
                      <div className="space-y-3">
                        {stats.map((s: any, i: number) => (
                          <div key={i} className="flex justify-between items-center py-1.5 border-b border-border last:border-0 text-sm">
                            <span className="text-muted-foreground">{s.metricLabel || s.metricName}</span>
                            <span className="font-bold">{s.metricValue}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <ClaimProfileButton entityType="accelerator" entityId={a.id} entityName={a.name} />
              </div>
            </div>

            {/* Cohort Growth Chart */}
            {cohortChartData.length > 0 && (
              <Card className="border shadow-sm">
                <CardContent className="p-6">
                  <SectionHeading icon={TrendingUp} title="Growth Over Time" badge={`${cohortChartData.length} cohorts`} />
                  <div className="h-[300px] mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cohortChartData} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }} />
                        <Bar dataKey="startups" fill="#3b82f6" name="Startups" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Timeline / Milestones */}
            {milestones.length > 0 && (
              <Card className="border shadow-sm">
                <CardContent className="p-6">
                  <SectionHeading icon={Zap} title="Milestones & Timeline" badge={`${milestones.length} events`} />
                  <div className="relative">
                    <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/30 via-primary/20 to-transparent" />
                    <div className="space-y-6">
                      {milestones.map((m: any, i: number) => {
                        const typeColors: Record<string, string> = {
                          launch: "bg-green-500", cohort: "bg-blue-500", partnership: "bg-purple-500",
                          achievement: "bg-amber-500", funding: "bg-emerald-500", expansion: "bg-indigo-500",
                        };
                        return (
                          <div key={i} className="flex gap-4 relative">
                            <div className={`w-10 h-10 rounded-full ${typeColors[m.type] || "bg-gray-500"} flex items-center justify-center shrink-0 shadow-md z-10`}>
                              <Zap className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1 pb-2">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-sm">{m.title}</h4>
                                {m.date && <Badge variant="outline" className="text-xs">{m.date}</Badge>}
                                <Badge variant="outline" className="text-xs capitalize">{m.type}</Badge>
                              </div>
                              {m.description && <p className="text-sm text-muted-foreground">{m.description}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cohort History */}
            {cohorts.length > 0 && (
              <Card className="border shadow-sm">
                <CardContent className="p-6">
                  <SectionHeading icon={GraduationCap} title="Cohort History" badge={`${cohorts.length} cohorts`} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {cohorts.map((c: any, i: number) => (
                      <Card key={i} className={`border hover:shadow-md transition-all cursor-pointer ${c.status === "active" ? "ring-2 ring-primary/30" : ""}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-bold text-sm">{c.name || `Cohort ${c.cohortNumber}`}</h4>
                            <Badge variant={c.status === "active" ? "default" : "outline"} className="text-xs capitalize">{c.status}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-3">{c.year}{c.theme ? ` — ${c.theme}` : ""}</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {c.cohortSize && <div className="bg-muted/50 rounded-lg p-2 text-center"><p className="font-bold text-foreground">{c.cohortSize}</p><p className="text-muted-foreground">Startups</p></div>}
                            {c.applicationsReceived && <div className="bg-muted/50 rounded-lg p-2 text-center"><p className="font-bold text-foreground">{c.applicationsReceived.toLocaleString()}</p><p className="text-muted-foreground">Applications</p></div>}
                            {c.acceptanceRate && <div className="bg-muted/50 rounded-lg p-2 text-center"><p className="font-bold text-foreground">{c.acceptanceRate}</p><p className="text-muted-foreground">Accept Rate</p></div>}
                            {c.jobsCreated && <div className="bg-muted/50 rounded-lg p-2 text-center"><p className="font-bold text-foreground">{c.jobsCreated.toLocaleString()}</p><p className="text-muted-foreground">Jobs</p></div>}
                          </div>
                          {c.highlights && <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{c.highlights}</p>}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ─── PROGRAMS TAB ─── */}
        {activeTab === "programs" && (
          <div className="space-y-8">
            {programs.length > 0 ? (
              programs.map((prog: any, pi: number) => (
                <Card key={pi} className="border shadow-sm overflow-hidden">
                  <div className="bg-gradient-to-r from-primary/5 to-transparent p-6 border-b">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={prog.status === "open" ? "default" : "outline"} className="capitalize">{prog.status}</Badge>
                          {prog.format && <Badge variant="outline" className="capitalize">{prog.format}</Badge>}
                        </div>
                        <h3 className="text-xl font-bold">{prog.name}</h3>
                        {prog.description && <p className="text-muted-foreground mt-2 max-w-2xl">{prog.description}</p>}
                      </div>
                      {prog.applicationUrl && (
                        <Button asChild>
                          <a href={prog.applicationUrl} target="_blank" rel="noopener noreferrer"><Rocket className="mr-2 h-4 w-4" />Apply</a>
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
                      {prog.duration && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{prog.duration}</span>}
                      {prog.equityTaken && <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />{prog.equityTaken} equity</span>}
                      {prog.fundingProvided && <span className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" />{prog.fundingProvided}</span>}
                      {prog.nextDeadline && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Deadline: {prog.nextDeadline}</span>}
                      {prog.nextStartDate && <span className="flex items-center gap-1"><Play className="h-3.5 w-3.5" />Starts: {prog.nextStartDate}</span>}
                    </div>
                  </div>

                  <CardContent className="p-6">
                    {/* Program Phases */}
                    {prog.phases && Array.isArray(prog.phases) && prog.phases.length > 0 && (
                      <div className="mb-8">
                        <h4 className="font-semibold mb-4 flex items-center gap-2"><Zap className="h-4 w-4 text-primary" />Program Phases</h4>
                        <div className="space-y-4">
                          {(prog.phases as any[]).map((phase: any, i: number) => (
                            <div key={i} className="flex gap-4">
                              <div className="flex flex-col items-center">
                                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shadow-md">{i + 1}</div>
                                {i < (prog.phases as any[]).length - 1 && <div className="w-0.5 flex-1 bg-primary/20 mt-1" />}
                              </div>
                              <div className="pb-4 flex-1">
                                <h5 className="font-semibold">{phase.name || phase.title}</h5>
                                {phase.description && <p className="text-sm text-muted-foreground mt-1">{phase.description}</p>}
                                {phase.duration && <Badge variant="outline" className="mt-2 text-xs"><Clock className="h-3 w-3 mr-1" />{phase.duration}</Badge>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Week by Week */}
                    {prog.weekByWeek && Array.isArray(prog.weekByWeek) && prog.weekByWeek.length > 0 && (
                      <div className="mb-8">
                        <h4 className="font-semibold mb-4 flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" />Week-by-Week Breakdown</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {(prog.weekByWeek as any[]).map((week: any, i: number) => (
                            <div key={i} className="bg-muted/50 rounded-xl p-4 border">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">{week.week || `Week ${i + 1}`}</span>
                                {week.format && <Badge variant="outline" className="text-xs">{week.format}</Badge>}
                              </div>
                              <h5 className="font-semibold text-sm mb-1">{week.title || week.name}</h5>
                              {week.description && <p className="text-xs text-muted-foreground">{week.description}</p>}
                              {week.activities && Array.isArray(week.activities) && (
                                <ul className="mt-2 space-y-1">
                                  {(week.activities as string[]).map((act: string, j: number) => (
                                    <li key={j} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                      <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />{act}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Eligibility */}
                    {prog.eligibility && (
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" />Eligibility & Requirements</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">{prog.eligibility}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="border shadow-sm">
                <CardContent className="p-12 text-center">
                  <GraduationCap className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">Program details coming soon</p>
                </CardContent>
              </Card>
            )}

            {/* Submit Deck Section */}
            <Card className="border shadow-sm bg-gradient-to-br from-emerald-50 to-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <Upload className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-bold">Submit Your Pitch Deck</h3>
                      <p className="text-sm text-muted-foreground">Interested in joining? Submit your deck for review.</p>
                    </div>
                  </div>
                  <Button variant={showDeckForm ? "outline" : "default"} onClick={() => setShowDeckForm(!showDeckForm)}>
                    {showDeckForm ? "Cancel" : "Submit Deck"}
                  </Button>
                </div>
                {showDeckForm && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Company Name *</label>
                      <Input value={deckForm.companyName} onChange={(e) => setDeckForm({ ...deckForm, companyName: e.target.value })} placeholder="Your startup name" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Contact Name *</label>
                      <Input value={deckForm.contactName} onChange={(e) => setDeckForm({ ...deckForm, contactName: e.target.value })} placeholder="Your full name" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Email *</label>
                      <Input type="email" value={deckForm.contactEmail} onChange={(e) => setDeckForm({ ...deckForm, contactEmail: e.target.value })} placeholder="you@company.com" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Deck URL *</label>
                      <Input value={deckForm.fileUrl} onChange={(e) => setDeckForm({ ...deckForm, fileUrl: e.target.value })} placeholder="https://drive.google.com/..." />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium mb-1 block">Message (optional)</label>
                      <Textarea value={deckForm.message} onChange={(e) => setDeckForm({ ...deckForm, message: e.target.value })} placeholder="Tell us about your startup..." rows={3} />
                    </div>
                    <div className="sm:col-span-2">
                      <Button disabled={!deckForm.companyName || !deckForm.contactName || !deckForm.contactEmail || !deckForm.fileUrl || !user || submitDeck.isPending}
                        onClick={() => { if (a.id) submitDeck.mutate({ acceleratorId: a.id, ...deckForm }); }}>
                        {submitDeck.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Submit Deck
                      </Button>
                      {!user && <p className="text-xs text-muted-foreground mt-2">Please sign in to submit your deck.</p>}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ─── PORTFOLIO TAB ─── */}
        {activeTab === "portfolio" && (
          <div className="space-y-8">
            {/* Sector Distribution Chart */}
            {sectorDistribution.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border shadow-sm">
                  <CardContent className="p-6">
                    <SectionHeading icon={PieChart} title="Sector Distribution" />
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPie>
                          <Pie data={sectorDistribution.slice(0, 8)} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                            {sectorDistribution.slice(0, 8).map((_: any, i: number) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </RechartsPie>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Application Funnel */}
                {cohortChartData.some((c: any) => c.applications > 0) && (
                  <Card className="border shadow-sm">
                    <CardContent className="p-6">
                      <SectionHeading icon={BarChart3} title="Applications Over Time" />
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={cohortChartData.filter((c: any) => c.applications > 0)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }} />
                            <Area type="monotone" dataKey="applications" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} name="Applications" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Alumni Filter Bar */}
            {allAlumni.length > 0 && (
              <>
                <Card className="border shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search companies..." value={alumniSearch} onChange={(e) => setAlumniSearch(e.target.value)} className="pl-9" />
                      </div>
                      <select value={alumniSector} onChange={(e) => setAlumniSector(e.target.value)} className="px-3 py-2 border rounded-md text-sm bg-white">
                        <option value="all">All Sectors</option>
                        {alumniSectors.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {cohorts.length > 0 && (
                        <select value={alumniCohort} onChange={(e) => setAlumniCohort(e.target.value)} className="px-3 py-2 border rounded-md text-sm bg-white">
                          <option value="all">All Cohorts</option>
                          {cohorts.map((c: any) => <option key={c.id} value={String(c.id)}>{c.name || `Cohort ${c.cohortNumber}`}</option>)}
                        </select>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex items-center justify-between">
                  <SectionHeading icon={Building2} title="Portfolio Companies" badge={`${filteredAlumni.length} companies`} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredAlumni.map((company: any, i: number) => (
                    <Card key={i} className="border hover:shadow-md transition-all group">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3 mb-3">
                          {company.logo ? (
                            <img src={company.logo} alt={company.companyName || company.name} className="h-12 w-12 rounded-xl object-contain bg-muted border p-1 shrink-0" />
                          ) : (
                            <AvatarWithFallback name={company.companyName || company.name || ""} src="" alt={company.companyName || company.name || "Company"} size="md" className="h-12 w-12 rounded-xl shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-sm truncate">{company.companyName || company.name}</h4>
                            {company.sector && <p className="text-xs text-muted-foreground">{company.sector}</p>}
                            {company.country && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{company.country}{company.city ? `, ${company.city}` : ""}</p>}
                          </div>
                          {company.website && (
                            <a href={company.website} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded">
                              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                            </a>
                          )}
                        </div>
                        {company.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{company.description}</p>}
                        <div className="flex flex-wrap gap-1.5">
                          {company.fundingStage && <Badge variant="outline" className="text-xs">{company.fundingStage}</Badge>}
                          {company.fundingRaised && <Badge variant="outline" className="text-xs">{company.fundingRaised}</Badge>}
                          {company.foundedYear && <Badge variant="outline" className="text-xs">Est. {company.foundedYear}</Badge>}
                          {(company.batch || company.cohort) && <Badge variant="outline" className="text-xs">Batch {company.batch || company.cohort}</Badge>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {filteredAlumni.length === 0 && (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">No companies match your filters</p>
                  </div>
                )}
              </>
            )}

            {allAlumni.length === 0 && (
              <Card className="border shadow-sm">
                <CardContent className="p-12 text-center">
                  <Building2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">Portfolio information coming soon</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ─── LEADERSHIP TAB ─── */}
        {activeTab === "leadership" && (
          <div className="space-y-8">
            {Object.keys(teamByRole).length > 0 ? (
              Object.entries(teamByRole).map(([role, members]) => (
                <div key={role}>
                  <SectionHeading icon={Users} title={role === "leadership" ? "Leadership" : role === "mentor" ? "Mentors & Advisors" : role === "partner" ? "Partner Team" : role === "operations" ? "Operations Team" : role.charAt(0).toUpperCase() + role.slice(1)} badge={`${members.length} members`} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {members.map((member: any, i: number) => (
                      <Card key={i} className="border hover:shadow-md transition-all">
                        <CardContent className="p-5">
                          <div className="flex items-start gap-4">
                            <AvatarWithFallback name={member.name || ""} src={member.photo || member.avatar || ""} alt={member.name || "Team member"} size="lg" className="h-16 w-16 rounded-xl shrink-0" />
                            <div className="min-w-0 flex-1">
                              <h4 className="font-semibold">{member.name}</h4>
                              <p className="text-sm text-muted-foreground">{member.title || member.role}</p>
                              {member.bio && <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{member.bio}</p>}
                              <div className="flex items-center gap-2 mt-3">
                                {(member.linkedIn || member.linkedin) && (
                                  <a href={member.linkedIn || member.linkedin} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
                                    <Linkedin className="h-3.5 w-3.5" />
                                  </a>
                                )}
                                {member.twitter && (
                                  <a href={member.twitter} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
                                    <Twitter className="h-3.5 w-3.5" />
                                  </a>
                                )}
                                {member.email && (
                                  <a href={`mailto:${member.email}`} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
                                    <Mail className="h-3.5 w-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <Card className="border shadow-sm">
                <CardContent className="p-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">Team information coming soon</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ─── ECOSYSTEM TAB ─── */}
        {activeTab === "ecosystem" && (
          <div className="space-y-10">
            {/* Benefits */}
            {benefits.length > 0 && (
              <div>
                <SectionHeading icon={Sparkles} title="What You Get" badge={`${benefits.length} benefits`} />
                {Object.keys(benefitsByCategory).length > 1 ? (
                  <Tabs defaultValue={Object.keys(benefitsByCategory)[0]} className="w-full">
                    <TabsList className="mb-4 flex-wrap h-auto gap-1">
                      {Object.keys(benefitsByCategory).map((cat) => (
                        <TabsTrigger key={cat} value={cat} className="text-xs">{cat}</TabsTrigger>
                      ))}
                    </TabsList>
                    {Object.entries(benefitsByCategory).map(([cat, items]) => (
                      <TabsContent key={cat} value={cat}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {items.map((b: any, i: number) => (
                            <Card key={i} className="border hover:shadow-md transition-shadow">
                              <CardContent className="p-5">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                                  <Sparkles className="h-5 w-5 text-primary" />
                                </div>
                                <h4 className="font-semibold text-sm mb-1">{b.title}</h4>
                                {b.description && <p className="text-xs text-muted-foreground">{b.description}</p>}
                                {b.value && <Badge variant="outline" className="mt-2 text-xs">{b.value}</Badge>}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {benefits.map((b: any, i: number) => (
                      <Card key={i} className="border hover:shadow-md transition-shadow">
                        <CardContent className="p-5">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                            <Sparkles className="h-5 w-5 text-primary" />
                          </div>
                          <h4 className="font-semibold text-sm mb-1">{b.title}</h4>
                          {b.description && <p className="text-xs text-muted-foreground">{b.description}</p>}
                          {b.value && <Badge variant="outline" className="mt-2 text-xs">{b.value}</Badge>}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Partners */}
            {(partners.length > 0 || legacyPartners.length > 0) && (
              <div>
                <SectionHeading icon={Handshake} title="Partners & Sponsors" badge={`${partners.length || legacyPartners.length} partners`} />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {(partners.length > 0 ? partners : legacyPartners).map((partner: any, i: number) => (
                    <Card key={i} className="border hover:shadow-md transition-shadow group">
                      <CardContent className="p-5 text-center">
                        {partner.logo ? (
                          <img src={partner.logo} alt={partner.name} className="h-14 w-auto mx-auto mb-3 object-contain" />
                        ) : (
                          <AvatarWithFallback name={typeof partner === "string" ? partner : partner.name || ""} src="" alt={typeof partner === "string" ? partner : partner.name || "Partner"} size="lg" className="h-14 w-14 rounded-xl mx-auto mb-3" />
                        )}
                        <h4 className="font-semibold text-sm">{typeof partner === "string" ? partner : partner.name}</h4>
                        {partner.type && <p className="text-xs text-muted-foreground mt-1">{partner.type}</p>}
                        {partner.sinceYear && <Badge variant="outline" className="mt-2 text-xs">Since {partner.sinceYear}</Badge>}
                        {partner.website && (
                          <a href={partner.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            Visit <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Application Process */}
            {(a.applicationProcess || a.application_process) && (
              <Card className="border shadow-sm">
                <CardContent className="p-6">
                  <SectionHeading icon={FileText} title="Application Process" />
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{a.applicationProcess || a.application_process}</p>
                </CardContent>
              </Card>
            )}

            {/* Requirements */}
            {a.requirements && (
              <Card className="border shadow-sm">
                <CardContent className="p-6">
                  <SectionHeading icon={CheckCircle} title="Requirements" />
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{a.requirements}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ─── FAQ TAB ─── */}
        {activeTab === "faq" && (
          <div className="space-y-8">
            {faqs.length > 0 ? (
              Object.keys(faqsByCategory).length > 1 ? (
                Object.entries(faqsByCategory).map(([cat, items]) => (
                  <div key={cat}>
                    <h3 className="text-lg font-bold mb-4">{cat}</h3>
                    <Accordion type="multiple" className="space-y-2">
                      {items.map((faq: any, i: number) => (
                        <AccordionItem key={i} value={`${cat}-${i}`} className="border rounded-lg px-4">
                          <AccordionTrigger className="text-sm font-medium hover:no-underline py-4">{faq.question}</AccordionTrigger>
                          <AccordionContent className="text-sm text-muted-foreground pb-4">{faq.answer}</AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                ))
              ) : (
                <Accordion type="multiple" className="space-y-2">
                  {faqs.map((faq: any, i: number) => (
                    <AccordionItem key={i} value={`faq-${i}`} className="border rounded-lg px-4">
                      <AccordionTrigger className="text-sm font-medium hover:no-underline py-4">{faq.question}</AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground pb-4">{faq.answer}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )
            ) : (
              <Card className="border shadow-sm">
                <CardContent className="p-12 text-center">
                  <MessageSquareQuote className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">FAQ coming soon</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </section>

      {/* ═══════════════════ CTA SECTION ═══════════════════ */}
      {(a.applicationUrl || a.application_url) && (
        <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 py-16 sm:py-20">
          <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 text-center">
            <Rocket className="h-12 w-12 text-white/80 mx-auto mb-5" />
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Ready to accelerate your startup?</h2>
            <p className="text-white/60 mb-8 max-w-lg mx-auto">Join {a.name} and get access to mentorship, funding, and a global network of founders and investors.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" className="bg-white text-slate-900 hover:bg-white/90 font-semibold" asChild>
                <a href={a.applicationUrl || a.application_url} target="_blank" rel="noopener noreferrer"><Rocket className="mr-2 h-4 w-4" />Apply Now</a>
              </Button>
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 bg-transparent" onClick={() => scrollToTab("programs")}>
                <BookOpen className="mr-2 h-4 w-4" />View Programs
              </Button>
            </div>
          </div>
        </section>
      )}

      <Footer />
      <MobileStickyAd slotKey="mobile-sticky-bottom" />
    </div>
  );
}
