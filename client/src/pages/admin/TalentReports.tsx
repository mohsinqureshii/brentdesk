/**
 * Talent / Reports — recruiter analytics dashboard
 * ----------------------------------------------------------------------
 * Read-only insights for the tenant: applications, interviews, offers,
 * hires, time-to-fill, pipeline conversion, top jobs.
 *
 * Backend: ats.report.summary({ range })
 */

import { useMemo, useState } from "react";
import { Link } from "wouter";
import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  ArrowDown,
  ArrowUp,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  FileText,
  Inbox,
  TrendingUp,
} from "lucide-react";

type Range = "7d" | "30d" | "90d" | "1y";

const RANGE_LABELS: Record<Range, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "1y": "Last year",
};

/**
 * Read the live OKLCH `--primary` token if available; otherwise return
 * a hard-coded fallback. recharts can't read CSS variables for stroke
 * directly, so we resolve at render time.
 */
function usePrimaryColor(): string {
  if (typeof window === "undefined") return "#1f2937";
  try {
    const root = window.document.documentElement;
    const val = getComputedStyle(root).getPropertyValue("--primary").trim();
    if (!val) return "#1f2937";
    // CSS variables may be raw OKLCH values without the wrapping function.
    if (val.startsWith("oklch") || val.startsWith("rgb") || val.startsWith("#") || val.startsWith("hsl")) {
      return val;
    }
    return `oklch(${val})`;
  } catch {
    return "#1f2937";
  }
}

