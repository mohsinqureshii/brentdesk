/**
 * SEO Manager Page
 * Manage meta tags, sitemaps, redirects, RSS feeds, indexing rules, hreflang, and SEO health
 */

import React, { useState, useEffect } from "react";
import { publication } from "@shared/publication";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { SearchAnalyticsPanel } from "./SearchAnalytics";
import { SEOToolsPanel } from "./ai/SEOTools";
import { ProfileEnrichmentPanel } from "./seo/ProfileEnrichmentPanel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  Globe,
  FileText,
  Link as LinkIcon,
  Rss,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  Download,
  RefreshCw,
  Copy,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Code,
  Map,
  Shield,
  Languages,
  Activity,
  Eye,
  EyeOff,
  ChevronRight,
  Settings,
  RotateCcw,
  Upload,
  X,
  Info,
  Zap,
  Ban,
  Undo2,
  Loader2,
  Wand2,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronDown,
  SquareCheck,
  Square,
  Sparkles,
} from "lucide-react";
import IndexingLogsTab from "@/components/admin/IndexingLogsTab";
import TechnicalSEOTab from "@/components/admin/TechnicalSEOTab";

// Type definitions
interface IndexingRule {
  id: number;
  module: string;
  pageType: string;
  indexingRule: string;
  canonicalRule: string;
  isEnabled: boolean;
  priority: number | null;
}

interface Redirect {
  id: number;
  fromPath: string;
  toPath: string;
  statusCode: number;
  isActive: boolean | null;
  hitCount: number | null;
  hasChain?: boolean;
  hasLoop?: boolean;
}

interface Monitor404 {
  id: number;
  requestedUrl: string;
  hitCount: number;
  lastHitAt: Date;
  suggestedRedirectUrl: string | null;
  suggestedConfidence: number | null;
  isResolved: boolean | null;
}

interface HealthIssue {
  id: number;
  issueType: string;
  severity: string;
  pageUrl: string;
  issueDetails: string | null;
  suggestedFix: string | null;
}


/**
 * Visual wrapper for one workflow group in the tab header.
 * Renders a small label + icon to the left of a TabsList, so the operator
 * sees what category each set of sub-tabs belongs to.
 */
