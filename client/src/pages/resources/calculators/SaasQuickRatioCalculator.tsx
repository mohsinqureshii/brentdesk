import { useState } from "react";
import { Link } from "wouter";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SidebarAd } from "@/components/ads/AdUnit";
import { BackToResources } from "@/components/resources/FilterPanel";
import { LineChart, ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react";

export default function SaasQuickRatioCalculator() {
  const [newMrr, setNewMrr] = useState("");
  const [expansionMrr, setExpansionMrr] = useState("");
  const [churnedMrr, setChurnedMrr] = useState("");
  const [contractionMrr, setContractionMrr] = useState("");

  const growth = parseFloat(newMrr || "0") + parseFloat(expansionMrr || "0");
  const loss = parseFloat(churnedMrr || "0") + parseFloat(contractionMrr || "0");
  const quickRatio = loss > 0 ? (growth / loss).toFixed(2) : "0";

  const getStatus = () => {
    const ratio = parseFloat(quickRatio);
    if (ratio >= 4) return { color: "text-green-600", bg: "bg-green-100", label: "Excellent" };
    if (ratio >= 2) return { color: "text-amber-600", bg: "bg-amber-100", label: "Good" };
    return { color: "text-red-600", bg: "bg-red-100", label: "Needs Work" };
  };

  const status = getStatus();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <section className="w-full bg-[#4CB944]">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="max-w-3xl">
            <BackToResources />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <LineChart className="w-6 h-6 text-white" />
              </div>
              <Badge className="bg-white/20 text-white border-0">SaaS Metrics</Badge>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              SaaS Quick Ratio Calculator
            </h1>
            <p className="text-white/90 text-base sm:text-lg leading-relaxed max-w-2xl">
              Measure your growth efficiency. A Quick Ratio of 4+ indicates efficient, sustainable growth.
            </p>
          </div>
        </div>
      </section>

      <section className="py-8 lg:py-12">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            <div className="flex-1 max-w-3xl">
              <Link href="/resources/calculators" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
                <ArrowLeft className="w-4 h-4" />
                Back to Calculators
              </Link>

              <Card className="border border-border">
                <CardContent className="p-6 lg:p-8">
                  <p className="text-sm text-muted-foreground mb-6">Quick Ratio = (New MRR + Expansion MRR) / (Churned MRR + Contraction MRR)</p>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-sm font-medium">New MRR ($)</Label>
                      <Input type="number" placeholder="10000" value={newMrr} onChange={(e) => setNewMrr(e.target.value)} className="mt-2 h-12" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Expansion MRR ($)</Label>
                      <Input type="number" placeholder="5000" value={expansionMrr} onChange={(e) => setExpansionMrr(e.target.value)} className="mt-2 h-12" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Churned MRR ($)</Label>
                      <Input type="number" placeholder="2000" value={churnedMrr} onChange={(e) => setChurnedMrr(e.target.value)} className="mt-2 h-12" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Contraction MRR ($)</Label>
                      <Input type="number" placeholder="1000" value={contractionMrr} onChange={(e) => setContractionMrr(e.target.value)} className="mt-2 h-12" />
                    </div>
                  </div>

                  {parseFloat(quickRatio) > 0 && (
                    <div className="mt-8 p-6 rounded-xl bg-muted/50 border border-border">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Your Quick Ratio</h3>
                        <Badge className={`${status.bg} ${status.color} border-0`}>{status.label}</Badge>
                      </div>
                      <div className="text-5xl font-bold text-foreground mb-2">{quickRatio}</div>
                      <p className="text-muted-foreground">Target: 4+ for efficient growth</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <aside className="hidden xl:block w-[300px] shrink-0">
              <div className="sticky top-24 space-y-6">
                <SidebarAd slotKey="detail-sidebar-top" />
              </div>
            </aside>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}