function formatDelta(curr: number, pct: number | null) {
  if (pct === null) return null;
  const up = pct >= 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        up ? "text-green-600" : "text-red-600"
      }`}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function formatBucketLabel(s: string, bucket: "day" | "week"): string {
  const d = new Date(s + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return s;
  if (bucket === "week") {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function TalentReports() {
  const [range, setRange] = useState<Range>("30d");
  const query = trpc.ats.report.summary.useQuery({ range });

  const primary = usePrimaryColor();
  const bucket: "day" | "week" = range === "90d" || range === "1y" ? "week" : "day";

  const data = query.data;
  const isEmpty =
    !!data &&
    data.applicationsCount === 0 &&
    data.interviewsScheduled === 0 &&
    data.offersExtended === 0 &&
    data.hiresCount === 0;

  const seriesData = useMemo(() => {
    if (!data) return [];
    return data.applicationsSeries.map((p) => ({
      label: formatBucketLabel(p.bucket, bucket),
      count: p.count,
    }));
  }, [data, bucket]);

  const funnelData = useMemo(() => {
    if (!data) return [];
    return data.pipelineFunnel
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((s) => ({
        name: s.stageName,
        candidates: s.candidates,
        conversionToNextPct: s.conversionToNextPct,
      }));
  }, [data]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
            <p className="text-sm text-muted-foreground">
              Recruiting metrics for your tenant.
            </p>
          </div>
          <Select value={range} onValueChange={(v) => setRange(v as Range)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(RANGE_LABELS) as Range[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {RANGE_LABELS[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {query.isLoading && <LoadingSkeleton />}
        {query.isError && (
          <Card>
            <CardContent className="p-6 text-sm text-red-600">
              Failed to load reports: {query.error.message}
            </CardContent>
          </Card>
        )}

        {!query.isLoading && data && isEmpty && (
          <Card>
            <CardContent className="p-12 flex flex-col items-center justify-center text-center">
              <Inbox className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-base font-semibold mb-1">No activity in this range</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Nothing has moved through the pipeline in the selected window.
              </p>
              <Link href="/admin/talent/pipeline">
                <Button size="sm">Open pipeline</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {!query.isLoading && data && !isEmpty && (
          <>
            {/* Stat row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={<FileText className="h-4 w-4 text-muted-foreground" />}
                label="Applications"
                value={data.applicationsCount}
                delta={formatDelta(
                  data.applicationsCount,
                  data.applicationsChangePct,
                )}
              />
              <StatCard
                icon={<CalendarDays className="h-4 w-4 text-muted-foreground" />}
                label="Interviews scheduled"
                value={data.interviewsScheduled}
                hint={
                  data.interviewsCompleted > 0
                    ? `${data.interviewsCompleted} completed`
                    : undefined
                }
              />
              <StatCard
                icon={<Briefcase className="h-4 w-4 text-muted-foreground" />}
                label="Offers extended"
                value={data.offersExtended}
                hint={
                  data.offersExtended > 0
                    ? `${data.offersAccepted} accepted, ${data.offersDeclined} declined`
                    : undefined
                }
              />
              <StatCard
                icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />}
                label="Hires"
                value={data.hiresCount}
                delta={formatDelta(
                  data.hiresCount,
                  data.hiresCountPrior === 0
                    ? null
                    : Math.round(
                        ((data.hiresCount - data.hiresCountPrior) /
                          data.hiresCountPrior) *
                          1000,
                      ) / 10,
                )}
              />
            </div>

            {/* Applications over time */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Applications over time</CardTitle>
                <CardDescription>
                  Grouped by {bucket === "day" ? "day" : "week"} across{" "}
                  {RANGE_LABELS[range].toLowerCase()}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={seriesData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="label" fontSize={11} tickMargin={6} />
                      <YAxis fontSize={11} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          background: "white",
                          border: "1px solid #e5e7eb",
                          borderRadius: 6,
                          fontSize: 12,
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        name="Applications"
                        stroke={primary}
                        strokeWidth={2}
                        dot={{ r: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Two-column row: funnel + time-to-hire/accept */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Pipeline funnel</CardTitle>
                  <CardDescription>
                    Candidates moved into each stage in this window.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {funnelData.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      No stage movement recorded.
                    </p>
                  ) : (
                    <div
                      className="w-full"
                      style={{ height: Math.max(220, funnelData.length * 36) }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={funnelData}
                          margin={{ top: 4, right: 32, left: 0, bottom: 4 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={false} />
                          <XAxis type="number" fontSize={11} allowDecimals={false} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            fontSize={11}
                            width={120}
                          />
                          <Tooltip
                            content={({ payload }) => {
                              if (!payload || payload.length === 0) return null;
                              const row = payload[0].payload as {
                                name: string;
                                candidates: number;
                                conversionToNextPct: number | null;
                              };
                              return (
                                <div className="bg-white border border-gray-200 rounded-md px-3 py-2 text-xs shadow-sm">
                                  <div className="font-semibold">{row.name}</div>
                                  <div>{row.candidates} candidates</div>
                                  {row.conversionToNextPct !== null && (
                                    <div className="text-muted-foreground">
                                      {row.conversionToNextPct.toFixed(1)}% to next
                                    </div>
                                  )}
                                </div>
                              );
                            }}
                          />
                          <Bar dataKey="candidates" radius={[0, 4, 4, 0]}>
                            {funnelData.map((_, i) => (
                              <Cell key={i} fill={primary} fillOpacity={0.85} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Avg. time-to-hire</CardTitle>
                    <CardDescription>
                      From application created to status = hired.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold">
                      {data.avgTimeToHireDays === null ? "—" : `${data.avgTimeToHireDays}d`}
                    </div>
                    {data.avgTimeToHireDaysPrior !== null &&
                      data.avgTimeToHireDays !== null && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Prior: {data.avgTimeToHireDaysPrior}d
                          {data.avgTimeToHireDaysPrior !== 0 && (
                            <>
                              {" · "}
                              {formatDelta(
                                data.avgTimeToHireDays,
                                Math.round(
                                  ((data.avgTimeToHireDays -
                                    data.avgTimeToHireDaysPrior) /
                                    data.avgTimeToHireDaysPrior) *
                                    1000,
                                ) / 10,
                              )}
                            </>
                          )}
                        </div>
                      )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Offer accept rate</CardTitle>
                    <CardDescription>
                      Accepted / extended in window.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AcceptRing
                      pct={data.offerAcceptRatePct}
                      primary={primary}
                    />
                    <div className="mt-3 text-xs text-muted-foreground text-center">
                      {data.offersAccepted}/{data.offersExtended} offers
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Top jobs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top jobs</CardTitle>
                <CardDescription>
                  By application volume in this window.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {data.topJobs.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-6 text-center">
                    No applications in this window.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40">
                        <tr className="text-left">
                          <th className="px-4 py-3 font-medium">Job title</th>
                          <th className="px-4 py-3 font-medium text-right">Applications</th>
                          <th className="px-4 py-3 font-medium text-right">Interviews</th>
                          <th className="px-4 py-3 font-medium text-right">Offers</th>
                          <th className="px-4 py-3 font-medium text-right">Hires</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topJobs.map((j) => (
                          <tr key={j.jobId} className="border-t hover:bg-muted/20">
                            <td className="px-4 py-3">
                              <Link href={`/admin/jobs/${j.jobId}/applications`}>
                                <span className="text-primary hover:underline cursor-pointer">
                                  {j.title}
                                </span>
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">
                              {j.applications}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">
                              {j.interviews}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">
                              {j.offers}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">
                              {j.hires}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Applications by status */}
            {data.applicationsByStatus.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Applications by status</CardTitle>
                  <CardDescription>
                    Breakdown of applications received in this window.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {data.applicationsByStatus.map((s) => (
                      <Badge key={s.status} variant="outline">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {s.status.replace(/_/g, " ")}: {s.count}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}

// ------------------------------------------------------------
// Sub-components
// ------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
  delta,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  delta?: React.ReactNode;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </span>
          {icon}
        </div>
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-bold tabular-nums">{value}</div>
          {delta}
        </div>
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function AcceptRing({ pct, primary }: { pct: number | null; primary: string }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const progress = pct === null ? 0 : Math.min(100, Math.max(0, pct));
  const dash = (progress / 100) * circumference;
  return (
    <div className="flex items-center justify-center">
      <div className="relative h-24 w-24">
        <svg viewBox="0 0 96 96" className="h-full w-full -rotate-90">
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.1}
            strokeWidth="8"
          />
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="none"
            stroke={primary}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold">
            {pct === null ? "—" : `${pct.toFixed(1)}%`}
          </span>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <Skeleton className="h-3 w-20 mb-3" />
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <Skeleton className="h-56 w-full" />
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
