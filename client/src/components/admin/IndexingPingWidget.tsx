/**
 * Indexing Ping Widget
 * Shows recent search engine notification results on the admin dashboard.
 * Displays stats, method breakdown, and recent log entries.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import {
  Globe,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Zap,
  Search,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Link } from "wouter";

const METHOD_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  sitemap_ping: { label: "Sitemap Ping", color: "bg-blue-100 text-blue-700", icon: "🗺️" },
  indexnow: { label: "IndexNow", color: "bg-purple-100 text-purple-700", icon: "⚡" },
  google_indexing_api: { label: "Google API", color: "bg-amber-100 text-amber-700", icon: "🔍" },
};

const TRIGGER_LABELS: Record<string, string> = {
  publish: "Published",
  transition: "Workflow",
  bulk_publish: "Bulk",
  scheduled: "Scheduled",
  manual: "Manual",
};

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function IndexingPingWidget() {
  const { data: stats, isLoading, refetch, isRefetching } = trpc.admin.indexing.getStats.useQuery(
    undefined,
    { refetchInterval: 60000 } // Refresh every minute
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-[#0066FF]" />
            <CardTitle className="text-lg font-semibold">Search Engine Indexing</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-[#F0F2F5] rounded-md" />
            <div className="h-24 bg-[#F0F2F5] rounded-md" />
            <div className="h-32 bg-[#F0F2F5] rounded-md" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const hasNoData = stats.allTime.total === 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-[#0066FF]" />
            <CardTitle className="text-lg font-semibold">Search Engine Indexing</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
        <p className="text-xs text-[#697386] mt-1">
          Automatic notifications sent to search engines when articles are published
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Empty state */}
        {hasNoData && (
          <div className="text-center py-6 text-[#697386]">
            <Search className="h-10 w-10 mx-auto mb-3 text-[#C8CDD6]" />
            <p className="text-sm font-medium">No indexing pings yet</p>
            <p className="text-xs mt-1">Notifications will appear here when articles are published</p>
          </div>
        )}

        {/* Stats Summary Row */}
        {!hasNoData && (
          <div className="grid grid-cols-3 gap-3">
            {/* Last 24h */}
            <div className="bg-[#F7F8FA] rounded-md p-3 text-center">
              <p className="text-xs font-medium text-[#697386] uppercase tracking-wider">24h</p>
              <p className="text-xl font-bold text-[#1A1F36] mt-1">{stats.last24h.total}</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                {stats.last24h.total > 0 ? (
                  <span className={`text-xs font-medium ${stats.last24h.successRate >= 80 ? "text-[#0066FF]" : stats.last24h.successRate >= 50 ? "text-amber-600" : "text-red-600"}`}>
                    {stats.last24h.successRate}% ok
                  </span>
                ) : (
                  <span className="text-xs text-[#9BA3B0]">—</span>
                )}
              </div>
            </div>
            {/* Last 7 days */}
            <div className="bg-[#F7F8FA] rounded-md p-3 text-center">
              <p className="text-xs font-medium text-[#697386] uppercase tracking-wider">7 days</p>
              <p className="text-xl font-bold text-[#1A1F36] mt-1">{stats.last7d.total}</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                {stats.last7d.total > 0 ? (
                  <span className={`text-xs font-medium ${stats.last7d.successRate >= 80 ? "text-[#0066FF]" : stats.last7d.successRate >= 50 ? "text-amber-600" : "text-red-600"}`}>
                    {stats.last7d.successRate}% ok
                  </span>
                ) : (
                  <span className="text-xs text-[#9BA3B0]">—</span>
                )}
              </div>
            </div>
            {/* All time */}
            <div className="bg-[#F7F8FA] rounded-md p-3 text-center">
              <p className="text-xs font-medium text-[#697386] uppercase tracking-wider">All time</p>
              <p className="text-xl font-bold text-[#1A1F36] mt-1">{stats.allTime.total}</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                {stats.allTime.total > 0 ? (
                  <span className={`text-xs font-medium ${stats.allTime.successRate >= 80 ? "text-[#0066FF]" : stats.allTime.successRate >= 50 ? "text-amber-600" : "text-red-600"}`}>
                    {stats.allTime.successRate}% ok
                  </span>
                ) : (
                  <span className="text-xs text-[#9BA3B0]">—</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Method Breakdown */}
        {!hasNoData && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#697386] uppercase tracking-wider">Methods (7d)</p>
            <div className="space-y-1.5">
              {(["sitemap_ping", "indexnow", "google_indexing_api"] as const).map((method) => {
                const info = METHOD_LABELS[method];
                const methodStat = stats.byMethod[method];
                const isGoogleApi = method === "google_indexing_api";
                const isConfigured = isGoogleApi ? stats.googleIndexingApiConfigured : true;

                return (
                  <div
                    key={method}
                    className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-[#F7F8FA] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{info.icon}</span>
                      <span className="text-sm font-medium text-[#1A1F36]">{info.label}</span>
                      {!isConfigured && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-600">
                                Not configured
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Add GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON to enable</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {methodStat.total > 0 ? (
                        <>
                          <span className="text-xs text-[#0066FF] font-medium">
                            {methodStat.successes}
                            <CheckCircle2 className="h-3 w-3 inline ml-0.5 -mt-0.5" />
                          </span>
                          {methodStat.total - methodStat.successes > 0 && (
                            <span className="text-xs text-red-500 font-medium">
                              {methodStat.total - methodStat.successes}
                              <XCircle className="h-3 w-3 inline ml-0.5 -mt-0.5" />
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-[#9BA3B0]">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Logs */}
        {stats.recentLogs.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#697386] uppercase tracking-wider">Recent Activity</p>
            <div className="space-y-1">
              {stats.recentLogs.map((log) => {
                const methodInfo = METHOD_LABELS[log.method] || { label: log.method, color: "bg-[#F0F2F5] text-[#1A1F36]", icon: "📡" };
                return (
                  <div
                    key={log.id}
                    className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-[#F7F8FA] transition-colors"
                  >
                    {log.success ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#0066FF] shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                    )}
                    <span className="text-xs">{methodInfo.icon}</span>
                    <span className="text-xs text-[#1A1F36] truncate flex-1" title={log.articleTitle || "Unknown"}>
                      {log.articleTitle
                        ? log.articleTitle.length > 40
                          ? log.articleTitle.substring(0, 40) + "…"
                          : log.articleTitle
                        : "Sitemap ping"}
                    </span>
                    <span className="text-[10px] text-[#9BA3B0] shrink-0">
                      {formatTimeAgo(log.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* View All Link */}
        {!hasNoData && (
          <Link href="/admin/seo">
            <Button variant="ghost" size="sm" className="w-full text-[#0066FF] hover:text-[#0066FF] hover:bg-[#F0F7FF] mt-1">
              View All Indexing Logs
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
