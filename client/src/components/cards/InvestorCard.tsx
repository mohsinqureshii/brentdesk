import { Link } from "wouter";
import { MapPin, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface InvestorCardProps {
  id: string;
  name: string;
  type: string;
  stageFocus: string[];
  sectorFocus: string[];
  location: string;
  portfolioCount?: number;
  logoUrl?: string;
}

export function InvestorCard({ 
  id, 
  name, 
  type,
  stageFocus,
  sectorFocus,
  location, 
  portfolioCount = 0,
  logoUrl 
}: InvestorCardProps) {
  return (
    <div className="group rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-elevated transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex items-start gap-4">
        {/* Logo */}
        <div className="h-14 w-14 rounded-xl bg-accent-blue/20 flex items-center justify-center shrink-0 overflow-hidden">
          {logoUrl ? (
            <img src={logoUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-xl font-bold text-foreground/70">{name.charAt(0)}</span>
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-body font-semibold text-foreground group-hover:text-foreground/80 transition-colors truncate">
            {name}
          </h3>
          <p className="text-caption text-muted-foreground mt-0.5">
            {type}
          </p>
          
          {/* Stage Focus */}
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            {stageFocus.slice(0, 3).map((stage) => (
              <Badge key={stage} variant="secondary" className="rounded-full text-caption font-medium bg-accent-mint/20">
                {stage}
              </Badge>
            ))}
          </div>
          
          {/* Sector Focus */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {sectorFocus.slice(0, 3).map((sector) => (
              <Badge key={sector} variant="secondary" className="rounded-full text-caption font-medium">
                {sector}
              </Badge>
            ))}
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-4 text-caption text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {location}
          </span>
          {portfolioCount > 0 && (
            <span className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              {portfolioCount} portfolio
            </span>
          )}
        </div>
        
        <Link href={`/investors/${id}`}>
          <Button variant="outline" size="sm">View profile</Button>
        </Link>
      </div>
    </div>
  );
}
