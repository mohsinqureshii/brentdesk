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
import { EditionSwitcher } from "@/components/EditionSwitcher";
import { EditionFirstVisitBanner } from "@/components/EditionFirstVisitBanner";
import { Input } from "@/components/ui/input";

const mainNavItems = [
  { label: "News", href: "/" },
  { label: "Jobs", href: "/jobs" },
  { label: "Companies", href: "/companies" },
  { label: "People", href: "/people" },
  { label: "Investors", href: "/investors" },
  { label: "Accelerators", href: "/accelerators" },
  { label: "Events", href: "/events" },
  { label: "Resources", href: "/resources" },
];

// Simplified mobile navigation - Bloomberg style
const mobileNavSections: { label: string; items: { label: string; href: string; hasArrow?: boolean }[] }[] = [
  {
    label: "Data",
    items: [
      { label: "Companies", href: "/companies", hasArrow: true },
      { label: "Investors", href: "/investors", hasArrow: true },
      { label: "Funding Rounds", href: "/funding", hasArrow: true },
    ]
  },
  {
    label: "News",
    items: [
      { label: "Latest", href: "/" },
      { label: "Startups", href: "/category/startups" },
      { label: "Funding & VC", href: "/category/funding-vc" },
      { label: "AI & Data", href: "/category/ai-data" },
      { label: "Fintech", href: "/category/fintech" },
      { label: "Enterprise", href: "/category/enterprise-saas" },
    ]
  },
  {
    label: "Ecosystem",
    items: [
      { label: "Jobs", href: "/jobs" },
      { label: "People", href: "/people" },
      { label: "Events", href: "/events" },
      { label: "Accelerators", href: "/accelerators" },
      { label: "Resources", href: "/resources" },
    ]
  },
];

export function Header() {
  const [location] = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();

  const isResourcesActive = location.startsWith('/resources');

  return (
    <>
      {/* First-visit edition banner — only shows when the visitor
          hasn't picked an edition yet and the server resolved them
          to a non-International one. Dismiss persists in a cookie. */}
      <EditionFirstVisitBanner />
      <header className="sticky top-0 z-50 w-full bg-black">
        {/* Main Navigation Row */}
        <div className="w-full border-b border-white/10">
          <div className="w-full max-w-[1400px] mx-auto px-6 lg:px-8 flex h-20 items-center justify-between">
            {/* Left Section - Logo */}
            <Link href="/" className="flex items-center shrink-0">
              <img
                src="/assets/logo.png"
                alt="TechScoop"
                className="object-contain brightness-0 invert"
                style={{ height: '34px', width: 'auto', maxWidth: '142px' }}
              />
            </Link>

            {/* Center Section - Main Navigation */}
            <nav className="hidden lg:flex items-center gap-2">
              {mainNavItems.map((item) => (
                  <Link 
                    key={item.label} 
                    href={item.href}
                    className={`text-base font-medium px-4 py-2 transition-colors ${
                      (item.href === '/' ? location === '/' : location.startsWith(item.href))
                        ? "text-white" 
                        : "text-white hover:text-white/70"
                    }`}
                  >
                    {item.label}
                  </Link>
              ))}
            </nav>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              {/* Edition switcher — flag + country name dropdown. Mounted
                  before search so the country is the most-prominent
                  preference signal in the header. Hidden until the
                  list loads to avoid layout shift. */}
              <div className="text-white [&_button]:text-white [&_button]:hover:bg-white/10">
                <EditionSwitcher />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchOpen(true)}
                className="text-white h-10 w-10 hover:bg-white/10"
              >
                <Search className="h-5 w-5" />
              </Button>

              {isAuthenticated ? (
                <>
                  {/* User Menu Dropdown - Shows Dashboard, Profile, Sign Out */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="hidden md:flex h-10 px-4 text-sm font-semibold border-white text-white bg-transparent hover:bg-white hover:text-black rounded-full transition-colors gap-2"
                      >
                        <User className="h-4 w-4" />
                        {user?.name || 'Account'}
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
                </>
              ) : (
                <>
                  <Link href="/signin">
                    <Button 
                      variant="outline" 
                      className="hidden md:flex h-10 px-5 text-sm font-semibold border-white text-white bg-transparent hover:bg-white hover:text-black rounded-full transition-colors"
                    >
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/signup">
                    <Button 
                      className="hidden md:flex h-10 px-6 text-sm font-semibold bg-white text-black hover:bg-white/90 rounded-full"
                    >
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}

              {/* Mobile Menu Trigger */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden h-10 w-10 text-white hover:bg-white/10">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent 
                  side="left" 
                  className="w-full max-w-[320px] p-0 bg-black border-none overflow-y-auto [&>button]:hidden"
                >
                  {/* Bloomberg-style Mobile Menu */}
                  <div className="flex flex-col h-full">
                    {/* Header with Logo and User */}
                    <div className="flex items-center justify-between px-4 py-4 bg-black border-b border-white/10">
                      <button 
                        onClick={() => setMobileMenuOpen(false)}
                        className="text-white hover:text-white/70"
                      >
                        <X className="h-6 w-6" />
                      </button>
                      <img
                        src="/assets/logo.png"
                        alt="TechScoop"
                        className="h-10 w-auto object-contain brightness-0 invert"
                        style={{ maxWidth: '200px' }}
                      />
                      <div className="flex items-center gap-2">
                        {isAuthenticated ? (
                          <Link href="/profile" onClick={() => setMobileMenuOpen(false)}>
                            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                              <User className="h-4 w-4 text-white" />
                            </div>
                          </Link>
                        ) : (
                          <Link href="/signin" onClick={() => setMobileMenuOpen(false)}>
                            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                              <User className="h-4 w-4 text-white" />
                            </div>
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Search Bar */}
                    <div className="px-4 py-3 bg-black">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                        <Input 
                          placeholder="Search TechScoop"
                          className="w-full h-10 pl-10 bg-[#2a2a2a] border-none text-white placeholder:text-white/50 rounded-lg focus-visible:ring-1 focus-visible:ring-white/30"
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
                    <div className="flex-1 bg-black">
                      {mobileNavSections.map((section, idx) => (
                        <div key={section.label}>
                          {/* Section Label */}
                          <div className="px-4 py-2 border-t border-white/10">
                            <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
                              {section.label}
                            </span>
                          </div>
                          
                          {/* Section Items */}
                          <div className="flex flex-col">
                            {section.items.map((item) => (
                              <Link
                                key={item.label}
                                href={item.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center justify-between px-4 py-4 text-white hover:bg-white/5 transition-colors border-b border-white/5"
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
                    <div className="px-4 py-6 bg-black border-t border-white/10 space-y-3">
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
                            <Button 
                              className="w-full h-12 text-sm font-semibold bg-white text-black hover:bg-white/90 rounded-full"
                            >
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
