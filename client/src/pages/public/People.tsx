import { useState, useMemo, useEffect } from "react";
import { publication } from "@shared/publication";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X, MapPin, Linkedin, ExternalLink, ChevronDown, ChevronUp, Briefcase, Users, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useEdition } from "@/hooks/useEdition";
import { AvatarWithFallback } from "@/components/ui/avatar-with-fallback";
import { ListPagination, PageInfo } from "@/components/ListPagination";
import { LeaderboardAd, SidebarAd, MobileStickyAd } from "@/components/ads/AdUnit";

const accentStyles = {
  orange: "bg-[hsl(25,95%,53%)]",
  blue: "bg-[hsl(217,91%,60%)]", 
  purple: "bg-[hsl(262,83%,58%)]",
  teal: "bg-[hsl(172,66%,50%)]",
  pink: "bg-[hsl(330,81%,60%)]",
  green: "bg-[hsl(142,71%,45%)]",
};

const tagColors = {
  orange: "bg-[hsl(25,95%,95%)] text-[hsl(25,95%,30%)]",
  blue: "bg-[hsl(217,91%,95%)] text-[hsl(217,91%,35%)]",
  purple: "bg-[hsl(262,83%,95%)] text-[hsl(262,83%,40%)]",
  teal: "bg-[hsl(172,66%,93%)] text-[hsl(172,66%,30%)]",
  pink: "bg-[hsl(330,81%,95%)] text-[hsl(330,81%,40%)]",
  green: "bg-[hsl(142,71%,93%)] text-[hsl(142,71%,30%)]",
};

type AccentColor = keyof typeof accentStyles;

const accentColorList: AccentColor[] = ["orange", "blue", "purple", "teal", "pink", "green"];

function getAccentColor(index: number): AccentColor {
  return accentColorList[index % accentColorList.length];
}

const personTypes = ["All", "Founders", "Investors", "Operators", "Advisors"];
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
const sectors = ["All Sectors", "Fintech", "Mobility", "FoodTech", "E-commerce", "SaaS", "HealthTech"];

interface PersonData {
  id: number;
  name: string;
  slug: string;
  title: string | null;
  company: string | null;
  location?: string | null;
  bio?: string | null;
  shortBio?: string | null;
  linkedIn?: string | null;
  avatar?: string | null;
  accentColor: AccentColor;
}

function PersonListItem({ person }: { person: PersonData }) {
  const [expanded, setExpanded] = useState(false);
  const bio = person.shortBio || person.bio || "";
  const shouldTruncate = bio.length > 100;
  const displayText = expanded ? bio : bio.slice(0, 100);

  return (
    <div className="group flex items-start gap-5 py-6">
      {/* Avatar */}
      <Link href={`/people/${person.slug}`} className="shrink-0">
        <AvatarWithFallback
          src={person.avatar}
          alt={person.name}
          name={person.name}
          size="lg"
          className="border border-border shadow-sm"
        />
      </Link>
      
      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Name Row */}
        <div className="flex items-center gap-2 mb-1">
          <Link href={`/people/${person.slug}`}>
            <h3 className="text-lg font-semibold text-foreground hover:underline">
              {person.name}
            </h3>
          </Link>
        </div>
        
        {/* Title & Company */}
        <p className="text-[15px] text-muted-foreground mb-2">
          {person.title || "Professional"} {person.company && (
            <>at <Link href={`/companies/${person.company.toLowerCase().replace(/\s+/g, '-')}`} className="font-medium text-foreground hover:underline">{person.company}</Link></>
          )}
        </p>
        
        {/* Bio */}
        {bio && (
          <p className="text-[15px] text-muted-foreground leading-relaxed">
            {displayText}
            {shouldTruncate && !expanded && "..."}
          </p>
        )}
        
        {shouldTruncate && (
          <button 
            onClick={() => setExpanded(!expanded)}
            className="text-sm font-medium text-foreground hover:underline mt-1.5 flex items-center gap-1"
          >
            {expanded ? (
              <>Show less <ChevronUp className="h-3.5 w-3.5" /></>
            ) : (
              <>Show more <ChevronDown className="h-3.5 w-3.5" /></>
            )}
          </button>
        )}
        
        {/* Tags */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {person.title && (
            <Badge className={`${tagColors[person.accentColor]} hover:opacity-80 border-0 rounded-full px-3 py-1 text-xs font-medium`}>
              {person.title.includes("Founder") || person.title.includes("CEO") ? "Founder" : 
               person.title.includes("Partner") || person.title.includes("Investor") ? "Investor" : "Operator"}
            </Badge>
          )}
          {person.location && (
            <Badge className={`${tagColors[person.accentColor]} hover:opacity-80 border-0 rounded-full px-3 py-1 text-xs font-medium`}>
              <MapPin className="h-3 w-3 mr-1" />
              {person.location}
            </Badge>
          )}
        </div>
      </div>

      {/* Right Side - Actions */}
      <div className="hidden md:flex items-center gap-2 shrink-0">
        {person.linkedIn && (
          <a href={person.linkedIn} target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <Linkedin className="h-5 w-5" />
          </a>
        )}
        <Link 
          href={`/people/${person.slug}`}
          className="p-2.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="h-5 w-5" />
        </Link>
      </div>
    </div>
  );
}

