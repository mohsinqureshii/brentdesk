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
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useT } from "@/lib/i18n";
import { useDirection, useLocale } from "@/components/LocaleProvider";
import type { UiKey } from "@shared/uiStrings";
import { Input } from "@/components/ui/input";
import { publication } from "@shared/publication";

// Nav entries carry a translation key rather than a label. The href stays
// English because the route does — wouter's locale base turns /companies into
// /ar/companies — so switching language changes the word, not the destination.
const mainNavItems: { key: UiKey; href: string }[] = [
  { key: "nav.news", href: "/" },
  { key: "nav.companies", href: "/companies" },
  { key: "nav.people", href: "/people" },
  { key: "nav.events", href: "/events" },
  { key: "nav.jobs", href: "/jobs" },
];

// Mobile navigation, grouped. Category slugs match the BrentDesk
// industrial taxonomy seeded in scripts/seed-brentdesk.ts.
const mobileNavSections: { key: UiKey; items: { key: UiKey; href: string; hasArrow?: boolean }[] }[] = [
  {
    key: "nav.news",
    items: [
      { key: "nav.latest", href: "/" },
      { key: "cat.construction", href: "/construction" },
      { key: "cat.infrastructure", href: "/infrastructure" },
      { key: "cat.energy", href: "/energy" },
      { key: "cat.manufacturing", href: "/manufacturing" },
      { key: "cat.logistics", href: "/logistics" },
      { key: "cat.real-estate", href: "/real-estate" },
      { key: "cat.industrial-technology", href: "/industrial-technology" },
    ],
  },
  {
    key: "nav.directory",
    items: [
      { key: "nav.companies", href: "/companies", hasArrow: true },
      { key: "nav.people", href: "/people", hasArrow: true },
    ],
  },
  {
    key: "nav.industry",
    items: [
      { key: "nav.events", href: "/events" },
      { key: "nav.jobs", href: "/jobs" },
      { key: "nav.newsletter", href: "/newsletter" },
    ],
  },
];

/**
 * The wordmark as plain text, for the few places that lay the mark out
 * themselves — the sign-in panels, which colour the trailing dot with the
 * rest of the word rather than in the accent. Same source as <Wordmark>.
 */
export function useWordmark(): string {
  return publication.wordmarksByLocale[useLocale()] ?? publication.wordmark;
}

