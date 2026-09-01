/**
 * Search Analytics Dashboard
 * Shows what users are searching for, zero-result queries, and daily trends
 */
import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  TrendingUp,
  AlertCircle,
  Users,
  BarChart3,
  Clock,
  Filter,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";

const ENTITY_COLORS: Record<string, string> = {
  all: "#10b981",
  article: "#3b82f6",
  company: "#8b5cf6",
  person: "#f97316",
  investor: "#eab308",
  job: "#06b6d4",
  event: "#ec4899",
  accelerator: "#14b8a6",
};

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-24 mt-1" />
            ) : (
              <p className="text-2xl font-bold mt-1">{value}</p>
            )}
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className="h-12 w-12 rounded-full bg-[#F0F7FF] flex items-center justify-center">
            <Icon className="h-6 w-6 text-[#0066FF]" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Default export: standalone admin page at /admin/search-analytics.
 * Kept for backwards-compat with bookmarks; canonical home is now
 * SEO Manager → Indexing → Analytics.
 */
export default function SearchAnalytics() {
  return (
    <AdminLayout>
      <div className="p-6">
        <SearchAnalyticsPanel />
      </div>
    </AdminLayout>
  );
}

/**
 * Layout-free panel for embedding inside other admin surfaces (notably
 * SEO Manager → Indexing → Analytics). All state + queries live here so
 * the standalone page and the embedded panel share one impl.
 */
