import { useState, useMemo, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, X, MapPin, Building2, ChevronDown, ChevronUp, FileText, CheckCircle2, Calendar, ArrowRight, Loader2, DollarSign } from "lucide-react";
import { Link } from "wouter";
import { LeaderboardAd, SidebarAd, MobileStickyAd } from "@/components/ads/AdUnit";
import { trpc } from "@/lib/trpc";
import { useEdition } from "@/hooks/useEdition";
import { ListPagination, PageInfo } from "@/components/ListPagination";

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

const investorTypes = ["All", "vc", "angel", "corporate_vc", "accelerator", "family_office", "other"];
const investorTypeLabels: Record<string, string> = {
  "All": "All",
  "vc": "Venture Capital",
  "angel": "Angel Investor",
  "corporate_vc": "Corporate VC",
  "accelerator": "Accelerator",
  "family_office": "Family Office",
  "other": "Other",
};
const stages = ["All Stages", "Pre-seed", "Seed", "Series A", "Series B", "Series C", "Growth"];
const locations = [
  "All Regions",
  // GCC Countries
  "UAE", "Saudi Arabia", "Qatar", "Kuwait", "Bahrain", "Oman",
  // North Africa
  "Egypt", "Morocco", "Tunisia", "Algeria",
  // Levant
  "Jordan", "Lebanon",
  // Other Major Markets
  "India", "Pakistan", "Turkey", "Israel",
  // Global
  "United States", "United Kingdom", "Singapore",
];

// Helper to get accent color based on investor index or name
function getAccentColor(index: number): AccentColor {
  return accentColors[index % accentColors.length];
}

// Helper to format check size
function formatCheckSize(min: string | null, max: string | null, currency: string | null): string {
  if (!min && !max) return "Varies";
  const curr = currency || "USD";
  if (min && max) {
    return `$${Number(min).toLocaleString()} - $${Number(max).toLocaleString()}`;
  }
  if (min) return `From $${Number(min).toLocaleString()}`;
  if (max) return `Up to $${Number(max).toLocaleString()}`;
  return "Varies";
}

interface InvestorFromAPI {
  id: number;
  name: string;
  slug: string;
  type: string | null;
  shortDescription: string | null;
  logo: string | null;
  headquarters: string | null;
  investmentStages: string[] | null;
  checkSizeMin: string | null;
  checkSizeMax: string | null;
  checkSizeCurrency: string | null;
  isVerified: boolean | null;
  viewCount: number | null;
}

