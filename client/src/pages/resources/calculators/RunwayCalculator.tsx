import { useState } from "react";
import { Link } from "wouter";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SidebarAd } from "@/components/ads/AdUnit";
import { BackToResources } from "@/components/resources/FilterPanel";
import { TrendingDown, ArrowLeft, Calculator, AlertTriangle, CheckCircle } from "lucide-react";

export default function RunwayCalculator() {
  const [cashBalance, setCashBalance] = useState("");
  const [monthlyBurn, setMonthlyBurn] = useState("");
  const [monthlyRevenue, setMonthlyRevenue] = useState("");

  const netBurn = parseFloat(monthlyBurn || "0") - parseFloat(monthlyRevenue || "0");
  const runwayMonths = netBurn > 0 && cashBalance ? Math.floor(parseFloat(cashBalance) / netBurn) : 0;
  const runwayDate = new Date();
  runwayDate.setMonth(runwayDate.getMonth() + runwayMonths);

  const getRunwayStatus = () => {
    if (runwayMonths >= 18) return { color: "text-green-600", bg: "bg-green-100", label: "Healthy", icon: CheckCircle };
    if (runwayMonths >= 12) return { color: "text-amber-600", bg: "bg-amber-100", label: "Monitor", icon: AlertTriangle };
    return { color: "text-red-600", bg: "bg-red-100", label: "Critical", icon: AlertTriangle };
  };

  const status = getRunwayStatus();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <section className="w-full bg-[#4CB944]">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="max-w-3xl">
            <BackToResources />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-white" />
              </div>
              <Badge className="bg-white/20 text-white border-0">Financial</Badge>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              Runway Calculator
            </h1>
            <p className="text-white/90 text-base sm:text-lg leading-relaxed max-w-2xl">
              Calculate how long your startup's cash will last based on your current burn rate and revenue.
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
                      <Label htmlFor="cash" className="text-sm font-medium">Current Cash Balance ($)</Label>
                      <Input id="cash" type="number" placeholder="500000" value={cashBalance} onChange={(e) => setCashBalance(e.target.value)} className="mt-2 h-12" />
                    </div>
                    <div>
                      <Label htmlFor="burn" className="text-sm font-medium">Monthly Burn Rate ($)</Label>
                      <Input id="burn" type="number" placeholder="50000" value={monthlyBurn} onChange={(e) => setMonthlyBurn(e.target.value)} className="mt-2 h-12" />
                    </div>
                    <div>
                      <Label htmlFor="revenue" className="text-sm font-medium">Monthly Revenue ($) - Optional</Label>
                      <Input id="revenue" type="number" placeholder="10000" value={monthlyRevenue} onChange={(e) => setMonthlyRevenue(e.target.value)} className="mt-2 h-12" />
                    </div>
                  </div>

                  {runwayMonths > 0 && (
                    <div className="mt-8 p-6 rounded-xl bg-muted/50 border border-border">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Your Runway</h3>
                        <Badge className={`${status.bg} ${status.color} border-0`}>
                          <status.icon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>
                      <div className="text-5xl font-bold text-foreground mb-2">{runwayMonths} months</div>
                      <p className="text-muted-foreground">Until approximately {runwayDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-sm text-muted-foreground">Net Monthly Burn: <span className="font-semibold text-foreground">${netBurn.toLocaleString()}</span></p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <aside className="hidden xl:block w-[300px] shrink-0">
              <div className="sticky top-24 space-y-6">
                <SidebarAd slotKey="detail-sidebar-top" />
                <Card className="border border-border">
                  <CardContent className="p-5">
                    <h3 className="font-semibold mb-3">Related Calculators</h3>
                    <div className="space-y-2">
                      <Link href="/resources/calculators" className="block text-sm text-muted-foreground hover:text-foreground">Burn Rate Calculator</Link>
                      <Link href="/resources/calculators" className="block text-sm text-muted-foreground hover:text-foreground">Break-Even Analysis</Link>
                      <Link href="/resources/calculators" className="block text-sm text-muted-foreground hover:text-foreground">Dilution Calculator</Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}