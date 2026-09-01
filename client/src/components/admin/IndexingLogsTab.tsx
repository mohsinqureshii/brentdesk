/**
 * Indexing Logs Tab
 * Full-featured log viewer for search engine indexing notifications.
 * Used inside the SEO Manager page.
 */

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Globe,
  Zap,
  Search,
  Filter,
  Key,
  Trash2,
  Upload,
  ExternalLink,
  AlertCircle,
  Info,
} from "lucide-react";

const METHOD_CONFIG: Record<string, { label: string; icon: string; badgeClass: string }> = {
  sitemap_ping: { label: "Sitemap Ping", icon: "🗺️", badgeClass: "bg-blue-50 text-blue-700 border-blue-200" },
  indexnow: { label: "IndexNow", icon: "⚡", badgeClass: "bg-purple-50 text-purple-700 border-purple-200" },
  google_indexing_api: { label: "Google API", icon: "🔍", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
};

const TRIGGER_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  publish: { label: "Published", badgeClass: "bg-[#F0F7FF] text-[#0066FF] border-[#C7DCFF]" },
  transition: { label: "Workflow", badgeClass: "bg-sky-50 text-sky-700 border-sky-200" },
  bulk_publish: { label: "Bulk", badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  scheduled: { label: "Scheduled", badgeClass: "bg-orange-50 text-orange-700 border-orange-200" },
  manual: { label: "Manual", badgeClass: "bg-[#F7F8FA] text-[#1A1F36] border-[#E0E3E8]" },
};

const PAGE_SIZE = 20;

export default function IndexingLogsTab() {
  const [page, setPage] = useState(0);
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showGoogleConfig, setShowGoogleConfig] = useState(false);
  const [serviceAccountJson, setServiceAccountJson] = useState("");
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = trpc.admin.indexing.getStats.useQuery();
  const googleApiStatus = trpc.admin.indexing.getGoogleApiStatus.useQuery();

  const saveGoogleAccount = trpc.admin.indexing.saveGoogleServiceAccount.useMutation({
    onSuccess: (data) => {
      toast({ title: "Google Indexing API configured", description: `Connected as ${data.clientEmail}` });
      setShowGoogleConfig(false);
      setServiceAccountJson("");
      googleApiStatus.refetch();
      refetchStats();
    },
    onError: (err) => toast({ title: "Configuration failed", description: err.message, variant: "destructive" }),
  });

  const removeGoogleAccount = trpc.admin.indexing.removeGoogleServiceAccount.useMutation({
    onSuccess: () => {
      toast({ title: "Google Indexing API disconnected" });
      googleApiStatus.refetch();
      refetchStats();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setServiceAccountJson(text);
    };
    reader.readAsText(file);
  }, []);

  const { data: logsData, isLoading: logsLoading, refetch, isRefetching } = trpc.admin.indexing.getLogs.useQuery({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    method: methodFilter !== "all" ? methodFilter as any : undefined,
    successOnly: statusFilter === "success" ? true : statusFilter === "failed" ? false : undefined,
  });

  const totalPages = logsData ? Math.ceil(logsData.total / PAGE_SIZE) : 0;

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))
        ) : stats ? (
          <>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-[#697386] uppercase tracking-wider">Total Pings (24h)</p>
                <p className="text-2xl font-bold text-[#1A1F36] mt-1">{stats.last24h.total}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-medium ${stats.last24h.successRate >= 80 ? "text-[#0066FF]" : "text-amber-600"}`}>
                    {stats.last24h.successRate}% success
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-[#697386] uppercase tracking-wider">Total Pings (7d)</p>
                <p className="text-2xl font-bold text-[#1A1F36] mt-1">{stats.last7d.total}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-medium ${stats.last7d.successRate >= 80 ? "text-[#0066FF]" : "text-amber-600"}`}>
                    {stats.last7d.successRate}% success
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-[#697386] uppercase tracking-wider">Google Indexing API</p>
                <p className="text-lg font-bold text-[#1A1F36] mt-1">
                  {stats.googleIndexingApiConfigured ? (
                    <span className="text-[#0066FF] flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" /> Active
                    </span>
                  ) : (
                    <span className="text-amber-600 flex items-center gap-1">
                      <XCircle className="h-4 w-4" /> Not configured
                    </span>
                  )}
                </p>
                <p className="text-xs text-[#697386] mt-1">
                  {stats.googleIndexingApiConfigured ? "Service account connected" : "Add service account JSON"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-[#697386] uppercase tracking-wider">All Time</p>
                <p className="text-2xl font-bold text-[#1A1F36] mt-1">{stats.allTime.total}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-[#0066FF] font-medium">{stats.allTime.successes} ok</span>
                  <span className="text-xs text-red-500 font-medium">{stats.allTime.total - stats.allTime.successes} failed</span>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* Google Indexing API Configuration */}
      <Card className={showGoogleConfig ? "border-amber-300 shadow-md" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-md ${googleApiStatus.data?.configured ? "bg-[#EBF3FF]" : "bg-amber-100"}`}>
                <Key className={`h-5 w-5 ${googleApiStatus.data?.configured ? "text-[#0066FF]" : "text-amber-600"}`} />
              </div>
              <div>
                <CardTitle className="text-base">Google Indexing API</CardTitle>
                <CardDescription>
                  {googleApiStatus.data?.configured
                    ? `Connected as ${googleApiStatus.data.clientEmail}`
                    : "Configure service account to enable direct URL submission to Google"}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {googleApiStatus.data?.configured ? (
                <>
                  <Badge className="bg-[#F0F7FF] text-[#0066FF] border-[#C7DCFF]" variant="outline">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => removeGoogleAccount.mutate()}
                    disabled={removeGoogleAccount.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowGoogleConfig(!showGoogleConfig)}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  {showGoogleConfig ? "Cancel" : "Configure"}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        {showGoogleConfig && !googleApiStatus.data?.configured && (
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800 space-y-2">
                  <p className="font-semibold">How to set up Google Indexing API:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener" className="underline font-medium">Google Cloud Console</a> and create a project</li>
                    <li>Enable the <strong>Web Search Indexing API</strong> in APIs & Services</li>
                    <li>Go to <strong>IAM & Admin → Service Accounts</strong> → Create Service Account</li>
                    <li>Create a <strong>JSON key</strong> for the service account (Keys tab → Add Key → JSON)</li>
                    <li>In <a href="https://search.google.com/search-console" target="_blank" rel="noopener" className="underline font-medium">Google Search Console</a>, add the service account email as <strong>Owner</strong></li>
                    <li>Upload or paste the JSON key below</li>
                  </ol>
                  <a
                    href="https://developers.google.com/search/apis/indexing-api/v3/quickstart"
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900"
                  >
                    <ExternalLink className="h-3 w-3" /> View full documentation
                  </a>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[#1A1F36] mb-2 block">Service Account JSON</label>
              <div className="flex items-center gap-2 mb-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-[#F0F2F5] hover:bg-[#E0E3E8] rounded-md border cursor-pointer transition-colors">
                    <Upload className="h-3 w-3" /> Upload JSON file
                  </span>
                </label>
                <span className="text-xs text-[#9BA3B0]">or paste below</span>
              </div>
              <Textarea
                value={serviceAccountJson}
                onChange={(e) => setServiceAccountJson(e.target.value)}
                placeholder='{\n  "type": "service_account",\n  "project_id": "your-project",\n  "private_key_id": "...",\n  "private_key": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",\n  "client_email": "your-sa@your-project.iam.gserviceaccount.com",\n  ...\n}'
                className="font-mono text-xs h-40"
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-[#697386] flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Credentials are stored securely and never exposed to the frontend
              </p>
              <Button
                onClick={() => saveGoogleAccount.mutate({ serviceAccountJson })}
                disabled={!serviceAccountJson.trim() || saveGoogleAccount.isPending}
                size="sm"
              >
                {saveGoogleAccount.isPending ? "Saving..." : "Save & Activate"}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Method Breakdown */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(["sitemap_ping", "indexnow", "google_indexing_api"] as const).map((method) => {
            const config = METHOD_CONFIG[method];
            const methodStat = stats.byMethod[method];
            const rate = methodStat.total > 0 ? Math.round((methodStat.successes / methodStat.total) * 100) : 0;
            return (
              <Card key={method}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{config.icon}</span>
                      <span className="text-sm font-semibold text-[#1A1F36]">{config.label}</span>
                    </div>
                    {methodStat.total > 0 && (
                      <Badge variant="outline" className={rate >= 80 ? "border-emerald-300 text-[#0066FF]" : "border-amber-300 text-amber-700"}>
                        {rate}%
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-xs text-[#697386]">{methodStat.total} total (7d)</span>
                    <span className="text-xs text-[#0066FF]">{methodStat.successes} ok</span>
                    {methodStat.total - methodStat.successes > 0 && (
                      <span className="text-xs text-red-500">{methodStat.total - methodStat.successes} failed</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Indexing Notification Logs</CardTitle>
              <CardDescription>Detailed log of all search engine notifications</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
          {/* Filters */}
          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-[#9BA3B0]" />
              <Select value={methodFilter} onValueChange={(v) => { setMethodFilter(v); setPage(0); }}>
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue placeholder="All methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All methods</SelectItem>
                  <SelectItem value="sitemap_ping">Sitemap Ping</SelectItem>
                  <SelectItem value="indexnow">IndexNow</SelectItem>
                  <SelectItem value="google_indexing_api">Google API</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="success">Success only</SelectItem>
                <SelectItem value="failed">Failed only</SelectItem>
              </SelectContent>
            </Select>
            {logsData && (
              <span className="text-xs text-[#697386] ml-auto">
                {logsData.total} total entries
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : logsData && logsData.logs.length > 0 ? (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Status</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Article</TableHead>
                      <TableHead>Trigger</TableHead>
                      <TableHead>HTTP</TableHead>
                      <TableHead className="max-w-[200px]">Message</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsData.logs.map((log) => {
                      const methodConfig = METHOD_CONFIG[log.method] || { label: log.method, icon: "📡", badgeClass: "bg-[#F7F8FA] text-[#1A1F36]" };
                      const triggerConfig = TRIGGER_CONFIG[log.trigger || "publish"] || { label: log.trigger, badgeClass: "bg-[#F7F8FA] text-[#1A1F36]" };
                      return (
                        <TableRow key={log.id}>
                          <TableCell>
                            {log.success ? (
                              <CheckCircle2 className="h-4 w-4 text-[#0066FF]" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-400" />
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${methodConfig.badgeClass}`}>
                              {methodConfig.icon} {methodConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <span className="text-sm truncate block" title={log.articleTitle || log.url}>
                              {log.articleTitle || "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${triggerConfig.badgeClass}`}>
                              {triggerConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {log.statusCode ? (
                              <span className={`text-xs font-mono ${log.statusCode < 300 ? "text-[#0066FF]" : "text-red-500"}`}>
                                {log.statusCode}
                              </span>
                            ) : (
                              <span className="text-xs text-[#9BA3B0]">—</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <span className="text-xs text-[#697386] truncate block" title={log.message || ""}>
                              {log.message
                                ? log.message.length > 50
                                  ? log.message.substring(0, 50) + "…"
                                  : log.message
                                : "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-[#697386] whitespace-nowrap">
                              {new Date(log.createdAt).toLocaleString()}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-[#697386]">
                    Page {page + 1} of {totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-[#697386]">
              <Search className="h-10 w-10 mx-auto mb-3 text-[#C8CDD6]" />
              <p className="text-sm font-medium">No indexing logs found</p>
              <p className="text-xs mt-1">
                {methodFilter !== "all" || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Logs will appear when articles are published"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
