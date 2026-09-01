/**
 * System Health — admin diagnostics
 * ----------------------------------------------------------------------
 * One page that tells you whether every Talent Platform integration
 * is configured and (where pingable) reachable. Use this after every
 * deploy to catch missing env vars / unprovisioned containers /
 * dangling credentials before users hit them.
 */

import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  XCircle,
  Circle,
} from "lucide-react";

export default function SystemHealth() {
  const utils = trpc.useUtils();
  const query = trpc.systemHealth.summary.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">System health</h1>
            <p className="text-sm text-muted-foreground">
              Every external service the Talent Platform depends on. Auto-refreshes every minute.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => utils.systemHealth.summary.invalidate()}
            disabled={query.isFetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${query.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {query.data && (
          <div className="grid sm:grid-cols-4 gap-3">
            <StatCard label="Total checks" value={query.data.summary.total} />
            <StatCard
              label="Configured"
              value={query.data.summary.configured}
              tone={
                query.data.summary.configured === query.data.summary.total ? "good" : "warn"
              }
            />
            <StatCard
              label="Unconfigured"
              value={query.data.summary.unconfigured}
              tone={query.data.summary.unconfigured === 0 ? "good" : "warn"}
            />
            <StatCard
              label="Reachable"
              value={`${query.data.summary.reachable}/${query.data.summary.reachableTotal}`}
              tone={
                query.data.summary.reachable === query.data.summary.reachableTotal
                  ? "good"
                  : "bad"
              }
            />
          </div>
        )}

        <div className="space-y-2">
          {query.isLoading && [0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
          {query.data?.checks.map((c: any) => (
            <Card key={c.name}>
              <CardContent className="p-4 flex items-start gap-3">
                <StatusIcon configured={c.configured} reachable={c.reachable} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{c.name}</h3>
                    {!c.configured && c.required && (
                      <Badge variant="destructive">Required</Badge>
                    )}
                    {c.reachable === false && (
                      <Badge variant="outline" className="bg-red-50 text-red-700">
                        Unreachable
                      </Badge>
                    )}
                    {c.reachable === true && (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
                        Reachable
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{c.detail}</p>
                  {c.envHint && !c.configured && (
                    <p className="text-xs text-muted-foreground mt-1 font-mono">
                      Set: {c.envHint}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {query.data && (
          <p className="text-xs text-muted-foreground text-right">
            Last checked: {new Date(query.data.generatedAt).toLocaleString()}
          </p>
        )}
      </div>
    </AdminLayout>
  );
}

function StatusIcon({ configured, reachable }: { configured: boolean; reachable: boolean | null }) {
  if (!configured) return <Circle className="h-5 w-5 text-muted-foreground mt-0.5" />;
  if (reachable === false) return <XCircle className="h-5 w-5 text-red-500 mt-0.5" />;
  if (reachable === true) return <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" />;
  return <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 opacity-60" />;
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "good" | "warn" | "bad";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-600"
      : tone === "warn"
        ? "text-amber-600"
        : tone === "bad"
          ? "text-red-600"
          : "";
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold tabular-nums ${toneClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
