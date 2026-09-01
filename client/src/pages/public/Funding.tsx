import { useState, useMemo, useCallback } from "react";
import { Link } from "wouter";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SEO from "@/components/SEO";
import { trpc } from "@/lib/trpc";
import { AvatarWithFallback } from "@/components/ui/avatar-with-fallback";
import { LeaderboardAd, SidebarAd, InContentAd, MobileStickyAd } from "@/components/ads/AdUnit";
import {
  DollarSign, TrendingUp, BarChart3, Search,
  Building2, Loader2, Calendar, MapPin,
  ChevronLeft, ChevronRight, Filter, X, SlidersHorizontal,
} from "lucide-react";

const roundTypeLabels: Record<string, string> = {
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

const roundTypes = [
  { label: "All Rounds", value: "" },
  { label: "Pre-Seed", value: "pre_seed" },
  { label: "Seed", value: "seed" },
  { label: "Series A", value: "series_a" },
  { label: "Series B", value: "series_b" },
  { label: "Series C", value: "series_c" },
  { label: "Series D+", value: "series_d_plus" },
  { label: "Bridge", value: "bridge" },
  { label: "Strategic", value: "strategic" },
  { label: "Grant", value: "grant" },
];

function formatAmount(amount: number | string | null, currency = "USD") {
  if (!amount) return "Undisclosed";
  const num = Number(amount);
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
  return `$${num.toLocaleString()}`;
}

export default function Funding() {
  const [selectedType, setSelectedType] = useState("");
  const [sectorId, setSectorId] = useState<number | undefined>(undefined);
  const [countryId, setCountryId] = useState<number | undefined>(undefined);
  const [investorId, setInvestorId] = useState<number | undefined>(undefined);
  const [industry, setIndustry] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const limit = 20;

  // Debounce search
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    const timer = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // Fetch filter options
  const { data: filterOptions } = trpc.funding.filterOptions.useQuery();

  const { data, isLoading } = trpc.funding.publicList.useQuery({
    roundType: selectedType || undefined,
    sectorId,
    countryId,
    investorId,
    industry,
    search: debouncedSearch || undefined,
    limit,
    offset: page * limit,
  } as any);

  const rounds = data?.rounds || [];
  const total = data?.total || 0;
  const stats = (data as any)?.stats || { totalRounds: 0, totalRaised: 0 };
  const totalPages = Math.ceil(total / limit);

  const activeFilterCount = [sectorId, countryId, investorId, industry, debouncedSearch].filter(Boolean).length;

  const clearAllFilters = () => {
    setSelectedType("");
    setSectorId(undefined);
    setCountryId(undefined);
    setInvestorId(undefined);
    setIndustry(undefined);
    setSearchQuery("");
    setDebouncedSearch("");
    setPage(0);
  };

  return (
    <div className="min-h-screen bg-white">
      <SEO title="Funding Tracker | TechScoop" description="Track the latest startup funding rounds across the MENA region. Real-time data on investments, valuations, and investor activity." />
      <Header />

      {/* Hero Section */}
      <section className="bg-white border-b border-border">
        <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-3">Funding Tracker</h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mb-8">
            Track the latest startup funding rounds across the MENA tech ecosystem. Real-time data on investments, valuations, and investor activity.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <Card className="border shadow-sm">
              <CardContent className="p-4 sm:p-5 text-center">
                <DollarSign className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
                <p className="text-xl sm:text-2xl font-bold">{formatAmount(stats.totalRaised)}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Raised</p>
              </CardContent>
            </Card>
            <Card className="border shadow-sm">
              <CardContent className="p-4 sm:p-5 text-center">
                <BarChart3 className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
                <p className="text-xl sm:text-2xl font-bold">{stats.totalRounds}</p>
                <p className="text-xs text-muted-foreground mt-1">Funding Rounds</p>
              </CardContent>
            </Card>
            <Card className="border shadow-sm hidden sm:block">
              <CardContent className="p-4 sm:p-5 text-center">
                <TrendingUp className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
                <p className="text-xl sm:text-2xl font-bold">{rounds.length > 0 ? roundTypeLabels[rounds[0]?.roundType] || "N/A" : "N/A"}</p>
                <p className="text-xs text-muted-foreground mt-1">Latest Round Type</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Round Type Tabs + Search + Filter Toggle */}
      <section className="sticky top-0 z-20 bg-white border-b border-border">
        <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8">
          {/* Round type tabs row */}
          <div className="flex items-center gap-0">
            <div className="flex gap-0 overflow-x-auto scrollbar-hide flex-1">
              {roundTypes.map((rt) => (
                <button
                  key={rt.value}
                  onClick={() => { setSelectedType(rt.value); setPage(0); }}
                  className={`px-4 sm:px-5 py-3.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors shrink-0 ${
                    selectedType === rt.value
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {rt.label}
                </button>
              ))}
            </div>

            {/* Search + Filter toggle */}
            <div className="flex items-center gap-2 ml-auto pl-4 shrink-0">
              <div className="relative hidden sm:block">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search company..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-8 h-9 w-48 text-sm"
                />
              </div>
              <Button
                variant={showFilters ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="h-9 gap-1.5"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Filters</span>
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="h-5 min-w-5 px-1 text-[10px] rounded-full">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Expanded Filter Panel */}
      {showFilters && (
        <section className="bg-gray-50/80 border-b border-border">
          <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-4">
            {/* Mobile search */}
            <div className="sm:hidden mb-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search company..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Sector Filter */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Sector</label>
                <Select
                  value={sectorId ? String(sectorId) : "all"}
                  onValueChange={(val) => { setSectorId(val === "all" ? undefined : Number(val)); setPage(0); }}
                >
                  <SelectTrigger className="h-9 text-sm bg-white">
                    <SelectValue placeholder="All Sectors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sectors</SelectItem>
                    {filterOptions?.sectors?.map((s: any) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Country Filter */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Country</label>
                <Select
                  value={countryId ? String(countryId) : "all"}
                  onValueChange={(val) => { setCountryId(val === "all" ? undefined : Number(val)); setPage(0); }}
                >
                  <SelectTrigger className="h-9 text-sm bg-white">
                    <SelectValue placeholder="All Countries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    {filterOptions?.countries?.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Investor Filter */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Investor</label>
                <Select
                  value={investorId ? String(investorId) : "all"}
                  onValueChange={(val) => { setInvestorId(val === "all" ? undefined : Number(val)); setPage(0); }}
                >
                  <SelectTrigger className="h-9 text-sm bg-white">
                    <SelectValue placeholder="All Investors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Investors</SelectItem>
                    {filterOptions?.investors?.map((i: any) => (
                      <SelectItem key={i.id} value={String(i.id)}>{i.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Industry Filter */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Industry</label>
                <Select
                  value={industry || "all"}
                  onValueChange={(val) => { setIndustry(val === "all" ? undefined : val); setPage(0); }}
                >
                  <SelectTrigger className="h-9 text-sm bg-white">
                    <SelectValue placeholder="All Industries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Industries</SelectItem>
                    {filterOptions?.industries?.map((ind: string) => (
                      <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active filters + Clear */}
            {activeFilterCount > 0 && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="text-xs text-muted-foreground">Active filters:</span>
                {sectorId && (
                  <Badge variant="secondary" className="text-xs gap-1 pr-1">
                    Sector: {filterOptions?.sectors?.find((s: any) => s.id === sectorId)?.name || sectorId}
                    <button onClick={() => { setSectorId(undefined); setPage(0); }} className="ml-0.5 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {countryId && (
                  <Badge variant="secondary" className="text-xs gap-1 pr-1">
                    Country: {filterOptions?.countries?.find((c: any) => c.id === countryId)?.name || countryId}
                    <button onClick={() => { setCountryId(undefined); setPage(0); }} className="ml-0.5 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {investorId && (
                  <Badge variant="secondary" className="text-xs gap-1 pr-1">
                    Investor: {filterOptions?.investors?.find((i: any) => i.id === investorId)?.name || investorId}
                    <button onClick={() => { setInvestorId(undefined); setPage(0); }} className="ml-0.5 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {industry && (
                  <Badge variant="secondary" className="text-xs gap-1 pr-1">
                    Industry: {industry}
                    <button onClick={() => { setIndustry(undefined); setPage(0); }} className="ml-0.5 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {debouncedSearch && (
                  <Badge variant="secondary" className="text-xs gap-1 pr-1">
                    Search: "{debouncedSearch}"
                    <button onClick={() => { setSearchQuery(""); setDebouncedSearch(""); setPage(0); }} className="ml-0.5 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-6 text-xs text-muted-foreground hover:text-destructive">
                  Clear all
                </Button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Main Content */}
      <section className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex gap-8">
          {/* Rounds List */}
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : rounds.length === 0 ? (
              <div className="text-center py-16">
                <DollarSign className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-2">No funding rounds found</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {activeFilterCount > 0 || selectedType
                    ? "Try adjusting your filters or search criteria."
                    : "Funding data will appear here as rounds are tracked."}
                </p>
                {(activeFilterCount > 0 || selectedType) && (
                  <Button variant="outline" size="sm" onClick={clearAllFilters}>
                    Clear all filters
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {page * limit + 1}-{Math.min((page + 1) * limit, total)} of {total} rounds
                  </p>
                </div>

                <div className="space-y-3">
                  {rounds.map((round: any, index: number) => (
                    <>
                    <Card key={round.id} className="border shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex items-start gap-3 sm:gap-4">
                          {/* Company Logo */}
                          <div className="shrink-0">
                            {round.company?.slug ? (
                              <Link href={`/companies/${round.company.slug}`}>
                                {round.company?.logo ? (
                                  <img src={round.company.logo} alt={round.company?.name || ""} className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg object-contain bg-muted border cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all" />
                                ) : (
                                  <AvatarWithFallback name={round.company?.name || "?"} alt={round.company?.name || "?"} src="" size="md" className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all" />
                                )}
                              </Link>
                            ) : round.company?.logo ? (
                              <img src={round.company.logo} alt={round.company?.name || ""} className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg object-contain bg-muted border" />
                            ) : (
                              <AvatarWithFallback name={round.company?.name || "?"} alt={round.company?.name || "?"} src="" size="md" className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {round.company?.slug ? (
                                    <Link href={`/companies/${round.company.slug}`} className="font-semibold text-foreground hover:underline truncate">
                                      {round.company?.name || "Unknown Company"}
                                    </Link>
                                  ) : (
                                    <span className="font-semibold text-foreground truncate">{round.company?.name || "Unknown Company"}</span>
                                  )}
                                  <Badge variant="outline" className="text-xs shrink-0">
                                    {roundTypeLabels[round.roundType] || round.roundType}
                                  </Badge>
                                </div>
                                {round.company?.industry && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{round.company.industry}</p>
                                )}
                              </div>

                              <div className="text-left sm:text-right shrink-0">
                                <p className="text-lg sm:text-xl font-bold text-foreground">
                                  {round.isUndisclosed ? "Undisclosed" : formatAmount(round.amountRaised, round.currency)}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                              {round.fundingDate && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(round.fundingDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                </span>
                              )}
                              {round.leadInvestor && (
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  Lead: {round.leadInvestor.name}
                                </span>
                              )}
                              {round.countryName && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {round.countryName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    {(index + 1) % 4 === 0 && (
                      <div className="my-4">
                        <InContentAd slotKey={`funding-in-content-${index}`} />
                      </div>
                    )}
                    </>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground px-3">
                      Page {page + 1} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar Ad - Desktop only */}
          <div className="hidden lg:block w-[300px] shrink-0">
            <div className="sticky top-16">
              <SidebarAd slotKey="funding-sidebar" category="funding" />
            </div>
          </div>
        </div>
      </section>

      {/* Leaderboard Ad */}
      <div className="container max-w-[1400px] mx-auto px-3 py-4">
        <LeaderboardAd slotKey="funding-leaderboard" />
      </div>

      <Footer />
      <MobileStickyAd slotKey="mobile-sticky-bottom" />
    </div>
  );
}
