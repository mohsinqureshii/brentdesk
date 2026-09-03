/**
 * My Content Hub - User's content management dashboard
 * Shows claimed profiles, user-created content with edit capabilities, and ability to post new content
 * Designed as a comprehensive content management tab for the user profile
 */

import { useState, useMemo } from "react";
import { fmtDate } from "@/lib/dates";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import {
  Building2,
  Briefcase,
  Users,
  TrendingUp,
  Calendar,
  Rocket,
  Plus,
  Search,
  Eye,
  Edit,
  ExternalLink,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
  FileText,
  LayoutDashboard,
  BarChart3,
  Loader2,
  HelpCircle,
  ChevronRight,
  PenLine,
  FolderOpen,
} from "lucide-react";
import { toast } from "sonner";

// ============================================================
// STATUS BADGE COMPONENT
// ============================================================

function StatusBadge({ slug, name }: { slug: string; name: string }) {
  const variants: Record<string, string> = {
    published: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    draft: "bg-slate-500/10 text-slate-600 border-slate-500/20",
    submitted: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    under_review: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    rejected: "bg-red-500/10 text-red-600 border-red-500/20",
    archived: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    needs_changes: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  };
  const icons: Record<string, React.ReactNode> = {
    published: <CheckCircle2 className="w-3 h-3" />,
    draft: <Clock className="w-3 h-3" />,
    submitted: <AlertCircle className="w-3 h-3" />,
    under_review: <Eye className="w-3 h-3" />,
    rejected: <XCircle className="w-3 h-3" />,
    needs_changes: <HelpCircle className="w-3 h-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${variants[slug] || variants.draft}`}>
      {icons[slug]} {name}
    </span>
  );
}

// ============================================================
// CLAIMED PROFILE STATUS
// ============================================================

const CLAIM_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: typeof CheckCircle2 }> = {
  approved: { label: "Verified", color: "text-green-700", bgColor: "bg-green-100 dark:bg-green-900/30", icon: CheckCircle2 },
  pending: { label: "Pending", color: "text-blue-700", bgColor: "bg-blue-100 dark:bg-blue-900/30", icon: Clock },
  under_review: { label: "Under Review", color: "text-yellow-700", bgColor: "bg-yellow-100 dark:bg-yellow-900/30", icon: Eye },
  needs_clarification: { label: "Needs Info", color: "text-orange-700", bgColor: "bg-orange-100 dark:bg-orange-900/30", icon: HelpCircle },
  rejected: { label: "Rejected", color: "text-red-700", bgColor: "bg-red-100 dark:bg-red-900/30", icon: XCircle },
};

