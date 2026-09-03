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
import { useT } from "@/lib/i18n";
import type { UiKey } from "@shared/uiStrings";

// The tile carries a translation key rather than a label; the grid resolves
// it at render, so the same tile reads in whichever language the page is in.
const matchTiles: { titleKey: UiKey; icon: typeof Sparkles; count: number; href: string; accentColor: "yellow" | "mint" | "blue" | "coral" }[] = [
  { titleKey: "dashboard.allMatches", icon: Sparkles, count: 24, href: "/jobs?filter=matches", accentColor: "yellow" },
  { titleKey: "dashboard.topPicks", icon: Star, count: 8, href: "/jobs?filter=top-picks", accentColor: "coral" },
  { titleKey: "dashboard.recentlyFunded", icon: TrendingUp, count: 12, href: "/companies?filter=recently-funded", accentColor: "mint" },
  { titleKey: "dashboard.remoteJobs", icon: Globe, count: 45, href: "/jobs?filter=remote", accentColor: "mint" },
  { titleKey: "dashboard.highSalary", icon: DollarSign, count: 18, href: "/jobs?filter=high-salary", accentColor: "coral" },
  { titleKey: "dashboard.newJobsThisWeek", icon: Clock, count: 32, href: "/jobs?filter=new", accentColor: "blue" },
  { titleKey: "dashboard.recommendedCompanies", icon: Building2, count: 15, href: "/companies?filter=recommended", accentColor: "yellow" },
  { titleKey: "dashboard.applyWithProfile", icon: FileCheck, count: 28, href: "/jobs?filter=easy-apply", accentColor: "coral" },
];

export function MatchTilesGrid() {
  const t = useT();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-h3 text-foreground">{t("dashboard.yourMatches")}</h2>
        <span className="text-caption text-muted-foreground">{t("dashboard.personalizedForYou")}</span>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {matchTiles.map(({ titleKey, ...tile }) => (
          <MatchTile key={titleKey} title={t(titleKey)} {...tile} />
        ))}
      </div>
    </div>
  );
}
