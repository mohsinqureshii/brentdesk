import { useState, useRef } from "react";
import { Link } from "wouter";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FilterPanel, ActiveFilterTags, BackToResources } from "@/components/resources/FilterPanel";
import { SidebarAd, LeaderboardAd } from "@/components/ads/AdUnit";
import { PageCTA } from "@/components/resources/PageCTA";
import { Search, SlidersHorizontal, Download, FileText, FileSpreadsheet, Presentation, ArrowRight, Gift, Loader2, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { getArticleUrl } from "@/lib/articleUrl";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";

// Pastel background colors for trending cards
const trendingPastelColors = [
  "bg-pink-100",
  "bg-blue-100",
  "bg-green-100",
  "bg-yellow-100",
  "bg-purple-100",
  "bg-orange-100",
];

// Helper function to format time ago
function formatTimeAgo(date: Date | string | null | undefined): string {
  if (!date) return "Recently";
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

const filterGroups = [
  {
    title: "Type",
    key: "type",
    variant: "dropdown" as const,
    options: [
      { label: "Legal", value: "Legal" },
      { label: "Finance", value: "Finance" },
      { label: "HR", value: "HR" },
      { label: "Sales", value: "Sales" },
      { label: "Product", value: "Product" },
    ],
  },
  {
    title: "Format",
    key: "format",
    variant: "dropdown" as const,
    options: [
      { label: "Document", value: "doc" },
      { label: "PDF", value: "pdf" },
      { label: "Spreadsheet", value: "sheet" },
      { label: "Presentation", value: "ppt" },
      { label: "Notion Template", value: "notion" },
      { label: "Google Sheets", value: "gsheet" },
      { label: "Excel", value: "excel" },
    ],
  },
  {
    title: "Country",
    key: "country",
    variant: "dropdown" as const,
    options: [
      { label: "Global", value: "Global" },
      { label: "Saudi Arabia", value: "KSA" },
      { label: "UAE", value: "UAE" },
      { label: "Egypt", value: "Egypt" },
      { label: "Qatar", value: "Qatar" },
      { label: "Kuwait", value: "Kuwait" },
      { label: "Bahrain", value: "Bahrain" },
      { label: "Oman", value: "Oman" },
      { label: "Jordan", value: "Jordan" },
    ],
  },
  {
    title: "Price",
    key: "free",
    variant: "dropdown" as const,
    options: [
      { label: "Free", value: "true" },
      { label: "Premium", value: "false" },
    ],
  },
  {
    title: "Stage",
    key: "stage",
    variant: "dropdown" as const,
    options: [
      { label: "Pre-Seed", value: "pre-seed" },
      { label: "Seed", value: "seed" },
      { label: "Series A", value: "series-a" },
      { label: "Series B+", value: "series-b" },
      { label: "All Stages", value: "all" },
    ],
  },
];

const formatIcons: Record<string, React.ElementType> = {
  doc: FileText,
  pdf: FileText,
  sheet: FileSpreadsheet,
  ppt: Presentation,
};

const formatColors: Record<string, string> = {
  doc: "bg-blue-100 text-blue-700",
  pdf: "bg-red-100 text-red-700",
  sheet: "bg-green-100 text-green-700",
  ppt: "bg-orange-100 text-orange-700",
};

export default function Templates() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const trendingScrollRef = useRef<HTMLDivElement>(null);

  // Fetch trending templates (most downloaded/viewed)
  const { data: trendingTemplatesData } = trpc.resources.list.useQuery({
    type: "template",
    limit: 6,
    sortBy: "viewCount",
    sortOrder: "desc",
  });

  const trendingTemplates = (trendingTemplatesData?.items || []).map((item: any) => ({
    id: item.id,
    slug: item.slug,
    name: item.title,
    type: item.shortDescription?.split(' ')[0] || 'Legal',
    format: 'pdf' as const,
    country: 'Global',
    free: true,
    downloads: item.viewCount || 0,
    description: item.shortDescription || '',
    downloadUrl: (item as any).downloadUrl,
    externalUrl: (item as any).externalUrl,
    provider: item.provider,
    providerLogo: item.providerLogo,
  }));

  const scrollTrending = (direction: 'left' | 'right') => {
    if (trendingScrollRef.current) {
      const scrollAmount = 280;
      trendingScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // This function is no longer used for trending templates
  // const handleTrendingDownload = async (template: any) => {
  //   setDownloadingId(template.id);
  //   try {
  //     await downloadMutation.mutateAsync({ resourceId: template.id });
  //     const url = template.downloadUrl || template.externalUrl;
  //     if (url) {
  //       const link = document.createElement('a');
  //       link.href = url;
  //       link.download = template.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  //       link.target = '_blank';
  //       document.body.appendChild(link);
  //       link.click();
  //       document.body.removeChild(link);
  //       toast.success("Download started!");
  //     } else {
  //       toast.error("Download link not available");
  //     }
  //   } catch (error) {
  //     toast.error("Failed to start download");
  //   } finally {
  //     setDownloadingId(null);
  //   }
  // };

  // Fetch templates from database
  const { data: templatesData, isLoading } = trpc.resources.list.useQuery({
    type: "template",
    limit: 50,
  });

  const downloadMutation = trpc.resources.trackDownload.useMutation();

  const handleFilterChange = (key: string, value: string) => {
    setActiveFilters((prev) => {
      const current = prev[key] || [];
      if (current.includes(value)) {
        return { ...prev, [key]: current.filter((v) => v !== value) };
      }
      return { ...prev, [key]: [...current, value] };
    });
  };

  const clearFilters = () => setActiveFilters({});

  const handleDownload = async (template: {
    id: number;
    title: string;
    downloadUrl?: string | null;
    externalUrl?: string | null;
    isFree?: boolean | null;
  }) => {
    setDownloadingId(template.id);
    
    try {
      // Track the download
      await downloadMutation.mutateAsync({ resourceId: template.id });
      
      // Determine the download URL
      const url = template.downloadUrl || template.externalUrl;
      
      if (url) {
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = url;
        link.download = template.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success("Download started!");
      } else {
        toast.error("Download link not available");
      }
    } catch (error) {
      toast.error("Failed to start download");
    } finally {
      setDownloadingId(null);
    }
  };

  // Transform database data to match UI expectations
  const templates = (templatesData?.items || []).map(item => ({
    id: item.id,
    slug: item.slug,
    name: item.title,
    type: item.shortDescription?.split(' ')[0] || 'Legal', // Extract type from description
    format: 'pdf' as const, // Default format
    country: 'Global',
    free: true, // Default to free
    downloads: item.viewCount || 0,
    description: item.shortDescription || '',
    downloadUrl: (item as any).downloadUrl,
    externalUrl: (item as any).externalUrl,
    provider: item.provider,
    providerLogo: item.providerLogo,
  }));

  const filteredTemplates = templates.filter((template) => {
    if (searchQuery && !template.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (activeFilters.type?.length && !activeFilters.type.includes(template.type)) {
      return false;
    }
    if (activeFilters.format?.length && !activeFilters.format.includes(template.format)) {
      return false;
    }
    if (activeFilters.country?.length && !activeFilters.country.includes(template.country)) {
      return false;
    }
    if (activeFilters.free?.length) {
      const isFree = template.free.toString();
      if (!activeFilters.free.includes(isFree)) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero - Green Banner */}
      <section className="w-full bg-[#4CB944]">
        <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="max-w-3xl">
            <BackToResources />
            <p className="text-white/80 text-sm uppercase tracking-wider mb-2">Resources</p>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3">
              Templates & Toolkits
            </h1>
            <p className="text-white/90 text-sm sm:text-base leading-relaxed mb-6 max-w-2xl">
              Download ready-to-use legal, finance, and HR templates designed for MENA startups.
            </p>

            <div className="relative max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search templates…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 pl-12 pr-4 rounded-xl bg-white text-foreground border-0"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Trending Now Section - Trending Templates */}
      {trendingTemplates.length > 0 && (
        <section className="py-6 border-b border-border">
          <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-1 h-5 rounded-sm bg-red-500" />
                <TrendingUp className="h-4 w-4 text-red-500" />
                <h2 className="text-lg font-bold text-foreground">Trending Templates</h2>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => scrollTrending('left')}
                  className="p-1.5 rounded-full border border-border hover:bg-muted transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button 
                  onClick={() => scrollTrending('right')}
                  className="p-1.5 rounded-full border border-border hover:bg-muted transition-colors"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div 
              ref={trendingScrollRef}
              className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
            >
              {trendingTemplates.map((template, idx) => (
                <div
                  key={template.id}
                  className={`group shrink-0 w-[280px] rounded-xl p-4 ${trendingPastelColors[idx % trendingPastelColors.length]} hover:shadow-md transition-all overflow-hidden`}
                >
                  <Badge variant="outline" className="mb-2 bg-white/80 border-none text-xs font-medium px-2 py-0.5">
                    {template.type}
                  </Badge>
                  <h4 className="text-sm font-bold text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors mb-3 break-words">
                    {template.name}
                  </h4>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                    <span>{template.format.toUpperCase()}</span>
                    <span>•</span>
                    <span>{template.downloads} downloads</span>
                  </div>
                  <Link href={`/resources/templates/${template.slug}`}>
                    <button className="w-full px-3 py-2 rounded-lg bg-foreground text-background text-xs font-medium hover:bg-foreground/90 transition-colors">
                      Get it now
                    </button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Main Content */}
      <section className="py-8 lg:py-12">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            {/* Left Sidebar - Filters + Related Content */}
            <aside className="hidden lg:block w-72 shrink-0">
              <div className="sticky top-24 space-y-6">
                <div className="bg-card rounded-xl border border-border p-5">
                  <FilterPanel
                    groups={filterGroups}
                    activeFilters={activeFilters}
                    onFilterChange={handleFilterChange}
                    onClearFilters={clearFilters}
                  />
                </div>
                
                <SidebarAd slotKey="category-sidebar" />
                
                {/* Related Resources */}
                <Card className="border border-border">
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-foreground mb-4">Related Resources</h3>
                    <div className="space-y-3">
                      <Link href="/resources/playbooks" className="block p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <p className="text-sm font-medium text-foreground">Fundraising Playbook</p>
                        <p className="text-xs text-muted-foreground">Step-by-step guide</p>
                      </Link>
                      <Link href="/resources/calculators" className="block p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <p className="text-sm font-medium text-foreground">Valuation Calculator</p>
                        <p className="text-xs text-muted-foreground">Calculate your worth</p>
                      </Link>
                      <Link href="/resources/perks" className="block p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <p className="text-sm font-medium text-foreground">Founder Perks</p>
                        <p className="text-xs text-muted-foreground">$1M+ in credits</p>
                      </Link>
                    </div>
                  </CardContent>
                </Card>

                {/* Related Articles */}
                <Card className="border border-border">
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-foreground mb-4">Related Articles</h3>
                    <div className="space-y-4">
                      <a href="/news" className="block group">
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                          Essential Legal Documents Every Startup Needs
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">5 min read</p>
                      </a>
                      <a href="/news" className="block group">
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                          Building Your First Financial Model
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">8 min read</p>
                      </a>
                      <a href="/news" className="block group">
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                          HR Templates for Remote Teams
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">6 min read</p>
                      </a>
                    </div>
                    <Link href="/news" className="flex items-center gap-1 text-sm font-medium text-primary mt-4 hover:underline">
                      View all articles
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </CardContent>
                </Card>

                {/* Perks CTA */}
                <Card className="border border-amber-200 bg-gradient-to-br from-amber-50 to-white">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Gift className="w-5 h-5 text-amber-600" />
                      <h3 className="font-semibold text-foreground">Founder Perks</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Get exclusive deals on premium templates and more.
                    </p>
                    <Link href="/resources/perks">
                      <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                        Claim Your Perks
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <SidebarAd slotKey="category-sidebar" />
              </div>
            </aside>

            {/* Content - Full Width List */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-4 lg:hidden">
                <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <SlidersHorizontal className="w-4 h-4" />
                      Filters
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[80vh]">
                    <SheetHeader>
                      <SheetTitle>Filters</SheetTitle>
                    </SheetHeader>
                    <div className="py-4 overflow-y-auto">
                      <FilterPanel
                        groups={filterGroups}
                        activeFilters={activeFilters}
                        onFilterChange={handleFilterChange}
                        onClearFilters={clearFilters}
                      />
                    </div>
                    <Button className="w-full" onClick={() => setMobileFiltersOpen(false)}>
                      Apply Filters
                    </Button>
                  </SheetContent>
                </Sheet>
                <p className="text-sm text-muted-foreground">
                  {filteredTemplates.length} templates
                </p>
              </div>

              <ActiveFilterTags 
                activeFilters={activeFilters} 
                onRemove={handleFilterChange} 
              />

              <div className="hidden lg:flex items-center justify-between mb-6">
                <p className="text-sm text-muted-foreground">
                  Showing {filteredTemplates.length} templates
                </p>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredTemplates.length > 0 ? (
                <div className="space-y-4">
                  {filteredTemplates.map((template) => {
                    const FormatIcon = formatIcons[template.format] || FileText;
                    const formatColor = formatColors[template.format] || "bg-muted text-muted-foreground";
                    const isDownloading = downloadingId === template.id;
                    
                    return (
                      <Card key={template.id} className="border border-border hover:border-foreground/20 hover:shadow-lg transition-all duration-200">
                        <CardContent className="p-6">
                          <div className="flex gap-6">
                            {/* Format Icon */}
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${formatColor}`}>
                              <FormatIcon className="w-7 h-7" />
                            </div>
                            
                            {/* Template Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4 mb-2">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <Link href={`/resources/templates/${template.slug}`}>
                                      <h3 className="text-lg font-semibold text-foreground hover:text-primary transition-colors cursor-pointer">{template.name}</h3>
                                    </Link>
                                    {template.provider && (
                                      <Badge variant="outline" className="text-xs">
                                        {template.provider}
                                      </Badge>
                                    )}
                                    {!template.free && (
                                      <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                                        Premium
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">{template.description}</p>
                                </div>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
                                  <Download className="w-4 h-4" />
                                  {template.downloads.toLocaleString()}
                                </div>
                              </div>

                              {/* Tags & Meta */}
                              <div className="flex items-center justify-between mt-4">
                                <div className="flex flex-wrap gap-2">
                                  <Badge variant="outline" className="text-xs">{template.type}</Badge>
                                  <Badge variant="secondary" className="text-xs uppercase">{template.format}</Badge>
                                  <Badge variant="secondary" className="text-xs">{template.country}</Badge>
                                </div>
                                <Button 
                                  className="gap-2 bg-foreground hover:bg-foreground/90 text-background"
                                  onClick={() => handleDownload({
                                    id: template.id,
                                    title: template.name,
                                    downloadUrl: template.downloadUrl,
                                    externalUrl: template.externalUrl,
                                    isFree: template.free,
                                  })}
                                  disabled={isDownloading}
                                >
                                  {isDownloading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Download className="w-4 h-4" />
                                  )}
                                  {template.free ? "Download Free" : "Get Template"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-lg text-muted-foreground mb-4">No templates found.</p>
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                </div>
              )}

              {/* Inline Ad Banner */}
              <div className="mt-8">
                <LeaderboardAd slotKey="category-leaderboard" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Compact CTA Section - Missing Template */}
      <PageCTA 
        headline="Missing a template?"
        subheadline="Tell us what you need and we'll create it for you."
        primaryButtonText="Write to us"
        primaryButtonLink="/contact"
        secondaryButtonText="Browse all"
        secondaryButtonLink="#templates"
        stats={[]}
        compact={true}
      />

      <Footer />
    </div>
  );
}