/**
 * Text wordmark — crisp at every size, no image dependency.
 *
 * Renders the mark for the language being read: `brentdesk.` in English,
 * `برنت ديسك.` in Arabic. The locale comes from the URL, so a hard load of
 * /ar paints the Arabic mark rather than swapping to it a moment later.
 *
 * The trailing dot is a separate span so it keeps the accent colour. It is
 * a neutral character, so in Arabic the bidi algorithm puts it at the left
 * end of the mark — the end of the word on a right-to-left line, which is
 * where it belongs.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const localized = publication.wordmarksByLocale[locale];
  const mark = localized ?? publication.wordmark;

  return (
    <span
      // Inter Tight is drawn tight; Arabic is not, and negative tracking
      // crowds the joins, so the Arabic mark goes without it.
      className={`font-extrabold leading-none select-none ${localized ? "" : "tracking-tight"} ${className}`}
      // Named only for the Latin mark. An inline family beats even the
      // unlayered rule that delivers STC Forward, and Inter Tight has no
      // Arabic glyphs — naming it here would drop the Arabic mark to
      // whatever the browser falls back to, which on Windows is Tahoma.
      // Leaving it unset lets the mark inherit the page's own face.
      style={localized ? undefined : { fontFamily: "var(--font-display)" }}
    >
      {mark.replace(/\.$/, "")}
      <span className="text-primary">.</span>
    </span>
  );
}

export function Header() {
  const [location] = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const t = useT();
  const dir = useDirection();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <>
      <header className="sticky top-0 z-50 w-full bd-ink">
        {/* Main Navigation Row */}
        <div className="w-full border-b border-white/10">
          {/* The masthead mirrors with the page. The brand — menu button and
              wordmark as one group — leads the reading direction, so it sits
              at the left in English and at the right in Arabic: where a
              reader of either language looks first, and on a phone where
              their thumb already is. The controls take the far end. */}
          <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
            {/* Brand — the menu button and the wordmark travel together, so
                mirroring the bar keeps them beside each other rather than
                throwing them to opposite ends. */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Menu button — grouped with the wordmark, not the controls. */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={t("nav.menu")} className="lg:hidden h-10 w-10 -ms-2 text-white hover:bg-white/10">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  // Opens from under the button that summoned it, which is
                  // whichever side the language starts on: left in English,
                  // right in Arabic. Radix takes a physical side, so this is
                  // the one part of the drawer that cannot be left to CSS.
                  side={dir === "rtl" ? "right" : "left"}
                  dir={dir}
                  // Explicit colours rather than the `bd-ink` class: that class
                  // lives in Tailwind's component layer, and SheetContent's own
                  // `bg-background` utility overrode it — a white panel with the
                  // white text below still on it. Passing a bg utility also lets
                  // tailwind-merge drop `bg-background` instead of fighting it.
                  className="w-full max-w-[320px] p-0 bg-[#0b0d12] text-white border-none overflow-y-auto [&>button]:hidden"
                >
                  <div className="flex flex-col h-full">
                    {/* Header with wordmark */}
                    <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
                      <button
                        onClick={() => setMobileMenuOpen(false)}
                        aria-label={t("nav.close")}
                        className="text-white hover:text-white/70"
                      >
                        <X className="h-6 w-6" />
                      </button>
                      <Wordmark className="text-white text-2xl" />
                      <Link
                        href={isAuthenticated ? "/profile" : "/signin"}
                        onClick={() => setMobileMenuOpen(false)}
                        aria-label={isAuthenticated ? t("nav.profile") : t("nav.signIn")}
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
                          placeholder={t("nav.searchPlaceholder", { site: publication.name })}
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
                            {t("nav.account")}
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
                              {t("nav.dashboard")}
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
                              {t("nav.profile")}
                            </span>
                            <ChevronRight className="h-5 w-5 text-white/40" />
                          </Link>
                        </div>
                      </div>
                    )}

                    {/* Navigation Sections */}
                    <div className="flex-1">
                      {mobileNavSections.map((section) => (
                        <div key={section.key}>
                          <div className="px-4 py-2 border-t border-white/10">
                            <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
                              {t(section.key)}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            {section.items.map((item) => (
                              <Link
                                key={item.key}
                                href={item.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center justify-between px-4 py-3.5 text-white hover:bg-white/5 transition-colors border-b border-white/5"
                              >
                                <span className="text-base font-medium">{t(item.key)}</span>
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
                          {t("nav.signOut")}
                        </Button>
                      ) : (
                        <>
                          <Link href="/signin" className="block" onClick={() => setMobileMenuOpen(false)}>
                            <Button
                              variant="outline"
                              className="w-full h-12 text-sm font-semibold border-white/30 text-white bg-transparent hover:bg-white hover:text-black rounded-full"
                            >
                              {t("nav.signIn")}
                            </Button>
                          </Link>
                          <Link href="/signup" className="block" onClick={() => setMobileMenuOpen(false)}>
                            <Button className="w-full h-12 text-sm font-semibold bg-white text-black hover:bg-white/90 rounded-full">
                              {t("nav.createAccount")}
                            </Button>
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
              <Link href="/" className="flex items-center shrink-0" aria-label={`${publication.name} home`}>
                <Wordmark className="text-white text-[26px]" />
              </Link>
            </div>

            {/* Center Section - Main Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {mainNavItems.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`text-[15px] font-semibold px-4 py-2 rounded-md transition-colors ${
                    (item.href === "/" ? location === "/" : location.startsWith(item.href))
                      ? "text-white"
                      : "text-white/75 hover:text-white"
                  }`}
                >
                  {t(item.key)}
                </Link>
              ))}
            </nav>

            {/* Right Section */}
            <div className="flex items-center gap-2">
              {/* Renders nothing until a second language is configured, so
                  a single-language site carries no dead control. */}
              <LanguageSwitcher className="text-white hover:bg-white/10" />

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchOpen(true)}
                aria-label={t("nav.search")}
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
                      {user?.name || t("nav.account")}
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="cursor-pointer text-sm font-medium w-full flex items-center gap-2">
                        <LayoutDashboard className="h-4 w-4" />
                        {t("nav.dashboard")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/my-content" className="cursor-pointer text-sm font-medium w-full flex items-center gap-2">
                        <LayoutDashboard className="h-4 w-4" />
                        {t("nav.myContent")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="cursor-pointer text-sm font-medium w-full flex items-center gap-2">
                        <UserCircle className="h-4 w-4" />
                        {t("nav.profile")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => logout()}
                      className="cursor-pointer text-sm font-medium text-red-600 focus:text-red-600"
                    >
                      {t("nav.signOut")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link href="/signin">
                  <Button className="hidden md:flex h-9 px-5 text-sm font-semibold bg-white text-black hover:bg-white/90 rounded-full">
                    {t("nav.signIn")}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Global Search Overlay */}
      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
