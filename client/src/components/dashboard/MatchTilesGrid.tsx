import { 
  Sparkles, 
  TrendingUp, 
  Building2, 
  Users, 
  Globe, 
  DollarSign, 
  Clock, 
  Star,
  Briefcase,
  FileCheck
} from "lucide-react";
import { MatchTile } from "./MatchTile";

const matchTiles = [
  { title: "All your matches", icon: Sparkles, count: 24, href: "/jobs?filter=matches", accentColor: "yellow" as const },
  { title: "Top picks for you", icon: Star, count: 8, href: "/jobs?filter=top-picks", accentColor: "coral" as const },
  { title: "Recently funded companies", icon: TrendingUp, count: 12, href: "/companies?filter=recently-funded", accentColor: "mint" as const },
  { title: "Remote jobs", icon: Globe, count: 45, href: "/jobs?filter=remote", accentColor: "mint" as const },
  { title: "High salary roles", icon: DollarSign, count: 18, href: "/jobs?filter=high-salary", accentColor: "coral" as const },
  { title: "New jobs this week", icon: Clock, count: 32, href: "/jobs?filter=new", accentColor: "blue" as const },
  { title: "Recommended companies", icon: Building2, count: 15, href: "/companies?filter=recommended", accentColor: "yellow" as const },
  { title: "Apply with your profile", icon: FileCheck, count: 28, href: "/jobs?filter=easy-apply", accentColor: "coral" as const },
];

export function MatchTilesGrid() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-h3 text-foreground">Your matches</h2>
        <span className="text-caption text-muted-foreground">Personalized for you</span>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {matchTiles.map((tile) => (
          <MatchTile key={tile.title} {...tile} />
        ))}
      </div>
    </div>
  );
}
