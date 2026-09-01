/**
 * Admin Dashboard — TechScoop edition.
 *
 * Multi-tab analytics surface for a tech-news platform. Tabs are workflow-
 * shaped: Home (everything-at-a-glance), Content (editorial pipeline + top
 * articles), SEO (audit + indexing health), Engagement (newsletter +
 * submissions), Revenue (AdSense + direct ads), Audience (GA pageviews).
 *
 * Data sources are real where we have them (articles, audit, indexing,
 * submissions) and "Connect via Integration Hub" stubs where we need an
 * external API (Google Analytics, AdSense). Operators clicking those
 * stubs are taken straight to the right card in the Hub.
 *
 * Fully responsive: stat-card grids reflow at sm/md/lg, tabs scroll
 * horizontally on phones, charts are ResponsiveContainer-wrapped.
 */

import { useState } from "react";
import { Link } from "wouter";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { AIAnalyticsPanel } from "./ai/AIAnalytics";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import {
  FileText, Briefcase, Users, Building2, Calendar, Inbox, BookOpen,
  TrendingUp, TrendingDown, Activity, Globe, Mail, BarChart3,
  Plus, ArrowRight, Sparkles, ShieldCheck, RefreshCw, Wand2, Eye,
  CheckCircle2, AlertTriangle, Zap, DollarSign, ExternalLink,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from "recharts";

// ============================================================
// SHARED PRIMITIVES
// ============================================================

interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: { value: string; positive: boolean } | null;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "emerald" | "blue" | "amber" | "violet" | "rose" | "zinc";
  loading?: boolean;
  href?: string;
}

const ACCENT: Record<NonNullable<KpiCardProps["accent"]>, { bg: string; text: string }> = {
  emerald: { bg: "bg-[#EBF3FF]", text: "text-[#0066FF]" },
  blue:    { bg: "bg-blue-100",    text: "text-blue-700" },
  amber:   { bg: "bg-amber-100",   text: "text-amber-700" },
  violet:  { bg: "bg-violet-100",  text: "text-violet-700" },
  rose:    { bg: "bg-rose-100",    text: "text-rose-700" },
  zinc:    { bg: "bg-[#F0F2F5]",    text: "text-[#1A1F36]" },
};

