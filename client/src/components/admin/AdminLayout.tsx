/**
 * Admin Layout Component
 * Green/White Aramco-style design for the publication's CMS
 */

import { useState } from "react";
import { Link, useLocation } from "wouter";
import { publication } from "@shared/publication";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Users,
  Building2,
  Calendar,
  Package,
  FolderOpen,
  Settings,
  Search,
  Bell,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  LogOut,
  User,
  Shield,
  Image,
  Globe,
  Megaphone,
  Home,
  Upload,
  GitBranch,
  CheckSquare,
  Rocket,
  Tags,
  DollarSign,
  Key,
  Handshake,
  Mail,
  PenTool,
  MonitorPlay,
  UserCog,
  Database,
  Sparkles,
  Bot,
  BarChart3,
  BookOpen,
  Layout,
  Brain,
  Layers,
  CalendarDays,
  SearchCheck,
  Palette,
  ShieldCheck,
  Share2,
  Newspaper,
  Mic2,
  Video,
  Eye,
  Webhook,
  Code,
  Puzzle,
} from "lucide-react";

interface NavItem {
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  // `badgeKey` lets a child entry surface a live count next to its
  // label (e.g. number of pending event submissions). Keep this
  // narrow — adding too many badges turns the sidebar into noise.
  children?: { title: string; href: string; badgeKey?: "eventSubmissions" }[];
}

const navigation: NavItem[] = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Content",
    icon: FileText,
    children: [
      { title: "Articles", href: "/admin/articles" },
      { title: "Jobs", href: "/admin/jobs" },
      { title: "People", href: "/admin/people" },
      { title: "Companies", href: "/admin/companies" },
      { title: "Investors", href: "/admin/investors" },
      { title: "Events", href: "/admin/events" },
      // Public submissions queue — surfaces a live count of items
      // awaiting human review (pending + ai_approved + ai_flagged).
      { title: "Event Submissions", href: "/admin/events/submissions", badgeKey: "eventSubmissions" },
      { title: "Accelerators", href: "/admin/accelerators" },
      { title: "Resources", href: "/admin/resources" },
    ],
  },
  {
    title: "Workflows",
    icon: GitBranch,
    children: [
      { title: "Editorial Queue", href: "/admin/workflow" },
      { title: "Moderation", href: "/admin/moderation" },
      { title: "Claim Requests", href: "/admin/claim-requests" },
      { title: "User Submissions", href: "/admin/user-submissions" },
    ],
  },
  {
    title: "Taxonomy",
    href: "/admin/taxonomy",
    icon: Tags,
  },
  {
    title: "Media Library",
    href: "/admin/media",
    icon: Image,
  },
  {
    title: "Funding Tracker",
    icon: DollarSign,
    children: [
      { title: "All Rounds", href: "/admin/funding" },
      { title: "Add Round", href: "/admin/funding/new" },
      { title: "Analytics", href: "/admin/funding?tab=analytics" },
    ],
  },
  {
    title: "Homepage",
    icon: Home,
    children: [
      { title: "Blocks", href: "/admin/homepage" },
      { title: "Category Sections", href: "/admin/homepage-sections" },
    ],
  },
  {
    title: "Popups & Banners",
    href: "/admin/popups",
    icon: Megaphone,
  },
  {
    title: "SEO",
    icon: Search,
    children: [
      // Single entry point. AI SEO Tools and Search Analytics now live
      // inside SEO Manager → Health → AI Studio and SEO Manager → Indexing
      // → Search Analytics respectively. Old standalone routes still resolve
      // for bookmark compat but are no longer surfaced in the sidebar.
      { title: "SEO Manager", href: "/admin/seo" },
    ],
  },
  {
    title: "Import",
    icon: Upload,
    children: [
      { title: "WordPress", href: "/admin/import/wordpress" },
    ],
  },
  {
    title: "Partners",
    icon: Handshake,
    children: [
      { title: "All Partners", href: "/admin/partners" },
      { title: "Affiliate Tracking", href: "/admin/partners?tab=affiliates" },
      { title: "Payouts", href: "/admin/partners?tab=payouts" },
    ],
  },
  {
    title: "Newsletter",
    icon: Mail,
    children: [
      { title: "Subscribers", href: "/admin/newsletter" },
      { title: "Campaigns", href: "/admin/newsletter?tab=campaigns" },
      { title: "Leads", href: "/admin/newsletter?tab=leads" },
      { title: "AI Newsletter", href: "/admin/ai/newsletter" },
    ],
  },
  {
    title: "Writers",
    icon: PenTool,
    children: [
      { title: "Applications", href: "/admin/writers" },
      { title: "Active Writers", href: "/admin/writers?tab=active" },
      { title: "Payouts", href: "/admin/writers?tab=payouts" },
    ],
  },
  {
    title: "Advertising",
    icon: MonitorPlay,
    href: "/admin/advertising",
  },
  {
    title: "Talent Platform",
    icon: Building2,
    children: [
      { title: "Jobs", href: "/admin/talent/jobs" },
      { title: "Pipeline", href: "/admin/talent/pipeline" },
      { title: "Candidates", href: "/admin/talent/candidates" },
      { title: "Interviews", href: "/admin/talent/interviews" },
      { title: "Offers", href: "/admin/talent/offers" },
      { title: "Assessments", href: "/admin/talent/assessments" },
      { title: "Reports", href: "/admin/talent/reports" },
      { title: "Tenants", href: "/admin/tenants" },
      { title: "Integrations", href: "/admin/integrations" },
      { title: "System Health", href: "/admin/system-health" },
    ],
  },
  {
    title: "AI Content",
    icon: Sparkles,
    children: [
      // Consolidated from 13 entries into 3 (Sept 2026 cleanup):
      //   - AI Studio = unified workspace for Newsletter, Social, Script,
      //     Bulk, Analyze (Tone + Plagiarism + Comparison), Research
      //   - Article Writer = the long-form generator (kept separate)
      //   - News Agent = automated content discovery
      //   - Editorial Calendar = planning view
      // AI Analytics moved to Dashboard "Insights" tab.
      // EntitiesManager / KeywordsManager / PolicyManager / TemplatesManager
      // deleted (duplicates of admin/entityLinking, admin/taxonomy/keywords,
      // /about anchors, /resources/templates respectively).
      { title: "AI Studio", href: "/admin/ai/studio" },
      { title: "Article Writer", href: "/admin/ai/generate" },
      { title: "News Agent", href: "/admin/ai/agent" },
      { title: "Editorial Calendar", href: "/admin/ai/calendar" },
    ],
  },
];