export function SearchAnalyticsPanel() {
  const [days, setDays] = useState(30);
  const [recentSearch, setRecentSearch] = useState("");
  const [recentEntityType, setRecentEntityType] = useState("all");
  const [recentPage, setRecentPage] = useState(1);

  const { data: summary, isLoading: summaryLoading } = trpc.admin.searchAnalytics.getSummary.useQuery({ days });

  const { data: recent, isLoading: recentLoading } = trpc.admin.searchAnalytics.getRecentSearches.useQuery({
    page: recentPage,
    limit: 50,
    search: recentSearch || undefined,
    entityType: recentEntityType !== "all" ? recentEntityType : undefined,
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#1A1F36]">Search Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Understand what your audience is looking for
            </p>
          </div>
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Searches"
            value={summaryLoading ? "—" : (summary?.totalSearches ?? 0).toLocaleString()}
            icon={Search}
            description={`Last ${days} days`}
            loading={summaryLoading}
          />
          <StatCard
            title="Unique Searchers"
            value={summaryLoading ? "—" : (summary?.uniqueSearchers ?? 0).toLocaleString()}
            icon={Users}
            description="By IP address"
            loading={summaryLoading}
          />
          <StatCard
            title="Zero-Result Queries"
            value={summaryLoading ? "—" : (summary?.zeroResultQueries?.length ?? 0).toLocaleString()}
            icon={AlertCircle}
            description="Content gaps"
            loading={summaryLoading}
          />
          <StatCard
            title="Avg Daily Searches"
            value={
              summaryLoading
                ? "—"
                : summary?.dailySearches?.length
                ? Math.round((summary.totalSearches ?? 0) / (summary.dailySearches.length || 1)).toLocaleString()
                : "0"
            }
            icon={TrendingUp}
            description="Per day"
            loading={summaryLoading}
          />
        </div>

        {/* Daily Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#0066FF]" />
              Daily Search Volume
            </CardTitle>
            <CardDescription>Number of searches per day over the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : summary?.dailySearches && summary.dailySearches.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={summary.dailySearches.map(d => ({ ...d, date: formatDate(String(d.date)) }))}>
                  <defs>
                    <linearGradient id="searchGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#searchGradient)"
                    name="Searches"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                No search data yet for this period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Two-column: Top Queries + Zero Results */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Queries */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#0066FF]" />
                Top Search Queries
              </CardTitle>
              <CardDescription>Most popular searches in the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : summary?.topQueries && summary.topQueries.length > 0 ? (
                <div className="space-y-2">
                  {summary.topQueries.map((q, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">{i + 1}</span>
                        <span className="text-sm font-medium truncate">{q.query}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-xs text-muted-foreground">{q.avgResults} results</span>
                        <Badge variant="secondary" className="text-xs">{q.count}×</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  No searches recorded yet
                </div>
              )}
            </CardContent>
          </Card>

          {/* Zero-Result Queries */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Zero-Result Queries
              </CardTitle>
              <CardDescription>Searches that returned no results — content gaps to fill</CardDescription>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : summary?.zeroResultQueries && summary.zeroResultQueries.length > 0 ? (
                <div className="space-y-2">
                  {summary.zeroResultQueries.map((q, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">{i + 1}</span>
                        <span className="text-sm font-medium truncate text-amber-700">{q.query}</span>
                      </div>
                      <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 shrink-0 ml-2">
                        {q.count}× missed
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  No zero-result searches — great coverage!
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Searches by Entity Type */}
        {summary?.byEntityType && summary.byEntityType.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-[#0066FF]" />
                Searches by Content Type
              </CardTitle>
              <CardDescription>Which content types users filter by most</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={summary.byEntityType} layout="vertical" margin={{ left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <YAxis dataKey="entityType" type="category" tick={{ fontSize: 12 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="count" name="Searches" radius={[0, 4, 4, 0]}>
                    {summary.byEntityType.map((entry, i) => (
                      <Cell key={i} fill={ENTITY_COLORS[entry.entityType] || "#10b981"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Recent Searches Log */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#0066FF]" />
              Recent Searches
            </CardTitle>
            <CardDescription>Live log of all search queries</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter by query..."
                  value={recentSearch}
                  onChange={e => { setRecentSearch(e.target.value); setRecentPage(1); }}
                  className="pl-9"
                />
              </div>
              <Select value={recentEntityType} onValueChange={v => { setRecentEntityType(v); setRecentPage(1); }}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="article">Articles</SelectItem>
                  <SelectItem value="company">Companies</SelectItem>
                  <SelectItem value="person">People</SelectItem>
                  <SelectItem value="investor">Investors</SelectItem>
                  <SelectItem value="job">Jobs</SelectItem>
                  <SelectItem value="event">Events</SelectItem>
                  <SelectItem value="accelerator">Accelerators</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            {recentLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : recent?.items && recent.items.length > 0 ? (
              <>
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-[#F7F8FA] border-b">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Query</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Results</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recent.items.map((row) => (
                        <tr key={row.id} className="border-b last:border-0 hover:bg-[#F7F8FA]">
                          <td className="px-4 py-3 font-medium">{row.query}</td>
                          <td className="px-4 py-3">
                            <Badge
                              variant="outline"
                              className="text-xs capitalize"
                              style={{
                                borderColor: ENTITY_COLORS[row.entityType || "all"] + "66",
                                color: ENTITY_COLORS[row.entityType || "all"],
                              }}
                            >
                              {row.entityType || "all"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {row.resultsCount === 0 ? (
                              <span className="text-amber-600 font-medium">0</span>
                            ) : (
                              <span className="text-[#1A1F36]">{row.resultsCount}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                            {new Date(row.searchedAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                {recent.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      {recent.total.toLocaleString()} total searches
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setRecentPage(p => Math.max(1, p - 1))}
                        disabled={recentPage === 1}
                        className="px-3 py-1 text-sm border rounded hover:bg-[#F7F8FA] disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1 text-sm">
                        {recentPage} / {recent.totalPages}
                      </span>
                      <button
                        onClick={() => setRecentPage(p => Math.min(recent.totalPages, p + 1))}
                        disabled={recentPage === recent.totalPages}
                        className="px-3 py-1 text-sm border rounded hover:bg-[#F7F8FA] disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <Search className="h-12 w-12 mx-auto text-[#E0E3E8] mb-3" />
                <p className="font-medium">No searches logged yet</p>
                <p className="text-sm mt-1">Searches from the public site will appear here automatically</p>
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
