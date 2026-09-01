/**
 * News Agent Dashboard v2.0
 * Intelligent MENA news discovery with three-stage scoring,
 * dynamic keyword/entity management, bulk actions, and smart presets.
 */
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  Bot, Globe, Plus, Play, Pause, Trash2, RefreshCw, Clock,
  CheckCircle2, XCircle, Loader2, ExternalLink,
  Rss, Search, BarChart3, Activity, Zap, Eye, FileText,
  Filter, Calendar, SlidersHorizontal, ChevronDown, ChevronUp,
  Pencil, ArrowUpDown, Tags, Database, Sparkles, TrendingUp,
  AlertTriangle, CheckCheck, Layers, Info,
} from "lucide-react";

// ============================================================
// ADD SOURCE DIALOG
// ============================================================
function AddSourceDialog({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", url: "", feedType: "rss", crawlIntervalMinutes: 60, relevanceThreshold: 20,
  });
  const addSource = (trpc.admin as any).aiContent?.addSource?.useMutation?.({
    onSuccess: () => {
      toast({ title: "Source Added" });
      setOpen(false);
      setForm({ name: "", url: "", feedType: "rss", crawlIntervalMinutes: 60, relevanceThreshold: 20 });
      onSuccess();
    },
    onError: (err: any) => toast({ title: "Error", description: err?.message, variant: "destructive" }),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-purple-600 hover:bg-purple-700">
          <Plus className="h-4 w-4 mr-2" /> Add Source
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add News Source</DialogTitle>
          <DialogDescription>Configure a new RSS feed or website for the agent to monitor</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Source Name</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Wamda" />
          </div>
          <div>
            <Label>Feed URL</Label>
            <Input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://wamda.com/feed" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Feed Type</Label>
              <Select value={form.feedType} onValueChange={v => setForm(f => ({ ...f, feedType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rss">RSS</SelectItem>
                  <SelectItem value="atom">Atom</SelectItem>
                  <SelectItem value="scrape">Web Scrape</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Crawl Interval (min)</Label>
              <Input type="number" min={5} value={form.crawlIntervalMinutes} onChange={e => setForm(f => ({ ...f, crawlIntervalMinutes: +e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Relevance Threshold (%)</Label>
            <Input type="number" min={0} max={100} value={form.relevanceThreshold} onChange={e => setForm(f => ({ ...f, relevanceThreshold: +e.target.value }))} />
            <p className="text-xs text-muted-foreground mt-1">Articles scoring below this are filtered out (0 = accept all)</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            className="bg-purple-600 hover:bg-purple-700"
            onClick={() => addSource.mutate(form as any)}
            disabled={addSource.isPending || !form.name || !form.url}
          >
            {addSource.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Add Source
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// EDIT SOURCE DIALOG (v2.0 — full editorial brief support)
// ============================================================
function EditSourceDialog({ source, onSuccess }: { source: any; onSuccess: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const threshold = source.relevanceThreshold > 1 ? source.relevanceThreshold : Math.round((source.relevanceThreshold || 0.2) * 100);
  const [form, setForm] = useState({
    name: source.name || "",
    url: source.url || "",
    feedType: source.feedType || source.sourceType || "rss",
    crawlIntervalMinutes: source.crawlIntervalMinutes || 60,
    relevanceThreshold: threshold,
    maxAgeHours: source.maxAgeHours || 168,
    mustWatchKeywords: source.mustWatchKeywords || "",
    ignoreKeywords: source.ignoreKeywords || "",
    editorialBrief: source.editorialBrief || "",
    autoGenerateEnabled: source.autoGenerateEnabled || false,
  });

  const updateSource = trpc.admin.aiContent.updateSource.useMutation({
    onSuccess: () => {
      toast({ title: "Source Updated", description: `${form.name} configuration saved.` });
      setOpen(false);
      onSuccess();
    },
    onError: (err: any) => toast({ title: "Error", description: err?.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (v) {
        const t = source.relevanceThreshold > 1 ? source.relevanceThreshold : Math.round((source.relevanceThreshold || 0.2) * 100);
        setForm({
          name: source.name || "",
          url: source.url || "",
          feedType: source.feedType || source.sourceType || "rss",
          crawlIntervalMinutes: source.crawlIntervalMinutes || 60,
          relevanceThreshold: t,
          maxAgeHours: source.maxAgeHours || 168,
          mustWatchKeywords: source.mustWatchKeywords || "",
          ignoreKeywords: source.ignoreKeywords || "",
          editorialBrief: source.editorialBrief || "",
          autoGenerateEnabled: source.autoGenerateEnabled || false,
        });
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" title="Edit source">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Source — {source.name}</DialogTitle>
          <DialogDescription>Configure crawl settings, scoring thresholds, and editorial brief</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {/* Basic */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Source Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Feed Type</Label>
              <Select value={form.feedType} onValueChange={v => setForm(f => ({ ...f, feedType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rss">RSS</SelectItem>
                  <SelectItem value="atom">Atom</SelectItem>
                  <SelectItem value="scrape">Web Scrape</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="twitter">X / Twitter</SelectItem>
                  <SelectItem value="email">Email / IMAP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Feed URL</Label>
            <Input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
          </div>

          {/* Crawl & Scoring */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="flex items-center gap-1">
                Crawl Interval (min)
                <TooltipProvider><Tooltip><TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger><TooltipContent>How often the agent checks this source for new articles</TooltipContent></Tooltip></TooltipProvider>
              </Label>
              <Input type="number" min={5} value={form.crawlIntervalMinutes} onChange={e => setForm(f => ({ ...f, crawlIntervalMinutes: +e.target.value }))} />
            </div>
            <div>
              <Label className="flex items-center gap-1">
                Relevance Threshold (%)
                <TooltipProvider><Tooltip><TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger><TooltipContent>Articles scoring below this % are automatically filtered out. Lower = more articles pass.</TooltipContent></Tooltip></TooltipProvider>
              </Label>
              <Input type="number" min={0} max={100} value={form.relevanceThreshold} onChange={e => setForm(f => ({ ...f, relevanceThreshold: +e.target.value }))} />
            </div>
            <div>
              <Label className="flex items-center gap-1">
                Max Article Age (hours)
                <TooltipProvider><Tooltip><TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger><TooltipContent>Articles older than this are automatically rejected. 72h for global sources, 168h (7 days) for MENA.</TooltipContent></Tooltip></TooltipProvider>
              </Label>
              <Input type="number" min={1} value={form.maxAgeHours} onChange={e => setForm(f => ({ ...f, maxAgeHours: +e.target.value }))} />
            </div>
          </div>

          {/* Must-watch & Ignore keywords */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="flex items-center gap-1">
                Must-Watch Keywords
                <TooltipProvider><Tooltip><TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger><TooltipContent>Comma-separated. Articles containing ANY of these keywords always pass the filter regardless of score.</TooltipContent></Tooltip></TooltipProvider>
              </Label>
              <Input
                value={form.mustWatchKeywords}
                onChange={e => setForm(f => ({ ...f, mustWatchKeywords: e.target.value }))}
                placeholder="Saudi, UAE, MENA, funding, startup"
              />
              <p className="text-xs text-muted-foreground mt-1">Comma-separated. These always pass.</p>
            </div>
            <div>
              <Label className="flex items-center gap-1">
                Ignore Keywords
                <TooltipProvider><Tooltip><TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger><TooltipContent>Comma-separated. Articles containing ANY of these keywords are always rejected.</TooltipContent></Tooltip></TooltipProvider>
              </Label>
              <Input
                value={form.ignoreKeywords}
                onChange={e => setForm(f => ({ ...f, ignoreKeywords: e.target.value }))}
                placeholder="sports, entertainment, celebrity"
              />
              <p className="text-xs text-muted-foreground mt-1">Comma-separated. These always fail.</p>
            </div>
          </div>

          {/* Editorial Brief */}
          <div>
            <Label className="flex items-center gap-1">
              Editorial Brief (LLM Context)
              <TooltipProvider><Tooltip><TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger><TooltipContent>This text is injected into the LLM prompt when scoring articles from this source. Describe what makes a good article from this source for TechScoop.</TooltipContent></Tooltip></TooltipProvider>
            </Label>
            <textarea
              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={form.editorialBrief}
              onChange={e => setForm(f => ({ ...f, editorialBrief: e.target.value }))}
              placeholder="e.g. Forbes Middle East covers MENA business leaders, startup funding rounds, and economic policy. Prioritize articles about GCC tech startups, Saudi Vision 2030 initiatives, and UAE tech ecosystem."
            />
          </div>

          {/* Auto-generate */}
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
            <input
              type="checkbox"
              id="autoGenerate"
              checked={form.autoGenerateEnabled}
              onChange={e => setForm(f => ({ ...f, autoGenerateEnabled: e.target.checked }))}
              className="h-4 w-4"
            />
            <div>
              <label htmlFor="autoGenerate" className="text-sm font-medium cursor-pointer">
                Auto-Generate Drafts
              </label>
              <p className="text-xs text-muted-foreground">
                Automatically create CMS drafts for articles from this source that score above the threshold (no manual Generate click needed)
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            className="bg-purple-600 hover:bg-purple-700"
            onClick={() => updateSource.mutate({
              id: source.id,
              name: form.name,
              url: form.url,
              sourceType: form.feedType as any,
              crawlFrequencyMinutes: form.crawlIntervalMinutes,
              relevanceThreshold: form.relevanceThreshold,
              maxAgeHours: form.maxAgeHours,
              mustWatchKeywords: form.mustWatchKeywords,
              ignoreKeywords: form.ignoreKeywords,
              editorialBrief: form.editorialBrief,
              autoGenerateEnabled: form.autoGenerateEnabled,
            } as any)}
            disabled={updateSource.isPending || !form.name || !form.url}
          >
            {updateSource.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// SCORE BREAKDOWN PANEL
// ============================================================
function ScoreBreakdown({ article }: { article: any }) {
  const [open, setOpen] = useState(false);
  const score = article.relevanceScore > 1 ? article.relevanceScore : Math.round(article.relevanceScore * 100);

  // Parse stage scores if available
  const stage1 = article.stage1Score ?? null;
  const stage2 = article.stage2Score ?? null;
  const stage3 = article.stage3Adjustment ?? null;
  const entities = (() => {
    try { return article.detectedEntities ? JSON.parse(article.detectedEntities) : []; }
    catch { return []; }
  })();
  const llmReasoning = article.llmReasoning || null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 px-1 text-xs text-muted-foreground hover:text-foreground" title="View score breakdown">
          <Info className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Score Breakdown</DialogTitle>
          <DialogDescription className="line-clamp-2">{article.title}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Overall score */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="font-semibold">Overall Relevance</span>
            <span className={`text-2xl font-bold ${score >= 60 ? "text-green-600" : score >= 35 ? "text-yellow-600" : "text-muted-foreground"}`}>
              {score}%
            </span>
          </div>

          {/* Stage scores */}
          {(stage1 !== null || stage2 !== null) && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Scoring Stages</p>
              {stage1 !== null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Tags className="h-3.5 w-3.5 text-blue-500" />
                    Stage 1: Keyword Match
                  </span>
                  <span className="font-medium">{Math.round(stage1)}%</span>
                </div>
              )}
              {stage2 !== null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                    Stage 2: LLM Semantic
                  </span>
                  <span className="font-medium">{Math.round(stage2)}%</span>
                </div>
              )}
              {stage3 !== null && stage3 !== 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                    Stage 3: Editorial Boost
                  </span>
                  <span className={`font-medium ${stage3 > 0 ? "text-green-600" : "text-red-500"}`}>
                    {stage3 > 0 ? "+" : ""}{Math.round(stage3)}%
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Detected entities */}
          {entities.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Detected MENA Entities</p>
              <div className="flex flex-wrap gap-1">
                {entities.map((e: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs">{e}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* LLM reasoning */}
          {llmReasoning && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">LLM Reasoning</p>
              <p className="text-sm text-muted-foreground bg-muted/50 rounded p-2">{llmReasoning}</p>
            </div>
          )}

          {/* Source info */}
          <div className="text-xs text-muted-foreground border-t pt-3 space-y-1">
            <div className="flex justify-between">
              <span>Source</span><span className="font-medium">{article.sourceName}</span>
            </div>
            {article.originalPublishedAt && (
              <div className="flex justify-between">
                <span>Published</span><span className="font-medium">{new Date(article.originalPublishedAt).toLocaleDateString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Crawled</span><span className="font-medium">{new Date(article.discoveredAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function AgentDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("sources");

  // Filter state
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [minScore, setMinScore] = useState("");
  const [maxScore, setMaxScore] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [pubDateFrom, setPubDateFrom] = useState("");
  const [pubDateTo, setPubDateTo] = useState("");
  const [sortBy, setSortBy] = useState<"crawledAt" | "publishedAt" | "score">("crawledAt");
  const [showFilters, setShowFilters] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Per-article generating state (Set of IDs)
  const [generatingIds, setGeneratingIds] = useState<Set<number>>(new Set());

  // Queries
  const sources = trpc.admin.aiContent.listSources.useQuery();
  const crawlLog = trpc.admin.aiContent.getCrawlHistory.useQuery({ limit: 50 });
  const discovered = trpc.admin.aiContent.getDiscoveredArticles.useQuery({
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    sourceId: sourceFilter !== "all" ? Number(sourceFilter) : undefined,
    minScore: minScore ? Number(minScore) : undefined,
    maxScore: maxScore ? Number(maxScore) : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    pubDateFrom: pubDateFrom || undefined,
    pubDateTo: pubDateTo || undefined,
    sortBy,
    limit: 200,
  });
  const agentStats = trpc.admin.aiContent.getAgentStats.useQuery();

  // Mutations
  const toggleSource = trpc.admin.aiContent.updateSource.useMutation({
    onSuccess: () => { sources.refetch(); toast({ title: "Source Updated" }); },
  });
  const deleteSource = trpc.admin.aiContent.deleteSource.useMutation({
    onSuccess: () => { sources.refetch(); toast({ title: "Source Deleted" }); },
  });
  const triggerCrawl = trpc.admin.aiContent.triggerCrawl.useMutation({
    onSuccess: () => {
      toast({ title: "Crawl Started", description: "The agent is now crawling the selected source" });
      crawlLog.refetch();
    },
    onError: (err) => toast({ title: "Crawl Failed", description: err.message, variant: "destructive" }),
  });
  const triggerCrawlAll = trpc.admin.aiContent.triggerCrawlAll.useMutation({
    onSuccess: (data: any) => {
      toast({ title: "All Sources Crawled", description: `${data?.newArticles || 0} new articles discovered` });
      crawlLog.refetch();
      discovered.refetch();
      agentStats.refetch();
    },
    onError: (err) => toast({ title: "Crawl Failed", description: err.message, variant: "destructive" }),
  });

  const processDiscovered = trpc.admin.aiContent.generateFromDiscovered.useMutation({
    onSuccess: (data: any, variables: any) => {
      setGeneratingIds(prev => { const next = new Set(prev); next.delete(variables.discoveredId); return next; });
      discovered.refetch();
      agentStats.refetch();
      if (data?.articleId) {
        toast({ title: "Draft Created", description: "Article generated and saved as a Draft — ready for editorial review." });
      } else {
        toast({ title: "Article Generated", description: "Open AI Content Generator to review and publish." });
      }
    },
    onError: (err: any, variables: any) => {
      setGeneratingIds(prev => { const next = new Set(prev); next.delete(variables.discoveredId); return next; });
      toast({ title: "Processing Failed", description: err.message, variant: "destructive" });
    },
  });

  const handleGenerate = (articleId: number) => {
    setGeneratingIds(prev => new Set(prev).add(articleId));
    processDiscovered.mutate({ discoveredId: articleId });
  };

  const dismissDiscovered = trpc.admin.aiContent.rejectDiscovered.useMutation({
    onSuccess: () => { discovered.refetch(); toast({ title: "Article Dismissed" }); },
  });

  // Bulk dismiss (dismiss all selected)
  const handleBulkDismiss = () => {
    const ids = Array.from(selectedIds);
    let done = 0;
    ids.forEach(id => {
      dismissDiscovered.mutate({ id }, {
        onSuccess: () => {
          done++;
          if (done === ids.length) {
            setSelectedIds(new Set());
            toast({ title: `${done} articles dismissed` });
            discovered.refetch();
          }
        },
      });
    });
  };

  // Smart preset: dismiss all below 20%
  const handleDismissLowScore = () => {
    const articles = (discovered.data as any)?.articles || [];
    const lowScore = articles.filter((a: any) => {
      const s = a.relevanceScore > 1 ? a.relevanceScore : Math.round(a.relevanceScore * 100);
      return s < 20 && a.status === "pending";
    });
    if (lowScore.length === 0) { toast({ title: "No articles below 20%" }); return; }
    let done = 0;
    lowScore.forEach((a: any) => {
      dismissDiscovered.mutate({ id: a.id }, {
        onSuccess: () => {
          done++;
          if (done === lowScore.length) {
            toast({ title: `${done} low-score articles dismissed` });
            discovered.refetch();
          }
        },
      });
    });
  };

  // Smart preset: dismiss stale (older than 7 days by original pub date)
  const handleDismissStale = () => {
    const articles = (discovered.data as any)?.articles || [];
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const stale = articles.filter((a: any) => {
      const pubDate = a.originalPublishedAt ? new Date(a.originalPublishedAt).getTime() : 0;
      return pubDate > 0 && pubDate < cutoff && a.status === "pending";
    });
    if (stale.length === 0) { toast({ title: "No stale articles found" }); return; }
    let done = 0;
    stale.forEach((a: any) => {
      dismissDiscovered.mutate({ id: a.id }, {
        onSuccess: () => {
          done++;
          if (done === stale.length) {
            toast({ title: `${done} stale articles dismissed` });
            discovered.refetch();
          }
        },
      });
    });
  };

  // Stats
  const stats = (agentStats.data as any) || {
    totalSources: 0, activeSources: 0, totalCrawls: 0,
    articlesDiscovered: 0, articlesPublished: 0, lastCrawlAt: null,
  };

  // Active filter count
  const activeFilterCount = [
    statusFilter !== "all",
    sourceFilter !== "all",
    !!minScore,
    !!maxScore,
    !!dateFrom,
    !!dateTo,
    !!pubDateFrom,
    !!pubDateTo,
    sortBy !== "crawledAt",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setStatusFilter("all");
    setSourceFilter("all");
    setMinScore("");
    setMaxScore("");
    setDateFrom("");
    setDateTo("");
    setPubDateFrom("");
    setPubDateTo("");
    setSortBy("crawledAt");
  };

  const articles = useMemo(() => (discovered.data as any)?.articles || [], [discovered.data]);
  const pendingArticles = useMemo(() => articles.filter((a: any) => a.status === "pending"), [articles]);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(pendingArticles.map((a: any) => a.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bot className="h-6 w-6 text-purple-500" />
              News Agent
              <Badge className="bg-purple-600 text-white text-xs ml-1">v2.0</Badge>
            </h1>
            <p className="text-muted-foreground mt-1">
              Intelligent MENA news discovery with three-stage AI scoring
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* v2.0 quick links */}
            <Link href="/admin/ai/keywords">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Tags className="h-4 w-4" /> Keywords
              </Button>
            </Link>
            <Link href="/admin/ai/entities">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Database className="h-4 w-4" /> Entities
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => triggerCrawlAll.mutate()}
              disabled={triggerCrawlAll.isPending}
            >
              {triggerCrawlAll.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Crawl All
            </Button>
            <AddSourceDialog onSuccess={() => sources.refetch()} />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">Sources</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.activeSources}/{stats.totalSources}</p>
              <p className="text-xs text-muted-foreground">active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Crawls</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.totalCrawls}</p>
              <p className="text-xs text-muted-foreground">total runs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-orange-500" />
                <span className="text-sm text-muted-foreground">Discovered</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.articlesDiscovered}</p>
              <p className="text-xs text-muted-foreground">articles found</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-muted-foreground">Drafts Created</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.articlesPublished}</p>
              <p className="text-xs text-muted-foreground">sent to editorial</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Last Crawl</span>
              </div>
              <p className="text-sm font-medium mt-1">
                {stats.lastCrawlAt ? new Date(stats.lastCrawlAt).toLocaleString() : "Never"}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="sources" className="gap-1">
              <Globe className="h-4 w-4" /> Sources
            </TabsTrigger>
            <TabsTrigger value="discovered" className="gap-1">
              <Search className="h-4 w-4" /> Discovered
              {(discovered.data as any)?.total > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">{(discovered.data as any).total}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="crawl-log" className="gap-1">
              <Activity className="h-4 w-4" /> Crawl Log
            </TabsTrigger>
          </TabsList>

          {/* ============================================================ */}
          {/* SOURCES TAB */}
          {/* ============================================================ */}
          <TabsContent value="sources" className="space-y-4">
            {sources.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              </div>
            ) : sources.data && sources.data.length > 0 ? (
              <div className="space-y-3">
                {sources.data.map((source: any) => (
                  <Card key={source.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${source.isActive ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"}`}>
                            {(source.feedType === "rss" || source.sourceType === "rss") ? <Rss className="h-5 w-5" /> : <Globe className="h-5 w-5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold">{source.name}</p>
                              <Badge variant={source.isActive ? "default" : "secondary"}>
                                {source.isActive ? "Active" : "Paused"}
                              </Badge>
                              <Badge variant="outline">{source.feedType || source.sourceType || 'rss'}</Badge>
                              {source.autoGenerateEnabled && (
                                <Badge className="bg-purple-100 text-purple-700 border-purple-300 text-xs">
                                  <Zap className="h-3 w-3 mr-1" />Auto-Generate
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate max-w-[400px]">{source.url}</p>
                            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Every {source.crawlIntervalMinutes || 60}min
                              </span>
                              <span className="flex items-center gap-1">
                                <BarChart3 className="h-3 w-3" /> Threshold: {(source.relevanceThreshold > 1 ? source.relevanceThreshold : Math.round(source.relevanceThreshold * 100))}%
                              </span>
                              {source.maxAgeHours && (
                                <span className="flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" /> Max age: {source.maxAgeHours}h
                                </span>
                              )}
                              {source.lastCrawledAt && (
                                <span className="flex items-center gap-1">
                                  <RefreshCw className="h-3 w-3" /> Last: {new Date(source.lastCrawledAt).toLocaleString()}
                                </span>
                              )}
                              <span>{source.totalArticlesFound || 0} articles found</span>
                            </div>
                            {source.editorialBrief && (
                              <p className="text-xs text-muted-foreground mt-1 italic line-clamp-1">
                                Brief: {source.editorialBrief}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => triggerCrawl.mutate({ sourceId: source.id })}
                            disabled={triggerCrawl.isPending}
                            title="Crawl now"
                          >
                            {triggerCrawl.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleSource.mutate({ id: source.id, isActive: !source.isActive } as any)}
                            title={source.isActive ? "Pause source" : "Activate source"}
                          >
                            {source.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <EditSourceDialog source={source} onSuccess={() => sources.refetch()} />
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => deleteSource.mutate({ id: source.id })}
                            title="Delete source"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Sources Configured</h3>
                  <p className="text-muted-foreground mb-4">Add news sources for the agent to monitor</p>
                  <AddSourceDialog onSuccess={() => sources.refetch()} />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ============================================================ */}
          {/* DISCOVERED ARTICLES TAB */}
          {/* ============================================================ */}
          <TabsContent value="discovered" className="space-y-4">
            {/* Smart Presets + Bulk Actions Bar */}
            <div className="flex items-center gap-2 flex-wrap p-3 rounded-lg bg-muted/30 border">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mr-1">Smart Actions:</span>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleDismissLowScore}>
                <XCircle className="h-3 w-3" /> Dismiss Below 20%
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleDismissStale}>
                <AlertTriangle className="h-3 w-3" /> Dismiss Stale (&gt;7 days)
              </Button>
              {selectedIds.size > 0 ? (
                <>
                  <span className="text-xs text-muted-foreground ml-2">{selectedIds.size} selected</span>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-red-600" onClick={handleBulkDismiss}>
                    <Trash2 className="h-3 w-3" /> Dismiss Selected
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearSelection}>Clear</Button>
                </>
              ) : (
                pendingArticles.length > 0 && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 ml-2" onClick={selectAll}>
                    <CheckCheck className="h-3 w-3" /> Select All Pending
                  </Button>
                )
              )}
            </div>

            {/* Filter Bar */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Status filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="discovered">Pending</SelectItem>
                    <SelectItem value="generating">Generating</SelectItem>
                    <SelectItem value="generated">Draft Created</SelectItem>
                    <SelectItem value="rejected">Dismissed</SelectItem>
                    <SelectItem value="duplicate">Duplicate</SelectItem>
                  </SelectContent>
                </Select>

                {/* Source filter */}
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-[160px]">
                    <Globe className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="All Sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    {(sources.data || []).map((s: any) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Sort order */}
                <Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
                  <SelectTrigger className="w-[170px]">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="crawledAt">Sort: Crawled Date</SelectItem>
                    <SelectItem value="publishedAt">Sort: Published Date</SelectItem>
                    <SelectItem value="score">Sort: Relevance Score</SelectItem>
                  </SelectContent>
                </Select>

                {/* Advanced filters toggle */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(v => !v)}
                  className="gap-1"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  More Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">{activeFilterCount}</Badge>
                  )}
                  {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>

                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                    Clear all
                  </Button>
                )}

                <div className="ml-auto flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {(discovered.data as any)?.total || 0} articles
                  </span>
                  <Button variant="outline" size="sm" onClick={() => discovered.refetch()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Expanded filters */}
              {showFilters && (
                <Card>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Min Score (%)</Label>
                        <Input
                          type="number" min={0} max={100} placeholder="0"
                          value={minScore} onChange={e => setMinScore(e.target.value)} className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Max Score (%)</Label>
                        <Input
                          type="number" min={0} max={100} placeholder="100"
                          value={maxScore} onChange={e => setMaxScore(e.target.value)} className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Crawled From</Label>
                        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Crawled To</Label>
                        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Published From (original)</Label>
                        <Input type="date" value={pubDateFrom} onChange={e => setPubDateFrom(e.target.value)} className="h-8" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Published To (original)</Label>
                        <Input type="date" value={pubDateTo} onChange={e => setPubDateTo(e.target.value)} className="h-8" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {discovered.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              </div>
            ) : articles.length > 0 ? (
              <div className="space-y-3">
                {articles.map((article: any) => {
                  const isGenerating = generatingIds.has(article.id);
                  const score = article.relevanceScore > 1 ? article.relevanceScore : Math.round(article.relevanceScore * 100);
                  const isSelected = selectedIds.has(article.id);
                  return (
                    <Card
                      key={article.id}
                      className={`transition-colors ${isSelected ? "ring-2 ring-purple-400 bg-purple-50/30 dark:bg-purple-900/10" : ""}`}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          {/* Checkbox for bulk select */}
                          {article.status === "pending" && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(article.id)}
                              className="mt-1 h-4 w-4 shrink-0 cursor-pointer"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant={
                                article.status === "generated" ? "default" :
                                article.status === "pending" ? "secondary" :
                                article.status === "generating" ? "outline" :
                                "secondary"
                              } className={
                                article.status === "generated" ? "bg-green-600 text-white" :
                                (article.status === "generating" || isGenerating) ? "border-blue-400 text-blue-600 animate-pulse" :
                                article.status === "rejected" ? "text-muted-foreground" : ""
                              }>
                                {article.status === "generated" ? "✓ Draft Created" :
                                 (article.status === "generating" || isGenerating) ? "⟳ Generating..." :
                                 article.status === "rejected" ? "Dismissed" :
                                 article.status === "pending" ? "Pending" :
                                 article.status}
                              </Badge>
                              <Badge variant="outline" className={
                                score >= 60 ? "border-green-500 text-green-600" :
                                score >= 35 ? "border-yellow-500 text-yellow-600" :
                                "border-muted text-muted-foreground"
                              }>
                                {score}% relevant
                              </Badge>
                              <ScoreBreakdown article={article} />
                              <span className="text-xs font-medium text-muted-foreground">{article.sourceName}</span>
                              {article.author && (
                                <span className="text-xs text-muted-foreground">by {article.author}</span>
                              )}
                            </div>
                            <h3 className="font-semibold leading-snug">{article.title}</h3>
                            {article.summary && article.summary !== article.title && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{article.summary}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                              {article.originalPublishedAt ? (
                                <span className="flex items-center gap-1" title="Original publication date">
                                  <Calendar className="h-3 w-3" />
                                  Published: {new Date(article.originalPublishedAt).toLocaleDateString()}
                                </span>
                              ) : null}
                              <span className="flex items-center gap-1" title="Crawled date">
                                <Clock className="h-3 w-3" />
                                Crawled: {new Date(article.discoveredAt).toLocaleString()}
                              </span>
                              <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-purple-500 hover:underline">
                                <ExternalLink className="h-3 w-3" /> Source
                              </a>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-2 shrink-0">
                            {article.status === "pending" && !isGenerating && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleGenerate(article.id)}
                                  className="bg-purple-600 hover:bg-purple-700"
                                >
                                  <Zap className="h-4 w-4 mr-1" />
                                  Generate
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => dismissDiscovered.mutate({ id: article.id })}
                                  title="Dismiss article"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {isGenerating && (
                              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                            )}
                            {article.status === "generated" && !isGenerating && (
                              <Link href="/admin/articles">
                                <Button size="sm" variant="outline" className="border-green-500 text-green-600 hover:bg-green-50">
                                  <Eye className="h-4 w-4 mr-1" /> View Draft
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Discovered Articles</h3>
                  <p className="text-muted-foreground">
                    {activeFilterCount > 0
                      ? "No articles match the current filters. Try adjusting or clearing them."
                      : "The agent hasn't discovered any articles yet. Add sources and trigger a crawl."}
                  </p>
                  {activeFilterCount > 0 && (
                    <Button variant="outline" className="mt-4" onClick={clearFilters}>Clear Filters</Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ============================================================ */}
          {/* CRAWL LOG TAB */}
          {/* ============================================================ */}
          <TabsContent value="crawl-log" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Recent crawl activity across all sources</p>
              <Button variant="outline" size="sm" onClick={() => crawlLog.refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            {crawlLog.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              </div>
            ) : crawlLog.data && (crawlLog.data as any).logs?.length > 0 ? (
              <div className="space-y-2">
                {((crawlLog.data as any).logs || []).map((log: any) => (
                  <Card key={log.id}>
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {log.status === "completed" ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                          ) : log.status === "failed" ? (
                            <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                          ) : (
                            <Loader2 className="h-5 w-5 text-blue-500 animate-spin shrink-0" />
                          )}
                          <div>
                            <p className="font-medium">{log.sourceName}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{new Date(log.startedAt).toLocaleString()}</span>
                              {log.articlesFound > 0 && (
                                <span className="text-green-600 font-medium">+{log.articlesFound} new</span>
                              )}
                              {log.articlesSkipped > 0 && (
                                <span>{log.articlesSkipped} skipped</span>
                              )}
                              {log.durationMs && (
                                <span>{(log.durationMs / 1000).toFixed(1)}s</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Badge variant={log.status === "completed" ? "default" : log.status === "failed" ? "destructive" : "secondary"}>
                          {log.status}
                        </Badge>
                      </div>
                      {log.errorMessage && (
                        <p className="text-sm text-red-500 mt-2 ml-8">{log.errorMessage}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Crawl History</h3>
                  <p className="text-muted-foreground">Crawl logs will appear here once the agent starts running.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