export default function People() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedLocation, setSelectedLocation] = useState("All Regions");
  const [selectedSector, setSelectedSector] = useState("All Sectors");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Edition bias — surface people from the visitor's country first.
  const { editionCountryId } = useEdition();
  // Fetch people from API
  const { data: peopleData, isLoading } = trpc.people.list.useQuery({
    page: currentPage,
    limit: itemsPerPage,
    editionCountryId: editionCountryId ?? undefined,
    search: searchQuery || undefined,
  });

  const totalPages = peopleData?.totalPages || 1;
  const totalItems = peopleData?.total || 0;

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedType, selectedLocation, selectedSector]);

  const people = useMemo(() => {
    if (!peopleData?.items) return [];
    return peopleData.items.map((p, idx) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      title: p.title,
      company: p.company,
      location: null as string | null, // Not returned from list endpoint
      bio: null as string | null, // Not returned from list endpoint
      shortBio: p.shortBio,
      linkedIn: null as string | null, // Not returned from list endpoint
      accentColor: getAccentColor(idx),
    }));
  }, [peopleData]);

  const filteredPeople = useMemo(() => {
    return people.filter((person) => {
      const matchesType = selectedType === "All" || 
        (selectedType === "Founders" && (person.title?.includes("Founder") || person.title?.includes("CEO"))) ||
        (selectedType === "Investors" && (person.title?.includes("Partner") || person.title?.includes("Investor"))) ||
        (selectedType === "Operators" && !person.title?.includes("Founder") && !person.title?.includes("Partner"));
      
      const matchesLocation = (() => {
        if (selectedLocation === "All Regions") return true;
        const location = (person.location || "").toLowerCase();
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
      
      return matchesType && matchesLocation;
    });
  }, [people, selectedType, selectedLocation]);

  const hasActiveFilters = selectedType !== "All" || selectedLocation !== "All Regions" || selectedSector !== "All Sectors";

  const clearFilters = () => {
    setSelectedType("All");
    setSelectedLocation("All Regions");
    setSelectedSector("All Sectors");
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-card">
      <SEO
        title="People Directory - MENA Tech Founders, Investors & Operators"
        description="Connect with founders, investors, and operators across the MENA tech ecosystem. Discover profiles of startup CEOs, venture capitalists, and tech leaders in Dubai, Saudi Arabia, and the Middle East."
        canonical={`${publication.siteUrl}/people`}
        keywords="MENA tech founders, Dubai startup CEOs, Saudi Arabia investors, UAE venture capitalists, Middle East tech leaders, GCC entrepreneurs, startup operators"
        ogImage={`${publication.siteUrl}${publication.assets.ogImage}`}
        ogType="website"
      />
      <Header />
      
      <main className="w-full">
        {/* Hero Section */}
        <section className="bg-foreground text-background">
          <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12">
            <div className="max-w-3xl">
              <Badge className="bg-[#4CB944] text-white border-0 mb-4">People Directory</Badge>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3">
                Discover the people building MENA's tech ecosystem
              </h1>
              <p className="text-background/70 text-sm sm:text-base mb-4 max-w-2xl">
                Connect with {peopleData?.total || 0}+ founders, investors, and operators shaping the future of technology in the Middle East.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-background/60 text-sm">
                  <Users className="h-4 w-4" />
                  <span>{peopleData?.total || 0} professionals</span>
                </div>
                <div className="flex items-center gap-2 text-background/60 text-sm">
                  <Briefcase className="h-4 w-4" />
                  <span>Founders, Investors & Operators</span>
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
                  placeholder="Search people..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 bg-background border-border"
                />
              </div>
              
              {/* Filter Dropdowns */}
              <div className="flex items-center gap-2 flex-wrap">
                <select 
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="h-11 px-4 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                >
                  {personTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
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

                <select 
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(e.target.value)}
                  className="h-11 px-4 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                >
                  {sectors.map(sector => (
                    <option key={sector} value={sector}>{sector}</option>
                  ))}
                </select>

                <Button variant="default" className="h-11 px-6 gap-2 font-medium">
                  <Search className="h-4 w-4" />
                  Search
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 flex flex-col lg:flex-row gap-8">
          <div className="flex-1 min-w-0">
          {/* Results Header */}
          <div className="flex items-center justify-between py-4 border-b border-border">
            <PageInfo
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
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
          
          {/* People List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredPeople.map((person) => (
                <PersonListItem key={person.id} person={person} />
              ))}
            </div>
          )}

          {!isLoading && filteredPeople.length === 0 && (
            <div className="text-center py-10">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground text-lg mb-2">No people found</p>
              <p className="text-caption text-muted-foreground mb-4">Try adjusting your search or filters</p>
              <Button variant="outline" onClick={clearFilters}>
                Clear all filters
              </Button>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && filteredPeople.length > 0 && totalPages > 1 && (
            <div className="py-10 border-t border-border">
              <ListPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
          </div>
          {/* Sidebar */}
          <aside className="w-full lg:w-[300px] lg:shrink-0 py-4">
            <div className="sticky top-20">
              <SidebarAd slotKey="people-sidebar" />
            </div>
          </aside>
        </div>
      </main>

      {/* Leaderboard Ad */}
      <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-4">
        <LeaderboardAd slotKey="people-leaderboard" />
      </div>

      <Footer />
      <MobileStickyAd slotKey="mobile-sticky-bottom" />
    </div>
  );
}