const ENTITY_TYPE_CONFIG: Record<string, { icon: typeof Building2; color: string; bgColor: string; label: string }> = {
  company: { icon: Building2, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30", label: "Company" },
  person: { icon: Users, color: "text-violet-600", bgColor: "bg-violet-100 dark:bg-violet-900/30", label: "Person" },
  accelerator: { icon: Rocket, color: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-900/30", label: "Accelerator" },
  event: { icon: Calendar, color: "text-orange-600", bgColor: "bg-orange-100 dark:bg-orange-900/30", label: "Event" },
  investor: { icon: TrendingUp, color: "text-emerald-600", bgColor: "bg-emerald-100 dark:bg-emerald-900/30", label: "Investor" },
};

// ============================================================
// ENTITY LIST COMPONENT (REUSABLE)
// ============================================================

interface EntityItem {
  id: number;
  name?: string;
  title?: string;
  slug: string;
  logo?: string | null;
  statusName: string;
  statusSlug: string;
  viewCount?: number | null;
  createdAt: Date | string;
}

function EntityList({
  items,
  total,
  page,
  totalPages,
  onPageChange,
  entityType,
  detailPath,
  editPath,
  isLoading,
}: {
  items: EntityItem[];
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  entityType: string;
  detailPath: string | null;
  editPath: string;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
          <FolderOpen className="w-8 h-8" />
        </div>
        <p className="text-lg font-medium">No {entityType} yet</p>
        <p className="text-sm mt-1">Create your first {entityType} to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
        >
          {/* Logo/Avatar */}
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
            {item.logo ? (
              <img src={item.logo} alt="" className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-5 h-5 text-muted-foreground" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium truncate">{item.name || item.title}</h4>
              <StatusBadge slug={item.statusSlug} name={item.statusName} />
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span>{new Date(item.createdAt).toLocaleDateString()}</span>
              {item.viewCount != null && (
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" /> {item.viewCount}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {item.statusSlug === "published" && detailPath && (
              <Link href={`${detailPath}/${item.slug}`}>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="View public page">
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </Link>
            )}
            <Link href={`${editPath}/${item.id}`}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit">
                <Edit className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      ))}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-muted-foreground">
            Showing {items.length} of {total}
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function MyContent() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});
  const [pages, setPages] = useState<Record<string, number>>({});

  // Fetch content stats
  const { data: stats, isLoading: statsLoading } = trpc.userContent.myContentStats.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Fetch claimed profiles
  const { data: claimedProfiles, isLoading: claimedLoading } = trpc.claimedProfiles.myClaimedProfiles.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Fetch each entity type
  const companiesQuery = trpc.userContent.myCompanies.useQuery(
    { page: pages.companies || 1, search: searchTerms.companies },
    { enabled: !!user && (activeTab === "overview" || activeTab === "companies") }
  );

  const jobsQuery = trpc.userContent.myJobs.useQuery(
    { page: pages.jobs || 1, search: searchTerms.jobs },
    { enabled: !!user && (activeTab === "overview" || activeTab === "jobs") }
  );

  const peopleQuery = trpc.userContent.myPeople.useQuery(
    { page: pages.people || 1, search: searchTerms.people },
    { enabled: !!user && (activeTab === "overview" || activeTab === "people") }
  );

  const investorsQuery = trpc.userContent.myInvestors.useQuery(
    { page: pages.investors || 1, search: searchTerms.investors },
    { enabled: !!user && (activeTab === "overview" || activeTab === "investors") }
  );

  const eventsQuery = trpc.userContent.myEvents.useQuery(
    { page: pages.events || 1, search: searchTerms.events },
    { enabled: !!user && (activeTab === "overview" || activeTab === "events") }
  );

  const acceleratorsQuery = trpc.userContent.myAccelerators.useQuery(
    { page: pages.accelerators || 1, search: searchTerms.accelerators },
    { enabled: !!user && (activeTab === "overview" || activeTab === "accelerators") }
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) {
    navigate("/signin");
    return null;
  }

  const entityConfigs = [
    {
      key: "companies",
      label: "Companies",
      icon: Building2,
      count: stats?.companies || 0,
      color: "text-blue-600",
      bgColor: "bg-blue-500/10",
      createPath: "/dashboard/my-content/company/new",
      detailPath: "/companies",
      editPath: "/dashboard/my-content/company",
    },
    {
      key: "jobs",
      label: "Jobs",
      icon: Briefcase,
      count: stats?.jobs || 0,
      color: "text-emerald-600",
      bgColor: "bg-emerald-500/10",
      createPath: "/dashboard/my-content/job/new",
      detailPath: "/jobs",
      editPath: "/dashboard/my-content/job",
    },
    {
      key: "people",
      label: "People",
      icon: Users,
      count: stats?.people || 0,
      color: "text-purple-600",
      bgColor: "bg-purple-500/10",
      createPath: "/dashboard/my-content/person/new",
      detailPath: "/people",
      editPath: "/dashboard/my-content/person",
    },
    {
      key: "investors",
      label: "Investors",
      icon: TrendingUp,
      count: stats?.investors || 0,
      color: "text-amber-600",
      bgColor: "bg-amber-500/10",
      createPath: "/dashboard/my-content/investor/new",
      detailPath: null,
      editPath: "/dashboard/my-content/investor",
    },
    {
      key: "events",
      label: "Events",
      icon: Calendar,
      count: stats?.events || 0,
      color: "text-rose-600",
      bgColor: "bg-rose-500/10",
      createPath: "/dashboard/my-content/event/new",
      detailPath: "/events",
      editPath: "/dashboard/my-content/event",
    },
    {
      key: "accelerators",
      label: "Accelerators",
      icon: Rocket,
      count: stats?.accelerators || 0,
      color: "text-cyan-600",
      bgColor: "bg-cyan-500/10",
      createPath: "/dashboard/my-content/accelerator/new",
      detailPath: null,
      editPath: "/dashboard/my-content/accelerator",
    },
  ];

  const getQueryForTab = (tab: string) => {
    switch (tab) {
      case "companies": return companiesQuery;
      case "jobs": return jobsQuery;
      case "people": return peopleQuery;
      case "investors": return investorsQuery;
      case "events": return eventsQuery;
      case "accelerators": return acceleratorsQuery;
      default: return null;
    }
  };

  const approvedClaims = (claimedProfiles || []).filter((p: any) => p.status === "approved");
  const pendingClaims = (claimedProfiles || []).filter((p: any) => p.status !== "approved" && p.status !== "rejected");
  const totalContent = entityConfigs.reduce((sum, c) => sum + c.count, 0);

  const getEntityLink = (type: string, slug: string | null, name: string | null) => {
    const s = slug || name?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "unknown";
    switch (type) {
      case "company": return `/companies/${s}`;
      case "person": return `/people/${s}`;
      case "accelerator": return `/accelerators/${s}`;
      case "event": return `/events/${s}`;
      case "investor": return `/investors/${s}`;
      default: return "#";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="w-full max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium text-foreground">My Content</span>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
              <PenLine className="h-7 w-7 text-primary" />
              My Content
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your content, claimed profiles, and submissions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/claimed-profiles">
              <Button variant="outline" className="gap-2">
                <ShieldCheck className="h-4 w-4" />
                Claim a Profile
              </Button>
            </Link>
          </div>
        </div>

        {/* Summary Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{statsLoading ? "—" : totalContent}</p>
                  <p className="text-xs text-muted-foreground">Total Content</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{claimedLoading ? "—" : approvedClaims.length}</p>
                  <p className="text-xs text-muted-foreground">Verified Claims</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{claimedLoading ? "—" : pendingClaims.length}</p>
                  <p className="text-xs text-muted-foreground">Pending Claims</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{statsLoading ? "—" : (stats?.jobs || 0)}</p>
                  <p className="text-xs text-muted-foreground">Job Postings</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b mb-6 overflow-x-auto">
            <TabsList className="bg-transparent h-auto p-0 gap-0 w-max">
              <TabsTrigger
                value="overview"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="claimed"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm"
              >
                Claimed Profiles
                {(claimedProfiles?.length || 0) > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                    {claimedProfiles?.length}
                  </Badge>
                )}
              </TabsTrigger>
              {entityConfigs.map((config) => (
                <TabsTrigger
                  key={config.key}
                  value={config.key}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm"
                >
                  {config.label}
                  {config.count > 0 && (
                    <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                      {config.count}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* ============================================================ */}
          {/* OVERVIEW TAB */}
          {/* ============================================================ */}
          <TabsContent value="overview" className="space-y-8">
            {/* Claimed Profiles Section */}
            {(claimedProfiles?.length || 0) > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                    Claimed Profiles
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab("claimed")}
                    className="text-sm gap-1"
                  >
                    View All <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {approvedClaims.slice(0, 3).map((profile: any) => {
                    const typeInfo = ENTITY_TYPE_CONFIG[profile.entityType];
                    const Icon = typeInfo?.icon || Building2;
                    return (
                      <Card key={profile.id} className="hover:shadow-md transition-all group">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-11 w-11 rounded-lg shrink-0">
                              <AvatarImage src={profile.entityLogo || undefined} className="rounded-lg object-cover" />
                              <AvatarFallback className={`rounded-lg ${typeInfo?.bgColor || "bg-muted"}`}>
                                <Icon className={`h-5 w-5 ${typeInfo?.color || "text-muted-foreground"}`} />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">{profile.entityName}</h4>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${typeInfo?.bgColor || ""} ${typeInfo?.color || ""} border-0`}>
                                  {typeInfo?.label || profile.entityType}
                                </Badge>
                                <span className="text-[10px] text-emerald-600 flex items-center gap-0.5">
                                  <CheckCircle2 className="h-3 w-3" /> Verified
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-3">
                            <Link href={getEntityLink(profile.entityType, profile.entitySlug, profile.entityName)} className="flex-1">
                              <Button variant="outline" size="sm" className="w-full gap-1 text-xs h-8">
                                <ExternalLink className="h-3 w-3" /> View
                              </Button>
                            </Link>
                            {profile.entityType === "company" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1 text-xs h-8"
                                onClick={() => navigate(`/dashboard/company-jobs/${profile.entityId}`)}
                              >
                                <LayoutDashboard className="h-3 w-3" /> Jobs
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                {pendingClaims.length > 0 && (
                  <div className="mt-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-400 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      You have {pendingClaims.length} pending claim{pendingClaims.length > 1 ? "s" : ""} awaiting review.
                      <Button
                        variant="link"
                        size="sm"
                        className="text-blue-700 dark:text-blue-400 p-0 h-auto"
                        onClick={() => setActiveTab("claimed")}
                      >
                        View details
                      </Button>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Content Grid */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">My Submissions</h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {entityConfigs.map((config) => {
                  const query = getQueryForTab(config.key);
                  const items = (query?.data?.items || []).slice(0, 3);
                  return (
                    <Card key={config.key} className="hover:shadow-sm transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <div className={`h-7 w-7 rounded-lg ${config.bgColor} flex items-center justify-center`}>
                              <config.icon className={`w-3.5 h-3.5 ${config.color}`} />
                            </div>
                            {config.label}
                          </CardTitle>
                          <Badge variant="secondary" className="text-xs">
                            {config.count}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {items.length > 0 ? (
                          items.map((item: any) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/5 text-sm"
                            >
                              <div className="w-7 h-7 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                                {item.logo ? (
                                  <img src={item.logo} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <config.icon className="w-3.5 h-3.5 text-muted-foreground" />
                                )}
                              </div>
                              <span className="truncate flex-1">{item.name || item.title}</span>
                              <StatusBadge slug={item.statusSlug} name={item.statusName} />
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground py-2">No {config.label.toLowerCase()} yet</p>
                        )}
                        <div className="flex gap-2 pt-2">
                          <Link href={config.createPath} className="flex-1">
                            <Button variant="outline" size="sm" className="w-full gap-1">
                              <Plus className="w-3 h-3" /> Create
                            </Button>
                          </Link>
                          {config.count > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setActiveTab(config.key)}
                              className="gap-1"
                            >
                              View All
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Info Banner */}
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <AlertCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-1">How content moderation works</h3>
                    <p className="text-sm text-muted-foreground">
                      When you submit new content (companies, jobs, profiles, etc.), it goes through a review process.
                      An admin will review your submission and either approve it for publishing, request changes, or reject it
                      with a reason. You can track the status of all your submissions here.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============================================================ */}
          {/* CLAIMED PROFILES TAB */}
          {/* ============================================================ */}
          <TabsContent value="claimed">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  Claimed Profiles
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Profiles you have claimed ownership of. Verified profiles give you management access.
                </p>
              </div>
              <Link href="/claimed-profiles">
                <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="h-4 w-4" />
                  Claim a Profile
                </Button>
              </Link>
            </div>

            {claimedLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : !claimedProfiles || claimedProfiles.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
                  <h3 className="text-lg font-semibold mb-2">No Claimed Profiles</h3>
                  <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                    Claim a company, person, accelerator, event, or investor profile to manage it and post content.
                  </p>
                  <Link href="/claimed-profiles">
                    <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                      <Plus className="h-4 w-4" />
                      Claim Your First Profile
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {claimedProfiles.map((profile: any) => {
                  const typeInfo = ENTITY_TYPE_CONFIG[profile.entityType];
                  const Icon = typeInfo?.icon || Building2;
                  const statusConfig = CLAIM_STATUS_CONFIG[profile.status];
                  const StatusIcon = statusConfig?.icon || Clock;

                  return (
                    <Card key={profile.id} className="hover:shadow-md transition-all">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-14 w-14 rounded-xl shrink-0">
                            <AvatarImage src={profile.entityLogo || undefined} className="rounded-xl object-cover" />
                            <AvatarFallback className={`rounded-xl ${typeInfo?.bgColor || "bg-muted"}`}>
                              <Icon className={`h-6 w-6 ${typeInfo?.color || "text-muted-foreground"}`} />
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="text-lg font-semibold truncate">
                                {profile.entityName || `${typeInfo?.label} #${profile.entityId}`}
                              </h3>
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${typeInfo?.bgColor || ""} ${typeInfo?.color || ""} border-0`}>
                                {typeInfo?.label || profile.entityType}
                              </Badge>
                              <Badge className={`${statusConfig?.bgColor || "bg-muted"} ${statusConfig?.color || ""} border-0 gap-1 text-xs`}>
                                <StatusIcon className="h-3 w-3" />
                                {statusConfig?.label || profile.status}
                              </Badge>
                            </div>

                            <p className="text-sm text-muted-foreground">
                              Role: <span className="capitalize font-medium">{profile.role}</span>
                              {profile.createdAt && ` · Claimed ${fmtDate(new Date(profile.createdAt), { month: "short", day: "numeric", year: "numeric" })}`}
                            </p>

                            {/* Verification note for rejected/needs_clarification */}
                            {(profile.status === "rejected" || profile.status === "needs_clarification") && profile.verificationNote && (
                              <div className={`mt-2 p-2.5 rounded-lg text-sm ${
                                profile.status === "rejected" ? "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800" : "bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800"
                              }`}>
                                <div className="flex items-start gap-2">
                                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                  <div>
                                    <p className="font-medium text-xs uppercase tracking-wide mb-0.5">
                                      {profile.status === "rejected" ? "Rejection Reason" : "Clarification Needed"}
                                    </p>
                                    <p>{profile.verificationNote}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 mt-3 flex-wrap">
                              {profile.status === "approved" && (
                                <>
                                  <Button variant="outline" size="sm" asChild className="gap-1.5">
                                    <Link href={getEntityLink(profile.entityType, profile.entitySlug, profile.entityName)}>
                                      <ExternalLink className="h-3.5 w-3.5" />
                                      View Profile
                                    </Link>
                                  </Button>

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5"
                                    onClick={() => navigate(`/dashboard/edit-claimed/${profile.entityType}/${profile.entityId}`)}
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                    Edit Profile
                                  </Button>

                                  {profile.entityType === "company" && (
                                    <>
                                      <Button
                                        size="sm"
                                        className="gap-1.5 bg-blue-600 hover:bg-blue-700"
                                        onClick={() => navigate(`/dashboard/company-jobs/${profile.entityId}`)}
                                      >
                                        <LayoutDashboard className="h-3.5 w-3.5" />
                                        Jobs Dashboard
                                      </Button>
                                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate(`/dashboard/my-content/job/new?companyId=${profile.entityId}`)}>
                                        <Briefcase className="h-3.5 w-3.5" />
                                        Post a Job
                                      </Button>
                                      <Button variant="outline" size="sm" asChild className="gap-1.5">
                                        <Link href={`/dashboard/applicant-tracker/${profile.entityId}`}>
                                          <BarChart3 className="h-3.5 w-3.5" />
                                          Applicants
                                        </Link>
                                      </Button>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ============================================================ */}
          {/* ENTITY-SPECIFIC TABS */}
          {/* ============================================================ */}
          {entityConfigs.map((config) => (
            <TabsContent key={config.key} value={config.key}>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <div className={`h-8 w-8 rounded-lg ${config.bgColor} flex items-center justify-center`}>
                          <config.icon className={`w-4 h-4 ${config.color}`} />
                        </div>
                        My {config.label}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Manage your {config.label.toLowerCase()}. New submissions go through moderation before publishing.
                      </CardDescription>
                    </div>
                    <Link href={config.createPath}>
                      <Button size="sm" className="gap-1">
                        <Plus className="w-4 h-4" /> Create {config.label.slice(0, -1)}
                      </Button>
                    </Link>
                  </div>
                  <div className="mt-3">
                    <div className="relative max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder={`Search ${config.label.toLowerCase()}...`}
                        value={searchTerms[config.key] || ""}
                        onChange={(e) =>
                          setSearchTerms((prev) => ({ ...prev, [config.key]: e.target.value }))
                        }
                        className="pl-9"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <EntityList
                    items={(getQueryForTab(config.key)?.data?.items || []) as EntityItem[]}
                    total={getQueryForTab(config.key)?.data?.total || 0}
                    page={pages[config.key] || 1}
                    totalPages={getQueryForTab(config.key)?.data?.totalPages || 1}
                    onPageChange={(p) => setPages((prev) => ({ ...prev, [config.key]: p }))}
                    entityType={config.label.toLowerCase()}
                    detailPath={config.detailPath}
                    editPath={config.editPath}
                    isLoading={getQueryForTab(config.key)?.isLoading || false}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
