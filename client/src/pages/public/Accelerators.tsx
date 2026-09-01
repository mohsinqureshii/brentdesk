import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, X, MapPin, Calendar, ArrowRight, Building2,
  Rocket, DollarSign, Loader2, ChevronDown, ChevronUp,
  Clock, Users, Star, TrendingUp, Zap, BookOpen,
} from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useEdition } from "@/hooks/useEdition";
import { ListPagination } from "@/components/ListPagination";
import { LeaderboardAd, SidebarAd, MobileStickyAd } from "@/components/ads/AdUnit";
import { useState, useMemo, useEffect } from "react";

const accentColors = ["orange", "blue", "purple", "teal", "pink", "green"] as const;
type AccentColor = typeof accentColors[number];

const accentStyles: Record<AccentColor, string> = {
  orange: "bg-[hsl(25,95%,53%)]",
  blue: "bg-[hsl(217,91%,60%)]",
  purple: "bg-[hsl(262,83%,58%)]",
  teal: "bg-[hsl(172,66%,50%)]",
  pink: "bg-[hsl(330,81%,60%)]",
  green: "bg-[hsl(142,71%,45%)]",
};

const tagColors: Record<AccentColor, string> = {
  orange: "bg-[hsl(25,95%,95%)] text-[hsl(25,95%,30%)]",
  blue: "bg-[hsl(217,91%,95%)] text-[hsl(217,91%,35%)]",
  purple: "bg-[hsl(262,83%,95%)] text-[hsl(262,83%,40%)]",
  teal: "bg-[hsl(172,66%,93%)] text-[hsl(172,66%,30%)]",
  pink: "bg-[hsl(330,81%,95%)] text-[hsl(330,81%,40%)]",
  green: "bg-[hsl(142,71%,93%)] text-[hsl(142,71%,30%)]",
};

function getAccentColor(index: number): AccentColor {
  return accentColors[index % accentColors.length];
}

