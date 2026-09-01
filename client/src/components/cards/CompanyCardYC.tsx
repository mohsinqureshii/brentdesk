import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

interface CompanyCardYCProps {
  id: string;
  name: string;
  tagline: string;
  stage: string;
  industry: string;
  location: string;
  batch?: string;
  logoUrl?: string;
  accentColor?: "yellow" | "mint" | "blue" | "coral" | "teal";
}

const accentStyles = {
  yellow: "bg-accent-yellow",
  mint: "bg-accent-mint", 
  blue: "bg-accent-blue",
  coral: "bg-accent-coral",
  teal: "bg-[hsl(175,60%,45%)]",
};

export function CompanyCardYC({ 
  id, 
  name, 
  tagline, 
  stage, 
  industry, 
  location, 
  batch,
  logoUrl,
  accentColor = "teal"
}: CompanyCardYCProps) {
  return (
    <Link 
      href={`/companies/${id}`}
      className="group flex items-start gap-4 p-4 rounded-lg hover:bg-card transition-colors duration-200"
    >
      {/* Logo */}
      <div className={`h-12 w-12 rounded-lg ${accentStyles[accentColor]} flex items-center justify-center shrink-0 overflow-hidden`}>
        {logoUrl ? (
          <img src={logoUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-lg font-bold text-foreground/90">{name.charAt(0)}</span>
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-body font-semibold text-foreground group-hover:underline">
            {name}
          </h3>
          {batch && (
            <span className="text-caption text-muted-foreground font-medium">
              {batch}
            </span>
          )}
        </div>
        <p className="text-caption text-muted-foreground mt-0.5 line-clamp-2">
          {tagline}
        </p>
        
        {/* Tags */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <Badge variant="outline" className="rounded-md text-[11px] px-2 py-0 h-5 font-normal border-border/60 text-muted-foreground">
            {industry}
          </Badge>
          <Badge variant="outline" className="rounded-md text-[11px] px-2 py-0 h-5 font-normal border-border/60 text-muted-foreground">
            {location}
          </Badge>
          <Badge variant="outline" className="rounded-md text-[11px] px-2 py-0 h-5 font-normal border-border/60 text-muted-foreground">
            {stage}
          </Badge>
        </div>
      </div>
    </Link>
  );
}
