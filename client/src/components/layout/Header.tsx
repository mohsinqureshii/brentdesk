import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, Search, X, ChevronDown, ChevronRight, User, LayoutDashboard, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/_core/hooks/useAuth";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { Input } from "@/components/ui/input";
import { publication } from "@shared/publication";

const mainNavItems = [
  { label: "News", href: "/" },
  { label: "Companies", href: "/companies" },
  { label: "People", href: "/people" },
  { label: "Events", href: "/events" },
  { label: "Jobs", href: "/jobs" },
];

// Mobile navigation, grouped. Category slugs match the BrentDesk
// industrial taxonomy seeded in scripts/seed-brentdesk.ts.
const mobileNavSections: { label: string; items: { label: string; href: string; hasArrow?: boolean }[] }[] = [
  {
    label: "News",
    items: [
      { label: "Latest", href: "/" },
      { label: "Construction", href: "/construction" },
      { label: "Infrastructure", href: "/infrastructure" },
      { label: "Energy", href: "/energy" },
      { label: "Manufacturing", href: "/manufacturing" },
      { label: "Logistics", href: "/logistics" },
      { label: "Real Estate", href: "/real-estate" },
      { label: "Industrial Technology", href: "/industrial-technology" },
    ],
  },
  {
    label: "Directory",
    items: [
      { label: "Companies", href: "/companies", hasArrow: true },
      { label: "People", href: "/people", hasArrow: true },
    ],
  },
  {
    label: "Industry",
    items: [
      { label: "Events", href: "/events" },
      { label: "Jobs", href: "/jobs" },
      { label: "Newsletter", href: "/newsletter" },
    ],
  },
];

