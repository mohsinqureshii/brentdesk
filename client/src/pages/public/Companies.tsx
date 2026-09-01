import { useState } from "react";
import { publication } from "@shared/publication";
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

const industries = ["All", "Construction", "Energy", "Infrastructure", "Manufacturing", "Logistics", "Real Estate", "Transportation", "Mining", "Utilities", "Industrial Technology"];
const locations = [
  "All Regions",
  "Saudi Arabia", "UAE", "Qatar", "Kuwait", "Bahrain", "Oman", "Egypt",
];

// Map location display labels to the substring sent to the server
// (server does a case-insensitive substring match on the free-text location field).
const locationServerValue: Record<string, string> = {
  "Saudi Arabia": "Saudi",
  "UAE": "UAE",
  "Qatar": "Qatar",
  "Kuwait": "Kuwait",
  "Bahrain": "Bahrain",
  "Oman": "Oman",
  "Egypt": "Egypt",
};

const accentColors = ["orange", "blue", "purple", "teal", "pink", "green"] as const;

export default function Companies() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("All");
  const [selectedLocation, setSelectedLocation] = useState("All Regions");
  const [page, setPage] = useState(1);

  // Edition bias — surface companies in the visitor's country first.
  const { editionCountryId } = useEdition();
  // Fetch companies from API — all filters applied server-side.
  const { data, isLoading, error } = trpc.companies.list.useQuery({
    page,
    limit: 20,
    editionCountryId: editionCountryId ?? undefined,
    search: searchQuery || undefined,
    industry: selectedIndustry === "All" ? undefined : selectedIndustry,
    location: selectedLocation === "All Regions" ? undefined : locationServerValue[selectedLocation],
  });

  const companies = data?.items || [];
  const totalCompanies = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const hasActiveFilters = selectedIndustry !== "All" || selectedLocation !== "All Regions" || searchQuery !== "";

  const clearFilters = () => {
    setSelectedIndustry("All");
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
        title={`Companies | ${publication.name}`}
        description="Profiles of the contractors, developers, operators, manufacturers and industrial companies shaping the region's physical economy — across Saudi Arabia, the GCC and MENA."
        canonical={`${publication.siteUrl}/companies`}
        keywords="industrial companies, contractors, developers, EPC, manufacturers, utilities, Saudi Arabia, GCC, MENA, company directory"
        ogImage={`${publication.siteUrl}${publication.assets.ogImage}`}
        ogType="website"
      />
      <Header />
      
      <main className="w-full">
        {/* Hero Section */}
        <section className="bg-foreground text-background">
          <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12">
            <div className="max-w-3xl">
              <Badge className="bg-primary text-white border-0 mb-4">Company Directory</Badge>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3">
                The companies building the region
              </h1>
              <p className="text-background/70 text-sm sm:text-base mb-4 max-w-2xl">
                Contractors, developers, operators and manufacturers across construction, energy, infrastructure and logistics in Saudi Arabia, the GCC and MENA.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-background/60 text-sm">
                  <Building2 className="h-4 w-4" />
                  <span>{totalCompanies.toLocaleString()} companies</span>
                </div>
                <div className="flex items-center gap-2 text-background/60 text-sm">
                  <Globe className="h-4 w-4" />
                  <span>Saudi Arabia · GCC · MENA</span>
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
                  value={selectedLocation}
                  onChange={(e) => { setSelectedLocation(e.target.value); setPage(1); }}
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
              {companies.map((company, index) => (
                <CompanyCardHybrid
                  key={company.id}
                  id={company.slug}
                  name={company.name}
                  tagline={company.tagline || ""}
                  stage=""
                  industry={company.industry || ""}
                  location={company.location || ""}
                  batch={company.foundedYear?.toString() || ""}
                  employees={company.employeeCount || ""}
                  logoUrl={company.logo || undefined}
                  accentColor={accentColors[index % accentColors.length]}
                />
              ))}
            </div>
          )}

          {!isLoading && !error && companies.length === 0 && (
            <div className="text-center py-10">
              <p className="text-muted-foreground text-lg mb-2">No companies found</p>
              <p className="text-caption text-muted-foreground mb-4">Try adjusting your search or filters</p>
              <Button variant="outline" onClick={clearFilters}>
                Clear all filters
              </Button>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && !error && companies.length > 0 && totalPages > 1 && (
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
