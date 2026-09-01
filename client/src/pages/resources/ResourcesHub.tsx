import { useState } from "react";
import { Link } from "wouter";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { PageCTA } from "@/components/resources/PageCTA";
import { trpc } from "@/lib/trpc";
import { LeaderboardAd } from "@/components/ads/AdUnit";
import { 
  Search, 
  ArrowRight, 
  TrendingUp, 
  Download, 
  Sparkles,
  FileText,
  Gift,
  Wrench,
  BookOpen,
  Scale,
  Calculator,
  Building2,
  Package,
  Loader2,
  ExternalLink
} from "lucide-react";

const quickChips = [
  "KSA", "UAE", "ZATCA", "SAFE", "AWS Credits", "Funding", "Legal", "AI Tools"
];

// Static category data for the resource categories grid
const resourceCategories = [
  {
    id: "perks",
    title: "Founder Perks",
    description: "Exclusive discounts and credits from top SaaS tools",
    icon: Gift,
    href: "/resources/perks",
  },
  {
    id: "templates",
    title: "Templates",
    description: "Legal docs, pitch decks, financial models",
    icon: FileText,
    href: "/resources/templates",
  },
  {
    id: "tools",
    title: "Tools Directory",
    description: "Curated software for MENA startups",
    icon: Wrench,
    href: "/resources/tools",
  },
  {
    id: "playbooks",
    title: "Playbooks",
    description: "Step-by-step guides for founders",
    icon: BookOpen,
    href: "/resources/playbooks",
  },
  {
    id: "regulations",
    title: "Regulations",
    description: "MENA compliance and legal guides",
    icon: Scale,
    href: "/resources/regulations",
  },
  {
    id: "calculators",
    title: "Calculators",
    description: "Runway, dilution, and more",
    icon: Calculator,
    href: "/resources/calculators",
  },
  {
    id: "vendors",
    title: "Service Providers",
    description: "Vetted agencies and consultants",
    icon: Building2,
    href: "/resources/vendors",
  },
  {
    id: "packs",
    title: "Starter Packs",
    description: "Curated bundles for founders",
    icon: Package,
    href: "/resources/packs",
  },
];

