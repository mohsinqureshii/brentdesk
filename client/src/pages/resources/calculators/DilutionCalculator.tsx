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
import { PieChart, ArrowLeft } from "lucide-react";

export default function DilutionCalculator() {
  const [currentOwnership, setCurrentOwnership] = useState("");
  const [investmentAmount, setInvestmentAmount] = useState("");
  const [postMoneyValuation, setPostMoneyValuation] = useState("");

  const investorOwnership = investmentAmount && postMoneyValuation ? (parseFloat(investmentAmount) / parseFloat(postMoneyValuation)) * 100 : 0;
  const newOwnership = currentOwnership ? parseFloat(currentOwnership) * (1 - investorOwnership / 100) : 0;
  const dilutionPercent = currentOwnership ? parseFloat(currentOwnership) - newOwnership : 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <section className="w-full bg-[#4CB944]">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="max-w-3xl">
            <BackToResources />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <PieChart className="w-6 h-6 text-white" />
              </div>
              <Badge className="bg-white/20 text-white border-0">Financial</Badge>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              Dilution Calculator
            </h1>
            <p className="text-white/90 text-base sm:text-lg leading-relaxed max-w-2xl">
              Understand how funding rounds affect your equity ownership.
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
                      <Label className="text-sm font-medium">Your Current Ownership (%)</Label>
                      <Input type="number" placeholder="80" value={currentOwnership} onChange={(e) => setCurrentOwnership(e.target.value)} className="mt-2 h-12" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Investment Amount ($)</Label>
                      <Input type="number" placeholder="1000000" value={investmentAmount} onChange={(e) => setInvestmentAmount(e.target.value)} className="mt-2 h-12" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Post-Money Valuation ($)</Label>
                      <Input type="number" placeholder="5000000" value={postMoneyValuation} onChange={(e) => setPostMoneyValuation(e.target.value)} className="mt-2 h-12" />
                    </div>
                  </div>

                  {newOwnership > 0 && (
                    <div className="mt-8 p-6 rounded-xl bg-muted/50 border border-border">
                      <h3 className="text-lg font-semibold mb-4">Results</h3>
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">New Ownership</p>
                          <p className="text-2xl font-bold">{newOwnership.toFixed(2)}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Dilution</p>
                          <p className="text-2xl font-bold text-red-600">-{dilutionPercent.toFixed(2)}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Investor Ownership</p>
                          <p className="text-2xl font-bold">{investorOwnership.toFixed(2)}%</p>
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