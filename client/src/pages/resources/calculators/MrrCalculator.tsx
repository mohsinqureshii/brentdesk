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
import { DollarSign, ArrowLeft } from "lucide-react";

export default function MrrCalculator() {
  const [customers, setCustomers] = useState("");
  const [arpu, setArpu] = useState("");
  const [growthRate, setGrowthRate] = useState("");

  const mrr = customers && arpu ? parseFloat(customers) * parseFloat(arpu) : 0;
  const arr = mrr * 12;
  const projectedMrr12 = growthRate ? mrr * Math.pow(1 + parseFloat(growthRate) / 100, 12) : mrr;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <section className="w-full bg-[#4CB944]">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="max-w-3xl">
            <BackToResources />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <Badge className="bg-white/20 text-white border-0">SaaS Metrics</Badge>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              MRR Calculator
            </h1>
            <p className="text-white/90 text-base sm:text-lg leading-relaxed max-w-2xl">
              Calculate your Monthly Recurring Revenue and project future growth.
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
                      <Label className="text-sm font-medium">Number of Customers</Label>
                      <Input type="number" placeholder="100" value={customers} onChange={(e) => setCustomers(e.target.value)} className="mt-2 h-12" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Average Revenue Per User / Month ($)</Label>
                      <Input type="number" placeholder="50" value={arpu} onChange={(e) => setArpu(e.target.value)} className="mt-2 h-12" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Monthly Growth Rate (%) - Optional</Label>
                      <Input type="number" placeholder="10" value={growthRate} onChange={(e) => setGrowthRate(e.target.value)} className="mt-2 h-12" />
                    </div>
                  </div>

                  {mrr > 0 && (
                    <div className="mt-8 p-6 rounded-xl bg-muted/50 border border-border">
                      <h3 className="text-lg font-semibold mb-4">Your Revenue</h3>
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Current MRR</p>
                          <p className="text-2xl font-bold">${mrr.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Current ARR</p>
                          <p className="text-2xl font-bold">${arr.toLocaleString()}</p>
                        </div>
                        {growthRate && (
                          <div>
                            <p className="text-sm text-muted-foreground">12-Month MRR</p>
                            <p className="text-2xl font-bold text-green-600">${projectedMrr12.toLocaleString()}</p>
                          </div>
                        )}
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