import { useState, useEffect, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { publication } from "@shared/publication";
import { Newspaper, Briefcase, Compass, Search, User, ArrowLeft, Bell } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

interface MobileLayoutProps {
  children: ReactNode;
}

const tabs = [
  { id: "news", label: "News", icon: Newspaper, href: "/" },
  { id: "jobs", label: "Jobs", icon: Briefcase, href: "/jobs" },
  { id: "explore", label: "Explore", icon: Compass, href: "/explore" },
  { id: "search", label: "Search", icon: Search, href: "/search-mobile" },
  { id: "profile", label: "Me", icon: User, href: "/profile-mobile" },
];

// Routes that should show the mobile layout
const mobileRoutes = [
  "/", "/jobs", "/explore", "/search-mobile", "/profile-mobile",
  "/companies", "/people", "/investors", "/accelerators", "/events", "/resources",
];

// Routes that should show back button instead of tabs
const detailRoutePatterns = [
  /^\/[^/]+\/[^/]+$/, // /:category/:slug (articles)
  /^\/companies\//, /^\/people\//, /^\/investors\//, /^\/accelerators\//,
  /^\/events\//, /^\/jobs\/[^/]+$/, /^\/resources\//,
];

function isDetailRoute(path: string): boolean {
  return detailRoutePatterns.some(p => p.test(path));
}

function getActiveTab(path: string): string {
  if (path === "/" || path.startsWith("/category/")) return "news";
  if (path.startsWith("/jobs")) return "jobs";
  if (path.startsWith("/search-mobile")) return "search";
  if (path.startsWith("/profile-mobile") || path.startsWith("/profile") || path.startsWith("/dashboard")) return "profile";
  if (["/companies", "/people", "/investors", "/accelerators", "/events", "/resources", "/funding"].some(r => path.startsWith(r))) return "explore";
  if (path.startsWith("/explore")) return "explore";
  return "";
}

export function MobileBottomNav() {
  const [location] = useLocation();
  const activeTab = getActiveTab(location);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border safe-area-bottom md:hidden">
      <div className="flex items-center justify-around h-14 px-1">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          const Icon = tab.icon;
          return (
            <Link key={tab.id} href={tab.href}>
              <button className={`flex flex-col items-center justify-center gap-0.5 w-14 h-full transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}>
                <Icon className={`h-5 w-5 ${isActive ? "stroke-[2.5]" : "stroke-[1.5]"}`} />
                <span className={`text-[10px] leading-tight ${isActive ? "font-semibold" : "font-normal"}`}>
                  {tab.label}
                </span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function MobileTopBar({ title, showBack }: { title?: string; showBack?: boolean }) {
  const [location, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border md:hidden">
      <div className="flex items-center justify-between h-12 px-3">
        {showBack ? (
          <button onClick={() => window.history.back()} className="flex items-center gap-1 text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : (
          <Link href="/">
            <span className="text-lg font-bold tracking-tight text-foreground">
              {publication.name.toLowerCase()}<span className="text-primary">.</span>
            </span>
          </Link>
        )}
        {title && (
          <h1 className="text-sm font-semibold text-foreground truncate max-w-[200px]">{title}</h1>
        )}
        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <button className="p-1.5 rounded-full hover:bg-accent">
              <Bell className="h-4.5 w-4.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export function MobileLayout({ children }: MobileLayoutProps) {
  const [location] = useLocation();
  const showDetail = isDetailRoute(location);

  return (
    <>
      {children}
      {!showDetail && <MobileBottomNav />}
      {/* Bottom padding to prevent content from being hidden behind nav */}
      {!showDetail && <div className="h-14 md:hidden" />}
    </>
  );
}

// Hook to detect mobile viewport
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  
  return isMobile;
}