function InvestorListItem({ investor, index }: { investor: InvestorFromAPI; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const description = investor.shortDescription || "";
  const shouldTruncate = description.length > 100;
  const displayText = expanded ? description : description.slice(0, 100);
  const accentColor = getAccentColor(index);
  const stages = Array.isArray(investor.investmentStages) 
    ? investor.investmentStages 
    : typeof investor.investmentStages === 'string' 
      ? JSON.parse(investor.investmentStages || '[]').filter((s: any) => s)
      : [];

  return (
    <div className="group py-5 border-b border-border last:border-0 hover:bg-muted/30 -mx-4 px-4 rounded-lg transition-all duration-200">
      {/* Top row: logo + content + button */}
      <div className="flex items-start gap-4 sm:gap-5">
        {/* Logo */}
        <Link href={`/investors/${investor.slug}`} className="shrink-0">
          <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-card flex items-center justify-center overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow">
            {investor.logo ? (
              <img src={investor.logo} alt={investor.name} className="h-full w-full object-cover" />
            ) : (
              <div className={`h-full w-full ${accentStyles[accentColor]} flex items-center justify-center`}>
                <span className="text-xl font-bold text-white">{investor.name.charAt(0)}</span>
              </div>
            )}
          </div>
        </Link>

        {/* Middle: name + description + tags + meta */}
        <div className="flex-1 min-w-0">
          {/* Name Row */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Link href={`/investors/${investor.slug}`}>
              <h3 className="text-base sm:text-lg font-bold text-foreground hover:text-primary transition-colors">
                {investor.name}
              </h3>
            </Link>
            {!!investor.isVerified && (
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            )}
            {investor.type && (
              <Badge variant="outline" className="text-xs whitespace-nowrap font-semibold">
                {investorTypeLabels[investor.type] || investor.type}
              </Badge>
            )}
          </div>

          {/* Description */}
          {description && (
            <div className="mb-2">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {displayText}
                {shouldTruncate && !expanded && "…"}
              </p>
              {shouldTruncate && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors mt-1 inline-flex items-center gap-0.5"
                >
                  {expanded ? (
                    <>Show less <ChevronUp className="h-3 w-3" /></>
                  ) : (
                    <>Show more <ChevronDown className="h-3 w-3" /></>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Tags */}
          {stages.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {stages.slice(0, 4).map((stage: string) => (
                <Badge key={stage} className={`${tagColors[accentColor]} hover:opacity-80 border-0 rounded-full px-2.5 py-0.5 text-xs font-semibold`}>
                  {stage}
                </Badge>
              ))}
            </div>
          )}

          {/* Meta row: location + views + check size */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            {investor.headquarters && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground/60" />
                <span className="font-medium">{investor.headquarters}</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground/60" />
              <span className="font-medium">{investor.viewCount || 0} views</span>
            </span>
            {formatCheckSize(investor.checkSizeMin, investor.checkSizeMax, investor.checkSizeCurrency) !== 'Varies' && (
              <span className="font-medium">
                Check size: <span className="text-foreground font-semibold">{formatCheckSize(investor.checkSizeMin, investor.checkSizeMax, investor.checkSizeCurrency)}</span>
              </span>
            )}
          </div>
        </div>

        {/* Right: CTA button — always visible, right-aligned */}
        <div className="shrink-0 self-center">
          <Link href={`/investors/${investor.slug}`}>
            <Button size="sm" className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 font-semibold shadow-sm hover:shadow-md whitespace-nowrap">
              View Profile
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Investors() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedStage, setSelectedStage] = useState("All Stages");
  const [selectedLocation, setSelectedLocation] = useState("All Regions");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Edition bias — surface investors in the visitor's country first.
  const { editionCountryId } = useEdition();
  // Fetch investors from API
  const { data: investorsData, isLoading, error } = trpc.investors.list.useQuery({
    page: currentPage,
    limit: itemsPerPage,
    editionCountryId: editionCountryId ?? undefined,
    search: searchQuery || undefined,
    type: selectedType !== "All" ? selectedType as "vc" | "angel" | "corporate_vc" | "accelerator" | "family_office" | "other" : undefined,
    sortBy: "name",
    sortOrder: "asc",
  });

  const investors = useMemo(() => investorsData?.items || [], [investorsData]);
  const totalPages = investorsData?.totalPages || 1;
  const totalItems = investorsData?.total || 0;

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedType, selectedStage, selectedLocation]);

  // Client-side filtering for stages and location (since API doesn't support these filters directly)
  const filteredInvestors = useMemo(() => {
    return investors.filter((investor) => {
      const matchesStage = selectedStage === "All Stages" || 
        (investor.investmentStages && (investor.investmentStages as string[]).some((s: string) => 
          s.toLowerCase().includes(selectedStage.toLowerCase())
        ));
      const matchesLocation = (() => {
        if (selectedLocation === "All Regions") return true;
        const location = (investor.headquarters || "").toLowerCase();
        const searchTerm = selectedLocation.toLowerCase();
        
        if (selectedLocation === "UAE") {
          return location.includes("uae") || location.includes("dubai") || location.includes("abu dhabi") || location.includes("emirates");
        }
        if (selectedLocation === "Saudi Arabia") {
          return location.includes("saudi") || location.includes("ksa") || location.includes("riyadh") || location.includes("jeddah");
        }
        if (selectedLocation === "United States") {
          return location.includes("usa") || location.includes("united states") || location.includes("us") || location.includes("california") || location.includes("new york");
        }
        if (selectedLocation === "United Kingdom") {
          return location.includes("uk") || location.includes("united kingdom") || location.includes("london") || location.includes("england");
        }
        return location.includes(searchTerm);
      })();
      return matchesStage && matchesLocation;
    });
  }, [investors, selectedStage, selectedLocation]);

  const hasActiveFilters = selectedType !== "All" || selectedStage !== "All Stages" || selectedLocation !== "All Regions";

  const clearFilters = () => {
    setSelectedType("All");
    setSelectedStage("All Stages");
    setSelectedLocation("All Regions");
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEO
        title="Investor Directory - VCs, Angels & Accelerators in MENA"
        description="Find the right investors for your startup. Connect with VCs, angel investors, and accelerators actively investing in MENA startups. Filter by stage, sector, and check size."
        canonical="https://techscoop.io/investors"
        keywords="MENA investors, Dubai VCs, Saudi Arabia venture capital, UAE angel investors, GCC accelerators, startup funding MENA, seed investors Middle East"
        ogImage="https://techscoop.io/og-investors.png"
        ogType="website"
      />
      <Header />

      {/* Hero Section */}
      <section className="bg-foreground text-background overflow-hidden">
        <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="max-w-3xl">
            <Badge className="bg-[#FF1493] text-white border-0 mb-4">Investor Directory</Badge>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3">
              Find the right investors for your startup
            </h1>
            <p className="text-background/70 text-sm sm:text-base mb-4 max-w-2xl">
              Connect with VCs, angels, and accelerators actively investing in MENA startups. 
              Filter by stage, sector, and check size to find your perfect match.
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 text-background/60 text-sm">
                <DollarSign className="h-4 w-4" />
                <span>{investorsData?.total || 0} investors</span>
              </div>
              <div className="flex items-center gap-2 text-background/60 text-sm">
                <Building2 className="h-4 w-4" />
                <span>VCs, Angels & Accelerators</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search & Filters */}
      <section className="border-b border-border bg-muted/30 sticky top-0 z-20">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search investors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              {/* Type Filter */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                {investorTypes.map((type) => (
                  <option key={type} value={type}>
                    {investorTypeLabels[type] || type}
                  </option>
                ))}
              </select>

              {/* Stage Filter */}
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                {stages.map((stage: string) => (
                  <option key={stage} value={stage}>{stage}</option>
                ))}
              </select>

              {/* Location Filter */}
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                {locations.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-10 gap-1">
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          {/* Investor List */}
          <div>
            {/* Results Header */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {isLoading ? "Loading..." : `${filteredInvestors.length} investors found`}
              </p>
            </div>

            {error && (
              <div className="text-center py-10 border border-dashed border-red-500/30 rounded-xl bg-red-500/5">
                <X className="h-10 w-10 mx-auto mb-3 text-red-500" />
                <h3 className="text-base font-semibold text-foreground mb-1">Failed to load investors</h3>
                <p className="text-sm text-muted-foreground mb-4">{error?.message || 'An error occurred. Please try again.'}</p>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Reload Page</Button>
              </div>
            )}

            {!error && isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredInvestors.length === 0 ? (
              <div className="text-center py-10">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No investors found</h3>
                <p className="text-muted-foreground mb-4">Try adjusting your search or filters</p>
                <Button variant="outline" onClick={clearFilters}>Clear all filters</Button>
              </div>
            ) : (
              <>
                <div>
                  {filteredInvestors.map((investor, index) => (
                    <InvestorListItem key={investor.id} investor={investor as InvestorFromAPI} index={index} />
                  ))}
                </div>
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8">
                    <ListPagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar - Hidden on mobile */}
          <div className="hidden lg:block space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-4">Directory Stats</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Investors</span>
                    <span className="font-medium text-foreground">{investorsData?.total || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Verified Profiles</span>
                    <span className="font-medium text-foreground">
                      {investors.filter(i => i.isVerified).length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CTA Card */}
            <Card className="bg-foreground text-background">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Are you an investor?</h3>
                <p className="text-background/70 text-sm mb-4">
                  Claim your profile to manage your listing and connect with founders.
                </p>
                <Button className="w-full bg-[#FF1493] hover:bg-[#FF1493]/90 text-white">
                  Claim Profile
                </Button>
              </CardContent>
            </Card>

            {/* Ad Spot */}
            <SidebarAd slotKey="category-sidebar" />
          </div>
        </div>
      </main>

      <Footer />
      <MobileStickyAd slotKey="mobile-sticky-bottom" />
    </div>
  );
}
