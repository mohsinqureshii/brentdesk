/**
 * Technical SEO Intelligence Tab
 * 5-stage pipeline: Detect → Analyze → Fix → Submit → Report
 */
import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Radar, Search, Zap, Send, BarChart2, AlertTriangle, CheckCircle2, XCircle,
  RefreshCw, Loader2, ExternalLink, Eye, Wrench, ChevronRight, Info,
  TrendingUp, TrendingDown, Clock, FileSearch, Shield, Link as LinkIcon,
  Code, Globe, AlertCircle, CheckCircle, Activity, ArrowRight, Download,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function severityColor(s: string) {
  if (s === "critical") return "bg-red-100 text-red-800 border-red-200";
  if (s === "high") return "bg-orange-100 text-orange-800 border-orange-200";
  if (s === "medium") return "bg-yellow-100 text-yellow-800 border-yellow-200";
  return "bg-blue-100 text-blue-800 border-blue-200";
}

function statusColor(s: string) {
  if (s === "indexed") return "bg-green-100 text-green-800";
  if (s === "not_indexed") return "bg-red-100 text-red-800";
  if (s === "excluded") return "bg-yellow-100 text-yellow-800";
  if (s === "error") return "bg-red-200 text-red-900";
  return "bg-[#F0F2F5] text-[#697386]";
}

function fixStatusColor(s: string) {
  if (s === "auto_fixed") return "bg-green-100 text-green-800";
  if (s === "manually_fixed") return "bg-blue-100 text-blue-800";
  if (s === "pending") return "bg-yellow-100 text-yellow-800";
  if (s === "ignored") return "bg-[#F0F2F5] text-[#697386]";
  return "bg-[#F0F2F5] text-[#697386]";
}

const ISSUE_CATEGORY_ICONS: Record<string, React.ReactNode> = {
  canonical: <LinkIcon className="h-4 w-4" />,
  schema_markup: <Code className="h-4 w-4" />,
  schema: <Code className="h-4 w-4" />,
  redirect_chain: <ArrowRight className="h-4 w-4" />,
  redirect: <ArrowRight className="h-4 w-4" />,
  hreflang: <Globe className="h-4 w-4" />,
  meta_robots: <Shield className="h-4 w-4" />,
  soft_404: <AlertCircle className="h-4 w-4" />,
  not_indexed: <XCircle className="h-4 w-4" />,
  duplicate_content: <FileSearch className="h-4 w-4" />,
  content: <FileSearch className="h-4 w-4" />,
};

// ─── Dashboard Stats Card ─────────────────────────────────────────────────────

