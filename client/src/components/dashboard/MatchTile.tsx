import { Link } from "wouter";
import { LucideIcon } from "lucide-react";

interface MatchTileProps {
  title: string;
  icon: LucideIcon;
  count?: number;
  href: string;
  accentColor?: "yellow" | "mint" | "blue" | "coral";
}

const accentStyles = {
  yellow: "bg-accent-yellow/20 text-accent-foreground",
  mint: "bg-accent-mint/30 text-accent-foreground",
  blue: "bg-accent-blue/30 text-accent-foreground",
  coral: "bg-accent-coral/30 text-accent-foreground",
};

export function MatchTile({ title, icon: Icon, count, href, accentColor = "yellow" }: MatchTileProps) {
  return (
    <Link href={href} className="group block">
      <div className="relative h-full rounded-xl border border-border bg-card p-5 shadow-card transition-all duration-200 hover:shadow-elevated hover:border-muted-foreground/20 hover:-translate-y-0.5">
        {/* Icon */}
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${accentStyles[accentColor]} mb-4`}>
          <Icon className="h-5 w-5" />
        </div>
        
        {/* Content */}
        <h3 className="text-body font-semibold text-foreground group-hover:text-foreground/80 transition-colors">
          {title}
        </h3>
        
        {/* Badge */}
        {count !== undefined && (
          <div className="absolute top-4 right-4">
            <span className="inline-flex items-center justify-center h-6 min-w-6 px-2 rounded-full bg-foreground text-caption font-medium text-background">
              {count}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
