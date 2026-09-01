import { Link } from "wouter";
import { 
  User, Settings, Bookmark, Bell, Shield, LogOut, LogIn,
  ChevronRight, Moon, Sun, ExternalLink, HelpCircle, FileText
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useTheme } from "@/contexts/ThemeContext";

export default function MobileProfile() {
  const { user, isAuthenticated } = useAuth();
  const isAuthLoading = false;
  const logoutMutation = trpc.auth.logout.useMutation();
  const { theme, setTheme } = useTheme() as any;

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => window.location.href = "/",
    });
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center h-12 px-4">
          <h1 className="text-lg font-bold text-foreground">Profile</h1>
        </div>
      </div>

      <div className="px-4 py-4">
        {/* User card */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border mb-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              {user.avatar ? (
                <img src={user.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <User className="h-6 w-6 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{user.name || "User"}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email || ""}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-card border border-border mb-6 text-center">
            <User className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-semibold text-foreground mb-1">Sign in to TechScoop</p>
            <p className="text-xs text-muted-foreground mb-3">Save articles, track companies, and get personalized content</p>
            <a
              href={getLoginUrl()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </a>
          </div>
        )}

        {/* Settings sections */}
        <div className="space-y-4">
          {/* Preferences */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
              Preferences
            </h3>
            <div className="rounded-xl bg-card border border-border overflow-hidden">
              <button
                onClick={() => (setTheme as any)(theme === "dark" ? "light" : "dark")}
                className="flex items-center gap-3 w-full p-3 hover:bg-accent/50 transition-colors"
              >
                {theme === "dark" ? <Moon className="h-5 w-5 text-muted-foreground" /> : <Sun className="h-5 w-5 text-muted-foreground" />}
                <span className="flex-1 text-sm text-foreground text-left">Dark Mode</span>
                <div className={`w-10 h-6 rounded-full transition-colors ${theme === "dark" ? "bg-primary" : "bg-muted"} flex items-center`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${theme === "dark" ? "translate-x-5" : "translate-x-1"}`} />
                </div>
              </button>
              {isAuthenticated && (
                <Link href="/dashboard/notifications">
                  <div className="flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors border-t border-border cursor-pointer">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    <span className="flex-1 text-sm text-foreground">Notifications</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              )}
            </div>
          </div>

          {/* About */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
              About
            </h3>
            <div className="rounded-xl bg-card border border-border overflow-hidden">
              <Link href="/privacy">
                <div className="flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors cursor-pointer">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <span className="flex-1 text-sm text-foreground">Privacy Policy</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
              <Link href="/terms">
                <div className="flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors border-t border-border cursor-pointer">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span className="flex-1 text-sm text-foreground">Terms of Service</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
              <Link href="/contact">
                <div className="flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors border-t border-border cursor-pointer">
                  <HelpCircle className="h-5 w-5 text-muted-foreground" />
                  <span className="flex-1 text-sm text-foreground">Contact Us</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            </div>
          </div>

          {/* Sign out */}
          {isAuthenticated && (
            <div>
              <div className="rounded-xl bg-card border border-border overflow-hidden">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full p-3 hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-5 w-5 text-destructive" />
                  <span className="text-sm text-destructive font-medium">Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* App version */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          TechScoop v1.0 &middot; MENA's Tech Ecosystem
        </p>
      </div>
    </div>
  );
}
