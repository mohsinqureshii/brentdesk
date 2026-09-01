import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SEO from "@/components/SEO";
import { trpc } from "@/lib/trpc";
import { LeaderboardAd } from "@/components/ads/AdUnit";
import {
  Scale, Search, ExternalLink, Loader2, ArrowLeft,
} from "lucide-react";

export default function RegulationsHub() {
  const [search, setSearch] = useState("");
  const { data: regulations, isLoading } = trpc.resources.list.useQuery({
    type: "regulation",
    limit: 50,
    page: 1,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const items = regulations?.items || [];
  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (p: any) =>
        p.title?.toLowerCase().includes(q) ||
        p.provider?.toLowerCase().includes(q) ||
        p.shortDescription?.toLowerCase().includes(q)
    );
  }, [items, search]);

  return (
    <div className="min-h-screen bg-white">
      <SEO title="Regulations Hub | TechScoop" description="Country-specific compliance guides for business setup, tax, data privacy, and more across MENA markets." />
      <Header />

      <section className="bg-green-700 text-white">
        <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12">
          <Link href="/resources" className="inline-flex items-center gap-1.5 text-green-100 hover:text-white text-sm mb-4">
            <ArrowLeft className="h-4 w-4" /> Back to Resources
          </Link>
          <div className="flex items-center gap-2 text-green-200 text-xs font-medium uppercase tracking-wider mb-2">
            <Scale className="h-4 w-4" /> Compliance & Legal
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3">Regulations Hub</h1>
          <p className="text-green-100 text-sm sm:text-base max-w-2xl mb-6">
            Country-specific compliance guides for business setup, tax, data privacy, and more across MENA markets.
          </p>
          <div className="relative max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-300" />
            <Input
              placeholder="Search regulations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-green-200 focus:bg-white/20"
            />
          </div>
        </div>
      </section>

      <section className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Scale className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-2">No regulations found</h3>
            <p className="text-muted-foreground text-sm">
              {search ? "Try a different search term." : "Regulations will appear here as they are published."}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">{filtered.length} regulations available</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((item: any) => (
                <Card key={item.id} className="border shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                        <Scale className="h-5 w-5 text-green-700" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm leading-tight">{item.title}</h3>
                        {item.provider && <p className="text-xs text-muted-foreground mt-0.5">{item.provider}</p>}
                      </div>
                    </div>
                    {item.shortDescription && <p className="text-xs text-muted-foreground line-clamp-3 mb-3">{item.shortDescription}</p>}
                    {item.externalUrl ? (
                      <a href={item.externalUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="w-full text-xs gap-1.5">View Details <ExternalLink className="h-3 w-3" /></Button>
                      </a>
                    ) : (
                      <Button variant="outline" size="sm" className="w-full text-xs gap-1.5" disabled>Coming Soon</Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Leaderboard Ad */}
        <div className="container max-w-[1400px] mx-auto px-3 py-4">
          <LeaderboardAd slotKey="category-leaderboard" />
        </div>

        <Footer />
    </div>
  );
}
