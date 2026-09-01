import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, MapPin, Users, Calendar, DollarSign, Building2 } from "lucide-react";

interface CompanyCardHybridProps {
  id: string;
  name: string;
  tagline: string;
  stage: string;
  industry: string;
  location: string;
  batch?: string;
  employees?: string;
  funding?: string;
  logoUrl?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  accentColor?: "orange" | "blue" | "purple" | "teal" | "pink" | "green";
}

const tagColors = {
  orange: "bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400",
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
  purple: "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400",
  teal: "bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400",
  pink: "bg-pink-50 text-pink-700 dark:bg-pink-950/30 dark:text-pink-400",
  green: "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400",
};

const logoBgColors = {
  orange: "bg-orange-100 dark:bg-orange-950/40",
  blue: "bg-blue-100 dark:bg-blue-950/40",
  purple: "bg-purple-100 dark:bg-purple-950/40",
  teal: "bg-teal-100 dark:bg-teal-950/40",
  pink: "bg-pink-100 dark:bg-pink-950/40",
  green: "bg-green-100 dark:bg-green-950/40",
};

const logoTextColors = {
  orange: "text-orange-600 dark:text-orange-400",
  blue: "text-blue-600 dark:text-blue-400",
  purple: "text-purple-600 dark:text-purple-400",
  teal: "text-teal-600 dark:text-teal-400",
  pink: "text-pink-600 dark:text-pink-400",
  green: "text-green-600 dark:text-green-400",
};

export function CompanyCardHybrid({
  id,
  name,
  tagline,
  stage,
  industry,
  location,
  batch,
  employees,
  funding,
  logoUrl,
  linkedinUrl,
  websiteUrl,
  accentColor = "teal"
}: CompanyCardHybridProps) {
  return (
    <Link href={`/companies/${id}`}>
      <div className="group flex items-start gap-4 sm:gap-5 py-5 px-1 hover:bg-muted/30 transition-colors rounded-lg cursor-pointer">
        {/* Logo */}
        <div className="shrink-0">
          <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl bg-white dark:bg-card flex items-center justify-center overflow-hidden border border-border shadow-sm">
            {logoUrl ? (
              <img src={logoUrl} alt={name} className="h-full w-full object-contain p-1.5" />
            ) : (
              <div className={`h-full w-full ${logoBgColors[accentColor]} flex items-center justify-center`}>
                <span className={`text-xl sm:text-2xl font-bold ${logoTextColors[accentColor]}`}>{name.charAt(0)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Name + Tagline */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                {name}
              </h3>
              {tagline && (
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                  {tagline}
                </p>
              )}
            </div>
            <div className="hidden sm:flex items-center shrink-0">
              <span className="p-2 rounded-full text-muted-foreground group-hover:text-foreground transition-colors">
                <ExternalLink className="h-4 w-4" />
              </span>
            </div>
          </div>

          {/* Data Points Row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs sm:text-sm text-muted-foreground">
            {location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate max-w-[140px]">{location}</span>
              </span>
            )}
            {industry && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3 shrink-0" />
                {industry}
              </span>
            )}
            {batch && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3 shrink-0" />
                Est. {batch}
              </span>
            )}
            {employees && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3 shrink-0" />
                {employees}
              </span>
            )}
            {funding && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3 shrink-0" />
                {funding}
              </span>
            )}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            {stage && (
              <Badge className={`${tagColors[accentColor]} hover:opacity-80 border-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium`}>
                {stage}
              </Badge>
            )}
            {location && (
              <Badge className={`${tagColors[accentColor]} hover:opacity-80 border-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium`}>
                {location}
              </Badge>
            )}
            {industry && (
              <Badge className={`${tagColors[accentColor]} hover:opacity-80 border-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium`}>
                {industry}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