function StatsCard({ stats }: { stats: Record<string, number> }) {
  const indexed = stats.indexed ?? 0;
  const notIndexed = stats.not_indexed ?? 0;
  const excluded = stats.excluded ?? 0;
  const errors = stats.error ?? 0;
  const total = indexed + notIndexed + excluded + errors;
  const indexRate = total > 0 ? Math.round((indexed / total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-green-600 font-medium uppercase tracking-wide">Indexed</p>
              <p className="text-3xl font-bold text-green-700">{indexed.toLocaleString()}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-400" />
          </div>
          <p className="text-xs text-green-600 mt-1">{indexRate}% index rate</p>
        </CardContent>
      </Card>
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-red-600 font-medium uppercase tracking-wide">Not Indexed</p>
              <p className="text-3xl font-bold text-red-700">{notIndexed.toLocaleString()}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
          <p className="text-xs text-red-600 mt-1">Need attention</p>
        </CardContent>
      </Card>
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-yellow-600 font-medium uppercase tracking-wide">Excluded</p>
              <p className="text-3xl font-bold text-yellow-700">{excluded.toLocaleString()}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-400" />
          </div>
          <p className="text-xs text-yellow-600 mt-1">Intentional or canonical</p>
        </CardContent>
      </Card>
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-orange-600 font-medium uppercase tracking-wide">Errors</p>
              <p className="text-3xl font-bold text-orange-700">{errors.toLocaleString()}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-orange-400" />
          </div>
          <p className="text-xs text-orange-600 mt-1">HTTP / crawl errors</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TechnicalSEOTab() {
  const { toast } = useToast();
  const [activeStage, setActiveStage] = useState("overview");
  const [coverageFilter, setCoverageFilter] = useState<string>("all");
  const [issueFilter, setIssueFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [fixStatusFilter, setFixStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIssue, setSelectedIssue] = useState<Record<string, unknown> | null>(null);
  const [issueDetailOpen, setIssueDetailOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Record<string, unknown> | null>(null);
  const [reportDetailOpen, setReportDetailOpen] = useState(false);
  const [detectMaxUrls, setDetectMaxUrls] = useState(200);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectProgress, setDetectProgress] = useState(0);
  const [detectResult, setDetectResult] = useState<Record<string, unknown> | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────
  const statsQuery = trpc.admin.seo.technicalSeo.dashboardStats.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  const coverageQuery = trpc.admin.seo.technicalSeo.getCoverage.useQuery({
    status: coverageFilter !== "all" ? (coverageFilter as "indexed" | "not_indexed" | "excluded" | "error" | "unknown") : undefined,
    limit: 100,
  });

  const issuesQuery = trpc.admin.seo.technicalSeo.getIssues.useQuery({
    category: issueFilter !== "all" ? issueFilter : undefined,
    severity: severityFilter !== "all" ? severityFilter : undefined,
    fixStatus: fixStatusFilter !== "all" ? fixStatusFilter : undefined,
    limit: 100,
  });

  const reportsQuery = trpc.admin.seo.technicalSeo.getReports.useQuery({ limit: 20 });
  const crawlSessionsQuery = trpc.admin.seo.technicalSeo.getCrawlSessions.useQuery({ limit: 10 });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const utils = trpc.useUtils();

  const runDetectionMut = trpc.admin.seo.technicalSeo.runDetection.useMutation({
    onSuccess: (data) => {
      setDetectResult(data as unknown as Record<string, unknown>);
      setIsDetecting(false);
      setDetectProgress(100);
      const d = data as unknown as Record<string, unknown>;
      toast({ title: "Detection complete", description: `Crawled ${d.urlsCrawled ?? 0} URLs, found ${d.issuesFound ?? 0} issues.` });
      utils.admin.seo.technicalSeo.dashboardStats.invalidate();
      utils.admin.seo.technicalSeo.getCoverage.invalidate();
      utils.admin.seo.technicalSeo.getIssues.invalidate();
      utils.admin.seo.technicalSeo.getCrawlSessions.invalidate();
    },
    onError: (err) => {
      setIsDetecting(false);
      setDetectProgress(0);
      toast({ title: "Detection failed", description: err.message, variant: "destructive" });
    },
  });

  const autoFixMut = trpc.admin.seo.technicalSeo.applyAutoFixes.useMutation({
    onSuccess: (data) => {
      toast({ title: "Auto-fix complete", description: `Fixed ${(data as Record<string, unknown>).fixed ?? 0} issues.` });
      utils.admin.seo.technicalSeo.getIssues.invalidate();
      utils.admin.seo.technicalSeo.dashboardStats.invalidate();
    },
    onError: (err) => toast({ title: "Fix failed", description: err.message, variant: "destructive" }),
  });

  const submitIndexingMut = trpc.admin.seo.technicalSeo.submitForIndexing.useMutation({
    onSuccess: (data) => {
      toast({ title: "Indexing submitted", description: `Submitted ${(data as Record<string, unknown>).submitted ?? 0} URLs to Google.` });
      utils.admin.seo.technicalSeo.dashboardStats.invalidate();
    },
    onError: (err) => toast({ title: "Submission failed", description: err.message, variant: "destructive" }),
  });

  const generateReportMut = trpc.admin.seo.technicalSeo.generateReport.useMutation({
    onSuccess: () => {
      toast({ title: "Report generated" });
      utils.admin.seo.technicalSeo.getReports.invalidate();
    },
    onError: (err) => toast({ title: "Report failed", description: err.message, variant: "destructive" }),
  });

  const updateIssueStatusMut = trpc.admin.seo.technicalSeo.updateIssueStatus.useMutation({
    onSuccess: () => {
      utils.admin.seo.technicalSeo.getIssues.invalidate();
      setIssueDetailOpen(false);
    },
  });

  // ── Derived data ──────────────────────────────────────────────────────────
  const stats = (statsQuery.data as Record<string, unknown>) ?? {};
  const coverageStats = (stats.coverageStats as Record<string, number>) ?? {};
  const issueStats = (stats.issueStats as Record<string, unknown>) ?? {};
  const recentActivity = (stats.recentActivity as Record<string, unknown>) ?? {};

  const coverageRows = useMemo(() => {
    const rows = ((coverageQuery.data as Record<string, unknown>)?.rows ?? []) as Record<string, unknown>[];
    if (!searchQuery) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter((r) => (r.url as string)?.toLowerCase().includes(q));
  }, [coverageQuery.data, searchQuery]);

  const issueRows = useMemo(() => {
    const rows = ((issuesQuery.data as Record<string, unknown>)?.rows ?? []) as Record<string, unknown>[];
    if (!searchQuery) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter((r) =>
      (r.url as string)?.toLowerCase().includes(q) ||
      (r.issueType as string)?.toLowerCase().includes(q) ||
      (r.description as string)?.toLowerCase().includes(q)
    );
  }, [issuesQuery.data, searchQuery]);

  const reportRows = ((reportsQuery.data as unknown[]) ?? []) as Record<string, unknown>[];
  const crawlSessions = ((crawlSessionsQuery.data as unknown[]) ?? []) as Record<string, unknown>[];

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleRunDetection() {
    setIsDetecting(true);
    setDetectProgress(5);
    setDetectResult(null);
    // Simulate progress while running
    const interval = setInterval(() => {
      setDetectProgress((p) => {
        if (p >= 90) { clearInterval(interval); return 90; }
        return p + Math.random() * 8;
      });
    }, 1500);
    runDetectionMut.mutate({ maxUrls: detectMaxUrls, batchSize: 5 });
  }

  function handleAutoFix(category?: string) {
    autoFixMut.mutate({ issueCategory: category, dryRun: false });
  }

  function handleSubmitIndexing() {
    submitIndexingMut.mutate({ coverageStatus: "not_indexed", maxSubmissions: 50 });
  }

  function handleGenerateReport() {
    generateReportMut.mutate({ reportType: "manual" });
  }

  // ── Stage pipeline steps ──────────────────────────────────────────────────
  const stages = [
    { id: "overview", label: "Overview", icon: <Activity className="h-4 w-4" /> },
    { id: "detect", label: "1. Detect", icon: <Radar className="h-4 w-4" /> },
    { id: "analyze", label: "2. Analyze", icon: <Search className="h-4 w-4" /> },
    { id: "fix", label: "3. Fix", icon: <Wrench className="h-4 w-4" /> },
    { id: "submit", label: "4. Submit", icon: <Send className="h-4 w-4" /> },
    { id: "report", label: "5. Report", icon: <BarChart2 className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-violet-600" />
            Technical SEO Intelligence
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Automated 5-stage pipeline: Detect non-indexed pages → Analyze root causes → Auto-fix 90% → Submit to Google → Weekly reports
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              statsQuery.refetch();
              coverageQuery.refetch();
              issuesQuery.refetch();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button
            size="sm"
            className="bg-violet-600 hover:bg-violet-700 text-white"
            onClick={handleRunDetection}
            disabled={isDetecting}
          >
            {isDetecting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Radar className="h-4 w-4 mr-1" />}
            {isDetecting ? "Detecting…" : "Run Detection Now"}
          </Button>
        </div>
      </div>

      {/* Stage Tabs */}
      <Tabs value={activeStage} onValueChange={setActiveStage}>
        <TabsList className="flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {stages.map((s) => (
            <TabsTrigger key={s.id} value={s.id} className="gap-1.5 text-xs sm:text-sm">
              {s.icon}
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── OVERVIEW ── */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {statsQuery.isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <StatsCard stats={coverageStats} />

              {/* Issue breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      Issues by Category
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {Object.entries((issueStats.byCategory as Record<string, number>) ?? {}).length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground text-sm">
                        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-400" />
                        No issues detected yet. Run a detection scan to get started.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries((issueStats.byCategory as Record<string, number>) ?? {}).map(([cat, cnt]) => (
                          <div key={cat} className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm">
                              {ISSUE_CATEGORY_ICONS[cat] ?? <AlertCircle className="h-4 w-4" />}
                              <span className="capitalize">{cat.replace(/_/g, " ")}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-muted rounded-full h-1.5">
                                <div
                                  className="bg-orange-500 h-1.5 rounded-full"
                                  style={{ width: `${Math.min(100, (cnt / Math.max(...Object.values((issueStats.byCategory as Record<string, number>) ?? {}))) * 100)}%` }}
                                />
                              </div>
                              <Badge variant="outline" className="text-xs">{cnt}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-500" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { label: "Last crawl", value: recentActivity.lastCrawl ? new Date(recentActivity.lastCrawl as string).toLocaleString() : "Never" },
                        { label: "Last auto-fix", value: recentActivity.lastAutoFix ? new Date(recentActivity.lastAutoFix as string).toLocaleString() : "Never" },
                        { label: "Last submission", value: recentActivity.lastSubmission ? new Date(recentActivity.lastSubmission as string).toLocaleString() : "Never" },
                        { label: "Last report", value: recentActivity.lastReport ? new Date(recentActivity.lastReport as string).toLocaleString() : "Never" },
                        { label: "Auto-fixable issues", value: String(issueStats.autoFixable ?? 0) },
                        { label: "Flagged for review", value: String(issueStats.flaggedForReview ?? 0) },
                      ].map((item) => (
                        <div key={item.label} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-medium">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick actions */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Button variant="outline" className="h-auto flex-col gap-1 py-3" onClick={() => setActiveStage("detect")}>
                      <Radar className="h-5 w-5 text-violet-600" />
                      <span className="text-xs">Run Detection</span>
                    </Button>
                    <Button variant="outline" className="h-auto flex-col gap-1 py-3" onClick={() => handleAutoFix()}>
                      {autoFixMut.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5 text-yellow-500" />}
                      <span className="text-xs">Auto-Fix All</span>
                    </Button>
                    <Button variant="outline" className="h-auto flex-col gap-1 py-3" onClick={handleSubmitIndexing}>
                      {submitIndexingMut.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 text-blue-500" />}
                      <span className="text-xs">Submit to Google</span>
                    </Button>
                    <Button variant="outline" className="h-auto flex-col gap-1 py-3" onClick={handleGenerateReport}>
                      {generateReportMut.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <BarChart2 className="h-5 w-5 text-green-500" />}
                      <span className="text-xs">Generate Report</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ── STAGE 1: DETECT ── */}
        <TabsContent value="detect" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Radar className="h-5 w-5 text-violet-600" />
                Stage 1: Detect
              </CardTitle>
              <CardDescription>
                Crawl your sitemap, check HTTP status codes, and identify non-indexed pages. Runs daily automatically, or trigger manually below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1 block">Max URLs to crawl</label>
                  <input
                    type="number"
                    min={10}
                    max={2000}
                    value={detectMaxUrls}
                    onChange={(e) => setDetectMaxUrls(Number(e.target.value))}
                    className="w-32 border rounded px-2 py-1 text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Recommended: 200 for quick scan, 2000 for full audit</p>
                </div>
                <Button
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                  onClick={handleRunDetection}
                  disabled={isDetecting}
                >
                  {isDetecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Radar className="h-4 w-4 mr-2" />}
                  {isDetecting ? "Running Detection…" : "Run Detection Now"}
                </Button>
              </div>

              {isDetecting && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Crawling pages and analyzing issues…</span>
                    <span>{Math.round(detectProgress)}%</span>
                  </div>
                  <Progress value={detectProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground">This may take 1–3 minutes depending on site size.</p>
                </div>
              )}

              {detectResult && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <h4 className="font-semibold text-green-800 flex items-center gap-2 mb-3">
                    <CheckCircle2 className="h-4 w-4" />
                    Detection Complete
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "URLs crawled", value: detectResult.urlsCrawled },
                      { label: "Not indexed", value: detectResult.notIndexed },
                      { label: "Issues found", value: detectResult.issuesFound },
                      { label: "Auto-fixable", value: detectResult.autoFixable },
                    ].map((item) => (
                      <div key={item.label} className="text-center">
                        <p className="text-2xl font-bold text-green-700">{String(item.value ?? 0)}</p>
                        <p className="text-xs text-green-600">{item.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setActiveStage("analyze")}>
                      View Analysis <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setActiveStage("fix")}>
                      Apply Fixes <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Crawl history */}
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Recent Crawl Sessions
                </h4>
                {crawlSessionsQuery.isLoading ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">Loading…</div>
                ) : crawlSessions.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm border rounded-md">
                    No crawl sessions yet. Run your first detection above.
                  </div>
                ) : (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Started</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">URLs</TableHead>
                          <TableHead className="text-right">Issues</TableHead>
                          <TableHead className="text-right">Duration</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {crawlSessions.map((s) => (
                          <TableRow key={String(s.id)}>
                            <TableCell className="text-sm">{new Date(s.startedAt as string).toLocaleString()}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs capitalize">{String(s.sessionType)}</Badge></TableCell>
                            <TableCell>
                              <Badge className={`text-xs ${s.status === "completed" ? "bg-green-100 text-green-800" : s.status === "running" ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800"}`}>
                                {String(s.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-sm">{String(s.urlsCrawled ?? 0)}</TableCell>
                            <TableCell className="text-right text-sm">{String(s.issuesFound ?? 0)}</TableCell>
                            <TableCell className="text-right text-sm">
                              {s.completedAt ? `${Math.round((new Date(s.completedAt as string).getTime() - new Date(s.startedAt as string).getTime()) / 1000)}s` : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Coverage table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Page Coverage ({coverageRows.length} pages)
                </CardTitle>
                <div className="flex gap-2">
                  <Select value={coverageFilter} onValueChange={setCoverageFilter}>
                    <SelectTrigger className="w-36 h-8 text-xs">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="indexed">Indexed</SelectItem>
                      <SelectItem value="not_indexed">Not indexed</SelectItem>
                      <SelectItem value="excluded">Excluded</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Search URLs…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-48 h-8 text-xs"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {coverageQuery.isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : coverageRows.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Globe className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No coverage data yet. Run a detection scan first.</p>
                </div>
              ) : (
                <ScrollArea className="h-80">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>URL</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>HTTP</TableHead>
                        <TableHead>Issues</TableHead>
                        <TableHead>Last checked</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {coverageRows.map((row) => (
                        <TableRow key={String(row.id)}>
                          <TableCell className="max-w-xs">
                            <a href={String(row.url)} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 truncate">
                              {String(row.url).replace("https://techscoop.io", "")}
                              <ExternalLink className="h-3 w-3 flex-shrink-0" />
                            </a>
                          </TableCell>
                          <TableCell><Badge variant="outline" className="text-xs capitalize">{String(row.pageType).replace(/_/g, " ")}</Badge></TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${statusColor(String(row.coverageStatus))}`}>
                              {String(row.coverageStatus).replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{row.httpStatus ? String(row.httpStatus) : "—"}</TableCell>
                          <TableCell>
                            {(row.issueCount as number) > 0 ? (
                              <Badge className="bg-orange-100 text-orange-800 text-xs">{String(row.issueCount)} issues</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {row.lastCheckedAt ? new Date(row.lastCheckedAt as string).toLocaleDateString() : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── STAGE 2: ANALYZE ── */}
        <TabsContent value="analyze" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-blue-600" />
                Stage 2: Analyze
              </CardTitle>
              <CardDescription>
                Understand why pages aren't indexed. Issues are automatically detected during the crawl and categorized by root cause.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Issue category summary */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                {[
                  { key: "canonical", label: "Canonical", icon: <LinkIcon className="h-4 w-4" />, color: "text-purple-600 bg-purple-50 border-purple-200" },
                  { key: "schema_markup", label: "Schema", icon: <Code className="h-4 w-4" />, color: "text-blue-600 bg-blue-50 border-blue-200" },
                  { key: "redirect_chain", label: "Redirects", icon: <ArrowRight className="h-4 w-4" />, color: "text-orange-600 bg-orange-50 border-orange-200" },
                  { key: "hreflang", label: "Hreflang", icon: <Globe className="h-4 w-4" />, color: "text-green-600 bg-green-50 border-green-200" },
                  { key: "meta_robots", label: "Meta Robots", icon: <Shield className="h-4 w-4" />, color: "text-red-600 bg-red-50 border-red-200" },
                  { key: "soft_404", label: "Soft 404", icon: <AlertCircle className="h-4 w-4" />, color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
                ].map((cat) => {
                  const cnt = ((issueStats.byCategory as Record<string, number>) ?? {})[cat.key] ?? 0;
                  return (
                    <button
                      key={cat.key}
                      onClick={() => { setIssueFilter(cat.key); setActiveStage("fix"); }}
                      className={`border rounded-md p-3 text-left hover:shadow-sm transition-shadow ${cat.color}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">{cat.icon}<span className="text-xs font-medium">{cat.label}</span></div>
                      <p className="text-2xl font-bold">{cnt}</p>
                      <p className="text-xs opacity-70">issues</p>
                    </button>
                  );
                })}
              </div>

              {/* GSC Reasons breakdown */}
              <div className="border rounded-md p-4 bg-muted/30">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-500" />
                  Google Search Console Reasons (from last crawl)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  {[
                    { reason: "Duplicate without user-selected canonical", description: "Multiple URLs serving same content without canonical tag pointing to preferred URL", fix: "canonical" },
                    { reason: "Soft 404", description: "Page returns 200 but has thin/empty content that Google treats as a 404", fix: "soft_404" },
                    { reason: "Crawled – currently not indexed", description: "Google crawled the page but decided not to index it (quality, duplicate, or thin content)", fix: "schema_markup" },
                    { reason: "Discovered – currently not indexed", description: "Google found the URL but hasn't crawled it yet (crawl budget issue)", fix: "redirect_chain" },
                  ].map((item) => (
                    <div key={item.reason} className="flex gap-2 p-2 rounded border bg-background">
                      <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-xs">{item.reason}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                        <button
                          className="text-xs text-blue-600 hover:underline mt-1"
                          onClick={() => { setIssueFilter(item.fix); setActiveStage("fix"); }}
                        >
                          View {item.fix.replace(/_/g, " ")} issues →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── STAGE 3: FIX ── */}
        <TabsContent value="fix" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-yellow-600" />
                    Stage 3: Fix (90% Auto)
                  </CardTitle>
                  <CardDescription>
                    Auto-fix canonical tags, schema markup, meta robots, and redirect chains. Remaining issues are flagged for manual review.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAutoFix()}
                    disabled={autoFixMut.isPending}
                  >
                    {autoFixMut.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Zap className="h-4 w-4 mr-1" />}
                    Auto-Fix All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Fix by category buttons */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  { key: "canonical", label: "Fix Canonical Issues", icon: <LinkIcon className="h-4 w-4" />, color: "border-purple-200 hover:bg-purple-50" },
                  { key: "schema_markup", label: "Fix Schema Markup", icon: <Code className="h-4 w-4" />, color: "border-blue-200 hover:bg-blue-50" },
                  { key: "meta_robots", label: "Fix Meta Robots", icon: <Shield className="h-4 w-4" />, color: "border-red-200 hover:bg-red-50" },
                  { key: "redirect_chain", label: "Fix Redirect Chains", icon: <ArrowRight className="h-4 w-4" />, color: "border-orange-200 hover:bg-orange-50" },
                  { key: "hreflang", label: "Fix Hreflang", icon: <Globe className="h-4 w-4" />, color: "border-green-200 hover:bg-green-50" },
                  { key: "soft_404", label: "Flag Soft 404s", icon: <AlertCircle className="h-4 w-4" />, color: "border-yellow-200 hover:bg-yellow-50" },
                ].map((cat) => (
                  <Button
                    key={cat.key}
                    variant="outline"
                    size="sm"
                    className={`justify-start gap-2 ${cat.color}`}
                    onClick={() => handleAutoFix(cat.key)}
                    disabled={autoFixMut.isPending}
                  >
                    {cat.icon}
                    {cat.label}
                  </Button>
                ))}
              </div>

              {/* Issues table */}
              <div className="flex gap-2 flex-wrap">
                <Select value={issueFilter} onValueChange={setIssueFilter}>
                  <SelectTrigger className="w-36 h-8 text-xs">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    <SelectItem value="canonical">Canonical</SelectItem>
                    <SelectItem value="schema_markup">Schema Markup</SelectItem>
                    <SelectItem value="redirect_chain">Redirect Chain</SelectItem>
                    <SelectItem value="hreflang">Hreflang</SelectItem>
                    <SelectItem value="meta_robots">Meta Robots</SelectItem>
                    <SelectItem value="soft_404">Soft 404</SelectItem>
                    <SelectItem value="not_indexed">Not Indexed</SelectItem>
                    <SelectItem value="duplicate_content">Duplicate Content</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue placeholder="All severities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All severities</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={fixStatusFilter} onValueChange={setFixStatusFilter}>
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue placeholder="All fix statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="auto_fixed">Auto-fixed</SelectItem>
                    <SelectItem value="manually_fixed">Manually fixed</SelectItem>
                    <SelectItem value="ignored">Ignored</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Search issues…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48 h-8 text-xs"
                />
              </div>

              {issuesQuery.isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : issueRows.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border rounded-md">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-400" />
                  <p className="text-sm font-medium">No issues found</p>
                  <p className="text-xs mt-1">Run a detection scan to identify issues, or all issues are resolved.</p>
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>URL</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Issue</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Fix Status</TableHead>
                        <TableHead>Auto-fix</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {issueRows.map((issue) => (
                        <TableRow key={String(issue.id)} className="cursor-pointer hover:bg-muted/50">
                          <TableCell className="max-w-xs">
                            <span className="text-xs truncate block max-w-[200px]">
                              {String(issue.url ?? "").replace("https://techscoop.io", "")}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-xs">
                              {ISSUE_CATEGORY_ICONS[String(issue.issueCategory)] ?? <AlertCircle className="h-3 w-3" />}
                              <span className="capitalize">{String(issue.issueCategory).replace(/_/g, " ")}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs max-w-xs">
                            <span className="truncate block max-w-[180px]">{String(issue.issueType).replace(/_/g, " ")}</span>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${severityColor(String(issue.severity))}`}>
                              {String(issue.severity)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${fixStatusColor(String(issue.fixStatus))}`}>
                              {String(issue.fixStatus).replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {issue.autoFixable ? (
                              <Badge className="bg-green-100 text-green-800 text-xs">Yes</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Manual</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => { setSelectedIssue(issue); setIssueDetailOpen(true); }}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── STAGE 4: SUBMIT ── */}
        <TabsContent value="submit" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-blue-600" />
                Stage 4: Submit to Google
              </CardTitle>
              <CardDescription>
                Request (re-)indexing via Google Indexing API for pages that have been fixed or are newly published. Google processes submissions within 24–48 hours.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="pt-4">
                    <p className="text-sm font-medium text-blue-800">Submit Not-Indexed Pages</p>
                    <p className="text-xs text-blue-600 mt-1 mb-3">Submit up to 50 not-indexed pages for re-crawl</p>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                      onClick={handleSubmitIndexing}
                      disabled={submitIndexingMut.isPending}
                    >
                      {submitIndexingMut.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                      Submit Not-Indexed
                    </Button>
                  </CardContent>
                </Card>
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="pt-4">
                    <p className="text-sm font-medium text-green-800">Submit Fixed Pages</p>
                    <p className="text-xs text-green-600 mt-1 mb-3">Re-submit pages where issues were auto-fixed</p>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white w-full"
                      onClick={() => submitIndexingMut.mutate({ coverageStatus: "error", maxSubmissions: 50 })}
                      disabled={submitIndexingMut.isPending}
                    >
                      {submitIndexingMut.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                      Submit Fixed Pages
                    </Button>
                  </CardContent>
                </Card>
                <Card className="border-orange-200 bg-orange-50">
                  <CardContent className="pt-4">
                    <p className="text-sm font-medium text-orange-800">Revalidate All</p>
                    <p className="text-xs text-orange-600 mt-1 mb-3">Request revalidation of all pages with errors</p>
                    <Button
                      size="sm"
                      className="bg-orange-600 hover:bg-orange-700 text-white w-full"
                      onClick={() => submitIndexingMut.mutate({ coverageStatus: "excluded", maxSubmissions: 50 })}
                      disabled={submitIndexingMut.isPending}
                    >
                      {submitIndexingMut.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Activity className="h-4 w-4 mr-1" />}
                      Revalidate Excluded
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-muted/30 border rounded-md p-4">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-500" />
                  How Google Indexing API Works
                </h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Submissions are processed by Google within 24–48 hours (not instant indexing)</p>
                  <p>• Google has a daily quota of 200 URL submissions per property</p>
                  <p>• Only use for pages that have been fixed or newly published — not for bulk re-indexing</p>
                  <p>• GSC will show updated coverage status within 3–7 days after submission</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── STAGE 5: REPORT ── */}
        <TabsContent value="report" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart2 className="h-5 w-5 text-green-600" />
                    Stage 5: Reports
                  </CardTitle>
                  <CardDescription>
                    Weekly AI-generated reports showing indexing progress, issues resolved, and recommended actions for remaining problems.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleGenerateReport}
                  disabled={generateReportMut.isPending}
                >
                  {generateReportMut.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <BarChart2 className="h-4 w-4 mr-1" />}
                  Generate Report Now
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {reportsQuery.isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : reportRows.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border rounded-md">
                  <BarChart2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No reports yet</p>
                  <p className="text-xs mt-1">Generate your first report above, or wait for the weekly auto-report.</p>
                  <Button size="sm" className="mt-3" onClick={handleGenerateReport} disabled={generateReportMut.isPending}>
                    Generate First Report
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {reportRows.map((report) => {
                    const summary = (report.summary as Record<string, unknown>) ?? {};
                    return (
                      <div
                        key={String(report.id)}
                        className="border rounded-md p-4 hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => { setSelectedReport(report); setReportDetailOpen(true); }}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs capitalize">{String(report.reportType)}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(report.generatedAt as string).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                              {[
                                { label: "Total pages", value: summary.totalPages, icon: <Globe className="h-3 w-3" />, color: "text-blue-600" },
                                { label: "Indexed", value: summary.indexedPages, icon: <CheckCircle className="h-3 w-3" />, color: "text-green-600" },
                                { label: "Issues fixed", value: summary.issuesFixed, icon: <Zap className="h-3 w-3" />, color: "text-yellow-600" },
                                { label: "For review", value: summary.flaggedForReview, icon: <AlertTriangle className="h-3 w-3" />, color: "text-orange-600" },
                              ].map((stat) => (
                                <div key={stat.label} className="flex items-center gap-1.5">
                                  <span className={stat.color}>{stat.icon}</span>
                                  <div>
                                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                                    <p className="text-sm font-semibold">{String(stat.value ?? "—")}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </div>
                        {Boolean(report.aiNarrative) && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2 border-t pt-2">
                            {String(report.aiNarrative).substring(0, 200)}…
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Issue Detail Dialog ── */}
      <Dialog open={issueDetailOpen} onOpenChange={setIssueDetailOpen}>
        <DialogContent className="max-w-2xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedIssue && ISSUE_CATEGORY_ICONS[String(selectedIssue.issueCategory)]}
              Issue Detail
            </DialogTitle>
            <DialogDescription>
              {selectedIssue && String(selectedIssue.issueType).replace(/_/g, " ")}
            </DialogDescription>
          </DialogHeader>
          {selectedIssue && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">URL</p>
                  <a href={String(selectedIssue.url)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs flex items-center gap-1">
                    {String(selectedIssue.url).replace("https://techscoop.io", "")}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Severity</p>
                  <Badge className={`text-xs ${severityColor(String(selectedIssue.severity))}`}>{String(selectedIssue.severity)}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Category</p>
                  <span className="text-sm capitalize">{String(selectedIssue.issueCategory).replace(/_/g, " ")}</span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Fix Status</p>
                  <Badge className={`text-xs ${fixStatusColor(String(selectedIssue.fixStatus))}`}>{String(selectedIssue.fixStatus).replace(/_/g, " ")}</Badge>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p className="text-sm">{String(selectedIssue.description)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Suggested Fix</p>
                <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">{String(selectedIssue.suggestedFix)}</p>
              </div>
              {Boolean(selectedIssue.fixPayload) && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Fix Payload</p>
                  <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-24">{JSON.stringify(selectedIssue.fixPayload, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateIssueStatusMut.mutate({ issueId: Number(selectedIssue?.id), action: "ignore" })}
              disabled={updateIssueStatusMut.isPending}
            >
              Ignore
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateIssueStatusMut.mutate({ issueId: Number(selectedIssue?.id), action: "flag_review" })}
              disabled={updateIssueStatusMut.isPending}
            >
              Flag for Review
            </Button>
            {Boolean(selectedIssue?.autoFixable) && (
              <Button
                size="sm"
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
                onClick={() => autoFixMut.mutate({ issueIds: [Number(selectedIssue?.id)] })}
                disabled={autoFixMut.isPending}
              >
                {autoFixMut.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Zap className="h-4 w-4 mr-1" />}
                Auto-Fix This
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => updateIssueStatusMut.mutate({ issueId: Number(selectedIssue?.id), action: "resolve" })}
              disabled={updateIssueStatusMut.isPending}
            >
              Mark Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Report Detail Dialog ── */}
      <Dialog open={reportDetailOpen} onOpenChange={setReportDetailOpen}>
        <DialogContent className="max-w-3xl sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-green-600" />
              {selectedReport && `${String(selectedReport.reportType).charAt(0).toUpperCase() + String(selectedReport.reportType).slice(1)} Report — ${new Date(selectedReport.generatedAt as string).toLocaleDateString()}`}
            </DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-4 pr-4">
                {/* Summary stats */}
                <>
                {((): React.ReactNode => {
                  const s = (selectedReport.summary as Record<string, unknown>) ?? {};
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: "Total pages", value: s.totalPages, color: "bg-blue-50 text-blue-800" },
                        { label: "Indexed", value: s.indexedPages, color: "bg-green-50 text-green-800" },
                        { label: "Not indexed", value: s.notIndexedPages, color: "bg-red-50 text-red-800" },
                        { label: "Index rate", value: `${s.indexRate ?? 0}%`, color: "bg-purple-50 text-purple-800" },
                        { label: "Issues found", value: s.issuesFound, color: "bg-orange-50 text-orange-800" },
                        { label: "Issues fixed", value: s.issuesFixed, color: "bg-green-50 text-green-800" },
                        { label: "URLs submitted", value: s.urlsSubmitted, color: "bg-blue-50 text-blue-800" },
                        { label: "For review", value: s.flaggedForReview, color: "bg-yellow-50 text-yellow-800" },
                      ].map((stat) => (
                        <div key={stat.label} className={`rounded-md p-3 ${stat.color}`}>
                          <p className="text-xs opacity-70">{stat.label}</p>
                          <p className="text-xl font-bold">{String(stat.value ?? "—")}</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* AI Narrative */}
                {selectedReport.aiNarrative && (
                  <div className="border rounded-md p-4 bg-muted/30">
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-violet-600" />
                      AI Analysis
                    </h4>
                    <p className="text-sm whitespace-pre-wrap">{String(selectedReport.aiNarrative)}</p>
                  </div>
                )}

                {/* Recommendations */}
                {selectedReport.recommendations && (
                  <div className="border rounded-md p-4">
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      Recommendations
                    </h4>
                    <div className="space-y-2">
                      {((selectedReport.recommendations as string[]) ?? []).map((rec, i) => (
                        <div key={i} className="flex gap-2 text-sm">
                          <ChevronRight className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Issues breakdown */}
                {selectedReport.issueBreakdown && (
                  <div className="border rounded-md p-4">
                    <h4 className="text-sm font-semibold mb-2">Issues Breakdown</h4>
                    <div className="space-y-1">
                      {Object.entries((selectedReport.issueBreakdown as Record<string, number>) ?? {}).map(([cat, cnt]) => (
                        <div key={cat} className="flex justify-between text-sm">
                          <span className="capitalize text-muted-foreground">{cat.replace(/_/g, " ")}</span>
                          <span className="font-medium">{cnt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                </>
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setReportDetailOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