interface AcceleratorFromAPI {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  logo: string | null;
  website: string | null;
  location: string | null;
  regionId: number | null;
  sectorId: number | null;
  programLength: string | null;
  equity: string | null;
  funding: string | null;
  applicationDeadline: Date | null;
  programStartDate: Date | null;
  programEndDate: Date | null;
  benefits: string | null;
  requirements: string | null;
  applicationUrl: string | null;
  status: "active" | "upcoming" | "completed" | "paused" | null;
  isFeatured: boolean | null;
  createdById: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const countries = [
  "All Countries", "UAE", "Saudi Arabia", "Egypt", "Jordan",
  "Bahrain", "Kuwait", "Qatar", "Oman", "Tunisia", "Morocco", "Lebanon",
];

const sectors = [
  "All Sectors", "Technology", "FinTech", "HealthTech", "E-commerce",
  "EdTech", "ClimaTech", "AgriTech", "PropTech", "AI/ML", "Logistics",
];

const types = [
  "All Types", "Accelerator", "Incubator", "Venture Studio", "Corporate",
];

/* ─── List Item ─── */
function AcceleratorListItem({ accelerator, index }: { accelerator: AcceleratorFromAPI; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const description = accelerator.description || accelerator.shortDescription || "";
  const shouldTruncate = description.length > 140;
  const displayText = expanded ? description : description.slice(0, 140);
  const accentColor = getAccentColor(index);
  const isOpen = accelerator.status === "active";

  return (
    <div className="group flex items-start gap-4 sm:gap-6 py-6 border-b border-border last:border-0 hover:bg-muted/50 -mx-4 px-4 rounded-lg transition-all duration-200">
      {/* Logo */}
      <Link href={`/accelerators/${accelerator.slug}`} className="shrink-0 mt-0.5">
        <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl bg-card flex items-center justify-center overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow">
          {accelerator.logo ? (
            <img src={accelerator.logo} alt={accelerator.name} className="h-full w-full object-cover" />
          ) : (
            <div className={`h-full w-full ${accentStyles[accentColor]} flex items-center justify-center`}>
              <span className="text-2xl font-bold text-white">{accelerator.name.charAt(0)}</span>
            </div>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Name + badges */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Link href={`/accelerators/${accelerator.slug}`}>
                <h3 className="text-lg sm:text-xl font-bold text-foreground hover:text-primary transition-colors">
                  {accelerator.name}
                </h3>
              </Link>
              <Badge variant="outline" className="text-xs capitalize shrink-0 font-semibold">
                {accelerator.status || "Active"}
              </Badge>
              {isOpen && (
                <Badge className="bg-emerald-500 text-white text-xs shrink-0 gap-1 font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse inline-block" />
                  Applications Open
                </Badge>
              )}
            </div>

            {/* Description */}
            {description && (
              <div className="mb-3">
                <span className="text-sm text-muted-foreground leading-relaxed">
                  {displayText}
                  {shouldTruncate && !expanded && "…"}
                </span>
                {shouldTruncate && (
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="ml-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-0.5"
                  >
                    {expanded ? (<>Show less <ChevronUp className="h-3 w-3" /></>) : (<>Show more <ChevronDown className="h-3 w-3" /></>)}
                  </button>
                )}
              </div>
            )}

            {/* Tags */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {accelerator.programLength && (
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full ${tagColors[accentColor]}`}>
                  <Clock className="h-3.5 w-3.5" />{accelerator.programLength}
                </span>
              )}
              {accelerator.equity && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-700">
                  {accelerator.equity} equity
                </span>
              )}
              {accelerator.funding && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full bg-muted text-muted-foreground">
                  <DollarSign className="h-3.5 w-3.5" />{accelerator.funding}
                </span>
              )}
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              {accelerator.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-muted-foreground/60" />
                  <span className="font-medium">{accelerator.location.split(",")[0]}</span>
                </span>
              )}
              {accelerator.applicationDeadline && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-muted-foreground/60" />
                  <span className="font-medium">Deadline: {new Date(accelerator.applicationDeadline).toLocaleDateString()}</span>
                </span>
              )}
            </div>
          </div>

          {/* CTA — desktop only, contained in flex row */}
          <div className="hidden sm:flex shrink-0 self-start pt-1">
            <Link
              href={`/accelerators/${accelerator.slug}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 text-sm font-semibold whitespace-nowrap shadow-sm hover:shadow-md"
            >
              View Details
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Mobile CTA */}
        <div className="sm:hidden mt-4">
          <Link
            href={`/accelerators/${accelerator.slug}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 text-xs font-semibold"
          >
            View Details <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── Featured Card ─── */
function FeaturedAcceleratorCard({ accelerator, index }: { accelerator: AcceleratorFromAPI; index: number }) {
  const accentColor = getAccentColor(index);
  const isOpen = accelerator.status === "active";

  return (
    <Link href={`/accelerators/${accelerator.slug}`}>
      <Card className="h-full hover:shadow-md transition-all duration-200 group cursor-pointer border hover:border-primary/30">
        <CardContent className="p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className={`h-12 w-12 rounded-xl ${accentStyles[accentColor]} flex items-center justify-center shrink-0 overflow-hidden`}>
              {accelerator.logo ? (
                <img src={accelerator.logo} alt={accelerator.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-lg font-bold text-white">{accelerator.name.charAt(0)}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                  {accelerator.name}
                </h3>
                {isOpen && <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {accelerator.shortDescription || accelerator.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {accelerator.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {accelerator.location.split(",")[0]}
              </span>
            )}
            {accelerator.funding && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {accelerator.funding}
              </span>
            )}
          </div>
          {accelerator.applicationDeadline && (
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Deadline</span>
              <span className="font-medium">{new Date(accelerator.applicationDeadline).toLocaleDateString()}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

/* ─── Main Page ─── */
export default function Accelerators() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("All Countries");
  const [selectedSector, setSelectedSector] = useState("All Sectors");
  const [selectedType, setSelectedType] = useState("All Types");
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Edition bias — surface accelerators in the visitor's country first.
  const { editionCountryId } = useEdition();
  const { data: acceleratorsData, isLoading, error } = trpc.accelerators.list.useQuery({
    page: currentPage,
    limit: itemsPerPage,
    editionCountryId: editionCountryId ?? undefined,
    search: searchQuery || undefined,
    status: activeTab === "open" ? "active" : activeTab === "upcoming" ? "upcoming" : undefined,
  });

  // Fetch featured accelerators separately (always show on all pages)
  const { data: featuredData } = trpc.accelerators.list.useQuery({
    page: 1,
    limit: 100,
  }, { enabled: true });

  const accelerators = useMemo(() => acceleratorsData?.items || [], [acceleratorsData]);
  const totalPages = acceleratorsData?.pagination?.totalPages || 1;
  const featuredAccelerators = useMemo(() => featuredData?.items?.filter((a) => a.isFeatured) || [], [featuredData]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, selectedCountry, selectedSector, selectedType, activeTab]);

  const filteredAccelerators = useMemo(() => {
    return accelerators.filter((a) => {
      const countryMatch = selectedCountry === "All Countries" ||
        (a.location && a.location.toLowerCase().includes(selectedCountry.toLowerCase()));
      return countryMatch;
    });
  }, [accelerators, selectedCountry]);
  
  const hasActiveFilters = selectedCountry !== "All Countries" || selectedSector !== "All Sectors" || selectedType !== "All Types" || searchQuery !== "";
  const clearFilters = () => { 
    setSelectedCountry("All Countries");
    setSelectedSector("All Sectors");
    setSelectedType("All Types");
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEO
        title="Startup Accelerators & Incubators in MENA"
        description="Discover top startup accelerators and incubators in the Middle East and North Africa. Find programs in Dubai, Saudi Arabia, Egypt, and across the GCC."
        canonical="https://techscoop.io/accelerators"
        keywords="MENA accelerators, Dubai startup incubators, Saudi Arabia accelerators, UAE startup programs"
        ogType="website"
      />
      <Header />

      {/* ── Hero ── */}
      <section className="bg-foreground text-background">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="max-w-3xl">
            <Badge className="bg-[#FF1493] text-white border-0 mb-4 text-xs font-semibold uppercase tracking-wide">
              Accelerator Directory
            </Badge>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 leading-tight">
              Find the right accelerator<br className="hidden sm:block" /> for your startup
            </h1>
            <p className="text-background/70 text-sm sm:text-base mb-6 max-w-2xl leading-relaxed">
              Discover accelerators, incubators, and startup programs across MENA.
              Get access to funding, mentorship, and resources to scale your startup.
            </p>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2 text-background/60 text-sm">
                <Rocket className="h-4 w-4" />
                <span><strong className="text-background">{acceleratorsData?.pagination?.total || 0}</strong>{' '}programs</span>
              </div>
              <div className="flex items-center gap-2 text-background/60 text-sm">
                <Building2 className="h-4 w-4" />
                <span>Accelerators &amp; Incubators</span>
              </div>
              <div className="flex items-center gap-2 text-background/60 text-sm">
                <TrendingUp className="h-4 w-4" />
                <span>MENA Region</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Sticky Search & Filters ── */}
      <section className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-20 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search accelerators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground"
              >
                {countries.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground"
              >
                {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground"
              >
                {types.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1 text-sm">
                  <X className="h-3.5 w-3.5" /> Clear
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Content ── */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4 flex flex-col lg:flex-row gap-8">
        <main className="flex-1 min-w-0">

          {/* Featured Programs - Always show on every page */}
          {featuredAccelerators.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Star className="h-4 w-4 text-amber-500" />
                <h2 className="text-lg font-bold text-foreground">Featured Programs</h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {featuredAccelerators.slice(0, 6).map((a, i) => (
                  <FeaturedAcceleratorCard key={a.id} accelerator={a as unknown as AcceleratorFromAPI} index={i} />
                ))}
              </div>
            </section>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-5">
            <TabsList className="h-9">
              <TabsTrigger value="all" className="text-sm">All Programs</TabsTrigger>
              <TabsTrigger value="open" className="text-sm">Applications Open</TabsTrigger>
              <TabsTrigger value="upcoming" className="text-sm">Upcoming</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Count and Tabs */}
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Loading…" : `${filteredAccelerators.length} program${filteredAccelerators.length !== 1 ? "s" : ""} found`}
            </p>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="mb-4 flex flex-wrap gap-2">
              {selectedCountry !== "All Countries" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {selectedCountry}
                  <button onClick={() => setSelectedCountry("All Countries")} className="ml-1 hover:opacity-70">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {selectedSector !== "All Sectors" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {selectedSector}
                  <button onClick={() => setSelectedSector("All Sectors")} className="ml-1 hover:opacity-70">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {selectedType !== "All Types" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {selectedType}
                  <button onClick={() => setSelectedType("All Types")} className="ml-1 hover:opacity-70">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-16 border border-dashed border-red-500/30 rounded-xl bg-red-500/5">
              <X className="h-10 w-10 mx-auto mb-3 text-red-500" />
              <h3 className="text-base font-semibold text-foreground mb-1">Failed to load accelerators</h3>
              <p className="text-sm text-muted-foreground mb-4">{error?.message || 'An error occurred. Please try again.'}</p>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Reload Page</Button>
            </div>
          )}

          {/* List */}
          {!error && isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : accelerators.length === 0 && activeTab !== "all" ? (
            <div className="text-center py-16 border border-dashed border-border rounded-xl">
              <Clock className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <h3 className="text-base font-semibold text-foreground mb-1">No {activeTab === "upcoming" ? "upcoming" : "programs with open"} accelerators found</h3>
              <p className="text-sm text-muted-foreground mb-4">Try viewing all programs or adjusting your filters</p>
              <Button variant="outline" size="sm" onClick={() => { setActiveTab("all"); clearFilters(); }}>View all programs</Button>
            </div>
          ) : filteredAccelerators.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-xl">
              <Rocket className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <h3 className="text-base font-semibold text-foreground mb-1">No accelerators found</h3>
              <p className="text-sm text-muted-foreground mb-4">Try adjusting your search or filters</p>
              <Button variant="outline" size="sm" onClick={clearFilters}>Clear all filters</Button>
            </div>
          ) : (
            <>
              <div className="bg-card border border-border rounded-xl px-4 divide-y divide-border">
                {filteredAccelerators.map((a, i) => (
                  <AcceleratorListItem key={a.id} accelerator={a as unknown as AcceleratorFromAPI} index={i} />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="mt-8">
                  <ListPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
              )}
            </>
          )}

        </main>

        {/* Sidebar */}
        <aside className="w-full lg:w-[300px] shrink-0 lg:sticky top-24 h-fit">
          <SidebarAd slotKey="accelerators-sidebar" />
        </aside>
      </div>

      {/* Leaderboard Ad */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <LeaderboardAd slotKey="accelerators-leaderboard" />
      </div>

      {/* ── Full-width CTA ── */}
      <section className="w-full bg-gradient-to-br from-[#0f1c3f] via-[#1a2d5a] to-[#1e3a8a] py-16 sm:py-20">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="flex justify-center mb-5">
            <Rocket className="h-10 w-10 text-white/80" />
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight">
            Ready to accelerate your startup?
          </h2>
          <p className="text-base text-white/70 mb-8 max-w-lg mx-auto leading-relaxed">
            Discover the right program, apply in minutes, and get access to funding, mentorship, and a global network of founders and investors.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/accelerators">
              <Button className="bg-white text-[#1a2d5a] hover:bg-white/90 font-semibold text-sm h-11 px-7 rounded-full gap-2 shadow-lg">
                <Rocket className="h-4 w-4" />
                Browse Programs
              </Button>
            </Link>
            <Link href="/submit-accelerator">
              <Button variant="outline" className="bg-transparent text-white border-white/40 hover:bg-white/10 font-semibold text-sm h-11 px-7 rounded-full gap-2">
                <BookOpen className="h-4 w-4" />
                List Your Program
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
      <MobileStickyAd slotKey="mobile-sticky-bottom" />
    </div>
  );
}