// AI Content tools are now part of the main navigation as a collapsible menu

const settingsNavigation: NavItem[] = [
  {
    title: "Users & Roles",
    icon: Shield,
    children: [
      { title: "Users", href: "/admin/users" },
      { title: "Roles & Permissions", href: "/admin/roles" },
    ],
  },
  {
    title: "Integration Hub",
    icon: Puzzle,
    children: [
      // Single entry point. The Hub page itself surfaces cards for
      // Email / SMS / WhatsApp / AI / Webhooks / API Access — each
      // links into its own configure screen.
      { title: "All Integrations", href: "/admin/integrations" },
    ],
  },
  {
    title: "Settings",
    icon: Settings,
    children: [
      // AI Settings / Webhooks / API Access removed from this group —
      // they're surfaced inside Integration Hub now. Routes still resolve
      // for bookmark compat.
      { title: "General", href: "/admin/settings" },
      // Editions defines country-anchored views of the public site
      // (Saudi / UAE / Egypt / Pakistan / Turkey / International ...).
      // It belongs under Settings because it's site-wide configuration,
      // not content the editor touches per article.
      { title: "Editions", href: "/admin/editions" },
    ],
  },
  {
    title: "Master Data",
    icon: Database,
    children: [
      { title: "Locations", href: "/admin/master-data/locations" },
    ],
  },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(["Content"]);
  const [location] = useLocation();
  const { user, logout } = useAuth();

  // Live sidebar badges. Polled every 60s — cheap counts query,
  // single grouped SELECT. If the query fails (logged-out, network)
  // the badge silently disappears, which is the right default.
  const submissionsCount = trpc.events.adminListSubmissions.useQuery(
    { status: "needs_review", page: 1, limit: 1 },
    { refetchInterval: 60_000, retry: false },
  );
  const badgeCounts: Record<string, number | undefined> = {
    eventSubmissions: submissionsCount.data?.counts?.needs_review,
  };

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    );
  };

  const isActive = (href: string) => {
    if (href === "/admin") return location === "/admin";
    return location.startsWith(href.split("?")[0]);
  };

  const NavItemComponent = ({ item }: { item: NavItem }) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.title);
    const active = item.href ? isActive(item.href) : false;
    const hasActiveChild = hasChildren && item.children?.some((child) => isActive(child.href));

    if (hasChildren) {
      return (
        <Collapsible
          open={isExpanded || hasActiveChild}
          onOpenChange={() => toggleExpanded(item.title)}
        >
          <CollapsibleTrigger className="w-full">
            <div
              className={cn(
                "flex items-center justify-between px-3 py-1.5 rounded-sm text-sm transition-colors",
                hasActiveChild
                  ? "bg-[#EBF3FF] text-[#0066FF] font-semibold"
                  : "text-[#697386] hover:bg-[#F7F8FA] hover:text-[#1A1F36]"
              )}
            >
              <div className="flex items-center gap-2.5">
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </div>
              {isExpanded || hasActiveChild ? (
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 opacity-70" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="ml-6 mt-0.5 space-y-0.5 border-l border-[#E0E3E8] pl-2">
              {item.children?.map((child) => {
                const badge =
                  child.badgeKey != null ? badgeCounts[child.badgeKey] : undefined;
                return (
                  <Link key={child.href} href={child.href}>
                    <span
                      className={cn(
                        "flex items-center justify-between px-3 py-1.5 rounded-sm text-[13px] transition-colors cursor-pointer",
                        isActive(child.href)
                          ? "bg-[#EBF3FF] text-[#0066FF] font-semibold"
                          : "text-[#697386] hover:bg-[#F7F8FA] hover:text-[#1A1F36]"
                      )}
                    >
                      <span>{child.title}</span>
                      {typeof badge === "number" && badge > 0 && (
                        <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-semibold bg-amber-500 text-white">
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </span>
                  </Link>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      );
    }

    return (
      <Link href={item.href!}>
        <span
          className={cn(
            "flex items-center gap-2.5 px-3 py-1.5 rounded-sm text-[13.5px] transition-colors cursor-pointer",
            active
              ? "bg-[#EBF3FF] text-[#0066FF] font-semibold"
              : "text-[#697386] hover:bg-[#F7F8FA] hover:text-[#1A1F36]"
          )}
        >
          <item.icon className="h-4 w-4" />
          <span>{item.title}</span>
        </span>
      </Link>
    );
  };

  return (
    <div data-admin-layout className="min-h-screen bg-[#F7F8FA] flex">
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar — Square-style polish on the publication's emerald.
          Solid emerald (no more 2-stop gradient noise), tighter section
          labels, refined hover/active states, thin divider above logout. */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 flex flex-col transition-transform duration-300 overflow-hidden",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{ backgroundColor: '#ffffff', borderRight: '1px solid #E0E3E8' }}
      >
        {/* Logo */}
        <div className="px-5 py-4 flex items-center gap-3 flex-shrink-0 border-b border-[#E0E3E8]">
          <img
            src="/assets/logo.png"
            alt={publication.name}
            className="h-7 w-auto object-contain"
            style={{ maxWidth: '140px' }}
          />
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden ml-auto text-[#697386] hover:bg-[#F7F8FA]"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
          <ScrollArea className="flex-1 px-3 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent hover:scrollbar-thumb-white/40">
          <nav className="space-y-0.5 pr-2">
            <div className="text-[10px] font-semibold text-[#9BA3B0] uppercase tracking-[0.12em] px-4 mb-1.5">
              Operations
            </div>
            {navigation.map((item) => (
              <NavItemComponent key={item.title} item={item} />
            ))}

            <div className="text-[10px] font-semibold text-[#9BA3B0] uppercase tracking-[0.12em] px-4 mt-5 mb-1.5">
              Settings
            </div>
            {settingsNavigation.map((item) => (
              <NavItemComponent key={item.title} item={item} />
            ))}
          </nav>
        </ScrollArea>

        {/* Logout */}
        <div className="px-3 py-3 border-t border-[#E0E3E8]">
          <button
            onClick={() => logout()}
            className="flex items-center gap-3 px-3 py-1.5 w-full rounded-sm text-[13px] text-[#697386] hover:bg-[#F7F8FA] hover:text-[#1A1F36] transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content — Square-style: light zinc-50 page bg, white sticky
          header with subtle border, generous content padding. White cards
          (default in our shadcn Card primitive) sit on this bg with clean
          contrast. */}
      <div className="flex-1 lg:ml-64 bg-[#F7F8FA] min-h-screen">
        {/* Top Header */}
        <header className="bg-white border-b border-[#E0E3E8] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 h-14">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="text-[#697386] text-[13px] truncate">
              Welcome, <span className="font-medium text-[#1A1F36]">{user?.name || "Admin"}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Search - hidden on mobile */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9BA3B0]" />
              <input
                type="text"
                placeholder="Search..."
                className="w-56 h-8 pl-9 pr-4 rounded-sm bg-[#F7F8FA] border border-[#E0E3E8] text-[13px] text-[#1A1F36] placeholder:text-[#9BA3B0] focus:outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/10 transition-colors"
              />
            </div>

            {/* Notifications */}
            <button className="relative p-1.5 text-[#697386] hover:text-[#1A1F36] transition-colors rounded-sm hover:bg-[#F7F8FA]">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-3 focus:outline-none">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-[#EBF3FF] text-[#0066FF] font-semibold text-[13px]">
                    {user?.name?.charAt(0) || "A"}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-medium text-[#1A1F36]">
                    {user?.name || "Admin User"}
                  </p>
                  <p className="text-xs text-[#697386] capitalize leading-tight">
                    {user?.role || "Admin"}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-[#9BA3B0] hidden sm:block" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link href="/admin/profile">
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                </Link>
                <Link href="/admin/account">
                  <DropdownMenuItem>
                    <Key className="mr-2 h-4 w-4" />
                    Security
                  </DropdownMenuItem>
                </Link>
                <Link href="/admin/settings">
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

export default AdminLayout;
