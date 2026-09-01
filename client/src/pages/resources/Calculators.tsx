import { useState } from "react";
import { Link } from "wouter";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FilterPanel, ActiveFilterTags, CategoryChips, BackToResources } from "@/components/resources/FilterPanel";
import { SidebarAd, LeaderboardAd } from "@/components/ads/AdUnit";
import { RelatedArticles } from "@/components/resources/RelatedArticles";
import { PageCTA } from "@/components/resources/PageCTA";
import { 
  Search,
  ArrowRight, 
  SlidersHorizontal,
  LineChart,
  BarChart3
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { calculatorsData, calculatorCategories, calculatorFilterGroups } from "@/data/calculatorsData";

export default function Calculators() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const handleFilterChange = (key: string, value: string) => {
    setActiveFilters((prev) => {
      const current = prev[key] || [];
      if (current.includes(value)) {
        return { ...prev, [key]: current.filter((v) => v !== value) };
      }
      return { ...prev, [key]: [...current, value] };
    });
  };

  const clearFilters = () => {
    setActiveFilters({});
    setSelectedCategory(null);
  };

  const filteredCalculators = calculatorsData.filter((calc) => {
    if (searchQuery && !calc.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (selectedCategory && selectedCategory !== "all" && calc.category !== selectedCategory) {
      return false;
    }
    if (activeFilters.category?.length && !activeFilters.category.includes(calc.category)) {
      return false;
    }
    if (activeFilters.popular?.includes("true") && !calc.popular) {
      return false;
    }
    return true;
  });

  // Category icons for chips
  const categoriesWithIcons = calculatorCategories.map(cat => ({
    ...cat,
    icon: cat.value === "Financial" ? <LineChart className="w-4 h-4" /> :
          cat.value === "SaaS" ? <BarChart3 className="w-4 h-4" /> :
          undefined
  }));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero - Green Banner */}
      <section className="w-full bg-[#4CB944]">
        <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="max-w-3xl">
            <BackToResources />
            <p className="text-white/80 text-sm uppercase tracking-wider mb-2">Tools</p>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3">
              Calculators
            </h1>
            <p className="text-white/90 text-sm sm:text-base leading-relaxed mb-6 max-w-2xl">
              Financial and business calculators to help you make data-driven decisions.
            </p>

            <div className="relative max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search calculators…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 pl-12 pr-4 rounded-xl bg-white text-foreground border-0"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Category Chips */}
      <section className="border-b border-border bg-background">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-4">
          <CategoryChips
            categories={categoriesWithIcons}
            activeCategory={selectedCategory}
            onSelect={setSelectedCategory}
          />
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8 lg:py-12">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            {/* Desktop Filters */}
            <aside className="hidden lg:block w-64 shrink-0">
              <div className="sticky top-24 space-y-6">
                <div className="bg-card rounded-xl border border-border p-5">
                  <FilterPanel
                    groups={calculatorFilterGroups}
                    activeFilters={activeFilters}
                    onFilterChange={handleFilterChange}
                    onClearFilters={clearFilters}
                  />
                </div>
                <SidebarAd slotKey="category-sidebar" />
              </div>
            </aside>

            {/* Content */}
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
                        groups={calculatorFilterGroups}
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
                  {filteredCalculators.length} calculators
                </p>
              </div>

              <ActiveFilterTags 
                activeFilters={activeFilters} 
                onRemove={handleFilterChange} 
              />

              <div className="hidden lg:flex items-center justify-between mb-6">
                <p className="text-sm text-muted-foreground">
                  Showing {filteredCalculators.length} of {calculatorsData.length} calculators
                </p>
              </div>

              {filteredCalculators.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                  {filteredCalculators.map((calc) => {
                    const IconComponent = calc.icon;
                    const hasDetailPage = !!calc.slug;
                    
                    const cardContent = (
                      <Card 
                        className="group cursor-pointer border border-border hover:border-foreground/20 hover:shadow-lg transition-all duration-200 h-full"
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-muted group-hover:bg-foreground group-hover:text-background flex items-center justify-center transition-colors">
                              <IconComponent className="w-6 h-6" />
                            </div>
                            <div className="flex items-center gap-2">
                              {calc.popular && (
                                <Badge variant="secondary" className="text-[10px]">Popular</Badge>
                              )}
                              <Badge variant="outline" className="text-[10px]">{calc.category}</Badge>
                            </div>
                          </div>
                          <h3 className="text-lg font-semibold text-foreground mb-2">
                            {calc.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {calc.description}
                          </p>
                          <div className="mt-4 flex items-center text-sm font-medium text-muted-foreground group-hover:text-foreground">
                            {hasDetailPage ? "Open Calculator" : "Use Calculator"}
                            <ArrowRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </CardContent>
                      </Card>
                    );
                    
                    if (hasDetailPage) {
                      return (
                        <Link key={calc.id} href={`/resources/calculators/${calc.slug}`}>
                          {cardContent}
                        </Link>
                      );
                    }
                    
                    return (
                      <div key={calc.id}>
                        {cardContent}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-lg text-muted-foreground mb-4">No calculators found.</p>
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                </div>
              )}

              {/* Inline Banner */}
              <div className="mt-8">
                <LeaderboardAd slotKey="category-leaderboard" />
              </div>
            </div>

            {/* Right Sidebar */}
            <aside className="hidden xl:block w-[300px] shrink-0">
              <div className="sticky top-24 space-y-6">
                <SidebarAd slotKey="category-sidebar" />
                
                <Card className="border border-border">
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-foreground mb-4">Featured Calculators</h3>
                    <div className="space-y-3">
                      <Link href="/resources/calculators/runway" className="block p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <p className="text-sm font-medium text-foreground">Runway Calculator</p>
                        <p className="text-xs text-muted-foreground">How long will your cash last?</p>
                      </Link>
                      <Link href="/resources/calculators/saas-quick-ratio" className="block p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <p className="text-sm font-medium text-foreground">SaaS Quick Ratio</p>
                        <p className="text-xs text-muted-foreground">Measure growth efficiency</p>
                      </Link>
                      <Link href="/resources/calculators/cac-ltv" className="block p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <p className="text-sm font-medium text-foreground">CAC/LTV Calculator</p>
                        <p className="text-xs text-muted-foreground">Customer economics</p>
                      </Link>
                      <Link href="/resources/calculators/dilution" className="block p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <p className="text-sm font-medium text-foreground">Dilution Calculator</p>
                        <p className="text-xs text-muted-foreground">Equity impact analysis</p>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* CTA */}
      <PageCTA 
        headline="Calculate.\nPlan ahead.\nGrow smart."
        primaryButtonText="Explore all tools"
        primaryButtonLink="/resources"
        secondaryButtonText="Get in touch"
        secondaryButtonLink="/contact"
        stats={[
          { value: `${calculatorsData.length}`, label: "Calculators" },
          { value: "2", label: "Categories" },
          { value: "100%", label: "Free to Use" },
          { value: "MENA", label: "Focused" },
        ]}
      />

      <Footer />
    </div>
  );
}