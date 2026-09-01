import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SEO from "@/components/SEO";
import { trpc } from "@/lib/trpc";
import { LeaderboardAd } from "@/components/ads/AdUnit";
import {
  Gift, Search, ExternalLink, Loader2, ArrowLeft, Star,
} from "lucide-react";

export default function FounderPerks() {
  const [search, setSearch] = useState("");
  const { data: perks, isLoading } = trpc.resources.list.useQuery({
    type: "perk",
    limit: 50,
    page: 1,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const items = perks?.items || [];
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
      <SEO title="Founder Perks | TechScoop" description="Exclusive deals, credits, and discounts from leading software companies for MENA founders." />
      <Header />

      {/* Hero */}
      <section className="bg-emerald-600 text-white">
        <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12">
          <Link href="/resources" className="inline-flex items-center gap-1.5 text-emerald-100 hover:text-white text-sm mb-4">
            <ArrowLeft className="h-4 w-4" /> Back to Resources
          </Link>
          <div className="flex items-center gap-2 text-emerald-200 text-xs font-medium uppercase tracking-wider mb-2">
            <Gift className="h-4 w-4" /> Exclusive Access
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3">Founder Perks</h1>
          <p className="text-emerald-100 text-sm sm:text-base max-w-2xl mb-6">
            Unlock exclusive deals, credits, and discounts from the world's leading software companies — curated for verified MENA founders.
          </p>
          <div className="relative max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-300" />
            <Input
              placeholder="Search by company, category, or offer type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-emerald-200 focus:bg-white/20"
            />
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Gift className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-2">No perks found</h3>
            <p className="text-muted-foreground text-sm">
              {search ? "Try a different search term." : "Perks will appear here as they are added."}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">{filtered.length} perks available</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((perk: any) => (
                <Card key={perk.id} className="border shadow-sm hover:shadow-md transition-shadow group">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start gap-3 mb-3">
                      {perk.providerLogo ? (
                        <img src={perk.providerLogo} alt={perk.provider || ""} className="h-10 w-10 rounded-lg object-contain bg-muted border shrink-0" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                          <Gift className="h-5 w-5 text-emerald-600" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm leading-tight">{perk.title}</h3>
                        {perk.provider && (
                          <p className="text-xs text-muted-foreground mt-0.5">{perk.provider}</p>
                        )}
                      </div>
                    </div>
                    {perk.value && (
                      <Badge variant="secondary" className="mb-2 text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                        {perk.value}
                      </Badge>
                    )}
                    {perk.shortDescription && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{perk.shortDescription}</p>
                    )}
                    {perk.externalUrl && (
                      <a href={perk.externalUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="w-full text-xs gap-1.5">
                          Claim Offer <ExternalLink className="h-3 w-3" />
                        </Button>
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Leaderboard Ad */}
        <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-4">
          <LeaderboardAd slotKey="category-leaderboard" />
        </div>

        <Footer />
    </div>
  );
}
