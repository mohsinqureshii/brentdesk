import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useT } from "@/lib/i18n";

interface WelcomeBannerProps {
  userName?: string;
  profileCompletion?: number;
}

export function WelcomeBanner({ userName, profileCompletion = 65 }: WelcomeBannerProps) {
  const t = useT();
  return (
    <div className="relative overflow-hidden rounded-2xl bg-accent-yellow p-8 md:p-10">
      {/* Background decoration */}
      <div className="absolute right-0 top-0 h-full w-1/3 opacity-20">
        <svg viewBox="0 0 200 200" className="h-full w-full">
          <circle cx="150" cy="100" r="120" fill="currentColor" />
        </svg>
      </div>
      
      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-3">
          <h1 className="text-h1 text-foreground">
            {userName
              ? t("dashboard.welcomeBackNamed", { name: userName })
              : t("auth.welcomeBack")}
          </h1>
          <p className="text-body text-foreground/80 max-w-md">
            {t("dashboard.completeProfile", { percent: profileCompletion })}
          </p>
          
          {/* Progress bar */}
          <div className="w-48 h-2 bg-foreground/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-foreground rounded-full transition-all duration-500"
              style={{ width: `${profileCompletion}%` }}
            />
          </div>
        </div>
        
        <Link href="/profile">
          <Button size="lg" className="bg-foreground text-background hover:bg-foreground/90 gap-2 shadow-elevated">
            {t("dashboard.goToProfile")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