/** Text wordmark — crisp at every size, no image dependency. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-extrabold tracking-tight leading-none select-none ${className}`}
      style={{ fontFamily: "var(--font-display)" }}
    >
      {publication.wordmark.replace(/\.$/, "")}
      <span className="text-primary">.</span>
    </span>
  );
}

export function Header() {
  const [location] = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <>
      <header className="sticky top-0 z-50 w-full bd-ink">
        {/* Main Navigation Row */}
        <div className="w-full border-b border-white/10">
          <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
            {/* Left Section - Wordmark */}
            <Link href="/" className="flex items-center shrink-0" aria-label={`${publication.name} home`}>
              <Wordmark className="text-white text-[26px]" />
            </Link>

            {/* Center Section - Main Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {mainNavItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`text-[15px] font-semibold px-4 py-2 rounded-md transition-colors ${
                    (item.href === "/" ? location === "/" : location.startsWith(item.href))
                      ? "text-white"
                      : "text-white/75 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Right Section */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
                className="text-white h-10 w-10 hover:bg-white/10"
              >
                <Search className="h-5 w-5" />
              </Button>

              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="hidden md:flex h-9 px-4 text-sm font-semibold border-white/40 text-white bg-transparent hover:bg-white hover:text-black rounded-full transition-colors gap-2"
                    >
                      <User className="h-4 w-4" />
                      {user?.name || "Account"}
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="cursor-pointer text-sm font-medium w-full flex items-center gap-2">
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/my-content" className="cursor-pointer text-sm font-medium w-full flex items-center gap-2">
                        <LayoutDashboard className="h-4 w-4" />
                        My Content
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="cursor-pointer text-sm font-medium w-full flex items-center gap-2">
                        <UserCircle className="h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => logout()}
                      className="cursor-pointer text-sm font-medium text-red-600 focus:text-red-600"
                    >
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link href="/signin">
                  <Button className="hidden md:flex h-9 px-5 text-sm font-semibold bg-white text-black hover:bg-white/90 rounded-full">
                    Sign in
                  </Button>
                </Link>
              )}

              {/* Mobile Menu Trigger */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Menu" className="lg:hidden h-10 w-10 text-white hover:bg-white/10">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-full max-w-[320px] p-0 bd-ink border-none overflow-y-auto [&>button]:hidden"
                >
                  <div className="flex flex-col h-full">
                    {/* Header with wordmark */}
                    <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
                      <button
                        onClick={() => setMobileMenuOpen(false)}
                        aria-label="Close menu"
                        className="text-white hover:text-white/70"
                      >
                        <X className="h-6 w-6" />
                      </button>
                      <Wordmark className="text-white text-2xl" />
                      <Link
                        href={isAuthenticated ? "/profile" : "/signin"}
                        onClick={() => setMobileMenuOpen(false)}
                        aria-label={isAuthenticated ? "Profile" : "Sign in"}
                      >
                        <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                          <User className="h-4 w-4 text-white" />
                        </div>
                      </Link>
                    </div>

                    {/* Search Bar */}
                    <div className="px-4 py-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                        <Input
                          placeholder={`Search ${publication.name}`}
                          className="w-full h-10 pl-10 bg-white/10 border-none text-white placeholder:text-white/50 rounded-lg focus-visible:ring-1 focus-visible:ring-white/30"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            setSearchOpen(true);
                          }}
                          readOnly
                        />
                      </div>
                    </div>

                    {/* User Section - Only show when authenticated */}
                    {isAuthenticated && (
                      <div>
                        <div className="px-4 py-2 border-t border-white/10">
                          <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
                            Account
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <Link
                            href="/dashboard"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center justify-between px-4 py-4 text-white hover:bg-white/5 transition-colors border-b border-white/5"
                          >
                            <span className="text-base font-medium flex items-center gap-3">
                              <LayoutDashboard className="h-5 w-5" />
                              Dashboard
                            </span>
                            <ChevronRight className="h-5 w-5 text-white/40" />
                          </Link>
                          <Link
                            href="/profile"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center justify-between px-4 py-4 text-white hover:bg-white/5 transition-colors border-b border-white/5"
                          >
                            <span className="text-base font-medium flex items-center gap-3">
                              <UserCircle className="h-5 w-5" />
                              Profile
                            </span>
                            <ChevronRight className="h-5 w-5 text-white/40" />
                          </Link>
                        </div>
                      </div>
                    )}

                    {/* Navigation Sections */}
                    <div className="flex-1">
                      {mobileNavSections.map((section) => (
                        <div key={section.label}>
                          <div className="px-4 py-2 border-t border-white/10">
                            <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
                              {section.label}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            {section.items.map((item) => (
                              <Link
                                key={item.label}
                                href={item.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center justify-between px-4 py-3.5 text-white hover:bg-white/5 transition-colors border-b border-white/5"
                              >
                                <span className="text-base font-medium">{item.label}</span>
                                {!!item.hasArrow && (
                                  <ChevronRight className="h-5 w-5 text-white/40" />
                                )}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Bottom Actions */}
                    <div className="px-4 py-6 border-t border-white/10 space-y-3">
                      {isAuthenticated ? (
                        <Button
                          onClick={() => {
                            logout();
                            setMobileMenuOpen(false);
                          }}
                          variant="outline"
                          className="w-full h-12 text-sm font-semibold border-white/30 text-white bg-transparent hover:bg-white hover:text-black rounded-full"
                        >
                          Sign Out
                        </Button>
                      ) : (
                        <>
                          <Link href="/signin" className="block" onClick={() => setMobileMenuOpen(false)}>
                            <Button
                              variant="outline"
                              className="w-full h-12 text-sm font-semibold border-white/30 text-white bg-transparent hover:bg-white hover:text-black rounded-full"
                            >
                              Sign In
                            </Button>
                          </Link>
                          <Link href="/signup" className="block" onClick={() => setMobileMenuOpen(false)}>
                            <Button className="w-full h-12 text-sm font-semibold bg-white text-black hover:bg-white/90 rounded-full">
                              Create Account
                            </Button>
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Global Search Overlay */}
      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
