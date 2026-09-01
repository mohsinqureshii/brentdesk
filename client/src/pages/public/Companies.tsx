import { useState } from "react";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { SEO } from "@/components/SEO";
import { CompanyCardHybrid } from "@/components/cards/CompanyCardHybrid";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Loader2, Building2, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useEdition } from "@/hooks/useEdition";
import { ListPagination, PageInfo } from "@/components/ListPagination";
import { LeaderboardAd, SidebarAd, MobileStickyAd } from "@/components/ads/AdUnit";

const industries = ["All", "Fintech", "E-commerce", "SaaS", "Logistics", "FoodTech", "Mobility", "Entertainment", "Healthcare", "AI"];
const stages = ["All Stages", "Pre-Seed", "Seed", "Series A", "Series B", "Series C", "Series D+", "Public", "Acquired"];
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

const accentColors = ["orange", "blue", "purple", "teal", "pink", "green"] as const;

// Map stage display names to API values
const stageMap: Record<string, string | undefined> = {
  "All Stages": undefined,
  "Pre-Seed": "pre_seed",
  "Seed": "seed",
  "Series A": "series_a",
  "Series B": "series_b",
  "Series C": "series_c",
  "Series D+": "series_d_plus",
  "Public": "public",
  "Acquired": "acquired",
};

// Map API stage values to display names
const stageDisplayMap: Record<string, string> = {
  "pre_seed": "Pre-Seed",
  "seed": "Seed",
  "series_a": "Series A",
  "series_b": "Series B",
  "series_c": "Series C",
  "series_d_plus": "Series D+",
  "public": "Public",
  "acquired": "Acquired",
};

