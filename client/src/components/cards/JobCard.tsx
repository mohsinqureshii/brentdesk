import { Link } from "wouter";
import { MapPin, DollarSign, Bookmark, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface JobCardProps {
  id: string;
  title: string;
  company: string;
  companyId: string;
  location: string;
  salary?: string;
  remote?: boolean;
  matchScore?: number;
  postedAt?: string;
  logoUrl?: string;
}

export function JobCard({ 
  id, 
  title, 
  company,
  companyId,
  location, 
  salary,
  remote,
  matchScore,
  postedAt,
  logoUrl 
}: JobCardProps) {
  return (
    <div className="group rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-elevated transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex items-start gap-4">
        {/* Company Logo */}
        <Link href={`/companies/${companyId}`} className="shrink-0">
          <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt={company} className="h-full w-full object-cover" />
            ) : (
              <span className="text-lg font-bold text-muted-foreground">{company.charAt(0)}</span>
            )}
          </div>
        </Link>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-body font-semibold text-foreground group-hover:text-foreground/80 transition-colors">
                {title}
              </h3>
              <Link href={`/companies/${companyId}`} className="text-caption text-muted-foreground hover:text-foreground transition-colors">
                {company}
              </Link>
            </div>
            
            {/* Match Score */}
            {matchScore && (
              <div className="shrink-0 h-10 w-10 rounded-full bg-accent-mint/30 flex items-center justify-center">
                <span className="text-caption font-bold text-foreground">{matchScore}%</span>
              </div>
            )}
          </div>
          
          {/* Details */}
          <div className="flex flex-wrap items-center gap-3 mt-3 text-caption text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {location}
            </span>
            {salary && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" />
                {salary}
              </span>
            )}
            {postedAt && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {postedAt}
              </span>
            )}
          </div>
          
          {/* Tags */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {remote && (
              <Badge className="rounded-full bg-accent-blue/20 text-foreground text-caption font-medium border-0">
                Remote
              </Badge>
            )}
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-border">
        <Button variant="ghost" size="sm" className="gap-1.5">
          <Bookmark className="h-4 w-4" />
          Save
        </Button>
        <Link href={`/jobs/${id}`}>
          <Button size="sm">View job</Button>
        </Link>
      </div>
    </div>
  );
}
