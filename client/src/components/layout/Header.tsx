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
import { MarketTicker } from "@/components/layout/MarketTicker";
import { Logo } from "@/components/layout/Logo";
import { trpc } from "@/lib/trpc";

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
 * The wordmark, kept as a named export because half the site imports it
 * from here. It is now a thin wrapper over <Logo>, which owns the mark.
 *
 * `Wordmark` renders the word and its rule; the descriptor stack is the
 * `full` variant, used where there is width for it — see <Logo>.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return <Logo variant="mark" className={className} />;
}

/**
 * The beats, in the masthead.
 *
 * Categories come from the newsroom rather than a hardcoded list, so a
 * beat added in the admin appears here without a deploy. The bare slug
 * is the canonical category URL.
 */
function BeatNav() {
  const [location] = useLocation();
  const { data: categories } = trpc.news.getAllCategoriesWithCounts.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const beats = ((categories ?? []) as any[]).filter((c) => !c.parentId && c.isActive !== 0);
  if (!beats.length) return null;
  return (
    <nav
      aria-label="Sections"
      className="hidden lg:block w-full border-b border-border bg-card"
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-6 h-10 overflow-x-auto scrollbar-hide">
        {beats.map((c: any) => {
          const href = `/${c.slug}`;
          const active = location === href || location.startsWith(`${href}/`);
          return (
            <Link
              key={c.slug}
              href={href}
              className={`bd-display shrink-0 text-[0.6875rem] font-bold uppercase tracking-[0.11em] transition-colors ${
                active ? "text-primary" : "text-foreground/60 hover:text-foreground"
              }`}
            >
              {c.name}
            </Link>
          );
        })}
      </div>
    </nav>
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
      {/* The market strip runs above the masthead on every page, which is
          where a reader of a trade paper looks for it — and it is the only
          ink on an otherwise white top, so the masthead reads as paper. */}
      <MarketTicker />
      {/* The masthead stays put once the market strip has scrolled past
          it, so the sections and the search are one click away from
          anywhere on a five-screen page.

          `sticky` here is only half the story: it sticks to the nearest
          scrolling ancestor, and ANY ancestor with `overflow-x-hidden`
          becomes one — the browser resolves the other axis to `auto` —
          at which point the header sticks to a container exactly as tall
          as its own content and scrolls away with the page. That is why
          html and body use `overflow-x: clip` in index.css, and why the
          public page wrappers do too. See server/stickyHeader.test.ts,
          which fails if `overflow-x-hidden` comes back on a page. */}
      <header className="sticky top-0 z-50 w-full bg-card">
        {/* Main Navigation Row */}
        <div className="w-full border-b border-border">
          {/* The masthead mirrors with the page. The brand — menu button and
              wordmark as one group — leads the reading direction, so it sits
              at the left in English and at the right in Arabic: where a
              reader of either language looks first, and on a phone where
              their thumb already is. The controls take the far end. */}
          <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex h-[60px] items-center justify-between gap-4">
            {/* Brand — the menu button and the wordmark travel together, so
                mirroring the bar keeps them beside each other rather than
                throwing them to opposite ends. */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Menu button — grouped with the wordmark, not the controls. */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={t("nav.menu")} className="lg:hidden h-10 w-10 -ms-2 text-foreground hover:bg-muted">
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
                      <Logo variant="full" className="text-white text-[20px]" />
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
                      {/* The masthead switch is a 30px target beside two
                          others on a phone. Here it is the width of the
                          drawer, under a heading that says what it is. */}
                      <div className="flex items-center justify-between gap-3 pb-3">
                        <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
                          {t("nav.language")}
                        </span>
                        <LanguageSwitcher tone="ink" />
                      </div>
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
                {/* The descriptor stack needs about 120px beside the word.
                    A phone masthead does not have it, so below `sm` the
                    mark goes on alone rather than being squeezed. */}
                <Logo variant="mark" className="text-foreground text-[24px] sm:hidden" />
                <Logo variant="full" className="text-foreground text-[26px] hidden sm:inline-flex" />
              </Link>
            </div>

            {/* Center Section - Main Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {mainNavItems.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`bd-display text-[0.8125rem] font-bold uppercase tracking-[0.07em] px-3.5 py-2 transition-colors ${
                    (item.href === "/" ? location === "/" : location.startsWith(item.href))
                      ? "text-primary"
                      : "text-foreground/75 hover:text-primary"
                  }`}
                >
                  {t(item.key)}
                </Link>
              ))}
            </nav>

            {/* Right Section */}
            <div className="flex items-center gap-2">
              {/* Renders nothing until a second language is configured, so
                  a single-language site carries no dead control. Paper tone:
                  the masthead is white, and the control used to be drawn in
                  white on it, which is why the Arabic switch was invisible. */}
              <LanguageSwitcher />

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchOpen(true)}
                aria-label={t("nav.search")}
                className="text-foreground h-10 w-10 hover:bg-muted"
              >
                <Search className="h-5 w-5" />
              </Button>

              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="hidden md:flex h-9 px-4 text-sm font-semibold border-border text-foreground bg-transparent hover:bg-foreground hover:text-background rounded-none transition-colors gap-2"
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
                  <Button className="hidden md:flex h-9 px-5 text-[0.8125rem] font-bold uppercase tracking-[0.06em] bg-foreground text-background hover:bg-primary rounded-none">
                    {t("nav.signIn")}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Beat row: the sections themselves, always one click away. On a
            phone the masthead menu carries them instead. */}
        <BeatNav />
      </header>

      {/* Global Search Overlay */}
      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
