/**
 * AI Analytics Dashboard
 * Usage statistics, cost tracking, generation history, and performance metrics.
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart3, DollarSign, Zap, Clock, FileText, TrendingUp,
  Brain, Loader2, RefreshCw, Activity, CheckCircle2, XCircle,
  Eye, ArrowUp, ArrowDown, Sparkles,
} from "lucide-react";

export function AIAnalyticsPanel() {
  const [timeRange, setTimeRange] = useState("30d");

  const analytics = trpc.admin.aiContent.getAnalytics.useQuery({ period: timeRange === '7d' ? 'week' : timeRange === '30d' ? 'month' : 'day' } as any);
  const sessions = trpc.admin.aiContent.listSessions.useQuery({ limit: 50 });

  const rawStats = analytics.data as any;
  const stats = rawStats || {
    totalSessions: 0,
    totalTokens: 0,
    totalCost: 0,
    avgGenerationTime: 0,
    publishedCount: 0,
    failedCount: 0,
    byProvider: [],
    byContentType: [],
    dailyUsage: [],
  };

  return (

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-purple-500" />
              AI Analytics
            </h1>
            <p className="text-muted-foreground mt-1">
              Usage statistics, costs, and generation performance
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => analytics.refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {analytics.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    <span className="text-sm text-muted-foreground">Generations</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.totalSessions}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm text-muted-foreground">Tokens</span>
                  </div>
                  <p className="text-2xl font-bold">{(stats.totalTokens / 1000).toFixed(1)}K</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">Total Cost</span>
                  </div>
                  <p className="text-2xl font-bold">${Number(stats.totalCost).toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-muted-foreground">Avg Time</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.avgGenerationTime ? (stats.avgGenerationTime / 1000).toFixed(1) + "s" : "0s"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">Published</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.publishedCount}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-muted-foreground">Failed</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.failedCount}</p>
                </CardContent>
              </Card>
            </div>

            {/* Breakdown Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* By Provider */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Usage by Provider
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.byProvider && stats.byProvider.length > 0 ? (
                    <div className="space-y-3">
                      {stats.byProvider.map((p: any, i: number) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"][i % 5] }} />
                            <span className="font-medium capitalize">{p.provider}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span>{p.count} calls</span>
                            <span className="text-muted-foreground">{(p.tokens / 1000).toFixed(1)}K tokens</span>
                            <span className="font-medium">${Number(p.cost).toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No usage data yet</p>
                  )}
                </CardContent>
              </Card>

              {/* By Content Type */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Usage by Content Type
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.byContentType && stats.byContentType.length > 0 ? (
                    <div className="space-y-3">
                      {stats.byContentType.map((ct: any, i: number) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">{ct.contentType}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span>{ct.count} generated</span>
                            <span className="text-muted-foreground">{ct.published} published</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No usage data yet</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Generation History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Generations
                </CardTitle>
                <CardDescription>Last 50 content generation sessions</CardDescription>
              </CardHeader>
              <CardContent>
                {sessions.isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : sessions.data && (sessions.data as any).sessions?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 font-medium">Title</th>
                          <th className="text-left py-2 px-3 font-medium">Type</th>
                          <th className="text-left py-2 px-3 font-medium">Provider</th>
                          <th className="text-left py-2 px-3 font-medium">Model</th>
                          <th className="text-right py-2 px-3 font-medium">Tokens</th>
                          <th className="text-right py-2 px-3 font-medium">Cost</th>
                          <th className="text-right py-2 px-3 font-medium">Time</th>
                          <th className="text-left py-2 px-3 font-medium">Status</th>
                          <th className="text-left py-2 px-3 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {((sessions.data as any).sessions || []).map((session: any) => (
                          <tr key={session.id} className="border-b hover:bg-muted/50">
                            <td className="py-2 px-3 max-w-[200px] truncate">{session.title || "Untitled"}</td>
                            <td className="py-2 px-3">
                              <Badge variant="outline" className="capitalize">{session.contentType}</Badge>
                            </td>
                            <td className="py-2 px-3 capitalize">{session.provider}</td>
                            <td className="py-2 px-3 text-muted-foreground">{session.model}</td>
                            <td className="py-2 px-3 text-right">{session.totalTokens?.toLocaleString()}</td>
                            <td className="py-2 px-3 text-right">${Number(session.estimatedCost || 0).toFixed(3)}</td>
                            <td className="py-2 px-3 text-right">{session.generationTimeMs ? `${(session.generationTimeMs / 1000).toFixed(1)}s` : "-"}</td>
                            <td className="py-2 px-3">
                              <Badge variant={
                                session.status === "published" ? "default" :
                                session.status === "completed" ? "secondary" :
                                session.status === "failed" ? "destructive" : "outline"
                              }>
                                {session.status}
                              </Badge>
                            </td>
                            <td className="py-2 px-3 text-muted-foreground">
                              {new Date(session.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No generation history yet</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

  );
}

// Backwards-compatible default export — wraps the panel in AdminLayout
// so the standalone route keeps working while the panel embeds in AIStudio.
export default function AIAnalyticsPanelPage() {
  return (
    <AdminLayout>
      <AIAnalyticsPanel />
    </AdminLayout>
  );
}