export default function Companies() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("All");
  const [selectedStage, setSelectedStage] = useState("All Stages");
  const [selectedLocation, setSelectedLocation] = useState("All Regions");
  const [page, setPage] = useState(1);

  // Edition bias — surface companies in the visitor's country first.
  const { editionCountryId } = useEdition();
  // Fetch companies from API
  const { data, isLoading, error } = trpc.companies.list.useQuery({
    page,
    limit: 20,
    editionCountryId: editionCountryId ?? undefined,
    search: searchQuery || undefined,
    industry: selectedIndustry === "All" ? undefined : selectedIndustry,
    stage: stageMap[selectedStage] as any,
  });

  const companies = data?.items || [];
  const totalCompanies = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  // Filter by location client-side (since location is a string field)
  const filteredCompanies = companies.filter((company) => {
    if (selectedLocation === "All Regions") return true;
    const location = (company.location || "").toLowerCase();
    const searchTerm = selectedLocation.toLowerCase();
    
    // Handle common abbreviations and variations
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
  });

  const hasActiveFilters = selectedIndustry !== "All" || selectedStage !== "All Stages" || selectedLocation !== "All Regions" || searchQuery !== "";

  const clearFilters = () => {
    setSelectedIndustry("All");
    setSelectedStage("All Stages");
    setSelectedLocation("All Regions");
    setSearchQuery("");
    setPage(1);
  };

  const handleSearch = () => {
    setPage(1);
  };

  const loadMore = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  return (
    <div className="min-h-screen bg-card">
      <SEO
        title="Startup Directory - MENA Tech Companies & Startups"
        description="Discover 1000+ top startups across the Middle East and North Africa. Browse tech companies by industry, funding stage, and location. Find unicorns, fintech, e-commerce, and AI startups in Dubai, Saudi Arabia, and the GCC."
        canonical="https://techscoop.io/companies"
        keywords="MENA startups, Dubai startups, Saudi Arabia tech companies, UAE unicorns, GCC startup directory, fintech MENA, e-commerce startups, AI companies Middle East"
        ogImage="https://techscoop.io/og-companies.png"
        ogType="website"
      />
      <Header />
      
      <main className="w-full">
        {/* Hero Section */}
        <section className="bg-foreground text-background">
          <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12">
            <div className="max-w-3xl">
              <Badge className="bg-[#4CB944] text-white border-0 mb-4">Startup Directory</Badge>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3">
                Explore MENA's most innovative companies
              </h1>
              <p className="text-background/70 text-sm sm:text-base mb-4 max-w-2xl">
                Discover {totalCompanies.toLocaleString()}+ startups and tech companies building the future across the Gulf and Middle East.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-background/60 text-sm">
                  <Building2 className="h-4 w-4" />
                  <span>{totalCompanies.toLocaleString()} companies</span>
                </div>
                <div className="flex items-center gap-2 text-background/60 text-sm">
                  <Globe className="h-4 w-4" />
                  <span>GCC & MENA</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Search & Filter Bar */}
        <div className="border-b border-border bg-card sticky top-0 z-10">
          <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-xl">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search companies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10 h-11 bg-background border-border"
                />
              </div>
              
              {/* Filter Dropdowns */}
              <div className="flex items-center gap-2 flex-wrap">
                <select 
                  value={selectedIndustry}
                  onChange={(e) => { setSelectedIndustry(e.target.value); setPage(1); }}
                  className="h-11 px-4 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                >
                  {industries.map(ind => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
                
                <select 
                  value={selectedStage}
                  onChange={(e) => { setSelectedStage(e.target.value); setPage(1); }}
                  className="h-11 px-4 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                >
                  {stages.map(stg => (
                    <option key={stg} value={stg}>{stg}</option>
                  ))}
                </select>
                
                <select 
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="h-11 px-4 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                >
                  {locations.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>

                <Button variant="default" className="h-11 px-6 gap-2 font-medium" onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                  Search
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
                <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 flex flex-col lg:flex-row gap-8">          <div className="w-full lg:w-[calc(75%-1rem)]">
          {/* Results Header */}
          <div className="flex items-center justify-between py-4 border-b border-border">
            <PageInfo
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalCompanies}
              itemsPerPage={20}
              className="text-sm"
            />
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground hover:text-foreground gap-1 h-8"
              >
                <X className="h-3.5 w-3.5" />
                Clear filters
              </Button>
            )}
          </div>
          
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-10">
              <p className="text-destructive text-lg mb-2">Error loading companies</p>
              <p className="text-caption text-muted-foreground">{error.message}</p>
            </div>
          )}

          {/* Companies List */}
          {!isLoading && !error && (
            <div className="divide-y divide-border">
              {filteredCompanies.map((company, index) => (
                <CompanyCardHybrid 
                  key={company.id} 
                  id={company.slug}
                  name={company.name}
                  tagline={company.tagline || ""}
                  stage={stageDisplayMap[company.stage || ""] || company.stage || ""}
                  industry={company.industry || ""}
                  location={company.location || ""}
                  batch={company.foundedYear?.toString() || ""}
                  employees={company.employeeCount || ""}
                  funding={company.totalFunding || ""}
                  logoUrl={company.logo || undefined}
                  accentColor={accentColors[index % accentColors.length]}
                />
              ))}
            </div>
          )}

          {!isLoading && !error && filteredCompanies.length === 0 && (
            <div className="text-center py-10">
              <p className="text-muted-foreground text-lg mb-2">No companies found</p>
              <p className="text-caption text-muted-foreground mb-4">Try adjusting your search or filters</p>
              <Button variant="outline" onClick={clearFilters}>
                Clear all filters
              </Button>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && !error && filteredCompanies.length > 0 && totalPages > 1 && (
                        <div className="py-10 border-t border-border">
              <ListPagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
          </div>
          <aside className="hidden lg:block lg:w-1/4 py-4">
            <div className="sticky top-24 space-y-6">
              <SidebarAd slotKey="companies-sidebar" />
            </div>
          </aside>
        </div>
      </main>
      {/* Leaderboard Ad */}
        <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-4">
          <LeaderboardAd slotKey="companies-leaderboard" />
        </div>

        <Footer />
      <MobileStickyAd slotKey="mobile-sticky-bottom" />
    </div>
  );
}