// Perk card component for the trending section
function PerkCard({ perk }: { perk: { id: number; title: string; slug: string; shortDescription?: string | null; provider?: string | null; providerLogo?: string | null; value?: string | null; } }) {
  return (
    <Link href={`/resources/perks/${perk.slug}`}>
      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            {perk.providerLogo ? (
              <img 
                src={perk.providerLogo} 
                alt={perk.provider || ""} 
                className="w-12 h-12 object-contain rounded-lg bg-white p-1 border"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Gift className="w-6 h-6 text-emerald-600" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground mb-1">{perk.provider}</p>
              <h3 className="font-semibold text-foreground line-clamp-1">{perk.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {perk.shortDescription}
              </p>
              {perk.value && (
                <Badge className="mt-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                  {perk.value}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// Template card component
function TemplateCard({ template }: { template: { id: number; title: string; slug: string; shortDescription?: string | null; provider?: string | null; viewCount?: number | null; downloadUrl?: string | null; externalUrl?: string | null; } }) {
  const handleClick = () => {
    const url = template.downloadUrl || template.externalUrl;
    if (url) {
      window.open(url, '_blank');
    } else {
      // Fallback: navigate to templates page
      window.location.href = '/resources/templates';
    }
  };

  return (
    <div onClick={handleClick} className="cursor-pointer">
      <Card className="h-full hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground line-clamp-1">{template.title}</h3>
              <p className="text-xs text-muted-foreground">{template.provider}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {template.shortDescription}
          </p>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Download className="w-3 h-3" />
              <span>{template.viewCount?.toLocaleString() || 0} downloads</span>
            </div>
            <Badge variant="outline" className="text-xs">Free</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Tool card component
function ToolCard({ tool }: { tool: { id: number; title: string; slug: string; shortDescription?: string | null; provider?: string | null; providerLogo?: string | null; value?: string | null; } }) {
  return (
    <Link href={`/resources/tools/${tool.slug}`}>
      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            {tool.providerLogo ? (
              <img 
                src={tool.providerLogo} 
                alt={tool.provider || ""} 
                className="w-10 h-10 object-contain rounded-lg"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Wrench className="w-5 h-5 text-purple-600" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground">{tool.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {tool.shortDescription}
              </p>
              {tool.value && (
                <Badge variant="outline" className="mt-2">
                  {tool.value}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function ResourcesHub() {
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch perks (featured)
  const { data: perksData, isLoading: perksLoading } = trpc.resources.getByType.useQuery({
    type: "perk",
    limit: 8,
  });

  // Fetch templates (most downloaded)
  const { data: templatesData, isLoading: templatesLoading } = trpc.resources.getByType.useQuery({
    type: "template",
    limit: 4,
  });

  // Fetch tools
  const { data: toolsData, isLoading: toolsLoading } = trpc.resources.getByType.useQuery({
    type: "tool",
    limit: 6,
  });

  // Fetch playbooks for new additions
  const { data: playbooksData, isLoading: playbooksLoading } = trpc.resources.getByType.useQuery({
    type: "playbook",
    limit: 6,
  });

  const isLoading = perksLoading || templatesLoading || toolsLoading || playbooksLoading;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section - Green Banner */}
      <section className="w-full bg-[#4CB944]">
        <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="max-w-3xl">
            <p className="text-white/80 text-sm uppercase tracking-wider mb-2">Founder OS</p>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3">
              Resources for founders in MENA
            </h1>
            <p className="text-white/90 text-sm sm:text-base leading-relaxed mb-6 max-w-2xl">
              Templates, founder perks, regulations, tools, grants, and playbooks — curated by TechScoop.
            </p>

            {/* Search */}
            <div className="relative max-w-xl mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search perks, templates, laws, tools…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 pl-12 pr-4 text-base rounded-xl bg-white text-foreground border-0"
              />
            </div>

            {/* Quick Chips */}
            <div className="flex flex-wrap gap-2">
              {quickChips.map((chip) => (
                <Badge 
                  key={chip}
                  variant="outline"
                  className="px-3 py-1.5 text-sm border-white/30 text-white hover:bg-white hover:text-[#4CB944] cursor-pointer transition-colors"
                >
                  {chip}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Category Grid */}
      <section className="py-10 lg:py-12">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              Explore by Category
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {resourceCategories.map((category) => (
              <ResourceCard
                key={category.id}
                title={category.title}
                description={category.description}
                icon={category.icon}
                href={category.href}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Trending This Week - Perks */}
      <section className="py-12 lg:py-16 bg-muted/30 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent-yellow flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-foreground" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Trending Perks
              </h2>
            </div>
            <Link href="/resources/perks">
              <Button variant="ghost" className="gap-2">
                View All
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
        
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8">
          {perksLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : perksData && perksData.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {perksData.map((perk) => (
                <PerkCard key={perk.id} perk={perk} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No perks available yet</p>
            </div>
          )}
        </div>
      </section>

      {/* Most Downloaded Templates */}
      <section className="py-12 lg:py-16">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent-mint flex items-center justify-center">
                <Download className="w-5 h-5 text-foreground" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Most Downloaded
              </h2>
            </div>
            <Link href="/resources/templates">
              <Button variant="ghost" className="gap-2">
                View All
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          
          {templatesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : templatesData && templatesData.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {templatesData.map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No templates available yet</p>
            </div>
          )}
        </div>
      </section>

      {/* Tools Directory */}
      <section className="py-12 lg:py-16 bg-muted/30">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent-blue flex items-center justify-center">
                <Wrench className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                  Tools Directory
                </h2>
                <p className="text-muted-foreground">Curated software for MENA startups</p>
              </div>
            </div>
            <Link href="/resources/tools">
              <Button variant="ghost" className="gap-2">
                View All
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          
          {toolsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : toolsData && toolsData.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {toolsData.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Wrench className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No tools available yet</p>
            </div>
          )}
        </div>
      </section>

      {/* Playbooks / New Additions */}
      <section className="py-12 lg:py-16">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-orange-600" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Founder Playbooks
              </h2>
            </div>
            <Link href="/resources/playbooks">
              <Button variant="ghost" className="gap-2">
                View All
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          
          {playbooksLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : playbooksData && playbooksData.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {playbooksData.map((playbook) => (
                <Link key={playbook.id} href={`/resources/playbooks/${playbook.slug}`}>
                  <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground line-clamp-1">{playbook.title}</h3>
                          <p className="text-xs text-muted-foreground">{playbook.provider}</p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {playbook.shortDescription}
                      </p>
                      <div className="flex items-center gap-2 mt-3">
                        <Badge variant="outline" className="text-xs">
                          Guide
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No playbooks available yet</p>
            </div>
          )}
        </div>
      </section>

      {/* Full-width CTA */}
      <PageCTA 
        headline="Your founder toolkit.\nAll in one place.\nLet's go."
        subheadline="Access templates, calculators, perks, and expert resources to accelerate your startup journey."
        primaryButtonText="Explore Perks"
        primaryButtonLink="/resources/perks"
        secondaryButtonText="Contact Us"
        secondaryButtonLink="/contact"
        stats={[
          { value: "500+", label: "Resources" },
          { value: "$1M+", label: "In Savings" },
          { value: "50+", label: "Partners" },
          { value: "Free", label: "Access" },
        ]}
      />

      {/* Leaderboard Ad */}
        <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-4">
          <LeaderboardAd slotKey="category-leaderboard" />
        </div>

        <Footer />
    </div>
  );
}
