import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface Stat {
  value: string;
  label: string;
}

interface PageCTAProps {
  headline?: string;
  subheadline?: string;
  primaryButtonText?: string;
  primaryButtonLink?: string;
  secondaryButtonText?: string;
  secondaryButtonLink?: string;
  stats?: Stat[];
  compact?: boolean;
}

const defaultStats: Stat[] = [
  { value: "99%", label: "Platform Uptime" },
  { value: "200+", label: "Partner Integrations" },
  { value: "96%", label: "Customer Satisfaction" },
];

export function PageCTA({
  headline = "Global thinking.\nGlobal growth.\nLet's go.",
  subheadline,
  primaryButtonText = "Book a demo",
  primaryButtonLink = "/contact",
  secondaryButtonText = "Get in touch",
  secondaryButtonLink = "/contact",
  stats = defaultStats,
  compact = false,
}: PageCTAProps) {
  const isCompact = compact || !stats || stats.length === 0;
  
  return (
    <section className="w-full bg-[#4CB944] overflow-hidden">
      <div className={`max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 ${isCompact ? 'py-5 sm:py-6 lg:py-7' : 'py-8 sm:py-10 lg:py-12'}`}>
        {isCompact ? (
          // Compact layout - horizontal with content on left, buttons on right
          <div className="flex items-center justify-between gap-6">
            <div className="max-w-lg">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-tight mb-2">
                {headline}
              </h2>
              {subheadline && (
                <p className="text-xs sm:text-sm text-white/80 max-w-md">{subheadline}</p>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Link href={primaryButtonLink}>
                <Button className="h-8 px-4 bg-white text-[#4CB944] hover:bg-white/90 rounded-full text-xs font-semibold gap-2 transition-all hover:scale-105">
                  <ArrowRight className="w-3 h-3" />
                  {primaryButtonText}
                </Button>
              </Link>
              {secondaryButtonText && (
                <Link href={secondaryButtonLink}>
                  <Button variant="ghost" className="h-8 px-4 text-white hover:bg-white/10 border border-white/30 rounded-full text-xs font-medium transition-all hover:border-white/60">
                    {secondaryButtonText}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        ) : (
          // Full layout - vertical with stats
          <>
            <div className="max-w-2xl mb-6">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-[1.15] whitespace-pre-line mb-3">
                {headline}
              </h2>
              {subheadline && (
                <p className="text-sm sm:text-base text-white/80 mb-5 max-w-xl">{subheadline}</p>
              )}
              
              <div className="flex flex-wrap items-center gap-3">
                <Link href={primaryButtonLink}>
                  <Button className="h-9 px-5 bg-white text-[#4CB944] hover:bg-white/90 rounded-full text-sm font-semibold gap-2 transition-all hover:scale-105">
                    <ArrowRight className="w-3.5 h-3.5" />
                    {primaryButtonText}
                  </Button>
                </Link>
                <Link href={secondaryButtonLink}>
                  <Button variant="ghost" className="h-9 px-5 text-white hover:bg-white/10 border border-white/30 rounded-full text-sm font-medium transition-all hover:border-white/60">
                    {secondaryButtonText}
                  </Button>
                </Link>
              </div>
            </div>
            
            {/* Stats Row */}
            {stats.length > 0 && (
              <div className="border-t border-white/20 pt-5">
                <div className="grid grid-cols-3 gap-6 lg:gap-10">
                  {stats.map((stat, index) => (
                    <div key={index} className="group cursor-default">
                      <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white transition-transform group-hover:scale-105">
                        {stat.value}
                      </p>
                      <p className="text-xs text-white/70 mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
