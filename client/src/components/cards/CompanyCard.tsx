import { Link } from "wouter";
import { MapPin, Users, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CompanyCardProps {
  id: string;
  name: string;
  tagline: string;
  stage: string;
  industry: string;
  location: string;
  jobCount?: number;
  logoUrl?: string;
}

export function CompanyCard({ 
  id, 
  name, 
  tagline, 
  stage, 
  industry, 
  location, 
  jobCount = 0,
  logoUrl 
}: CompanyCardProps) {
  return (
    <div className="group rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-elevated transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex items-start gap-4">
        {/* Logo */}
        <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
          {logoUrl ? (
            <img src={logoUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-xl font-bold text-muted-foreground">{name.charAt(0)}</span>
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-body font-semibold text-foreground group-hover:text-foreground/80 transition-colors truncate">
            {name}
          </h3>
          <p className="text-caption text-muted-foreground mt-0.5 line-clamp-2">
            {tagline}
          </p>
          
          {/* Tags */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Badge variant="secondary" className="rounded-full text-caption font-medium">
              {stage}
            </Badge>
            <Badge variant="secondary" className="rounded-full text-caption font-medium">
              {industry}
            </Badge>
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
          {jobCount > 0 && (
            <span className="flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5" />
              {jobCount} jobs
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Link href={`/companies/${id}`}>
            <Button variant="outline" size="sm">View</Button>
          </Link>
          <Button variant="ghost" size="sm">Follow</Button>
        </div>
      </div>
    </div>
  );
}
