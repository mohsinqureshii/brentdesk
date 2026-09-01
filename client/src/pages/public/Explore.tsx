import { Link } from "wouter";
import { 
  Building2, Users, TrendingUp, Rocket, Calendar, BookOpen, 
  Briefcase, Newspaper, DollarSign, ArrowRight 
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const sections = [
  {
    title: "Ecosystem",
    items: [
      { label: "Companies", desc: "Startups & tech companies", icon: Building2, href: "/companies", color: "bg-blue-500/10 text-blue-500" },
      { label: "People", desc: "Founders, leaders & talent", icon: Users, href: "/people", color: "bg-purple-500/10 text-purple-500" },
      { label: "Investors", desc: "VCs & angel investors", icon: TrendingUp, href: "/investors", color: "bg-emerald-500/10 text-emerald-500" },
      { label: "Accelerators", desc: "Programs & incubators", icon: Rocket, href: "/accelerators", color: "bg-orange-500/10 text-orange-500" },
    ]
  },
  {
    title: "Discover",
    items: [
      { label: "Events", desc: "Conferences & meetups", icon: Calendar, href: "/events", color: "bg-pink-500/10 text-pink-500" },
      { label: "Resources", desc: "Tools, guides & perks", icon: BookOpen, href: "/resources", color: "bg-cyan-500/10 text-cyan-500" },
      { label: "Funding", desc: "Latest funding rounds", icon: DollarSign, href: "/funding", color: "bg-amber-500/10 text-amber-500" },
    ]
  },
  {
    title: "Content",
    items: [
      { label: "News", desc: "Latest tech news", icon: Newspaper, href: "/", color: "bg-red-500/10 text-red-500" },
      { label: "Jobs", desc: "Tech career opportunities", icon: Briefcase, href: "/jobs", color: "bg-indigo-500/10 text-indigo-500" },
    ]
  }
];

export default function Explore() {
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop: show normal header */}
      <div className="hidden md:block">
        <Header />
      </div>
      
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center h-12 px-4">
          <h1 className="text-lg font-bold text-foreground">Explore</h1>
        </div>
      </div>

      <main className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-4 md:py-8">
        {sections.map((section) => (
          <div key={section.title} className="mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">
              {section.title}
            </h2>
            <div className="space-y-1.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}>
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors cursor-pointer group">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${item.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </main>

      {/* Desktop: show footer */}
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