function KpiCard({ label, value, delta, hint, icon: Icon, accent = "emerald", loading, href }: KpiCardProps) {
  const tone = ACCENT[accent];
  const inner = (
    <Card className={`group ${href ? "hover:shadow-md transition-shadow cursor-pointer" : ""}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#697386]">{label}</p>
          <div className={`w-9 h-9 rounded-md flex items-center justify-center ${tone.bg}`}>
            <Icon className={`h-4 w-4 ${tone.text}`} />
          </div>
        </div>
        {loading ? (
          <Skeleton className="h-8 w-24 mb-2" />
        ) : (
          <p className="text-xl font-semibold text-[#1A1F36] tracking-tight tabular-nums">{value}</p>
        )}
        <div className="flex items-center justify-between mt-2 min-h-[20px]">
          <p className="text-xs text-[#697386]">{hint}</p>
          {delta && (
            <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${
              delta.positive ? "text-[#0066FF]" : "text-rose-700"
            }`}>
              {delta.positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {delta.value}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

interface QuickActionProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  accent?: "emerald" | "blue" | "amber" | "violet" | "rose" | "zinc";
}

function QuickAction({ label, icon: Icon, href, accent = "emerald" }: QuickActionProps) {
  const tone = ACCENT[accent];
  return (
    <Link href={href}>
      <button className={`w-full text-left rounded-md border border-[#E0E3E8] p-4 hover:border-[#0066FF] hover:shadow-sm transition flex items-start gap-3 bg-white`}>
        <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${tone.bg}`}>
          <Icon className={`h-5 w-5 ${tone.text}`} />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#1A1F36]">{label}</p>
        </div>
      </button>
    </Link>
  );
}

/** "Connect via Integration Hub" empty state for tabs that depend on an external API. */
function ConnectIntegrationCard({
  title, description, integrationId, capabilities,
}: {
  title: string;
  description: string;
  integrationId: string;
  capabilities: string[];
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-6 sm:p-8 text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-[#F0F7FF] flex items-center justify-center mb-4">
          <Zap className="h-6 w-6 text-[#0066FF]" />
        </div>
        <h3 className="text-lg font-semibold text-[#1A1F36] mb-2">{title}</h3>
        <p className="text-sm text-[#697386] max-w-md mx-auto mb-5">{description}</p>
        <div className="flex flex-wrap justify-center gap-1.5 mb-5">
          {capabilities.map((c) => (
            <Badge key={c} variant="secondary" className="text-[11px] bg-[#F0F2F5] text-[#1A1F36]">{c}</Badge>
          ))}
        </div>
        <Link href={`/admin/integrations#${integrationId}`}>
          <Button className="bg-[#0066FF] hover:bg-[#0052CC]">
            Connect via Integration Hub <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function PanelTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-[#1A1F36]">{title}</h3>
      {action}
    </div>
  );
}

// ============================================================
// DASHBOARD
// ============================================================

export default function AdminDashboard() {
  // Role-aware dashboard. ALL hooks run unconditionally on every render
  // (Rules of Hooks); the role check below decides which JSX to return,
  // not which hooks fire. role-change between author <-> editor stays
  // safe because the hook list is stable.
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("home");
  const stats         = trpc.admin.dashboard.getStats.useQuery();
  const auditSummary  = trpc.admin.seoAudit.getSummary.useQuery();
  const submissions   = trpc.submissions.listForAdmin.useQuery({ page: 1, limit: 5 });
  // Best-effort fetch of the existing search-analytics summary; if the
  // user hasn't logged any searches yet the panel just renders zeroes.
  const searchSummary = trpc.admin.searchAnalytics.getSummary.useQuery({ days: 30 });

  // Writers get a focused My Work view (drafts / scheduled / published).
  // Editors / senior_editors / admins get the full multi-tab analytics
  // surface below.
  if (user?.role === "author") {
    return <WriterDashboard />;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[#1A1F36]">Dashboard</h1>
            <p className="text-[#697386] mt-0.5 text-[13px]">
              Editorial, SEO, audience, and revenue health across techscoop.io
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { stats.refetch(); auditSummary.refetch(); submissions.refetch(); }}>
              <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh
            </Button>
            <Link href="/admin/integrations">
              <Button variant="outline" size="sm">
                <Zap className="h-4 w-4 mr-1.5" /> Integrations
              </Button>
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
            <TabsList>
              <TabsTrigger value="home">       <Activity className="h-3.5 w-3.5 mr-1.5" /> Home</TabsTrigger>
              <TabsTrigger value="content">    <FileText className="h-3.5 w-3.5 mr-1.5" /> Content</TabsTrigger>
              <TabsTrigger value="seo">        <Sparkles className="h-3.5 w-3.5 mr-1.5" /> SEO</TabsTrigger>
              <TabsTrigger value="engagement"> <Mail     className="h-3.5 w-3.5 mr-1.5" /> Engagement</TabsTrigger>
              <TabsTrigger value="revenue">    <DollarSign className="h-3.5 w-3.5 mr-1.5" /> Revenue</TabsTrigger>
              <TabsTrigger value="audience">   <Globe    className="h-3.5 w-3.5 mr-1.5" /> Audience</TabsTrigger>
              <TabsTrigger value="insights">   <BarChart3 className="h-3.5 w-3.5 mr-1.5" /> AI Insights</TabsTrigger>
            </TabsList>
          </div>

          {/* ============================================================
              TAB 1 — HOME (everything at a glance)
              ============================================================ */}
          <TabsContent value="home" className="mt-6 space-y-6">
            {/* KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
              <KpiCard label="Articles"    value={stats.data?.content.articles ?? "—"} icon={FileText} accent="emerald" loading={stats.isLoading} href="/admin/articles" hint="Total published" />
              <KpiCard label="Jobs"        value={stats.data?.content.jobs ?? "—"}     icon={Briefcase} accent="blue"    loading={stats.isLoading} href="/admin/jobs" />
              <KpiCard label="Companies"   value={(stats.data?.content as any)?.companies ?? "—"} icon={Building2} accent="violet" loading={stats.isLoading} href="/admin/companies" />
              <KpiCard label="People"      value={stats.data?.content.people ?? "—"}    icon={Users}     accent="amber"  loading={stats.isLoading} href="/admin/people" />
              <KpiCard label="Events"      value={stats.data?.content.events ?? "—"}    icon={Calendar}  accent="rose"   loading={stats.isLoading} href="/admin/events" />
              <KpiCard label="Resources"   value={stats.data?.content.resources ?? "—"} icon={BookOpen}  accent="zinc"   loading={stats.isLoading} href="/admin/resources" />
            </div>

            {/* Quick actions */}
            <div>
              <PanelTitle title="Quick actions" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <QuickAction label="New Article"  icon={FileText}   href="/admin/articles/new" accent="emerald" />
                <QuickAction label="New Job"      icon={Briefcase}  href="/admin/jobs/new"     accent="blue"    />
                <QuickAction label="Add Company"  icon={Building2}  href="/admin/companies/new" accent="violet" />
                <QuickAction label="New Event"    icon={Calendar}   href="/admin/events/new"   accent="rose"    />
                <QuickAction label="AI Generate"  icon={Sparkles}   href="/admin/ai/generate"  accent="violet"  />
                <QuickAction label="SEO Manager"  icon={Wand2}      href="/admin/seo"          accent="amber"   />
              </div>
            </div>

            {/* Two-column: Editorial alerts + Recent submissions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-5">
                  <PanelTitle
                    title="Pending moderation"
                    action={<Link href="/admin/moderation"><Button variant="ghost" size="sm" className="text-[#0066FF] -mr-2">View all <ArrowRight className="h-3.5 w-3.5 ml-1" /></Button></Link>}
                  />
                  {stats.isLoading ? (
                    <Skeleton className="h-20 w-full" />
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-md border border-[#E0E3E8] p-3">
                        <p className="text-xs uppercase tracking-wider text-[#697386] mb-1">Profile claims</p>
                        <p className="text-xl font-semibold text-[#1A1F36]">{stats.data?.moderation.pendingClaims ?? 0}</p>
                      </div>
                      <div className="rounded-md border border-[#E0E3E8] p-3">
                        <p className="text-xs uppercase tracking-wider text-[#697386] mb-1">Suggested updates</p>
                        <p className="text-xl font-semibold text-[#1A1F36]">{stats.data?.moderation.pendingUpdates ?? 0}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <PanelTitle
                    title="Recent form submissions"
                    action={<Link href="/admin/integrations"><Button variant="ghost" size="sm" className="text-[#0066FF] -mr-2">View all <ArrowRight className="h-3.5 w-3.5 ml-1" /></Button></Link>}
                  />
                  {submissions.isLoading ? (
                    <Skeleton className="h-20 w-full" />
                  ) : !submissions.data || submissions.data.items.length === 0 ? (
                    <p className="text-sm text-[#697386]">No submissions yet.</p>
                  ) : (
                    <ul className="divide-y">
                      {submissions.data.items.slice(0, 5).map((s: any) => (
                        <li key={s.id} className="py-2 flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="text-[10px] uppercase shrink-0">{s.form_type}</Badge>
                          <span className="flex-1 min-w-0 truncate text-[#1A1F36]">{s.name || s.email}</span>
                          <span className="text-xs text-[#9BA3B0] shrink-0">{new Date(s.created_at).toLocaleDateString()}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ============================================================
              TAB 2 — CONTENT
              ============================================================ */}
          <TabsContent value="content" className="mt-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <KpiCard label="Articles" value={stats.data?.content.articles ?? "—"} icon={FileText} accent="emerald" loading={stats.isLoading} href="/admin/articles" />
              <KpiCard label="Jobs"     value={stats.data?.content.jobs ?? "—"}     icon={Briefcase} accent="blue" loading={stats.isLoading} href="/admin/jobs" />
              <KpiCard label="Events"   value={stats.data?.content.events ?? "—"}   icon={Calendar} accent="rose" loading={stats.isLoading} href="/admin/events" />
              <KpiCard label="Total users" value={stats.data?.users ?? "—"}         icon={Users} accent="violet" loading={stats.isLoading} href="/admin/users" />
            </div>

            <Card>
              <CardContent className="p-5">
                <PanelTitle
                  title="Editorial workflow"
                  action={<Link href="/admin/articles"><Button variant="ghost" size="sm" className="text-[#0066FF] -mr-2">All articles <ArrowRight className="h-3.5 w-3.5 ml-1" /></Button></Link>}
                />
                <p className="text-sm text-[#697386] mb-4">
                  Articles by status — drafts, in review, scheduled, published, archived.
                </p>
                <ContentByStatusPanel />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <PanelTitle
                  title="Top-performing articles (30 days)"
                  action={<Link href="/admin/articles"><Button variant="ghost" size="sm" className="text-[#0066FF] -mr-2">Browse <ArrowRight className="h-3.5 w-3.5 ml-1" /></Button></Link>}
                />
                <TopArticlesPanel />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============================================================
              TAB 3 — SEO
              ============================================================ */}
          <TabsContent value="seo" className="mt-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <KpiCard
                label="SEO score"
                value={auditSummary.data?.score ?? "—"}
                icon={Sparkles}
                accent={(auditSummary.data?.score ?? 0) >= 80 ? "emerald" : (auditSummary.data?.score ?? 0) >= 60 ? "amber" : "rose"}
                loading={auditSummary.isLoading}
                hint={auditSummary.data?.lastAuditTime ? `Last scan ${new Date(auditSummary.data.lastAuditTime).toLocaleDateString()}` : "No audit yet"}
                href="/admin/seo"
              />
              <KpiCard label="Total issues" value={auditSummary.data?.totalIssues ?? "—"} icon={AlertTriangle} accent="amber" loading={auditSummary.isLoading} href="/admin/seo" />
              <KpiCard label="Critical"     value={auditSummary.data?.criticalCount ?? "—"} icon={AlertTriangle} accent="rose" loading={auditSummary.isLoading} href="/admin/seo" />
              <KpiCard label="Auto-fixable" value={auditSummary.data?.autoFixableCount ?? "—"} icon={Wand2} accent="emerald" loading={auditSummary.isLoading} hint="One-click bulk fix" href="/admin/seo" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <KpiCard label="404 errors"     value={auditSummary.data?.total404 ?? "—"}     icon={AlertTriangle} accent="rose"  loading={auditSummary.isLoading} href="/admin/seo" />
              <KpiCard label="Redirect chains" value={auditSummary.data?.redirectChains ?? "—"} icon={ShieldCheck}  accent="amber" loading={auditSummary.isLoading} href="/admin/seo" />
              <KpiCard label="Ignored"        value={auditSummary.data?.ignoredCount ?? "—"}  icon={CheckCircle2} accent="zinc"  loading={auditSummary.isLoading} href="/admin/seo" />
            </div>

            <ConnectIntegrationCard
              title="Connect Google Search Console"
              description="Pull search clicks, impressions, average position, and top queries directly into this dashboard. Already authenticated for Indexing API — Search Console reuses the same credentials."
              integrationId="search-console"
              capabilities={["Top queries", "Click-through rate", "Average position", "Coverage report"]}
            />
          </TabsContent>

          {/* ============================================================
              TAB 4 — ENGAGEMENT
              ============================================================ */}
          <TabsContent value="engagement" className="mt-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <KpiCard label="Form submissions"  value={submissions.data?.total ?? 0} icon={Inbox} accent="emerald" loading={submissions.isLoading} href="/admin/integrations" />
              <KpiCard label="Newsletter subs (30d)" value="—" icon={Mail} accent="blue" hint="Filterable view coming" href="/admin/integrations" />
              <KpiCard label="Top search terms (30d)" value={searchSummary.data?.totalSearches ?? 0} icon={BarChart3} accent="violet" loading={searchSummary.isLoading} href="/admin/seo" />
              <KpiCard label="Zero-result queries"   value={searchSummary.data?.zeroResultQueries?.length ?? 0} icon={AlertTriangle} accent="amber" loading={searchSummary.isLoading} hint="Content gaps" />
            </div>

            <Card>
              <CardContent className="p-5">
                <PanelTitle title="Recent form submissions"
                  action={<Link href="/admin/integrations"><Button variant="ghost" size="sm" className="text-[#0066FF] -mr-2">Open inbox <ArrowRight className="h-3.5 w-3.5 ml-1" /></Button></Link>}
                />
                {submissions.data?.items?.length ? (
                  <ul className="divide-y">
                    {submissions.data.items.map((s: any) => (
                      <li key={s.id} className="py-3 flex items-start gap-3">
                        <Badge variant="outline" className="text-[10px] uppercase shrink-0 mt-0.5">{s.form_type}</Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1A1F36] truncate">{s.name || s.email}</p>
                          <p className="text-xs text-[#697386] truncate">{s.email}</p>
                        </div>
                        <span className="text-xs text-[#9BA3B0] shrink-0">{new Date(s.created_at).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[#697386]">No submissions yet — Newsletter / Contact / Advertise forms write here.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============================================================
              TAB 5 — REVENUE
              ============================================================ */}
          <TabsContent value="revenue" className="mt-6 space-y-6">
            <RevenueTab />
          </TabsContent>

          {/* ============================================================
              TAB 6 — AUDIENCE
              ============================================================ */}
          <TabsContent value="audience" className="mt-6 space-y-6">
            <AudienceTab searchSummary={searchSummary} />
          </TabsContent>

          {/*
            AI Insights tab — formerly /admin/ai/analytics. Shows token
            usage, cost breakdown by feature, generation success rate.
            Lives here because it's analytics data, not a writing tool.
          */}
          <TabsContent value="insights" className="mt-6 space-y-6">
            <AIAnalyticsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

// ============================================================
// SUB-COMPONENTS for the Content tab
// ============================================================

function ContentByStatusPanel() {
  const q = trpc.admin.dashboard.getContentByStatus.useQuery();
  if (q.isLoading) return <Skeleton className="h-32 w-full" />;
  if (!q.data?.statuses?.length) return <p className="text-sm text-[#697386]">No workflow statuses configured.</p>;
  const total = q.data.statuses.reduce((s: number, x: any) => s + (x.count || 0), 0);
  return (
    <div>
      <div className="flex items-end gap-2 h-2.5 mb-3 rounded-full overflow-hidden bg-[#F0F2F5]">
        {q.data.statuses.map((s: any) => total > 0 && s.count > 0 && (
          <div key={s.id} title={`${s.name}: ${s.count}`} className="h-full"
            style={{ width: `${(s.count / total) * 100}%`, backgroundColor: s.color || "#10b981" }} />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {q.data.statuses.map((s: any) => (
          <div key={s.id} className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color || "#10b981" }} />
            <span className="text-[#697386]">{s.name}</span>
            <span className="ml-auto font-semibold text-[#1A1F36] tabular-nums">{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopArticlesPanel() {
  const list = trpc.news.list.useQuery({
    sortBy: "viewCount" as any,
    sortOrder: "desc" as any,
    page: 1,
    limit: 5,
  } as any);
  if (list.isLoading) return <Skeleton className="h-24 w-full" />;
  const items: any[] = (list.data as any)?.items || [];
  if (items.length === 0) return <p className="text-sm text-[#697386]">No articles yet.</p>;
  return (
    <ul className="divide-y">
      {items.map((a) => (
        <li key={a.id} className="py-2.5 flex items-center gap-3">
          <Link href={`/admin/articles/${a.id}`} className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#1A1F36] truncate hover:text-[#0066FF]">{a.title}</p>
            <p className="text-xs text-[#697386] truncate">/{a.slug}</p>
          </Link>
          <span className="text-sm text-[#1A1F36] tabular-nums shrink-0">
            <Eye className="h-3.5 w-3.5 inline mr-1 text-[#9BA3B0]" />
            {(a.viewCount || 0).toLocaleString()}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ============================================================
// AUDIENCE TAB — real GA4 data when configured, fallbacks otherwise
// ============================================================
function AudienceTab({ searchSummary }: { searchSummary: any }) {
  const ga = trpc.admin.dashboard.audienceSummary.useQuery({ days: 30 });
  const data = ga.data && !(ga.data as any)?.error ? (ga.data as any) : null;
  const error = (ga.data as any)?.error as string | undefined;

  // Not configured / no data → show the Connect card + on-site search fallback
  if (ga.isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>)}
      </div>
    );
  }
  if (!data) {
    return (
      <>
        <ConnectIntegrationCard
          title="Connect Google Analytics 4"
          description="Pull pageviews, sessions, unique users, top countries, top pages, average engagement time, and bounce rate. Add your GA4 property ID + service-account JSON in Integration Hub to activate."
          integrationId="google-analytics"
          capabilities={["Pageviews", "Sessions", "Unique users", "Top countries", "Top pages", "Engagement time", "Bounce rate"]}
        />
        <Card>
          <CardContent className="p-5">
            <PanelTitle title="On-site search (last 30 days)"
              action={<Link href="/admin/seo"><Button variant="ghost" size="sm" className="text-[#0066FF] -mr-2">Open Search Analytics <ArrowRight className="h-3.5 w-3.5 ml-1" /></Button></Link>}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard label="Searches"         value={searchSummary.data?.totalSearches ?? 0}             icon={BarChart3} accent="emerald" loading={searchSummary.isLoading} />
              <KpiCard label="Unique searchers" value={searchSummary.data?.uniqueSearchers ?? 0}           icon={Users}     accent="blue"    loading={searchSummary.isLoading} />
              <KpiCard label="Zero-result"      value={searchSummary.data?.zeroResultQueries?.length ?? 0} icon={AlertTriangle} accent="amber" loading={searchSummary.isLoading} hint="Content gaps" />
              <KpiCard label="Top queries"      value={searchSummary.data?.topQueries?.length ?? 0}        icon={Eye}       accent="violet"  loading={searchSummary.isLoading} />
            </div>
          </CardContent>
        </Card>
      </>
    );
  }
  if (error) {
    return (
      <Card className="border-red-200 bg-red-50/50">
        <CardContent className="p-6">
          <p className="font-semibold text-red-900 mb-1">Google Analytics error</p>
          <p className="text-sm text-red-800/80 break-all">{error}</p>
          <Link href="/admin/integrations#google-analytics">
            <Button variant="outline" size="sm" className="mt-3">Re-configure</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard label="Total users"  value={data.totalUsers.toLocaleString()}  icon={Users}     accent="emerald" />
        <KpiCard label="New users"    value={data.newUsers.toLocaleString()}    icon={Users}     accent="blue" />
        <KpiCard label="Sessions"     value={data.sessions.toLocaleString()}    icon={Activity}  accent="violet" />
        <KpiCard label="Pageviews"    value={data.pageviews.toLocaleString()}   icon={Eye}       accent="amber" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <KpiCard label="Avg engagement (sec)" value={Math.round(data.averageEngagementSeconds).toLocaleString()} icon={Activity} accent="emerald" />
        <KpiCard label="Bounce rate"          value={(data.bounceRate * 100).toFixed(1) + "%"}                   icon={TrendingDown} accent="rose" />
      </div>
      <Card>
        <CardContent className="p-5">
          <PanelTitle title="Daily users (30 days)" />
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.daily}>
              <defs>
                <linearGradient id="ga-users" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="users" stroke="#10b981" strokeWidth={2} fill="url(#ga-users)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <PanelTitle title="Top pages" />
            <ul className="divide-y">
              {data.topPages.slice(0, 8).map((p: any, i: number) => (
                <li key={i} className="py-2 flex items-center gap-3 text-sm">
                  <span className="font-mono text-xs text-[#697386] truncate flex-1">{p.path || "/"}</span>
                  <span className="text-[#1A1F36] tabular-nums shrink-0">{p.pageviews.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <PanelTitle title="Top countries" />
            <ul className="divide-y">
              {data.topCountries.slice(0, 8).map((c: any, i: number) => (
                <li key={i} className="py-2 flex items-center gap-3 text-sm">
                  <span className="text-[#1A1F36] truncate flex-1">{c.country}</span>
                  <span className="text-[#1A1F36] tabular-nums shrink-0">{c.users.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// ============================================================
// REVENUE TAB — real AdSense data when configured
// ============================================================
function RevenueTab() {
  const ad = trpc.admin.dashboard.revenueSummary.useQuery({ days: 30 });
  // ad.data can be: null (not configured), { error: string } (API failed), or RevenueSummary
  const error = (ad.data as any)?.error as string | undefined;
  const data = ad.data && !error ? (ad.data as any) : null;
  // Detect "pending activation" errors (403 / permission denied from Google)
  const isPending = !!error && (
    error.includes("403") ||
    error.toLowerCase().includes("permission") ||
    error.toLowerCase().includes("forbidden") ||
    error.toLowerCase().includes("pending")
  );

  if (ad.isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>)}
      </div>
    );
  }

  // Check error BEFORE null — when configured but API fails, show error card not connect card
  if (error) {
    return (
      <>
        <Card className={isPending ? "border-amber-200 bg-amber-50/50" : "border-red-200 bg-red-50/50"}>
          <CardContent className="p-6">
            {isPending ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <p className="font-semibold text-amber-900">AdSense connected — awaiting activation</p>
                </div>
                <p className="text-sm text-amber-800/80 mb-3">
                  Your service account has been added to AdSense but Google has not yet granted API access.
                  This typically takes <strong>24–48 hours</strong>. No action needed — the dashboard will
                  populate automatically once access is approved.
                </p>
                <p className="text-xs text-amber-700/70 break-all font-mono">{error}</p>
              </>
            ) : (
              <>
                <p className="font-semibold text-red-900 mb-1">AdSense API error</p>
                <p className="text-sm text-red-800/80 break-all mb-3">{error}</p>
                <Link href="/admin/integrations">
                  <Button variant="outline" size="sm">Re-configure in Integration Hub</Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-5">
              <PanelTitle title="Direct ads (campaigns)" />
              <p className="text-sm text-[#697386] mb-3">Live impressions, clicks, and revenue from direct-sold campaigns.</p>
              <Link href="/admin/advertising">
                <Button variant="outline" className="w-full">Go to Advertising Manager</Button>
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <PanelTitle title="Sponsored content (coming soon)" />
              <p className="text-sm text-[#697386]">Per-article sponsorship deals + delivery tracking. Phase 2 of the Advertising Manager.</p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <ConnectIntegrationCard
          title="Connect Google AdSense"
          description="Live revenue, RPM, fill rate, eCPM, and earnings per article. Add your publisher ID + service-account JSON in Integration Hub. The service account needs Reporting access added inside the AdSense dashboard."
          integrationId="adsense-api"
          capabilities={["Live revenue", "Page views", "Clicks", "CTR", "RPM", "Daily trend"]}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-5">
              <PanelTitle title="Direct ads (campaigns)" />
              <p className="text-sm text-[#697386] mb-3">Live impressions, clicks, and revenue from direct-sold campaigns.</p>
              <Link href="/admin/advertising">
                <Button variant="outline" className="w-full">Go to Advertising Manager</Button>
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <PanelTitle title="Sponsored content (coming soon)" />
              <p className="text-sm text-[#697386]">Per-article sponsorship deals + delivery tracking. Phase 2 of the Advertising Manager.</p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard label={`Revenue (${data.currency})`} value={data.totalRevenue.toFixed(2)}        icon={DollarSign} accent="emerald" />
        <KpiCard label="Page views"                   value={data.pageViews.toLocaleString()}    icon={Eye}        accent="blue" />
        <KpiCard label="Clicks"                       value={data.clicks.toLocaleString()}       icon={Activity}   accent="violet" />
        <KpiCard label="Avg RPM"                      value={data.rpm.toFixed(2)}                icon={TrendingUp} accent="amber"  hint="per 1000 pageviews" />
      </div>
      <Card>
        <CardContent className="p-5">
          <PanelTitle title={`Daily revenue (${data.currency}) — last 30 days`} />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="revenue" fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <PanelTitle title="Direct ads (campaigns)" />
            <Link href="/admin/advertising">
              <Button variant="outline" className="w-full">Go to Advertising Manager</Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <PanelTitle title="Sponsored content" />
            <p className="text-sm text-[#697386]">Per-article sponsorship deals + delivery tracking — coming.</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// ============================================================
// WRITER DASHBOARD — minimal surface for `role=author` users
// ============================================================
//
// Editors see the full 6-tab analytics dashboard; writers don't need
// audience / revenue / SEO. They need their work, fast: drafts,
// scheduled, recent published, and a one-click "Start writing" CTA.
// Same AdminLayout wrapper so the sidebar stays consistent and
// promotion to editor doesn't require relearning the app.
function WriterDashboard() {
  const { user } = useAuth();
  // news.list filtered by current user — backend already supports
  // authorId in the list query
  const drafts    = trpc.news.list.useQuery({ status: "draft",    page: 1, limit: 5 } as any);
  const scheduled = trpc.news.list.useQuery({ status: "scheduled", page: 1, limit: 5 } as any);
  const published = trpc.news.list.useQuery({ status: "published", page: 1, limit: 5 } as any);

  const greet = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();
  const firstName = (user?.name || "").split(" ")[0] || "there";

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Greeting + primary action */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[#1A1F36]">{greet}, {firstName}</h1>
            <p className="text-[#697386] mt-0.5 text-[13px]">
              Pick up where you left off, or start something new.
            </p>
          </div>
          <Link href="/admin/articles/new">
            <Button className="bg-[#0066FF] hover:bg-[#0052CC] h-11 px-5">
              <Plus className="h-4 w-4 mr-1.5" /> New article
            </Button>
          </Link>
        </div>

        {/* KPI strip — counts only, no charts */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <KpiCard label="Drafts"    value={drafts.data?.total ?? "—"}    icon={FileText} accent="amber"   loading={drafts.isLoading}    href="/admin/articles?status=draft" />
          <KpiCard label="Scheduled" value={scheduled.data?.total ?? "—"} icon={Calendar} accent="blue"    loading={scheduled.isLoading} href="/admin/articles?status=scheduled" />
          <KpiCard label="Published" value={published.data?.total ?? "—"} icon={CheckCircle2} accent="emerald" loading={published.isLoading} href="/admin/articles?status=published" />
        </div>

        {/* Two-column: My drafts + Recently published */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-5">
              <PanelTitle
                title="My drafts"
                action={<Link href="/admin/articles?status=draft"><Button variant="ghost" size="sm" className="text-[#0066FF] -mr-2">All drafts <ArrowRight className="h-3.5 w-3.5 ml-1" /></Button></Link>}
              />
              <ArticleListPanel q={drafts} emptyMessage="No drafts yet — start a new article." />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <PanelTitle
                title="Recently published"
                action={<Link href="/admin/articles?status=published"><Button variant="ghost" size="sm" className="text-[#0066FF] -mr-2">All published <ArrowRight className="h-3.5 w-3.5 ml-1" /></Button></Link>}
              />
              <ArticleListPanel q={published} emptyMessage="Nothing published yet." showViewCount />
            </CardContent>
          </Card>
        </div>

        {/* Tips strip — light editorial guidance */}
        <Card className="bg-[#F0F7FF]/40 border-[#C7DCFF]">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-md bg-[#EBF3FF] flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4 text-[#0066FF]" />
              </div>
              <div>
                <p className="font-semibold text-[#003D99] mb-1">Writing tips</p>
                <ul className="text-sm text-[#003D99]/80 list-disc pl-4 space-y-1">
                  <li>Aim for 50–60 char SEO titles — the editor's live score will tell you when you're in range.</li>
                  <li>Add a focus keyword in the SEO tab so the inline AI suggester picks the right alternatives.</li>
                  <li>Click "Suggest" on the SEO Title and Meta Description fields for 3 LLM-written options.</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function ArticleListPanel({ q, emptyMessage, showViewCount }: { q: any; emptyMessage: string; showViewCount?: boolean }) {
  if (q.isLoading) return <Skeleton className="h-24 w-full" />;
  const items: any[] = q.data?.items || [];
  if (items.length === 0) return <p className="text-sm text-[#697386]">{emptyMessage}</p>;
  return (
    <ul className="divide-y">
      {items.map((a) => (
        <li key={a.id} className="py-2.5 flex items-center gap-3">
          <Link href={`/admin/articles/${a.id}`} className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#1A1F36] truncate hover:text-[#0066FF]">{a.title}</p>
            <p className="text-xs text-[#697386] truncate">/{a.slug}</p>
          </Link>
          {showViewCount && (
            <span className="text-xs text-[#697386] tabular-nums shrink-0">
              <Eye className="h-3 w-3 inline mr-0.5 text-[#9BA3B0]" />
              {(a.viewCount || 0).toLocaleString()}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
