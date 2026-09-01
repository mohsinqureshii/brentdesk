/**
 * EventAnalytics
 *
 * Mounted under the Analytics tab of the Event Editor for any event.
 * Sections:
 *   - Engagement: page views, going / interested counts
 *   - External clicks: per-provider bar + per-day timeline (last 30d)
 *     via events.adminGetExternalClickStats
 *   - Live blog stats (only when posts exist) via
 *     events.adminGetLiveBlogStats
 *   - Sales headlines (only when ticketProvider === 'internal') via
 *     events.adminGetOrderStats
 *
 * No chart library — bars are CSS widths, the timeline is an inline
 * SVG sparkline. Keeps the dependency surface flat.
 */

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Eye, Users, UserPlus, MousePointerClick, Radio, DollarSign,
  ShoppingCart, Ticket, Undo2,
} from "lucide-react";

interface Props {
  eventId: number;
  ticketProvider?: string | null;
  defaultCurrency?: string;
}

function fmtCurrencyCents(cents: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: currency || 'USD', maximumFractionDigits: 2,
    }).format((cents || 0) / 100);
  } catch {
    return `$${((cents || 0) / 100).toFixed(2)}`;
  }
}

export function EventAnalytics({ eventId, ticketProvider, defaultCurrency = 'USD' }: Props) {
  // Engagement headlines come from the public event row + a small
  // RSVP rollup query. The router exposes goingCount/interestedCount
  // via getBySlug; for the admin view we hit getById to get the raw
  // event row plus those counts in one call.
  const eventQ = trpc.events.adminGet.useQuery({ id: eventId }, { enabled: !!eventId });
  const clicksQ = trpc.events.adminGetExternalClickStats.useQuery({ eventId, days: 30 });
  const liveBlogQ = trpc.events.adminGetLiveBlogStats.useQuery({ eventId });
  const isInternal = ticketProvider === 'internal';
  const salesQ = trpc.events.adminGetOrderStats.useQuery(
    { eventId },
    { enabled: isInternal },
  );

  const event = eventQ.data as any;
  const clicks = clicksQ.data;
  const liveBlog = liveBlogQ.data;
  const sales = salesQ.data;

  const refundRate = useMemo(() => {
    if (!sales) return 0;
    const denom = (sales.paidCount || 0) + (sales.refundedCount || 0);
    if (denom === 0) return 0;
    return Math.round(((sales.refundedCount || 0) / denom) * 100);
  }, [sales]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Analytics</h2>
        <p className="text-sm text-muted-foreground">Engagement, traffic, and (when applicable) sales for this event.</p>
      </div>

      {/* ========== Engagement ========== */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Engagement</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <MetricTile
            icon={<Eye className="h-4 w-4" />}
            label="Page views"
            value={event?.viewCount?.toLocaleString() ?? '—'}
            loading={eventQ.isLoading}
          />
          <MetricTile
            icon={<Users className="h-4 w-4" />}
            label="Going"
            value={event?.goingCount?.toLocaleString() ?? '0'}
            loading={eventQ.isLoading}
          />
          <MetricTile
            icon={<UserPlus className="h-4 w-4" />}
            label="Interested"
            value={event?.interestedCount?.toLocaleString() ?? '0'}
            loading={eventQ.isLoading}
          />
        </div>
      </section>

      {/* ========== External clicks ========== */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">External tickets (last 30 days)</h3>
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <MiniMetric icon={<MousePointerClick className="h-4 w-4" />} label="Total clicks" value={clicks?.totalClicks?.toLocaleString() ?? '—'} loading={clicksQ.isLoading} />
              <MiniMetric icon={<Users className="h-4 w-4" />} label="Unique clickers" value={clicks?.uniqueClickerCount?.toLocaleString() ?? '—'} loading={clicksQ.isLoading} />
            </div>

            {/* Per-provider bar — CSS widths, no chart lib */}
            {clicks && clicks.totalClicks > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">By provider</div>
                <ProviderBar label="Eventbrite"  value={clicks.byProvider.eventbrite} total={clicks.totalClicks} cls="bg-orange-500" />
                <ProviderBar label="Luma"        value={clicks.byProvider.luma}       total={clicks.totalClicks} cls="bg-violet-500" />
                <ProviderBar label="External"    value={clicks.byProvider.external}   total={clicks.totalClicks} cls="bg-zinc-500" />
              </div>
            )}

            {/* Daily sparkline — inline SVG, last 14 buckets */}
            {clicks && clicks.perDayCounts.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-1.5">Daily timeline</div>
                <Sparkline data={clicks.perDayCounts.slice(-14)} />
              </div>
            )}

            {clicks && clicks.totalClicks === 0 && (
              <div className="text-sm text-muted-foreground">No external ticket clicks in the last 30 days.</div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ========== Live blog stats ========== */}
      {liveBlog && liveBlog.totalPosts > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Live coverage</h3>
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <MiniMetric icon={<Radio className="h-4 w-4" />} label="Total posts" value={liveBlog.totalPosts.toLocaleString()} />
                <MiniMetric label="Updates"  value={String(liveBlog.byType.update || 0)} />
                <MiniMetric label="Funding"  value={String(liveBlog.byType.funding || 0)} />
                <MiniMetric label="Quotes"   value={String(liveBlog.byType.quote || 0)} />
              </div>

              {liveBlog.postsByCorrespondent.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-2">Top correspondents</div>
                  <div className="space-y-1.5">
                    {liveBlog.postsByCorrespondent.slice(0, 6).map((c: any) => {
                      const max = liveBlog.postsByCorrespondent[0]?.count || 1;
                      const pct = Math.max(2, Math.round((c.count / max) * 100));
                      return (
                        <div key={c.userId} className="flex items-center gap-3 text-sm">
                          <span className="w-32 truncate">{c.name}</span>
                          <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs tabular-nums w-8 text-right">{c.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* ========== Sales (only for internal) ========== */}
      {isInternal && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Sales</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricTile
              icon={<DollarSign className="h-4 w-4" />}
              label="Revenue"
              value={sales ? fmtCurrencyCents(sales.totalRevenue || 0, defaultCurrency) : '—'}
              loading={salesQ.isLoading}
            />
            <MetricTile
              icon={<ShoppingCart className="h-4 w-4" />}
              label="Orders"
              value={sales?.totalOrders?.toLocaleString() ?? '—'}
              loading={salesQ.isLoading}
            />
            <MetricTile
              icon={<Ticket className="h-4 w-4" />}
              label="Tickets sold"
              value={(sales?.perTier || []).reduce((sum: number, t: any) => sum + (t.sold || 0), 0).toLocaleString()}
              loading={salesQ.isLoading}
            />
            <MetricTile
              icon={<Undo2 className="h-4 w-4" />}
              label="Refund rate"
              value={`${refundRate}%`}
              loading={salesQ.isLoading}
            />
          </div>
        </section>
      )}
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function MetricTile({
  icon, label, value, loading,
}: {
  icon: React.ReactNode; label: string; value: string; loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
          {icon}
          {label}
        </div>
        <div className="mt-1 text-2xl font-semibold tabular-nums">
          {loading ? <span className="text-muted-foreground">…</span> : value}
        </div>
      </CardContent>
    </Card>
  );
}

function MiniMetric({
  icon, label, value, loading,
}: {
  icon?: React.ReactNode; label: string; value: string; loading?: boolean;
}) {
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        {icon}{label}
      </div>
      <div className="text-lg font-semibold tabular-nums">
        {loading ? <span className="text-muted-foreground">…</span> : value}
      </div>
    </div>
  );
}

function ProviderBar({
  label, value, total, cls,
}: {
  label: string; value: number; total: number; cls: string;
}) {
  const pct = total > 0 ? Math.max(2, Math.round((value / total) * 100)) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-24 text-muted-foreground">{label}</span>
      <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${cls}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums w-12 text-right">{value.toLocaleString()}</span>
    </div>
  );
}

function Sparkline({ data }: { data: { date: string; clicks: number }[] }) {
  if (data.length === 0) return null;
  const max = Math.max(1, ...data.map(d => d.clicks));
  const W = 320, H = 48, pad = 2;
  const stepX = (W - pad * 2) / Math.max(1, data.length - 1);

  const points = data.map((d, i) => {
    const x = pad + i * stepX;
    const y = H - pad - (d.clicks / max) * (H - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  // Filled area for visual weight
  const areaPoints = `${pad},${H} ${points} ${(W - pad).toFixed(1)},${H}`;

  return (
    <div>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block">
        <polyline points={areaPoints} fill="currentColor" className="text-primary/15" stroke="none" />
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth={1.5} className="text-primary" />
      </svg>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}
