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
import { Users, ArrowLeft } from "lucide-react";

export default function CacLtvCalculator() {
  const [cac, setCac] = useState("");
  const [arpu, setArpu] = useState("");
  const [churnRate, setChurnRate] = useState("");

  const ltv = arpu && churnRate && parseFloat(churnRate) > 0 ? parseFloat(arpu) / (parseFloat(churnRate) / 100) : 0;
  const ratio = cac && ltv > 0 ? ltv / parseFloat(cac) : 0;

  const getStatus = () => {
    if (ratio >= 3) return { color: "text-green-600", bg: "bg-green-100", label: "Healthy (3:1+)" };
    if (ratio >= 1) return { color: "text-amber-600", bg: "bg-amber-100", label: "Needs Improvement" };
    return { color: "text-red-600", bg: "bg-red-100", label: "Unsustainable" };
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
                <Users className="w-6 h-6 text-white" />
              </div>
              <Badge className="bg-white/20 text-white border-0">SaaS Metrics</Badge>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              CAC/LTV Calculator
            </h1>
            <p className="text-white/90 text-base sm:text-lg leading-relaxed max-w-2xl">
              Calculate customer acquisition cost vs lifetime value. Target a 3:1 LTV:CAC ratio.
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
                  <div className="grid gap-6">
                    <div>
                      <Label className="text-sm font-medium">Customer Acquisition Cost ($)</Label>
                      <Input type="number" placeholder="100" value={cac} onChange={(e) => setCac(e.target.value)} className="mt-2 h-12" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Average Revenue Per User / Month ($)</Label>
                      <Input type="number" placeholder="50" value={arpu} onChange={(e) => setArpu(e.target.value)} className="mt-2 h-12" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Monthly Churn Rate (%)</Label>
                      <Input type="number" placeholder="5" value={churnRate} onChange={(e) => setChurnRate(e.target.value)} className="mt-2 h-12" />
                    </div>
                  </div>

                  {ratio > 0 && (
                    <div className="mt-8 p-6 rounded-xl bg-muted/50 border border-border">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Your LTV:CAC Ratio</h3>
                        <Badge className={`${status.bg} ${status.color} border-0`}>{status.label}</Badge>
                      </div>
                      <div className="text-5xl font-bold text-foreground mb-2">{ratio.toFixed(1)}:1</div>
                      <div className="mt-4 pt-4 border-t border-border grid sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Customer LTV</p>
                          <p className="text-xl font-semibold">${ltv.toFixed(0)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">CAC</p>
                          <p className="text-xl font-semibold">${cac}</p>
                        </div>
                      </div>
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