function WorkflowGroup({ label, icon, children }: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[140px]">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export default function SEOManager() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [redirectDialogOpen, setRedirectDialogOpen] = useState(false);
  const [newRedirect, setNewRedirect] = useState({ fromPath: "", toPath: "", type: "301" as "301" | "302" });
  const [editingRedirect, setEditingRedirect] = useState<number | null>(null);
  const [deleteRedirectId, setDeleteRedirectId] = useState<number | null>(null);
  const [indexingRuleDialogOpen, setIndexingRuleDialogOpen] = useState(false);
  const [newIndexingRule, setNewIndexingRule] = useState({
    module: "",
    pageType: "",
    indexingRule: "index, follow",
    canonicalRule: "self",
    isEnabled: true,
    priority: 0,
  });
  const [editingIndexingRule, setEditingIndexingRule] = useState<number | null>(null);
  const [monitor404Page, setMonitor404Page] = useState(1);
  const [healthIssuesPage, setHealthIssuesPage] = useState(1);
  const [redirectsPage, setRedirectsPage] = useState(1);
  const [selectedIssue, setSelectedIssue] = useState<HealthIssue | null>(null);
  const [healthFilter, setHealthFilter] = useState<string>("all");
  const [healthSearch, setHealthSearch] = useState("");
  // Multi-select state for SEO Health issues
  const [selectedHealthIssues, setSelectedHealthIssues] = useState<Set<string>>(new Set());
  // AI Fix approval workflow state
  const [aiFixApprovalOpen, setAiFixApprovalOpen] = useState(false);
  const [aiFixResults, setAiFixResults] = useState<Array<{
    issueId: string;
    issue: any;
    suggestedFix: string | null;
    editedFix: string;
    status: 'pending' | 'approved' | 'rejected' | 'applied' | 'failed';
    error?: string;
  }>>([]);
  const [aiFixGenerating, setAiFixGenerating] = useState(false);
  const [aiFixCurrentIndex, setAiFixCurrentIndex] = useState(0);
  const [aiFixApplying, setAiFixApplying] = useState(false);
  // Single issue AI fix dialog
  const [singleFixDialogOpen, setSingleFixDialogOpen] = useState(false);
  const [singleFixIssue, setSingleFixIssue] = useState<any>(null);
  const [singleFixValue, setSingleFixValue] = useState("");
  const [singleFixGenerating, setSingleFixGenerating] = useState(false);
  const [singleFixContextUrl, setSingleFixContextUrl] = useState("");
  const [singleFixImageUrl, setSingleFixImageUrl] = useState("");
  const [singleFixImageKeyword, setSingleFixImageKeyword] = useState("");
  const [singleFixImageResults, setSingleFixImageResults] = useState<any[]>([]);
  const [singleFixSelectedImage, setSingleFixSelectedImage] = useState<any>(null);
  const [singleFixImageSearching, setSingleFixImageSearching] = useState(false);
  const [singleFixAltText, setSingleFixAltText] = useState("");
  const [singleFixDescription, setSingleFixDescription] = useState("");
  const [singleFixFilename, setSingleFixFilename] = useState("");
  // Bulk AI fix context URL per issue
  const [aiFixContextUrls, setAiFixContextUrls] = useState<Record<string, string>>({});
  const [aiFixImageResults, setAiFixImageResults] = useState<Record<string, any[]>>({});
  const [aiFixSelectedImages, setAiFixSelectedImages] = useState<Record<string, any>>({});
  const [aiFixImageSearching, setAiFixImageSearching] = useState<Record<string, boolean>>({});
  const [aiFixImageKeywords, setAiFixImageKeywords] = useState<Record<string, string>>({});
  const [aiFixImageUrls, setAiFixImageUrls] = useState<Record<string, string>>({}); // direct URL input

  // SEO Audit queries (for Overview and Health tabs)
  const auditSummary = trpc.admin.seoAudit.getSummary.useQuery();
  const lastAudit = trpc.admin.seoAudit.getLastAudit.useQuery();
  const ignoredIssues = trpc.admin.seoAudit.getIgnoredIssues.useQuery();

  // Queries
  // (seo.health.getSummary / listIssues removed — auditSummary + lastAudit
  // now provide totalIssues, severity counts, total404, redirectChains, and
  // the issues list. healthIssuesPage state kept for compatibility but no
  // longer drives a query.)
  const indexingRules = trpc.admin.seo.indexingRules.list.useQuery();
  const hreflangSettings = trpc.admin.seo.hreflang.getSettings.useQuery();
  const sitemapSettings = trpc.admin.seo.sitemaps.getSettings.useQuery();
  const sitemapStats = trpc.admin.seo.sitemaps.getStats.useQuery();
  const schemaSettings = trpc.admin.seo.schema.getSettings.useQuery();
  const redirectsList = trpc.admin.seo.redirects.list.useQuery({ 
    search: search || undefined, 
    page: redirectsPage, 
    limit: 20 
  });
  const monitor404List = trpc.admin.seo.monitor404.list.useQuery({ page: monitor404Page, limit: 20 });

  // Mutations
  const createRedirect = trpc.admin.seo.redirects.create.useMutation({
    onSuccess: () => {
      toast({ title: "Redirect created successfully" });
      setRedirectDialogOpen(false);
      setNewRedirect({ fromPath: "", toPath: "", type: "301" });
      redirectsList.refetch();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateRedirect = trpc.admin.seo.redirects.update.useMutation({
    onSuccess: () => {
      toast({ title: "Redirect updated successfully" });
      setEditingRedirect(null);
      redirectsList.refetch();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteRedirect = trpc.admin.seo.redirects.delete.useMutation({
    onSuccess: () => {
      toast({ title: "Redirect deleted successfully" });
      setDeleteRedirectId(null);
      redirectsList.refetch();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const createIndexingRule = trpc.admin.seo.indexingRules.create.useMutation({
    onSuccess: () => {
      toast({ title: "Indexing rule created successfully" });
      setIndexingRuleDialogOpen(false);
      setNewIndexingRule({
        module: "",
        pageType: "",
        indexingRule: "index, follow",
        canonicalRule: "self",
        isEnabled: true,
        priority: 0,
      });
      indexingRules.refetch();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateIndexingRule = trpc.admin.seo.indexingRules.update.useMutation({
    onSuccess: () => {
      toast({ title: "Indexing rule updated successfully" });
      indexingRules.refetch();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteIndexingRule = trpc.admin.seo.indexingRules.delete.useMutation({
    onSuccess: () => {
      toast({ title: "Indexing rule deleted successfully" });
      indexingRules.refetch();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const resetIndexingRules = trpc.admin.seo.indexingRules.resetToDefaults.useMutation({
    onSuccess: (data) => {
      toast({ title: `Reset to ${data.count} default rules` });
      indexingRules.refetch();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // runHealthScan + resolveHealthIssue removed — runAudit (declared further
  // down) replaces both. Issues are now ignored via ignoreIssueMut /
  // bulkIgnoreMut against the canonical seoAudit dataset.

  // AI redirect suggestions for 404s — Phase 2C.
  // Bulk-suggests + reviews + applies. The dialog below collects the
  // suggestions then offers a single "Apply all >= 80% confidence" button.
  const [aiSuggestions, setAiSuggestions] = useState<Array<{
    monitorId: number;
    brokenUrl: string;
    hitCount: number;
    suggested: { url: string; confidence: number; reasoning: string } | null;
    candidatesConsidered: number;
    error?: string;
  }>>([]);
  const [aiSuggestOpen, setAiSuggestOpen] = useState(false);

  const aiSuggestRedirect = trpc.admin.seo.monitor404.aiSuggestRedirect.useMutation({
    onSuccess: (data) => {
      setAiSuggestions(data.suggestions);
      setAiSuggestOpen(true);
    },
    onError: (err) => toast({ title: "AI suggestion failed", description: err.message, variant: "destructive" }),
  });

  const applyAiSuggestions = trpc.admin.seo.monitor404.applyAiSuggestions.useMutation({
    onSuccess: (data) => {
      toast({
        title: `${data.applied} redirects created`,
        description: data.skipped > 0 ? `${data.skipped} skipped (low confidence or already exists)` : undefined,
      });
      setAiSuggestOpen(false);
      setAiSuggestions([]);
      monitor404List.refetch();
      redirectsList.refetch();
    },
    onError: (err) => toast({ title: "Apply failed", description: err.message, variant: "destructive" }),
  });

  const create404Redirect = trpc.admin.seo.monitor404.createRedirect.useMutation({
    onSuccess: () => {
      toast({ title: "Redirect created from 404" });
      monitor404List.refetch();
      redirectsList.refetch();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const dismiss404 = trpc.admin.seo.monitor404.dismiss.useMutation({
    onSuccess: () => {
      toast({ title: "404 error dismissed" });
      monitor404List.refetch();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // Bulk-import URLs from GSC paste. The 404 monitor only logs URLs
  // hit by live traffic, so when GSC reports historical 404s the
  // server hasn't seen recently, this is how the operator seeds them.
  const [importUrls, setImportUrls] = useState("");
  const [importExpanded, setImportExpanded] = useState(false);
  const bulkImport404 = trpc.admin.seo.monitor404.bulkImportUrls.useMutation({
    onSuccess: (data: any) => {
      toast({
        title: `Imported ${data.imported} URLs (${data.skipped} already in monitor)`,
        description: data.imported > 0 ? "Click \"AI Suggest All\" to generate redirect suggestions" : undefined,
      });
      setImportUrls("");
      monitor404List.refetch();
    },
    onError: (err) => toast({ title: "Import failed", description: err.message, variant: "destructive" }),
  });

  const updateHreflangSettings = trpc.admin.seo.hreflang.updateSettings.useMutation({
    onSuccess: () => {
      toast({ title: "Hreflang settings updated" });
      hreflangSettings.refetch();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateSitemapSettings = trpc.admin.seo.sitemaps.updateSettings.useMutation({
    onSuccess: () => {
      toast({ title: "Sitemap settings updated" });
      sitemapSettings.refetch();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const regenerateSitemaps = trpc.admin.seo.sitemaps.regenerateAll.useMutation({
    onSuccess: () => {
      toast({ title: "Sitemaps regenerated successfully" });
      sitemapStats.refetch();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateSchemaSettings = trpc.admin.seo.schema.updateSettings.useMutation({
    onSuccess: () => {
      toast({ title: "Schema settings updated" });
      schemaSettings.refetch();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // SEO Audit mutations
  const runAudit = trpc.admin.seoAudit.runAudit.useMutation({
    onSuccess: () => {
      toast({ title: "SEO Audit complete" });
      auditSummary.refetch();
      lastAudit.refetch();
      ignoredIssues.refetch();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // Bulk quick-fix: applies deterministic defaults to all issues with one
  // (no LLM). Clears 70-80 % of audits in seconds — covers missing meta
  // titles/descriptions, long titles, missing alt text. After running,
  // re-audit to see what genuinely needs human attention.
  const bulkQuickFix = trpc.admin.seoAudit.bulkQuickFix.useMutation({
    onSuccess: (data) => {
      toast({
        title: `Quick-fix applied: ${data.fixed} fixed, ${data.skipped} skipped, ${data.failed} failed`,
        description: data.skipped > 0
          ? `${data.skipped} issues need AI or human review (duplicates, focus keywords, etc.)`
          : undefined,
      });
      // Re-run audit so the dashboard reflects what's actually left
      runAudit.mutate();
    },
    onError: (err) => toast({ title: "Quick-fix failed", description: err.message, variant: "destructive" }),
  });

  const ignoreIssueMut = trpc.admin.seoAudit.ignoreIssue.useMutation({
    onSuccess: () => {
      toast({ title: "Issue ignored" });
      auditSummary.refetch();
      lastAudit.refetch();
      ignoredIssues.refetch();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const unignoreIssueMut = trpc.admin.seoAudit.unignoreIssue.useMutation({
    onSuccess: () => {
      toast({ title: "Issue restored" });
      auditSummary.refetch();
      lastAudit.refetch();
      ignoredIssues.refetch();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const bulkIgnoreMut = trpc.admin.seoAudit.bulkIgnoreIssues.useMutation({
    onSuccess: (data) => {
      toast({ title: `${data.ignoredCount} issues ignored` });
      auditSummary.refetch();
      lastAudit.refetch();
      ignoredIssues.refetch();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // Bulk generate fixes mutation (for approval workflow)
  const bulkGenerateFixesMut = trpc.admin.seoAudit.bulkGenerateFixes.useMutation({
    onSuccess: (data) => {
      const results = data.results.map((r: any) => ({
        issueId: r.issueId,
        issue: r.issue,
        suggestedFix: r.suggestedFix,
        editedFix: r.suggestedFix || '',
        status: r.suggestedFix ? 'pending' as const : 'failed' as const,
        error: r.error
      }));
      setAiFixResults(results);
      setAiFixCurrentIndex(0);
      setAiFixGenerating(false);
    },
    onError: (err) => {
      toast({ title: "Error generating fixes", description: err.message, variant: "destructive" });
      setAiFixGenerating(false);
    }
  });

  // Single fix apply mutation
  const applyFixMut = trpc.admin.seoAudit.applyFix.useMutation({
    onSuccess: () => {
      auditSummary.refetch();
      lastAudit.refetch();
      ignoredIssues.refetch();
    },
    onError: (err) => toast({ title: "Fix failed", description: err.message, variant: "destructive" }),
  });

  // Single issue generate fix mutation
  const generateFixMut = trpc.admin.seoAudit.generateFix.useMutation({
    onSuccess: (data) => {
      if (data.suggestedFix) {
        setSingleFixValue(data.suggestedFix);
      }
      setSingleFixGenerating(false);
    },
    onError: (err) => {
      toast({ title: "Fix generation failed", description: err.message, variant: "destructive" });
      setSingleFixGenerating(false);
    }
  });

  // Regenerate fix with context URL
  const regenerateWithContextMut = trpc.admin.seoAudit.regenerateFixWithContext.useMutation({
    onSuccess: (data) => {
      if (data.suggestedFix) setSingleFixValue(data.suggestedFix);
      setSingleFixGenerating(false);
    },
    onError: (err) => {
      toast({ title: "Regeneration failed", description: err.message, variant: "destructive" });
      setSingleFixGenerating(false);
    }
  });

  // Image search mutation
  const searchImagesMut = trpc.admin.seoAudit.searchImages.useMutation({
    onSuccess: (data) => {
      setSingleFixImageResults(data.results || []);
      setSingleFixImageSearching(false);
    },
    onError: (err) => {
      toast({ title: "Image search failed", description: err.message, variant: "destructive" });
      setSingleFixImageSearching(false);
    }
  });

  // Bulk image search mutation
  const bulkSearchImagesMut = trpc.admin.seoAudit.searchImages.useMutation({
    onSuccess: (data, variables: any) => {
      const issueId = variables._issueId;
      if (issueId) {
        setAiFixImageResults(prev => ({ ...prev, [issueId]: data.results || [] }));
        setAiFixImageSearching(prev => ({ ...prev, [issueId]: false }));
      }
    },
    onError: (err, variables: any) => {
      const issueId = variables._issueId;
      if (issueId) setAiFixImageSearching(prev => ({ ...prev, [issueId]: false }));
      toast({ title: "Image search failed", description: err.message, variant: "destructive" });
    }
  });

  // Bulk regenerate with context
  const bulkRegenerateWithContextMut = trpc.admin.seoAudit.regenerateFixWithContext.useMutation({
    onSuccess: (data, variables: any) => {
      const idx = variables._index;
      if (typeof idx === 'number' && data.suggestedFix) {
        setAiFixResults(prev => prev.map((r, i) =>
          i === idx ? { ...r, editedFix: data.suggestedFix!, suggestedFix: data.suggestedFix } : r
        ));
      }
    },
    onError: (err) => toast({ title: "Regeneration failed", description: err.message, variant: "destructive" })
  });

  // Computed: filter audit issues for the Health tab (must be before helper functions)
  const auditIssues = lastAudit.data?.issues || [];
  const filteredAuditIssues = auditIssues.filter((issue: any) => {
    if (healthFilter === "critical") return issue.severity === "critical";
    if (healthFilter === "warning") return issue.severity === "warning";
    if (healthFilter === "info") return issue.severity === "info";
    if (healthFilter === "autofix") return issue.autoFixAvailable;
    return true;
  }).filter((issue: any) => {
    if (!healthSearch) return true;
    const q = healthSearch.toLowerCase();
    return issue.entityTitle?.toLowerCase().includes(q) || issue.type?.toLowerCase().includes(q) || issue.description?.toLowerCase().includes(q);
  });

  // Multi-select helper functions
  const toggleHealthIssueSelection = (issueId: string) => {
    setSelectedHealthIssues(prev => {
      const next = new Set(prev);
      if (next.has(issueId)) next.delete(issueId);
      else next.add(issueId);
      return next;
    });
  };

  const selectAllFilteredIssues = () => {
    const ids = filteredAuditIssues.slice(0, 50).map((i: any) => i.id);
    setSelectedHealthIssues(new Set(ids));
  };

  const deselectAllIssues = () => {
    setSelectedHealthIssues(new Set());
  };

  const isAllSelected = filteredAuditIssues.length > 0 && 
    filteredAuditIssues.slice(0, 50).every((i: any) => selectedHealthIssues.has(i.id));

  // AI Fix approval workflow
  const handleBulkAiFix = () => {
    const selectedIds = filteredAuditIssues
      .filter((i: any) => selectedHealthIssues.has(i.id))
      .map((i: any) => i.id);
    
    if (selectedIds.length === 0) {
      toast({ title: "No issues selected", description: "Select at least one issue to use AI Fix.", variant: "destructive" });
      return;
    }
    
    // Cap at 20 issues per batch to avoid timeouts
    const batch = selectedIds.slice(0, 20);
    if (selectedIds.length > 20) {
      toast({ title: "Batch limited", description: `Processing first 20 of ${selectedIds.length} selected issues. Run again for the rest.` });
    }
    
    setAiFixGenerating(true);
    setAiFixApprovalOpen(true);
    setAiFixResults([]);
    setAiFixCurrentIndex(0);
    bulkGenerateFixesMut.mutate({ issueIds: batch });
  };

  const handleApproveCurrentFix = () => {
    setAiFixResults(prev => prev.map((r, i) => 
      i === aiFixCurrentIndex ? { ...r, status: 'approved' as const } : r
    ));
    if (aiFixCurrentIndex < aiFixResults.length - 1) {
      setAiFixCurrentIndex(prev => prev + 1);
    }
  };

  const handleRejectCurrentFix = () => {
    setAiFixResults(prev => prev.map((r, i) => 
      i === aiFixCurrentIndex ? { ...r, status: 'rejected' as const } : r
    ));
    if (aiFixCurrentIndex < aiFixResults.length - 1) {
      setAiFixCurrentIndex(prev => prev + 1);
    }
  };

  const handleUpdateFixValue = (index: number, value: string) => {
    setAiFixResults(prev => prev.map((r, i) => 
      i === index ? { ...r, editedFix: value } : r
    ));
  };

  const handleApplyApprovedFixes = async () => {
    const approved = aiFixResults.filter(r => r.status === 'approved' && r.editedFix);
    if (approved.length === 0) {
      toast({ title: "No fixes approved", description: "Approve at least one fix before applying." });
      return;
    }
    
    setAiFixApplying(true);
    let successCount = 0;
    let failCount = 0;
    
    for (const fix of approved) {
      try {
        await applyFixMut.mutateAsync({ issueId: fix.issueId, newValue: fix.editedFix });
        setAiFixResults(prev => prev.map(r => 
          r.issueId === fix.issueId ? { ...r, status: 'applied' as const } : r
        ));
        successCount++;
      } catch {
        setAiFixResults(prev => prev.map(r => 
          r.issueId === fix.issueId ? { ...r, status: 'failed' as const } : r
        ));
        failCount++;
      }
    }
    
    setAiFixApplying(false);
    toast({ 
      title: "Fixes Applied", 
      description: `${successCount} applied, ${failCount} failed, ${aiFixResults.filter(r => r.status === 'rejected').length} rejected.` 
    });
    setSelectedHealthIssues(new Set());
    auditSummary.refetch();
    lastAudit.refetch();
    ignoredIssues.refetch();
  };

  // Single issue AI fix
  const handleOpenSingleFix = (issue: any) => {
    setSingleFixIssue(issue);
    setSingleFixValue(issue.currentValue || '');
    setSingleFixContextUrl('');
    setSingleFixImageUrl('');
    setSingleFixImageKeyword(issue.entityTitle || '');
    setSingleFixImageResults([]);
    setSingleFixSelectedImage(null);
    setSingleFixAltText('');
    setSingleFixDescription('');
    setSingleFixFilename('');
    setSingleFixDialogOpen(true);
  };

  const handleGenerateSingleAiFix = () => {
    if (!singleFixIssue) return;
    setSingleFixGenerating(true);
    if (singleFixContextUrl) {
      regenerateWithContextMut.mutate({ issueId: singleFixIssue.id, contextUrl: singleFixContextUrl });
    } else {
      generateFixMut.mutate({ issueId: singleFixIssue.id });
    }
  };

  const handleSingleImageSearch = () => {
    if (!singleFixImageKeyword && !singleFixImageUrl) return;
    setSingleFixImageSearching(true);
    setSingleFixImageResults([]);
    setSingleFixSelectedImage(null);
    searchImagesMut.mutate({ query: singleFixImageKeyword || singleFixIssue?.entityTitle || '', imageUrl: singleFixImageUrl || undefined });
  };

  const handleSelectSingleImage = (img: any) => {
    setSingleFixSelectedImage(img);
    setSingleFixValue(img.url);
    if (img.altText) setSingleFixAltText(img.altText);
    else setSingleFixAltText(singleFixImageKeyword || singleFixIssue?.entityTitle || '');
    if (img.description) setSingleFixDescription(img.description);
    if (img.filename) setSingleFixFilename(img.filename);
    else setSingleFixFilename((singleFixImageKeyword || singleFixIssue?.entityTitle || 'image').toLowerCase().replace(/\s+/g, '-') + '.jpg');
  };

  const handleBulkImageSearch = (issueId: string, keyword: string, imageUrl?: string) => {
    setAiFixImageSearching(prev => ({ ...prev, [issueId]: true }));
    setAiFixImageResults(prev => ({ ...prev, [issueId]: [] }));
    setAiFixSelectedImages(prev => { const n = { ...prev }; delete n[issueId]; return n; });
    bulkSearchImagesMut.mutate({ query: keyword, imageUrl: imageUrl || undefined, _issueId: issueId } as any);
  };

  const handleSelectBulkImage = (issueId: string, img: any, fixIndex: number) => {
    setAiFixSelectedImages(prev => ({ ...prev, [issueId]: img }));
    handleUpdateFixValue(fixIndex, img.url);
  };

  const handleApplySingleFix = async () => {
    if (!singleFixIssue || !singleFixValue) return;
    try {
      await applyFixMut.mutateAsync({ issueId: singleFixIssue.id, newValue: singleFixValue });
      toast({ title: "Fix Applied", description: "The SEO issue has been fixed." });
      setSingleFixDialogOpen(false);
      setSingleFixIssue(null);
      setSingleFixValue('');
      auditSummary.refetch();
      lastAudit.refetch();
      ignoredIssues.refetch();
    } catch (err: any) {
      toast({ title: "Fix Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleCreateRedirect = () => {
    if (!newRedirect.fromPath || !newRedirect.toPath) {
      toast({ title: "Error", description: "Both paths are required", variant: "destructive" });
      return;
    }
    createRedirect.mutate(newRedirect);
  };

  const handleCreateIndexingRule = () => {
    if (!newIndexingRule.module || !newIndexingRule.pageType) {
      toast({ title: "Error", description: "Module and page type are required", variant: "destructive" });
      return;
    }
    createIndexingRule.mutate(newIndexingRule);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-100 text-red-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-blue-100 text-blue-800";
      default: return "bg-[#F0F2F5] text-gray-800";
    }
  };

  const getIndexingRuleColor = (rule: string) => {
    if (rule.includes("noindex") && rule.includes("nofollow")) return "bg-red-100 text-red-800";
    if (rule.includes("noindex")) return "bg-orange-100 text-orange-800";
    return "bg-green-100 text-green-800";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">SEO Manager</h1>
            <p className="text-muted-foreground mt-1">
              Manage meta tags, sitemaps, redirects, indexing rules, and SEO health
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/*
            Workflow-grouped tab layout (Phase 1 redesign).

            11 flat tabs collapsed into 4 logical workflows. Each row is a
            workflow group; the buttons inside are sub-views of that workflow.
            Internal `value=""` strings stay identical so the underlying
            TabsContent blocks render unchanged — the rewrite is visual only.

            Workflows:
              HEALTH    overview, health, technical-seo
              INDEXING  sitemaps, indexing-logs, indexing, feeds
              URLS      redirects, 404monitor
              SCHEMA    schema, hreflang
          */}
          <div className="space-y-2 mb-2">
            <WorkflowGroup label="Health" icon={<Activity className="h-3.5 w-3.5" />}>
              <TabsList className="bg-transparent p-0 gap-1 h-auto flex-wrap">
                <TabsTrigger value="overview" className="gap-2">
                  <Globe className="h-4 w-4" /> Overview
                </TabsTrigger>
                <TabsTrigger value="health" className="gap-2">
                  <Activity className="h-4 w-4" /> Issues &amp; AI Fixes
                </TabsTrigger>
                <TabsTrigger value="technical-seo" className="gap-2">
                  <Shield className="h-4 w-4" /> Technical SEO
                </TabsTrigger>
                <TabsTrigger value="ai-studio" className="gap-2">
                  <Wand2 className="h-4 w-4" /> AI Studio
                </TabsTrigger>
                <TabsTrigger value="profile-enrichment" className="gap-2">
                  <Sparkles className="h-4 w-4" /> Profile Enrichment
                </TabsTrigger>
              </TabsList>
            </WorkflowGroup>

            <WorkflowGroup label="Indexing" icon={<Zap className="h-3.5 w-3.5" />}>
              <TabsList className="bg-transparent p-0 gap-1 h-auto flex-wrap">
                <TabsTrigger value="sitemaps" className="gap-2">
                  <Map className="h-4 w-4" /> Sitemaps
                </TabsTrigger>
                <TabsTrigger value="indexing-logs" className="gap-2">
                  <Zap className="h-4 w-4" /> Indexing Pings
                </TabsTrigger>
                <TabsTrigger value="indexing" className="gap-2">
                  <Shield className="h-4 w-4" /> Crawl Rules
                </TabsTrigger>
                <TabsTrigger value="feeds" className="gap-2">
                  <Rss className="h-4 w-4" /> RSS Feeds
                </TabsTrigger>
                <TabsTrigger value="search-analytics" className="gap-2">
                  <Search className="h-4 w-4" /> Search Analytics
                </TabsTrigger>
              </TabsList>
            </WorkflowGroup>

            <WorkflowGroup label="URLs" icon={<LinkIcon className="h-3.5 w-3.5" />}>
              <TabsList className="bg-transparent p-0 gap-1 h-auto flex-wrap">
                <TabsTrigger value="redirects" className="gap-2">
                  <LinkIcon className="h-4 w-4" /> Redirects
                </TabsTrigger>
                <TabsTrigger value="404monitor" className="gap-2">
                  <AlertTriangle className="h-4 w-4" /> 404 Monitor
                </TabsTrigger>
              </TabsList>
            </WorkflowGroup>

            <WorkflowGroup label="Schema &amp; Localization" icon={<Code className="h-3.5 w-3.5" />}>
              <TabsList className="bg-transparent p-0 gap-1 h-auto flex-wrap">
                <TabsTrigger value="schema" className="gap-2">
                  <Code className="h-4 w-4" /> Schema
                </TabsTrigger>
                <TabsTrigger value="hreflang" className="gap-2">
                  <Languages className="h-4 w-4" /> Languages
                </TabsTrigger>
              </TabsList>
            </WorkflowGroup>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6">
            {/* Recommended Next Action banner — surfaces the highest-leverage
                action based on current audit state. Shows a Quick Fix CTA when
                issue count is high; an audit prompt when no audit has run. */}
            {auditSummary.data && (
              <>
                {!auditSummary.data.hasAudit && (
                  <Card className="mb-6 border-blue-200 bg-blue-50/50">
                    <CardContent className="p-6 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-blue-900">No SEO audit yet</p>
                        <p className="text-sm text-blue-800/80 mt-1">
                          Run your first audit to see what's blocking indexing.
                        </p>
                      </div>
                      <Button onClick={() => runAudit.mutate()} disabled={runAudit.isPending}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${runAudit.isPending ? 'animate-spin' : ''}`} />
                        Run First Audit
                      </Button>
                    </CardContent>
                  </Card>
                )}
                {!!auditSummary.data.hasAudit && auditSummary.data.totalIssues > 50 && (
                  <Card className="mb-6 border-[#C7DCFF] bg-gradient-to-r from-emerald-50 to-emerald-50/40">
                    <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-md bg-[#C7DCFF]">
                          <Zap className="h-5 w-5 text-[#0052CC]" />
                        </div>
                        <div>
                          <p className="font-semibold text-[#003D99]">
                            {auditSummary.data.totalIssues.toLocaleString()} issues to clear — most can be auto-fixed
                          </p>
                          <p className="text-sm text-[#0052CC]/80 mt-1">
                            Quick Fix copies article titles → seoTitle, excerpts → seoDescription,
                            truncates over-long titles, back-fills alt text. No LLM calls — instant.
                            Issues needing AI/human review are skipped.
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          if (!confirm(
                            `Apply quick fixes to ${auditSummary.data.totalIssues} issues?\n\n` +
                            "This is reversible — re-run audit afterward to see what's left."
                          )) return;
                          bulkQuickFix.mutate({});
                        }}
                        disabled={bulkQuickFix.isPending}
                        className="bg-[#0066FF] hover:bg-[#0052CC] shrink-0"
                      >
                        <Zap className={`h-4 w-4 mr-2 ${bulkQuickFix.isPending ? 'animate-pulse' : ''}`} />
                        {bulkQuickFix.isPending ? "Applying..." : "Apply Quick Fixes"}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* SEO Score Banner */}
            {auditSummary.data && auditSummary.data.lastAuditTime && (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="relative">
                      <svg className="w-24 h-24" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                        <circle cx="50" cy="50" r="45" fill="none"
                          stroke={auditSummary.data.score >= 80 ? '#22c55e' : auditSummary.data.score >= 60 ? '#eab308' : '#ef4444'}
                          strokeWidth="8" strokeLinecap="round"
                          strokeDasharray={`${(auditSummary.data.score / 100) * 283} 283`}
                          transform="rotate(-90 50 50)" />
                        <text x="50" y="55" textAnchor="middle" className="text-2xl font-bold" fill="currentColor">
                          {auditSummary.data.score}
                        </text>
                      </svg>
                    </div>
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-3xl font-bold">{auditSummary.data.totalIssues}</p>
                        <p className="text-sm text-muted-foreground">Total Issues</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-red-600">{auditSummary.data.criticalCount}</p>
                        <p className="text-sm text-muted-foreground">Critical</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-yellow-600">{auditSummary.data.warningCount}</p>
                        <p className="text-sm text-muted-foreground">Warnings</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-blue-600">{auditSummary.data.infoCount}</p>
                        <p className="text-sm text-muted-foreground">Info</p>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground text-right">
                      <p>Last scanned</p>
                      <p>{new Date(auditSummary.data.lastAuditTime).toLocaleString()}</p>
                      {auditSummary.data.ignoredCount > 0 && (
                        <p className="mt-1">{auditSummary.data.ignoredCount} ignored</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setActiveTab("health")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-red-100">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">SEO Issues</p>
                      <div className="text-2xl font-bold">
                        {auditSummary.isLoading ? <Skeleton className="h-8 w-12" /> : auditSummary.data?.totalIssues || 0}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground ml-auto" />
                  </div>
                </CardContent>
              </Card>
              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setActiveTab("404monitor")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-orange-100">
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">404 Errors</p>
                      <p className="text-2xl font-bold">
                        {auditSummary.isLoading ? <Skeleton className="h-8 w-12" /> : auditSummary.data?.total404 || 0}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground ml-auto" />
                  </div>
                </CardContent>
              </Card>
              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setActiveTab("redirects")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-blue-100">
                      <LinkIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Active Redirects</p>
                      <p className="text-2xl font-bold">
                        {redirectsList.isLoading ? <Skeleton className="h-8 w-12" /> : redirectsList.data?.total || 0}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground ml-auto" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-yellow-100">
                      <ChevronRight className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Redirect Chains</p>
                      <p className="text-2xl font-bold">
                        {auditSummary.isLoading ? <Skeleton className="h-8 w-12" /> : auditSummary.data?.redirectChains || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common SEO management tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => runAudit.mutate()}
                    disabled={runAudit.isPending}
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    {runAudit.isPending ? "Running Audit..." : "Run SEO Audit"}
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => setActiveTab("redirects")}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Redirect
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => setActiveTab("404monitor")}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Review 404 Errors
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => setActiveTab("indexing")}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Configure Indexing Rules
                  </Button>
                </CardContent>
              </Card>

              {/* Issue Summary - from Audit */}
              <Card>
                <CardHeader>
                  <CardTitle>Issues by Severity</CardTitle>
                  <CardDescription>Current unresolved SEO issues (from last audit)</CardDescription>
                </CardHeader>
                <CardContent>
                  {auditSummary.isLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {[
                        { key: "critical", label: "Critical", color: "bg-red-100 text-red-800", count: auditSummary.data?.criticalCount || 0 },
                        { key: "warning", label: "Warnings", color: "bg-yellow-100 text-yellow-800", count: auditSummary.data?.warningCount || 0 },
                        { key: "info", label: "Info", color: "bg-blue-100 text-blue-800", count: auditSummary.data?.infoCount || 0 },
                        { key: "autofix", label: "Auto-fixable", color: "bg-green-100 text-green-800", count: auditSummary.data?.autoFixableCount || 0 },
                      ].map((item) => (
                        <div 
                          key={item.key} 
                          className="flex items-center justify-between p-3 rounded-md border cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => {
                            if (item.count > 0) {
                              setHealthFilter(item.key);
                              setActiveTab("health");
                            }
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <Badge className={item.color}>
                              {item.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{item.count}</span>
                            {item.count > 0 && (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Indexing Rules Tab */}
          <TabsContent value="indexing" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Indexing Rules</CardTitle>
                  <CardDescription>
                    Control what Google indexes with robots meta directives
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => resetIndexingRules.mutate()}
                    disabled={resetIndexingRules.isPending}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset to Defaults
                  </Button>
                  <Button onClick={() => setIndexingRuleDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Rule
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table className="table-fixed">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[16%]">Module</TableHead>
                        <TableHead className="w-[14%]">Page Type</TableHead>
                        <TableHead className="w-[16%]">Indexing Rule</TableHead>
                        <TableHead className="w-[14%]">Canonical</TableHead>
                        <TableHead className="w-[12%]">Priority</TableHead>
                        <TableHead className="w-[12%]">Status</TableHead>
                        <TableHead className="text-right hidden md:table-cell">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {indexingRules.isLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      ) : indexingRules.data?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No indexing rules configured
                          </TableCell>
                        </TableRow>
                      ) : (
                        indexingRules.data?.map((rule: any) => (
                          <TableRow key={rule.id}>
                            <TableCell className="font-medium capitalize">{rule.module}</TableCell>
                            <TableCell className="capitalize">{rule.pageType}</TableCell>
                            <TableCell>
                              <Badge className={getIndexingRuleColor(rule.indexingRule)}>
                                {rule.indexingRule}
                              </Badge>
                            </TableCell>
                            <TableCell className="capitalize">{rule.canonicalRule}</TableCell>
                            <TableCell>{rule.priority}</TableCell>
                            <TableCell>
                              <Switch
                                checked={rule.isEnabled}
                                onCheckedChange={(checked) => 
                                  updateIndexingRule.mutate({ id: rule.id, isEnabled: checked })
                                }
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteIndexingRule.mutate({ id: rule.id })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Presets Info */}
                <div className="mt-6 p-4 rounded-md bg-muted">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Recommended Presets
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-green-700">index, follow</p>
                      <p className="text-muted-foreground">Article details, category listings, company profiles</p>
                    </div>
                    <div>
                      <p className="font-medium text-orange-700">noindex, follow</p>
                      <p className="text-muted-foreground">Tag pages, author archives, pagination pages</p>
                    </div>
                    <div>
                      <p className="font-medium text-red-700">noindex, nofollow</p>
                      <p className="text-muted-foreground">Search results, preview pages, admin pages</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Redirects Tab */}
          <TabsContent value="redirects" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>URL Redirects</CardTitle>
                  <CardDescription>
                    Manage 301 and 302 redirects for SEO preservation
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Import CSV
                  </Button>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button onClick={() => setRedirectDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Redirect
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search redirects..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="rounded-md border">
                  <Table className="table-fixed">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[28%]">From URL</TableHead>
                        <TableHead className="w-[28%]">To URL</TableHead>
                        <TableHead className="w-[10%]">Type</TableHead>
                        <TableHead className="w-[10%]">Hits</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {redirectsList.isLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      ) : redirectsList.data?.items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No redirects found
                          </TableCell>
                        </TableRow>
                      ) : (
                        redirectsList.data?.items.map((redirect: any) => (
                          <TableRow key={redirect.id}>
                            <TableCell className="font-mono text-sm max-w-[200px] truncate">
                              {redirect.fromPath}
                            </TableCell>
                            <TableCell className="font-mono text-sm max-w-[200px] truncate">
                              <div className="flex items-center gap-2">
                                {redirect.toPath}
                                {!!redirect.hasChain && (
                                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                    Chain
                                  </Badge>
                                )}
                                {!!redirect.hasLoop && (
                                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                    Loop!
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={redirect.statusCode === 301 ? "default" : "secondary"}>
                                {redirect.statusCode}
                              </Badge>
                            </TableCell>
                            <TableCell>
                             <span className={(redirect.hitCount || 0) > 100 ? "font-bold text-green-600" : ""}>
                                {redirect.hitCount}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={redirect.isActive ?? false}
                                onCheckedChange={(checked) => 
                                  updateRedirect.mutate({ id: redirect.id, isActive: checked })
                                }
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setEditingRedirect(redirect.id)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteRedirectId(redirect.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {redirectsList.data && redirectsList.data.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Page {redirectsPage} of {redirectsList.data.totalPages} ({redirectsList.data.total} total)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={redirectsPage === 1}
                        onClick={() => setRedirectsPage(p => p - 1)}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={redirectsPage >= redirectsList.data.totalPages}
                        onClick={() => setRedirectsPage(p => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 404 Monitor Tab */}
          <TabsContent value="404monitor" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle>404 Error Monitor</CardTitle>
                  <CardDescription>
                    Track and resolve 404 errors with smart redirect suggestions.
                    The monitor logs URLs hit by live traffic — for URLs from
                    a GSC export, use "Import URLs" to seed them first.
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setImportExpanded(v => !v)}
                  >
                    <LinkIcon className="h-4 w-4 mr-2" />
                    {importExpanded ? "Hide import" : "Import URLs"}
                  </Button>
                  <Button
                    variant="outline"
                    className="text-violet-700 border-violet-300 hover:bg-violet-50"
                    disabled={aiSuggestRedirect.isPending || !monitor404List.data?.items?.length}
                    onClick={() => {
                      const ids = (monitor404List.data?.items || []).map((m: any) => m.id).slice(0, 50);
                      if (ids.length === 0) return;
                      aiSuggestRedirect.mutate({ monitorIds: ids });
                    }}
                  >
                    <Wand2 className={`h-4 w-4 mr-2 ${aiSuggestRedirect.isPending ? 'animate-pulse' : ''}`} />
                    {aiSuggestRedirect.isPending ? "AI thinking..." : "AI Suggest All"}
                  </Button>
                </div>
              </CardHeader>
              {importExpanded && (
                <CardContent className="border-t pt-4 space-y-3">
                  <div>
                    <label className="text-sm font-medium block mb-1.5">
                      Paste 404 URLs from Google Search Console
                    </label>
                    <textarea
                      value={importUrls}
                      onChange={(e) => setImportUrls(e.target.value)}
                      placeholder={`One URL per line. Bare paths or full ${publication.siteUrl}/... URLs both work.\n\n/old-wp-page\n${publication.siteUrl}/2023/06/some-article\n/category/old-name`}
                      rows={6}
                      className="w-full text-sm font-mono rounded-md border bg-background px-3 py-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {importUrls.split("\n").filter((l) => l.trim()).length} URLs ready to import (max 500 per batch)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => bulkImport404.mutate({
                        urls: importUrls.split("\n").map((u) => u.trim()).filter(Boolean),
                      })}
                      disabled={
                        bulkImport404.isPending ||
                        importUrls.split("\n").filter((l) => l.trim()).length === 0
                      }
                    >
                      {bulkImport404.isPending
                        ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing…</>
                        : <>Import URLs</>}
                    </Button>
                    <Button variant="ghost" onClick={() => { setImportUrls(""); setImportExpanded(false); }}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              )}
              <CardContent>
                <div className="rounded-md border">
                  <Table className="table-fixed">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Requested URL</TableHead>
                        <TableHead>Hits</TableHead>
                        <TableHead>Last Hit</TableHead>
                        <TableHead>Suggested Redirect</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monitor404List.isLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      ) : monitor404List.data?.items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No 404 errors recorded
                          </TableCell>
                        </TableRow>
                      ) : (
                        monitor404List.data?.items.map((error: any) => (
                          <TableRow key={error.id}>
                            <TableCell className="font-mono text-sm max-w-[250px] truncate">
                              {error.requestedUrl}
                            </TableCell>
                            <TableCell>
                              <Badge variant={error.hitCount > 10 ? "destructive" : "secondary"}>
                                {error.hitCount}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(error.lastHitAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {error.suggestedRedirectUrl ? (
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm truncate max-w-[150px]">
                                    {error.suggestedRedirectUrl}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {error.suggestedConfidence}%
                                  </Badge>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">No suggestion</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-violet-700 border-violet-200 hover:bg-violet-50"
                                  title="Ask AI for a redirect target"
                                  onClick={() => aiSuggestRedirect.mutate({ monitorIds: [error.id] })}
                                  disabled={aiSuggestRedirect.isPending}
                                >
                                  <Wand2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const toPath = error.suggestedRedirectUrl || prompt("Enter redirect target URL:");
                                    if (toPath) {
                                      create404Redirect.mutate({ monitorId: error.id, toPath });
                                    }
                                  }}
                                >
                                  <ArrowRight className="h-4 w-4 mr-1" />
                                  Create Redirect
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => dismiss404.mutate({ id: error.id })}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {monitor404List.data && monitor404List.data.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Page {monitor404Page} of {monitor404List.data.totalPages} ({monitor404List.data.total} total)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={monitor404Page === 1}
                        onClick={() => setMonitor404Page(p => p - 1)}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={monitor404Page >= monitor404List.data.totalPages}
                        onClick={() => setMonitor404Page(p => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SEO Health Tab */}
          <TabsContent value="health" className="mt-6">
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>SEO Health Dashboard</CardTitle>
                    <CardDescription>
                      Monitor and fix SEO issues across your content
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (!confirm(
                          "Apply quick fixes to every issue with a deterministic default value?\n\n" +
                          "This will copy article titles → seoTitle for missing meta titles, excerpts → seoDescription for missing descriptions, truncate over-long titles, and back-fill missing alt text. No LLM calls — instant.\n\n" +
                          "Issues that need uniqueness or domain knowledge (duplicates, focus keywords, broken links) are skipped and remain in the dashboard for AI Fix or manual review."
                        )) return;
                        bulkQuickFix.mutate({});
                      }}
                      disabled={bulkQuickFix.isPending || runAudit.isPending}
                      className="text-[#0066FF] border-emerald-300 hover:bg-[#F0F7FF]"
                    >
                      <Zap className={`h-4 w-4 mr-2 ${bulkQuickFix.isPending ? 'animate-pulse' : ''}`} />
                      {bulkQuickFix.isPending ? "Applying..." : "Apply Quick Fixes"}
                    </Button>
                    <Button
                      onClick={() => runAudit.mutate()}
                      disabled={runAudit.isPending}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${runAudit.isPending ? 'animate-spin' : ''}`} />
                      {runAudit.isPending ? "Scanning..." : "Run Full Scan"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Filter tabs */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    {[
                      { key: "all", label: `All (${auditIssues.length})` },
                      { key: "critical", label: `Critical (${auditIssues.filter((i: any) => i.severity === 'critical').length})` },
                      { key: "warning", label: `Warnings (${auditIssues.filter((i: any) => i.severity === 'warning').length})` },
                      { key: "info", label: `Info (${auditIssues.filter((i: any) => i.severity === 'info').length})` },
                      { key: "autofix", label: `Auto-fixable (${auditIssues.filter((i: any) => i.autoFixAvailable).length})` },
                    ].map((tab) => (
                      <Button
                        key={tab.key}
                        variant={healthFilter === tab.key ? "default" : "outline"}
                        size="sm"
                        onClick={() => { setHealthFilter(tab.key); setSelectedHealthIssues(new Set()); }}
                      >
                        {tab.label}
                      </Button>
                    ))}
                    <div className="ml-auto flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search issues..."
                          value={healthSearch}
                          onChange={(e) => setHealthSearch(e.target.value)}
                          className="pl-10 w-64"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Select All / Deselect All + Floating Bulk Action Bar */}
                  {filteredAuditIssues.length > 0 && (
                    <div className="flex items-center justify-between mb-3 p-3 rounded-md bg-muted/50 border">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={(checked) => {
                            if (checked) selectAllFilteredIssues();
                            else deselectAllIssues();
                          }}
                        />
                        <span className="text-sm font-medium">
                          {isAllSelected ? 'All selected' : 'Select all'}
                          {selectedHealthIssues.size > 0 && !isAllSelected && (
                            <span className="text-muted-foreground ml-1">({selectedHealthIssues.size} selected)</span>
                          )}
                        </span>
                      </div>
                      {selectedHealthIssues.size > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {selectedHealthIssues.size} issue{selectedHealthIssues.size !== 1 ? 's' : ''} selected
                          </span>
                          <Button
                            size="sm"
                            onClick={handleBulkAiFix}
                            disabled={aiFixGenerating}
                            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white"
                          >
                            {aiFixGenerating ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Wand2 className="h-4 w-4 mr-2" />
                            )}
                            AI Fix Selected
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const ids = Array.from(selectedHealthIssues);
                              bulkIgnoreMut.mutate({ issueIds: ids, reason: 'Bulk dismissed by admin' });
                              setSelectedHealthIssues(new Set());
                            }}
                            disabled={bulkIgnoreMut.isPending}
                          >
                            <Ban className="h-4 w-4 mr-2" />
                            Ignore Selected
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={deselectAllIssues}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Issues list */}
                  {lastAudit.isLoading ? (
                    <div className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </div>
                  ) : filteredAuditIssues.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
                      <p className="text-muted-foreground">
                        {auditIssues.length === 0 ? "No audit results yet. Run a scan to check your SEO health." : "No issues match the current filter."}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredAuditIssues.slice(0, 50).map((issue: any, idx: number) => (
                        <div 
                          key={issue.id || idx} 
                          className={`border rounded-md p-4 hover:bg-muted/30 transition-colors ${
                            selectedHealthIssues.has(issue.id) ? 'border-primary bg-primary/5' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Checkbox */}
                            <div className="pt-1">
                              <Checkbox
                                checked={selectedHealthIssues.has(issue.id)}
                                onCheckedChange={() => toggleHealthIssueSelection(issue.id)}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={
                                  issue.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                  issue.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-blue-100 text-blue-800'
                                }>
                                  {issue.type?.replace(/_/g, ' ')}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {issue.entityType}
                                </Badge>
                                {issue.autoFixAvailable && (
                                  <Badge className="bg-green-100 text-green-800 text-xs">Auto-fix</Badge>
                                )}
                              </div>
                              <p className="font-medium truncate">{issue.entityTitle || 'Unknown'}</p>
                              <p className="text-sm text-muted-foreground mt-1">{issue.description || issue.recommendation}</p>
                              {issue.currentValue && (
                                <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
                                  Current: {issue.currentValue}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {issue.pageUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(issue.pageUrl, '_blank')}
                                  title="Open page"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              )}
                              {issue.entityId && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenSingleFix(issue)}
                                  title="AI Fix this issue"
                                  className="text-violet-600 border-violet-200 hover:bg-violet-50"
                                >
                                  <Wand2 className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => ignoreIssueMut.mutate({
                                  issueId: issue.id,
                                  reason: 'Dismissed by admin',
                                })}
                                disabled={ignoreIssueMut.isPending}
                                title="Ignore this issue"
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {filteredAuditIssues.length > 50 && (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          Showing 50 of {filteredAuditIssues.length} issues. Use the search or filters to narrow down.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Ignored issues section */}
                  {ignoredIssues.data && ignoredIssues.data.length > 0 && (
                    <div className="mt-6 border-t pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-muted-foreground">
                          Ignored Issues ({ignoredIssues.data.length})
                        </h4>
                      </div>
                      <div className="space-y-2">
                        {ignoredIssues.data.slice(0, 10).map((ignored: any) => (
                          <div key={ignored.id} className="flex items-center justify-between p-2 rounded border border-dashed opacity-60 hover:opacity-100 transition-opacity">
                            <div className="flex items-center gap-2 min-w-0">
                              <Badge variant="outline" className="text-xs shrink-0">{ignored.issueType?.replace(/_/g, ' ')}</Badge>
                              <span className="text-sm truncate">{ignored.entityType}:{ignored.entityId}</span>
                              <span className="text-xs text-muted-foreground truncate">{ignored.reason}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => unignoreIssueMut.mutate({ issueId: ignored.issueId })}
                              disabled={unignoreIssueMut.isPending}
                              title="Restore this issue"
                            >
                              <Undo2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        {ignoredIssues.data.length > 10 && (
                          <p className="text-xs text-muted-foreground text-center">
                            +{ignoredIssues.data.length - 10} more ignored issues
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Hreflang/Languages Tab */}
          <TabsContent value="hreflang" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Language Settings</CardTitle>
                  <CardDescription>
                    Configure hreflang tags for multilingual SEO
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {hreflangSettings.isLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Enable Hreflang Tags</p>
                          <p className="text-sm text-muted-foreground">
                            Add hreflang tags to pages for language targeting
                          </p>
                        </div>
                        <Switch
                          checked={hreflangSettings.data?.hreflang_enabled === true}
                          onCheckedChange={(checked) => 
                            updateHreflangSettings.mutate({ hreflang_enabled: checked })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Default Language</Label>
                        <Select
                          value={hreflangSettings.data?.default_language as string || "en"}
                          onValueChange={(value) => 
                            updateHreflangSettings.mutate({ default_language: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">English (en)</SelectItem>
                            <SelectItem value="ar">Arabic (ar)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Secondary Language</Label>
                        <Select
                          value={hreflangSettings.data?.secondary_language as string || "ar"}
                          onValueChange={(value) => 
                            updateHreflangSettings.mutate({ secondary_language: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">English (en)</SelectItem>
                            <SelectItem value="ar">Arabic (ar)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Hreflang Preview</CardTitle>
                  <CardDescription>
                    Example hreflang tags for your pages
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="p-4 rounded-md bg-muted overflow-x-auto text-sm font-mono">
{`<link rel="alternate" hreflang="en"
      href="${publication.siteUrl}/news/article-slug" />
<link rel="alternate" hreflang="ar"
      href="${publication.siteUrl}/ar/news/article-slug" />
<link rel="alternate" hreflang="x-default"
      href="${publication.siteUrl}/news/article-slug" />`}
                  </pre>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Sitemaps Tab */}
          <TabsContent value="sitemaps" className="mt-6">
            <div className="space-y-6">
              {/* Master Sitemap Info with Stats */}
              <Card className="border-green-200 bg-green-50/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        Master Sitemap Index
                      </CardTitle>
                      <CardDescription>
                        Submit this single URL to Google Search Console
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => regenerateSitemaps.mutate()}
                        disabled={regenerateSitemaps.isPending}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${regenerateSitemaps.isPending ? 'animate-spin' : ''}`} />
                        {regenerateSitemaps.isPending ? 'Regenerating...' : 'Regenerate All'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/sitemap.xml`);
                          toast({ title: "Copied to clipboard" });
                        }}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy URL
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-3 rounded-md bg-white border mb-4">
                    <div className="flex items-center gap-3">
                      <code className="text-sm font-mono bg-[#F0F2F5] px-2 py-1 rounded">
                        {window.location.origin}/sitemap.xml
                      </code>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open('/sitemap.xml', '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                  {/* Sitemap Stats Summary */}
                  {sitemapStats.data && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 rounded-md bg-white border text-center">
                        <p className="text-2xl font-bold text-green-600">{sitemapStats.data.totalUrls.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Total URLs</p>
                      </div>
                      <div className="p-3 rounded-md bg-white border text-center">
                        <p className="text-2xl font-bold text-purple-600">{sitemapStats.data.sitemaps.length}</p>
                        <p className="text-xs text-muted-foreground">Sitemaps</p>
                      </div>
                      <div className="p-3 rounded-md bg-white border text-center">
                        <p className="text-2xl font-bold text-blue-600">
                          {sitemapStats.data.sitemaps.find(s => s.name === 'articles')?.urlCount.toLocaleString() || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">Articles</p>
                      </div>
                      <div className="p-3 rounded-md bg-white border text-center">
                        <p className="text-2xl font-bold text-orange-600">
                          {sitemapStats.data.sitemaps.find(s => s.name === 'news')?.urlCount || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">News (48h)</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Module Sitemaps */}
                <Card>
                  <CardHeader>
                    <CardTitle>Module Sitemaps</CardTitle>
                    <CardDescription>
                      Individual sitemaps for each content type
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { name: "articles", label: "Articles (Full Archive)", desc: "All published articles" },
                        { name: "news", label: "Google News (48h)", desc: "Last 48 hours only" },
                        { name: "jobs", label: "Jobs", desc: "Job listings" },
                        { name: "people", label: "People", desc: "People profiles" },
                        { name: "investors", label: "Investors", desc: "Investor profiles" },
                        { name: "companies", label: "Companies", desc: "Company profiles" },
                        { name: "accelerators", label: "Accelerators", desc: "Accelerator profiles" },
                        { name: "events", label: "Events", desc: "Event listings" },
                        { name: "resources", label: "Resources", desc: "Resource library" },
                        { name: "research", label: "Research", desc: "Research reports" },
                        { name: "categories", label: "Categories", desc: "Category pages" },
                        { name: "pages", label: "Static Pages", desc: "Homepage, about, etc." },
                      ].map((sitemap) => {
                        const stats = sitemapStats.data?.sitemaps.find(s => s.name === sitemap.name);
                        return (
                          <div
                            key={sitemap.name}
                            className="flex items-center justify-between p-3 rounded-md border hover:bg-[#F7F8FA] transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-md ${sitemap.name === 'news' ? 'bg-orange-100' : 'bg-purple-100'}`}>
                                <Map className={`h-4 w-4 ${sitemap.name === 'news' ? 'text-orange-600' : 'text-purple-600'}`} />
                              </div>
                              <div>
                                <p className="font-medium">{sitemap.label}</p>
                                <p className="text-xs text-muted-foreground">
                                  {sitemap.desc}
                                </p>
                                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                                  /sitemap-{sitemap.name}.xml
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {stats && (
                                <Badge variant="secondary" className="text-xs">
                                  {stats.urlCount.toLocaleString()} URLs
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(`/sitemap-${sitemap.name}.xml`, '_blank')}
                                title="View sitemap"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sitemap Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sitemapSettings.isLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Include images in sitemaps</p>
                          <p className="text-sm text-muted-foreground">
                            Add image URLs to article sitemaps
                          </p>
                        </div>
                        <Switch
                          checked={sitemapSettings.data?.sitemap_include_images === true}
                          onCheckedChange={(checked) => 
                            updateSitemapSettings.mutate({ sitemap_include_images: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Exclude tag pages</p>
                          <p className="text-sm text-muted-foreground">
                            Don't include tag archive pages
                          </p>
                        </div>
                        <Switch
                          checked={sitemapSettings.data?.sitemap_exclude_tags === true}
                          onCheckedChange={(checked) => 
                            updateSitemapSettings.mutate({ sitemap_exclude_tags: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Exclude pagination</p>
                          <p className="text-sm text-muted-foreground">
                            Don't include paginated listing pages
                          </p>
                        </div>
                        <Switch
                          checked={sitemapSettings.data?.sitemap_exclude_pagination === true}
                          onCheckedChange={(checked) => 
                            updateSitemapSettings.mutate({ sitemap_exclude_pagination: checked })
                          }
                        />
                      </div>
                      <div className="pt-4 border-t">
                        <h4 className="font-medium mb-3">Google News Sitemap</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">Enable News Sitemap</p>
                              <p className="text-sm text-muted-foreground">
                                Generate sitemap for Google News
                              </p>
                            </div>
                            <Switch
                              checked={sitemapSettings.data?.news_sitemap_enabled === true}
                              onCheckedChange={(checked) => 
                                updateSitemapSettings.mutate({ news_sitemap_enabled: checked })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Publication Name</Label>
                            <Input
                              defaultValue={sitemapSettings.data?.news_publication_name as string || publication.name}
                              onBlur={(e) => 
                                updateSitemapSettings.mutate({ news_publication_name: e.target.value })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
              </div>
            </div>
          </TabsContent>

          {/* RSS Feeds Tab */}
          <TabsContent value="feeds" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>RSS Feeds</CardTitle>
                  <CardDescription>
                    Available RSS feeds for content syndication
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { name: "All News", url: "/feed/news.xml", items: 50 },
                      { name: "Featured Articles", url: "/feed/featured.xml", items: 10 },
                      { name: "Jobs Feed", url: "/feed/jobs.xml", items: 25 },
                      { name: "Events Feed", url: "/feed/events.xml", items: 15 },
                    ].map((feed) => (
                      <div
                        key={feed.name}
                        className="flex items-center justify-between p-3 rounded-md border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-md bg-orange-100">
                            <Rss className="h-4 w-4 text-orange-600" />
                          </div>
                          <div>
                            <p className="font-medium">{feed.name}</p>
                            <p className="text-sm text-muted-foreground font-mono">
                              {feed.url}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{feed.items} items</Badge>
                          <Button variant="ghost" size="icon">
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Feed Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Items per feed</Label>
                    <Select defaultValue="50">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 items</SelectItem>
                        <SelectItem value="25">25 items</SelectItem>
                        <SelectItem value="50">50 items</SelectItem>
                        <SelectItem value="100">100 items</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Feed format</Label>
                    <Select defaultValue="rss2">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rss2">RSS 2.0</SelectItem>
                        <SelectItem value="atom">Atom</SelectItem>
                        <SelectItem value="json">JSON Feed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Include full content</p>
                      <p className="text-sm text-muted-foreground">
                        Show full article content in feeds
                      </p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Include featured images</p>
                      <p className="text-sm text-muted-foreground">
                        Add media enclosures to feed items
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Button className="w-full">Save Settings</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Schema Tab */}
          <TabsContent value="schema" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>JSON-LD Schema Types</CardTitle>
                  <CardDescription>
                    Structured data automatically generated for each content type
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { type: "NewsArticle", module: "News", key: "news_article" },
                      { type: "JobPosting", module: "Jobs", key: "job_posting" },
                      { type: "Person", module: "People", key: "person" },
                      { type: "Organization", module: "Investors/Companies", key: "organization" },
                      { type: "Event", module: "Events", key: "event" },
                      { type: "BreadcrumbList", module: "All Pages", key: "schema_breadcrumb_enabled" },
                      { type: "WebSite + SearchAction", module: "Homepage", key: "schema_website_enabled" },
                    ].map((schema) => (
                      <div
                        key={schema.type}
                        className="flex items-center justify-between p-3 rounded-md border"
                      >
                        <div>
                          <p className="font-medium font-mono">{schema.type}</p>
                          <p className="text-sm text-muted-foreground">
                            {schema.module}
                          </p>
                        </div>
                        <Switch 
                          defaultChecked 
                          checked={
                            schema.key.startsWith('schema_') 
                              ? schemaSettings.data?.[schema.key] === true 
                              : true
                          }
                          onCheckedChange={(checked) => {
                            if (schema.key.startsWith('schema_')) {
                              updateSchemaSettings.mutate({ [schema.key]: checked });
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Organization Schema</CardTitle>
                  <CardDescription>
                    Default organization data for structured markup
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {schemaSettings.isLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>Organization Name</Label>
                        <Input
                          defaultValue={schemaSettings.data?.organization_name as string || publication.name}
                          onBlur={(e) => 
                            updateSchemaSettings.mutate({ organization_name: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Logo URL</Label>
                        <Input
                          defaultValue={schemaSettings.data?.organization_logo as string || `${publication.siteUrl}${publication.assets.logo}`}
                          onBlur={(e) => 
                            updateSchemaSettings.mutate({ organization_logo: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Search URL Template</Label>
                        <Input
                          defaultValue={schemaSettings.data?.search_url_template as string || `${publication.siteUrl}/search?q={search_term_string}`}
                          onBlur={(e) => 
                            updateSchemaSettings.mutate({ search_url_template: e.target.value })
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          Use {"{search_term_string}"} as placeholder for search query
                        </p>
                      </div>
                      <Button className="w-full">Save Organization Data</Button>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Schema Preview</CardTitle>
                  <CardDescription>
                    Preview generated JSON-LD for a sample article
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="p-4 rounded-md bg-muted overflow-x-auto text-sm font-mono">
{`{
  "@context": "https://schema.org",
  "@type": "NewsArticle",
  "headline": "NEOM Awards $2B EPC Contract for Water Infrastructure",
  "description": "Saudi giga-project awards major engineering, procurement and construction package...",
  "image": "${publication.siteUrl}/images/article-hero.jpg",
  "datePublished": "2026-01-15T10:00:00Z",
  "dateModified": "2026-01-15T14:30:00Z",
  "author": {
    "@type": "Person",
    "name": "John Doe",
    "url": "${publication.siteUrl}/people/john-doe"
  },
  "publisher": {
    "@type": "Organization",
    "name": "${schemaSettings.data?.organization_name || publication.name}",
    "logo": {
      "@type": "ImageObject",
      "url": "${schemaSettings.data?.organization_logo || publication.siteUrl + publication.assets.logo}"
    }
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "${publication.siteUrl}/news/neom-epc-contract"
  }
}`}
                  </pre>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Indexing Logs Tab */}
          <TabsContent value="indexing-logs" className="mt-6">
            <IndexingLogsTab />
          </TabsContent>

          {/* Technical SEO Intelligence Tab */}
          <TabsContent value="technical-seo" className="mt-6">
            <TechnicalSEOTab />
          </TabsContent>

          {/* AI Studio (Health workflow) — embeds the former /admin/ai/seo
              standalone page. AI inline with the issues it fixes. */}
          <TabsContent value="ai-studio" className="mt-6">
            <SEOToolsPanel />
          </TabsContent>

          {/* Profile Enrichment — bulk-fills empty descriptions on
              people/company/investor/event/accelerator profiles. Targets
              the GSC "Crawled — currently not indexed" 943 bucket. */}
          <TabsContent value="profile-enrichment" className="mt-6">
            <ProfileEnrichmentPanel />
          </TabsContent>

          {/* Search Analytics (Indexing workflow) — embeds the former
              /admin/search-analytics standalone page. Search-query gaps
              now sit next to indexing health where they're most useful. */}
          <TabsContent value="search-analytics" className="mt-6">
            <SearchAnalyticsPanel />
          </TabsContent>
        </Tabs>

        {/* AI Redirect Suggestions review dialog (Phase 2C). Opens after the
            "AI Suggest All" or per-row Wand button. Operator reviews each
            suggestion + confidence, then applies all >= threshold in one go. */}
        <Dialog open={aiSuggestOpen} onOpenChange={setAiSuggestOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-violet-600" />
                AI Redirect Suggestions
              </DialogTitle>
              <DialogDescription>
                Review each suggestion. Click "Apply ≥ 80% confidence" to create 301s for high-confidence matches in one batch.
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[60vh] overflow-y-auto space-y-3 my-4">
              {aiSuggestions.length === 0 ? (
                <p className="text-muted-foreground text-sm">No suggestions yet — run "AI Suggest All" first.</p>
              ) : (
                aiSuggestions.map((s) => (
                  <div key={s.monitorId} className="border rounded-md p-3 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-xs text-muted-foreground truncate">404 → {s.brokenUrl}</p>
                        {s.suggested ? (
                          <>
                            <p className="font-mono text-sm font-semibold text-[#0066FF] truncate">
                              ↦ {s.suggested.url}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">{s.suggested.reasoning}</p>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            {s.error || "AI couldn't find a confident match — manual redirect needed"}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {s.suggested && (
                          <Badge
                            className={
                              s.suggested.confidence >= 80 ? "bg-green-100 text-green-800" :
                              s.suggested.confidence >= 60 ? "bg-yellow-100 text-yellow-800" :
                              "bg-red-100 text-red-800"
                            }
                          >
                            {s.suggested.confidence}%
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">{s.hitCount} hits</Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setAiSuggestOpen(false)}>Cancel</Button>
              <Button
                onClick={() => {
                  const payload = aiSuggestions
                    .filter(s => s.suggested && s.suggested.confidence >= 80)
                    .map(s => ({
                      monitorId: s.monitorId,
                      targetUrl: s.suggested!.url,
                      confidence: s.suggested!.confidence,
                    }));
                  if (payload.length === 0) {
                    toast({ title: "Nothing to apply", description: "No suggestions reached 80% confidence." });
                    return;
                  }
                  applyAiSuggestions.mutate({ suggestions: payload, minConfidence: 80 });
                }}
                disabled={applyAiSuggestions.isPending}
                className="bg-[#0066FF] hover:bg-[#0052CC]"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Apply ≥ 80% confidence ({aiSuggestions.filter(s => s.suggested && s.suggested.confidence >= 80).length})
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Add Redirect Dialog */}
      <Dialog open={redirectDialogOpen} onOpenChange={setRedirectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Redirect</DialogTitle>
            <DialogDescription>
              Create a new URL redirect for SEO preservation
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>From URL</Label>
              <Input
                placeholder="/old-page-url"
                value={newRedirect.fromPath}
                onChange={(e) => setNewRedirect({ ...newRedirect, fromPath: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>To URL</Label>
              <Input
                placeholder="/new-page-url"
                value={newRedirect.toPath}
                onChange={(e) => setNewRedirect({ ...newRedirect, toPath: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Redirect Type</Label>
              <Select
                value={newRedirect.type}
                onValueChange={(value: "301" | "302") => setNewRedirect({ ...newRedirect, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="301">301 - Permanent</SelectItem>
                  <SelectItem value="302">302 - Temporary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRedirectDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRedirect} disabled={createRedirect.isPending}>
              {createRedirect.isPending ? "Creating..." : "Create Redirect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Indexing Rule Dialog */}
      <Dialog open={indexingRuleDialogOpen} onOpenChange={setIndexingRuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Indexing Rule</DialogTitle>
            <DialogDescription>
              Configure how search engines should index this page type
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Module</Label>
              <Select
                value={newIndexingRule.module}
                onValueChange={(value) => setNewIndexingRule({ ...newIndexingRule, module: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="articles">Articles</SelectItem>
                  <SelectItem value="companies">Companies</SelectItem>
                  <SelectItem value="investors">Investors</SelectItem>
                  <SelectItem value="people">People</SelectItem>
                  <SelectItem value="events">Events</SelectItem>
                  <SelectItem value="jobs">Jobs</SelectItem>
                  <SelectItem value="accelerators">Accelerators</SelectItem>
                  <SelectItem value="resources">Resources</SelectItem>
                  <SelectItem value="tags">Tags</SelectItem>
                  <SelectItem value="categories">Categories</SelectItem>
                  <SelectItem value="search">Search</SelectItem>
                  <SelectItem value="pagination">Pagination</SelectItem>
                  <SelectItem value="author">Author</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Page Type</Label>
              <Select
                value={newIndexingRule.pageType}
                onValueChange={(value) => setNewIndexingRule({ ...newIndexingRule, pageType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select page type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="detail">Detail Page</SelectItem>
                  <SelectItem value="listing">Listing Page</SelectItem>
                  <SelectItem value="preview">Preview Page</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Indexing Rule</Label>
              <Select
                value={newIndexingRule.indexingRule}
                onValueChange={(value) => setNewIndexingRule({ ...newIndexingRule, indexingRule: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="index, follow">index, follow</SelectItem>
                  <SelectItem value="noindex, follow">noindex, follow</SelectItem>
                  <SelectItem value="noindex, nofollow">noindex, nofollow</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Canonical Rule</Label>
              <Select
                value={newIndexingRule.canonicalRule}
                onValueChange={(value) => setNewIndexingRule({ ...newIndexingRule, canonicalRule: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">Self</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Input
                type="number"
                value={newIndexingRule.priority}
                onChange={(e) => setNewIndexingRule({ ...newIndexingRule, priority: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">Higher priority rules take precedence</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIndexingRuleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateIndexingRule} disabled={createIndexingRule.isPending}>
              {createIndexingRule.isPending ? "Creating..." : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Redirect Confirmation */}
      <AlertDialog open={deleteRedirectId !== null} onOpenChange={() => setDeleteRedirectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Redirect?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The redirect will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteRedirectId && deleteRedirect.mutate({ id: deleteRedirectId })}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* SEO Issue Details Dialog */}
      <Dialog open={selectedIssue !== null} onOpenChange={() => setSelectedIssue(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              SEO Issue Details
            </DialogTitle>
            <DialogDescription>
              Review the issue details and suggested fix
            </DialogDescription>
          </DialogHeader>
          {selectedIssue && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={getSeverityColor(selectedIssue.severity)}>
                  {selectedIssue.severity.charAt(0).toUpperCase() + selectedIssue.severity.slice(1)}
                </Badge>
                <span className="font-medium">
                  {selectedIssue.issueType.replace(/_/g, ' ')}
                </span>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Page URL</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm bg-muted px-3 py-2 rounded-md break-all">
                    {selectedIssue.pageUrl}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(selectedIssue.pageUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {selectedIssue.issueDetails && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Issue Details</Label>
                  <div className="text-sm bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded-md">
                    {selectedIssue.issueDetails}
                  </div>
                </div>
              )}

              {selectedIssue.suggestedFix && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Suggested Fix</Label>
                  <div className="text-sm bg-green-50 border border-green-200 text-green-800 px-3 py-2 rounded-md">
                    {selectedIssue.suggestedFix}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedIssue(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (selectedIssue) {
                  // Migrated from seo.health.resolveIssue → seoAudit.ignoreIssue.
                  // The canonical audit treats "resolved" as "ignored" — same effect:
                  // issue stops counting toward the dashboard until re-surfaced.
                  ignoreIssueMut.mutate({ issueId: String(selectedIssue.id) });
                  setSelectedIssue(null);
                }
              }}
              disabled={ignoreIssueMut.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark as Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ===== ENHANCED AI Fix Approval Dialog ===== */}
      <Dialog open={aiFixApprovalOpen} onOpenChange={(open) => {
        if (!open && !aiFixApplying) {
          setAiFixApprovalOpen(false);
          setAiFixResults([]);
          setAiFixCurrentIndex(0);
          setAiFixContextUrls({});
          setAiFixImageResults({});
          setAiFixSelectedImages({});
          setAiFixImageKeywords({});
          setAiFixImageUrls({});
        }
      }}>
        <DialogContent className="max-w-7xl sm:max-w-7xl w-[98vw] max-h-[92vh] p-0 overflow-hidden flex flex-col">
          <DialogTitle className="sr-only">AI Fix Approval</DialogTitle>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-violet-50 to-indigo-50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-violet-100">
                <Wand2 className="h-5 w-5 text-violet-700" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">AI Fix Approval</h2>
                <p className="text-sm text-muted-foreground">Review, edit, and approve AI-generated fixes before applying</p>
              </div>
            </div>
            {aiFixResults.length > 0 && (
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {aiFixResults.filter(r => r.status === 'approved' || r.status === 'applied').length} Approved
                </span>
                <span className="flex items-center gap-1.5 text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-200">
                  <XCircle className="h-3.5 w-3.5" />
                  {aiFixResults.filter(r => r.status === 'rejected').length} Rejected
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  {aiFixResults.filter(r => r.status === 'pending').length} Pending
                </span>
              </div>
            )}
          </div>

          {aiFixGenerating ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-violet-600" />
              </div>
              <p className="text-base font-medium">Generating AI fixes...</p>
              <p className="text-sm text-muted-foreground">Analyzing {Math.min(selectedHealthIssues.size, 20)} issues — this may take 30-60 seconds</p>
            </div>
          ) : aiFixResults.length > 0 ? (
            <div className="flex flex-1 overflow-hidden">
              {/* Left sidebar: issue list */}
              <div className="w-72 shrink-0 border-r overflow-y-auto bg-muted/30">
                <div className="p-3 border-b">
                  <Progress 
                    value={((aiFixResults.filter(r => r.status !== 'pending' && r.status !== 'failed').length) / aiFixResults.length) * 100} 
                    className="h-1.5"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {aiFixResults.filter(r => r.status !== 'pending' && r.status !== 'failed').length} of {aiFixResults.length} reviewed
                  </p>
                </div>
                <div className="p-2 space-y-1">
                  {aiFixResults.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => setAiFixCurrentIndex(i)}
                      className={`w-full text-left px-3 py-2.5 rounded-md transition-colors text-sm ${
                        i === aiFixCurrentIndex 
                          ? 'bg-violet-100 border border-violet-200 text-violet-900' 
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          r.status === 'approved' || r.status === 'applied' ? 'bg-green-500' :
                          r.status === 'rejected' ? 'bg-red-400' :
                          r.status === 'failed' ? 'bg-[#9BA3B0]' :
                          'bg-amber-400'
                        }`} />
                        <span className="truncate font-medium text-xs">{r.issue?.entityTitle || 'Unknown'}</span>
                      </div>
                      <span className="text-xs text-muted-foreground ml-4">{r.issue?.type?.replace(/_/g, ' ')}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right: current fix detail */}
              <div className="flex-1 overflow-y-auto">
                {aiFixResults[aiFixCurrentIndex] && (() => {
                  const cur = aiFixResults[aiFixCurrentIndex];
                  const issue = cur.issue;
                  const issueId = issue?.id || String(aiFixCurrentIndex);
                  const isImageIssue = issue?.type === 'missing_featured_image' || issue?.type === 'missing_alt_text';
                  const contextUrl = aiFixContextUrls[issueId] || '';
                  const imageKeyword = aiFixImageKeywords[issueId] || issue?.entityTitle || '';
                  const imageUrl = aiFixImageUrls[issueId] || '';
                  const imageResults = aiFixImageResults[issueId] || [];
                  const selectedImg = aiFixSelectedImages[issueId];
                  const isSearchingImg = aiFixImageSearching[issueId] || false;

                  return (
                    <div className="p-6 space-y-5">
                      {/* Issue header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={
                              issue?.severity === 'critical' ? 'bg-red-100 text-red-800 border-red-200' :
                              issue?.severity === 'warning' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                              'bg-blue-100 text-blue-800 border-blue-200'
                            }>
                              {issue?.severity?.toUpperCase()}
                            </Badge>
                            <Badge variant="outline">{issue?.type?.replace(/_/g, ' ')}</Badge>
                            <Badge variant="outline" className="text-xs">{issue?.entityType}</Badge>
                            {cur.status !== 'pending' && (
                              <Badge className={
                                cur.status === 'approved' || cur.status === 'applied' ? 'bg-green-100 text-green-800' :
                                cur.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                'bg-[#F0F2F5] text-gray-800'
                              }>
                                {cur.status === 'applied' ? '✓ Applied' : cur.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
                              </Badge>
                            )}
                          </div>
                          <h3 className="text-xl font-semibold">{issue?.entityTitle}</h3>
                          <p className="text-sm text-muted-foreground">{issue?.recommendation || issue?.description}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={aiFixCurrentIndex === 0}
                            onClick={() => setAiFixCurrentIndex(prev => prev - 1)}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={aiFixCurrentIndex >= aiFixResults.length - 1}
                            onClick={() => setAiFixCurrentIndex(prev => prev + 1)}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <Separator />

                      {/* Diff: Current vs Suggested */}
                      {(issue?.currentValue || cur.suggestedFix) && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Current Value</Label>
                            <div className="bg-red-50 border border-red-200 rounded-md p-3 min-h-[60px]">
                              {issue?.currentValue ? (
                                <p className="text-sm font-mono text-red-800 whitespace-pre-wrap break-words">{issue.currentValue}</p>
                              ) : (
                                <p className="text-sm text-muted-foreground italic">Empty / Not set</p>
                              )}
                            </div>
                            {issue?.currentValue && (
                              <p className="text-xs text-muted-foreground mt-1">{issue.currentValue.length} characters</p>
                            )}
                          </div>
                          <div>
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                              AI Suggested Fix <span className="text-violet-600 normal-case font-normal text-xs">(directly editable)</span>
                            </Label>
                            {cur.status === 'failed' ? (
                              <div className="bg-red-50 border border-red-200 rounded-md p-3 min-h-[60px]">
                                <p className="text-sm text-red-700">Could not generate a fix: {cur.error || 'Unknown error'}</p>
                              </div>
                            ) : (issue?.field === 'seoDescription' || issue?.field === 'bio' || issue?.field === 'description' || issue?.type?.includes('description')) ? (
                              <Textarea
                                value={cur.editedFix}
                                onChange={(e) => handleUpdateFixValue(aiFixCurrentIndex, e.target.value)}
                                className="font-mono text-sm bg-green-50 border-green-300 focus-visible:ring-green-400 text-green-900 placeholder:text-muted-foreground min-h-[60px]"
                                rows={4}
                                placeholder="No suggestion generated — type your fix here..."
                              />
                            ) : (
                              <Input
                                value={cur.editedFix}
                                onChange={(e) => handleUpdateFixValue(aiFixCurrentIndex, e.target.value)}
                                className="font-mono text-sm bg-green-50 border-green-300 focus-visible:ring-green-400 text-green-900 placeholder:text-muted-foreground"
                                placeholder="No suggestion generated — type your fix here..."
                              />
                            )}
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-xs text-muted-foreground">{cur.editedFix.length} characters</p>
                              {issue?.type?.includes('meta_description') && (
                                <p className={`text-xs ${cur.editedFix.length > 160 ? 'text-red-500' : cur.editedFix.length >= 150 ? 'text-green-600' : 'text-muted-foreground'}`}>
                                  {cur.editedFix.length >= 150 && cur.editedFix.length <= 160 ? '✓ Optimal length' : 'Target: 150-160 chars'}
                                </p>
                              )}
                              {issue?.type?.includes('meta_title') && (
                                <p className={`text-xs ${cur.editedFix.length > 60 ? 'text-red-500' : cur.editedFix.length >= 50 ? 'text-green-600' : 'text-muted-foreground'}`}>
                                  {cur.editedFix.length >= 50 && cur.editedFix.length <= 60 ? '✓ Optimal length' : 'Target: 50-60 chars'}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Context URL input (for re-generating with better info) */}
                      <div className="bg-muted/50 rounded-md p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          <Label className="text-sm font-medium">Provide Context for Better AI Results</Label>
                          <Badge variant="outline" className="text-xs">Optional</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">If the AI suggestion is incorrect, provide a LinkedIn profile, website URL, or descriptive text so the AI can generate a more accurate fix.</p>
                        <div className="flex gap-2">
                          <Input
                            value={contextUrl}
                            onChange={(e) => setAiFixContextUrls(prev => ({ ...prev, [issueId]: e.target.value }))}
                            placeholder="https://linkedin.com/in/person-name or https://website.com"
                            className="flex-1 text-sm"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              bulkRegenerateWithContextMut.mutate({ 
                                issueId: issueId, 
                                contextUrl: contextUrl || undefined,
                                _index: aiFixCurrentIndex 
                              } as any);
                            }}
                            disabled={bulkRegenerateWithContextMut.isPending}
                          >
                            {bulkRegenerateWithContextMut.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                            <span className="ml-1.5">Regenerate</span>
                          </Button>
                        </div>
                      </div>

                      {/* Image search section (for image-related issues) */}
                      {isImageIssue && (
                        <div className="border rounded-md p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <Label className="text-sm font-medium">Image Search</Label>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1 block">Search by keyword</Label>
                              <div className="flex gap-2">
                                <Input
                                  value={imageKeyword}
                                  onChange={(e) => setAiFixImageKeywords(prev => ({ ...prev, [issueId]: e.target.value }))}
                                  placeholder="e.g. Mostafa Ashour tech CEO"
                                  className="text-sm"
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleBulkImageSearch(issueId, imageKeyword)}
                                  disabled={isSearchingImg}
                                >
                                  {isSearchingImg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                </Button>
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1 block">Or paste direct image URL</Label>
                              <div className="flex gap-2">
                                <Input
                                  value={imageUrl}
                                  onChange={(e) => setAiFixImageUrls(prev => ({ ...prev, [issueId]: e.target.value }))}
                                  placeholder="https://example.com/image.jpg"
                                  className="text-sm"
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleBulkImageSearch(issueId, imageKeyword, imageUrl)}
                                  disabled={!imageUrl || isSearchingImg}
                                >
                                  {isSearchingImg ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* Image grid */}
                          {imageResults.length > 0 && (
                            <div>
                              <Label className="text-xs text-muted-foreground mb-2 block">Select an image:</Label>
                              <div className="grid grid-cols-4 gap-2">
                                {imageResults.map((img: any, imgIdx: number) => (
                                  img.isSearchLink ? (
                                    // Google Images search link tile
                                    <a
                                      key={imgIdx}
                                      href={img.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="relative aspect-square rounded-md overflow-hidden border-2 border-dashed border-blue-300 bg-blue-50 flex flex-col items-center justify-center gap-1 hover:bg-blue-100 transition-colors text-center p-1"
                                    >
                                      <Search className="h-5 w-5 text-blue-500" />
                                      <span className="text-xs text-blue-700 font-medium leading-tight line-clamp-2">{img.title}</span>
                                      <span className="text-xs text-blue-400">Google Images</span>
                                    </a>
                                  ) : (
                                    // Real image tile (AI generated or direct URL)
                                    <button
                                      key={imgIdx}
                                      onClick={() => handleSelectBulkImage(issueId, img, aiFixCurrentIndex)}
                                      className={`relative aspect-square rounded-md overflow-hidden border-2 transition-all hover:opacity-90 ${
                                        selectedImg?.url === img.url ? 'border-violet-500 ring-2 ring-violet-300' : 'border-transparent hover:border-[#C8CDD6]'
                                      }`}
                                    >
                                      {!!img.isGenerated && (
                                        <div className="absolute top-1 left-1 z-10 bg-violet-600 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                          <Wand2 className="h-2.5 w-2.5" /><span>AI</span>
                                        </div>
                                      )}
                                      <img
                                        src={img.thumbnail || img.url}
                                        alt={img.title || 'Image result'}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23f3f4f6" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="12">No img</text></svg>'; }}
                                      />
                                      {selectedImg?.url === img.url && (
                                        <div className="absolute inset-0 bg-violet-600/20 flex items-center justify-center">
                                          <CheckCircle2 className="h-6 w-6 text-violet-700" />
                                        </div>
                                      )}
                                    </button>
                                  )
                                ))}
                              </div>
                              {selectedImg && (
                                <div className="mt-3 p-3 bg-violet-50 border border-violet-200 rounded-md space-y-2">
                                  <p className="text-xs font-medium text-violet-800">Selected image — auto-populated metadata:</p>
                                  <div className="grid grid-cols-3 gap-2">
                                    <div>
                                      <Label className="text-xs text-muted-foreground">Alt Text</Label>
                                      <Input value={selectedImg.altText || imageKeyword} className="text-xs mt-0.5 h-7" readOnly />
                                    </div>
                                    <div>
                                      <Label className="text-xs text-muted-foreground">Description</Label>
                                      <Input value={selectedImg.description || selectedImg.title || ''} className="text-xs mt-0.5 h-7" readOnly />
                                    </div>
                                    <div>
                                      <Label className="text-xs text-muted-foreground">Filename</Label>
                                      <Input value={selectedImg.filename || (imageKeyword.toLowerCase().replace(/\s+/g, '-') + '.jpg')} className="text-xs mt-0.5 h-7" readOnly />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* AI Suggested Fix is now directly editable inline in the diff section above */}

                      {/* Approve / Reject */}
                      {cur.status === 'pending' && (
                        <div className="flex items-center gap-3 pt-2">
                          <Button
                            onClick={handleApproveCurrentFix}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            size="lg"
                          >
                            <CheckCircle2 className="h-5 w-5 mr-2" />
                            Approve Fix
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleRejectCurrentFix}
                            className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                            size="lg"
                          >
                            <XCircle className="h-5 w-5 mr-2" />
                            Reject
                          </Button>
                        </div>
                      )}
                      {(cur.status === 'approved' || cur.status === 'applied') && (
                        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <span className="text-sm text-green-700 font-medium">Fix approved — will be applied when you click "Apply Approved Fixes"</span>
                          <Button variant="ghost" size="sm" className="ml-auto text-red-500" onClick={() => {
                            setAiFixResults(prev => prev.map((r, i) => i === aiFixCurrentIndex ? { ...r, status: 'pending' } : r));
                          }}>Undo</Button>
                        </div>
                      )}
                      {cur.status === 'rejected' && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                          <XCircle className="h-5 w-5 text-red-500" />
                          <span className="text-sm text-red-700 font-medium">Fix rejected</span>
                          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => {
                            setAiFixResults(prev => prev.map((r, i) => i === aiFixCurrentIndex ? { ...r, status: 'pending' } : r));
                          }}>Undo</Button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : null}

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30 shrink-0">
            <Button
              variant="outline"
              onClick={() => {
                setAiFixApprovalOpen(false);
                setAiFixResults([]);
              }}
              disabled={aiFixApplying}
            >
              Cancel
            </Button>
            <div className="flex items-center gap-3">
              {aiFixResults.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {aiFixResults.filter(r => r.status === 'approved').length} fix{aiFixResults.filter(r => r.status === 'approved').length !== 1 ? 'es' : ''} ready to apply
                </p>
              )}
              <Button
                onClick={handleApplyApprovedFixes}
                disabled={aiFixApplying || aiFixResults.filter(r => r.status === 'approved').length === 0}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white"
                size="lg"
              >
                {aiFixApplying ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Apply {aiFixResults.filter(r => r.status === 'approved').length} Approved Fix{aiFixResults.filter(r => r.status === 'approved').length !== 1 ? 'es' : ''}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== ENHANCED Single Issue AI Fix Dialog ===== */}
      <Dialog open={singleFixDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setSingleFixDialogOpen(false);
          setSingleFixIssue(null);
          setSingleFixValue('');
          setSingleFixContextUrl('');
          setSingleFixImageUrl('');
          setSingleFixImageResults([]);
          setSingleFixSelectedImage(null);
          setSingleFixAltText('');
          setSingleFixDescription('');
          setSingleFixFilename('');
        }
      }}>
        <DialogContent className="max-w-5xl sm:max-w-5xl w-[95vw] max-h-[90vh] p-0 overflow-hidden flex flex-col">
          <DialogTitle className="sr-only">Fix SEO Issue</DialogTitle>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-violet-50 to-indigo-50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-violet-100">
                <Wand2 className="h-5 w-5 text-violet-700" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Fix SEO Issue</h2>
                {singleFixIssue && (
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={
                      singleFixIssue.severity === 'critical' ? 'bg-red-100 text-red-800' :
                      singleFixIssue.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    } variant="outline">
                      {singleFixIssue.severity?.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="text-xs">{singleFixIssue.type?.replace(/_/g, ' ')}</Badge>
                    <Badge variant="outline" className="text-xs">{singleFixIssue.entityType}</Badge>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {singleFixIssue && (
              <div className="p-6 space-y-5">
                {/* Entity info */}
                <div>
                  <h3 className="text-xl font-semibold">{singleFixIssue.entityTitle}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{singleFixIssue.recommendation || singleFixIssue.description}</p>
                </div>

                <Separator />

                {/* Diff: Current vs New (New Value is directly editable) */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Current Value</Label>
                    <div className="bg-red-50 border border-red-200 rounded-md p-3 min-h-[80px]">
                      {singleFixIssue.currentValue ? (
                        <p className="text-sm font-mono text-red-800 whitespace-pre-wrap break-words">{singleFixIssue.currentValue}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Empty / Not set</p>
                      )}
                    </div>
                    {singleFixIssue.currentValue && (
                      <p className="text-xs text-muted-foreground mt-1">{singleFixIssue.currentValue.length} characters</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                      New Value <span className="text-violet-600 normal-case font-normal text-xs">(directly editable)</span>
                    </Label>
                    {(singleFixIssue.field === 'seoDescription' || singleFixIssue.field === 'bio' || singleFixIssue.field === 'description' || singleFixIssue.type?.includes('description')) ? (
                      <Textarea
                        value={singleFixValue}
                        onChange={(e) => setSingleFixValue(e.target.value)}
                        placeholder="Enter the new value or generate with AI above..."
                        className="font-mono text-sm bg-green-50 border-green-300 focus-visible:ring-green-400 text-green-900 placeholder:text-muted-foreground min-h-[80px]"
                        rows={4}
                      />
                    ) : (
                      <Input
                        value={singleFixValue}
                        onChange={(e) => setSingleFixValue(e.target.value)}
                        placeholder="Enter the new value or generate with AI above..."
                        className="font-mono text-sm bg-green-50 border-green-300 focus-visible:ring-green-400 text-green-900 placeholder:text-muted-foreground"
                      />
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-muted-foreground">{singleFixValue.length} characters</p>
                      {singleFixIssue.type?.includes('meta_description') && (
                        <p className={`text-xs ${
                          singleFixValue.length > 160 ? 'text-red-500' :
                          singleFixValue.length >= 150 ? 'text-green-600' :
                          'text-muted-foreground'
                        }`}>
                          {singleFixValue.length >= 150 && singleFixValue.length <= 160 ? '✓ Optimal length' : 'Target: 150-160 chars'}
                        </p>
                      )}
                      {singleFixIssue.type?.includes('meta_title') && (
                        <p className={`text-xs ${
                          singleFixValue.length > 60 ? 'text-red-500' :
                          singleFixValue.length >= 50 ? 'text-green-600' :
                          'text-muted-foreground'
                        }`}>
                          {singleFixValue.length >= 50 && singleFixValue.length <= 60 ? '✓ Optimal length' : 'Target: 50-60 chars'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Context URL */}
                <div className="bg-muted/50 rounded-md p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Context for AI (Optional)</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">Provide a LinkedIn profile, website URL, or descriptive text to help the AI generate a more accurate fix.</p>
                  <div className="flex gap-2">
                    <Input
                      value={singleFixContextUrl}
                      onChange={(e) => setSingleFixContextUrl(e.target.value)}
                      placeholder="https://linkedin.com/in/person-name or https://website.com"
                      className="flex-1 text-sm"
                    />
                    <Button
                      variant="outline"
                      onClick={handleGenerateSingleAiFix}
                      disabled={singleFixGenerating}
                    >
                      {singleFixGenerating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Wand2 className="h-4 w-4" />
                      )}
                      <span className="ml-1.5">{singleFixContextUrl ? 'Regenerate with Context' : 'Generate with AI'}</span>
                    </Button>
                  </div>
                </div>

                {/* Image search (for image issues) */}
                {(singleFixIssue.type === 'missing_featured_image' || singleFixIssue.type === 'missing_alt_text') && (
                  <div className="border rounded-md p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm font-medium">Image Search</Label>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Search by keyword</Label>
                        <div className="flex gap-2">
                          <Input
                            value={singleFixImageKeyword}
                            onChange={(e) => setSingleFixImageKeyword(e.target.value)}
                            placeholder={singleFixIssue.entityTitle || 'Search images...'}
                            className="text-sm"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleSingleImageSearch}
                            disabled={singleFixImageSearching}
                          >
                            {singleFixImageSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Or paste direct image URL</Label>
                        <div className="flex gap-2">
                          <Input
                            value={singleFixImageUrl}
                            onChange={(e) => setSingleFixImageUrl(e.target.value)}
                            placeholder="https://example.com/image.jpg"
                            className="text-sm"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleSingleImageSearch}
                            disabled={!singleFixImageUrl || singleFixImageSearching}
                          >
                            {singleFixImageSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {singleFixImageResults.length > 0 && (
                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">Select an image:</Label>
                        <div className="grid grid-cols-4 gap-2">
                          {singleFixImageResults.map((img: any, imgIdx: number) => (
                            img.isSearchLink ? (
                              // Google Images search link tile
                              <a
                                key={imgIdx}
                                href={img.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="relative aspect-square rounded-md overflow-hidden border-2 border-dashed border-blue-300 bg-blue-50 flex flex-col items-center justify-center gap-1 hover:bg-blue-100 transition-colors text-center p-1"
                              >
                                <Search className="h-5 w-5 text-blue-500" />
                                <span className="text-xs text-blue-700 font-medium leading-tight line-clamp-2">{img.title}</span>
                                <span className="text-xs text-blue-400">Google Images</span>
                              </a>
                            ) : (
                              // Real image tile (AI generated or direct URL)
                              <button
                                key={imgIdx}
                                onClick={() => handleSelectSingleImage(img)}
                                className={`relative aspect-square rounded-md overflow-hidden border-2 transition-all hover:opacity-90 ${
                                  singleFixSelectedImage?.url === img.url ? 'border-violet-500 ring-2 ring-violet-300' : 'border-transparent hover:border-[#C8CDD6]'
                                }`}
                              >
                                {!!img.isGenerated && (
                                  <div className="absolute top-1 left-1 z-10 bg-violet-600 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                    <Wand2 className="h-2.5 w-2.5" /><span>AI</span>
                                  </div>
                                )}
                                <img
                                  src={img.thumbnail || img.url}
                                  alt={img.title || 'Image result'}
                                  className="w-full h-full object-cover"
                                  onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23f3f4f6" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="12">No img</text></svg>'; }}
                                />
                                {singleFixSelectedImage?.url === img.url && (
                                  <div className="absolute inset-0 bg-violet-600/20 flex items-center justify-center">
                                    <CheckCircle2 className="h-6 w-6 text-violet-700" />
                                  </div>
                                )}
                              </button>
                            )
                          ))}
                        </div>
                        {singleFixSelectedImage && (
                          <div className="mt-3 p-3 bg-violet-50 border border-violet-200 rounded-md space-y-2">
                            <p className="text-xs font-medium text-violet-800">Selected image — auto-populated metadata:</p>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <Label className="text-xs text-muted-foreground">Alt Text</Label>
                                <Input
                                  value={singleFixAltText}
                                  onChange={(e) => setSingleFixAltText(e.target.value)}
                                  className="text-xs mt-0.5 h-7"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Description</Label>
                                <Input
                                  value={singleFixDescription}
                                  onChange={(e) => setSingleFixDescription(e.target.value)}
                                  className="text-xs mt-0.5 h-7"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Filename</Label>
                                <Input
                                  value={singleFixFilename}
                                  onChange={(e) => setSingleFixFilename(e.target.value)}
                                  className="text-xs mt-0.5 h-7"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* New Value is now directly editable inline in the diff section above */}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30 shrink-0">
            <Button
              variant="outline"
              onClick={() => setSingleFixDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApplySingleFix}
              disabled={!singleFixValue || applyFixMut.isPending}
              size="lg"
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white"
            >
              {applyFixMut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Apply Fix
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
