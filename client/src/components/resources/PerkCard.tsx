import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Perk } from "@/data/resourcesData";
import { ChevronRight, Users, Sparkles } from "lucide-react";

interface PerkCardProps {
  perk: Perk;
}

export function PerkCard({ perk }: PerkCardProps) {
  const getValueBadgeStyles = () => {
    switch (perk.valueType) {
      case "credits":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "percent":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "free":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "months":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getOfferTypeLabel = () => {
    switch (perk.valueType) {
      case "credits":
        return "Credits";
      case "percent":
        return "Discount";
      case "free":
        return "FREE";
      case "months":
        return "Free Months";
      default:
        return "Offer";
    }
  };

  return (
    <Card className="group h-full border border-border hover:border-foreground/20 hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
      <CardContent className="p-0 flex flex-col h-full">
        {/* Header Section */}
        <div className="p-5 pb-4 border-b border-border/50">
          <div className="flex items-start justify-between mb-4">
            {/* Logo and Company */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center overflow-hidden border border-border">
                <img 
                  src={perk.logo} 
                  alt={perk.vendor}
                  className="w-8 h-8 object-contain"
                  onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${perk.vendor.charAt(0)}&background=random`;
                  }}
                />
              </div>
              <div>
                <h3 className="font-semibold text-foreground group-hover:text-foreground/80 transition-colors">
                  {perk.vendor}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {perk.eligibility === "verified" ? (
                    <>
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>Verified Founders</span>
                    </>
                  ) : (
                    <>
                      <Users className="w-3 h-3" />
                      <span>New customers</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* Value Badge */}
            <div className="text-right">
              <span className="text-xs text-muted-foreground">{getOfferTypeLabel()}</span>
              <div className="text-xl font-bold text-foreground">{perk.value}</div>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {perk.eligibility === "verified" && (
              <Badge variant="outline" className="text-xs rounded-full px-2 py-0.5 bg-amber-50 text-amber-700 border-amber-200">
                Portfolio Founder
              </Badge>
            )}
            <Badge variant="outline" className="text-xs rounded-full px-2 py-0.5">
              {perk.category}
            </Badge>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-5 pt-4 flex-grow flex flex-col">
          {/* Title */}
          <h4 className="font-semibold text-foreground mb-2 line-clamp-2">
            {perk.title}
          </h4>

          {/* Description */}
          <p className="text-sm text-muted-foreground mb-4 flex-grow line-clamp-3">
            {perk.description}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <div>
              <span className="text-xs text-muted-foreground">Value</span>
              <p className={`text-lg font-bold ${
                perk.valueType === "credits" || perk.valueType === "months" 
                  ? "text-emerald-600" 
                  : perk.valueType === "free" 
                    ? "text-purple-600" 
                    : "text-blue-600"
              }`}>
                {perk.valueType === "credits" ? perk.value : perk.valueType === "free" ? "FREE" : perk.value}
              </p>
            </div>
            
            <Link href={`/resources/perks/${perk.id}`}>
              <Button 
                variant="default" 
                size="sm" 
                className="rounded-lg gap-1 bg-foreground text-background hover:bg-foreground/90"
              >
                Show Details
                <ChevronRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
