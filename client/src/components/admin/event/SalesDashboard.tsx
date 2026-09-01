/**
 * SalesDashboard
 *
 * Mounted under the Sales tab of the Event Editor. Visible only when
 * event.ticketProvider === 'internal' (gated upstream by EventEditor).
 *
 * Surfaces:
 *   - Headline metrics (revenue / orders / tickets sold / refund rate)
 *     via events.adminGetOrderStats
 *   - Per-tier breakdown table with %-full bar
 *   - Recent orders table (paginated, status-filterable) via
 *     events.adminListOrders
 *   - Refund flow (full + optional partial) via events.adminRefundOrder
 *   - Manual "mark paid" comp flow via events.adminMarkPaidManual
 *   - Client-side CSV export of the currently-loaded orders page
 */

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus, Download, MoreHorizontal, Loader2, RefreshCcw,
  DollarSign, ShoppingCart, Ticket, Undo2,
} from "lucide-react";

type OrderStatus = 'pending' | 'paid' | 'refunded' | 'cancelled' | 'failed';
type FilterStatus = 'all' | OrderStatus;

const STATUS_FILTERS: { value: FilterStatus; label: string }[] = [
  { value: 'all',        label: 'All' },
  { value: 'paid',       label: 'Paid' },
  { value: 'pending',    label: 'Pending' },
  { value: 'refunded',   label: 'Refunded' },
  { value: 'cancelled',  label: 'Cancelled' },
  { value: 'failed',     label: 'Failed' },
];

const STATUS_BADGE: Record<OrderStatus, { label: string; cls: string }> = {
  paid:      { label: 'Paid',      cls: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900' },
  pending:   { label: 'Pending',   cls: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900' },
  refunded:  { label: 'Refunded',  cls: 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-900/60 dark:text-zinc-400 dark:border-zinc-800' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900' },
  failed:    { label: 'Failed',    cls: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900' },
};

function formatCurrencyCents(cents: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format((cents || 0) / 100);
  } catch {
    return `$${((cents || 0) / 100).toFixed(2)}`;
  }
}

function formatDateShort(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface SalesDashboardProps {
  eventId: number;
  /** Currency from the event's ticket tiers (best-effort). */
  defaultCurrency?: string;
}

export function SalesDashboard({ eventId, defaultCurrency = 'USD' }: SalesDashboardProps) {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const limit = 50;

  const stats = trpc.events.adminGetOrderStats.useQuery({ eventId });
  const orders = trpc.events.adminListOrders.useQuery({
    eventId,
    status: filter === 'all' ? undefined : filter,
    page,
    limit,
  });
  const tickets = trpc.events.listTickets.useQuery({ eventId });

  const utils = trpc.useUtils();
  const refundOrder = trpc.events.adminRefundOrder.useMutation({
    onSuccess: () => {
      toast.success('Refund processed');
      utils.events.adminListOrders.invalidate({ eventId });
      utils.events.adminGetOrderStats.invalidate({ eventId });
    },
    onError: (e) => toast.error(e.message || 'Refund failed'),
  });
  const markPaid = trpc.events.adminMarkPaidManual.useMutation({
    onSuccess: () => {
      toast.success('Manual order created');
      utils.events.adminListOrders.invalidate({ eventId });
      utils.events.adminGetOrderStats.invalidate({ eventId });
      utils.events.listTickets.invalidate({ eventId });
    },
    onError: (e) => toast.error(e.message || 'Failed to mark paid'),
  });

  const s = stats.data;
  const refundRate = useMemo(() => {
    if (!s) return 0;
    const denom = (s.paidCount || 0) + (s.refundedCount || 0);
    if (denom === 0) return 0;
    return Math.round(((s.refundedCount || 0) / denom) * 100);
  }, [s]);

  // Per-tier merge: capacity comes from listTickets, sold counts from
  // listTickets too (denormalized counter). Revenue per tier needs a
  // cross-walk through orders → items, but we don't have that endpoint
  // wired in this dashboard yet — we estimate revenue from sold * price
  // and label it "estimated" so it's not mistaken for cash booked.
  const tierRows = useMemo(() => {
    const list = (tickets.data || []) as any[];
    return list.map(t => {
      const sold = t.soldCount || 0;
      const cap = t.capacity ?? null;
      const pct = cap ? Math.min(100, Math.round((sold / cap) * 100)) : null;
      return {
        id: t.id,
        name: t.name,
        sold,
        capacity: cap,
        revenueCents: sold * (t.priceCents || 0),
        currency: t.currency || defaultCurrency,
        pctFull: pct,
      };
    });
  }, [tickets.data, defaultCurrency]);

  const orderRows = (orders.data?.rows || []) as any[];
  const total = orders.data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // --- CSV export ---
  function exportCsv() {
    const header = ['Date', 'Customer', 'Email', 'Total (cents)', 'Currency', 'Status', 'Provider', 'Order ID'];
    const lines = [header.join(',')];
    for (const o of orderRows) {
      const row = [
        o.createdAt ?? '',
        (o.customerName || '').replace(/"/g, '""'),
        o.customerEmail || '',
        String(o.totalCents ?? 0),
        o.currency || '',
        o.status || '',
        o.paymentProvider || '',
        String(o.id),
      ].map(v => `"${String(v)}"`).join(',');
      lines.push(row);
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `event-${eventId}-orders-page${page}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* ========== Header actions ========== */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Sales</h2>
          <p className="text-sm text-muted-foreground">Orders, revenue, and refunds for this event.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={orderRows.length === 0}>
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
          <ManualPaidDialog
            eventId={eventId}
            tickets={(tickets.data || []) as any[]}
            onSubmit={(payload) => markPaid.mutate(payload)}
            pending={markPaid.isPending}
          />
        </div>
      </div>

      {/* ========== Stat tiles ========== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          icon={<DollarSign className="h-4 w-4" />}
          label="Revenue"
          value={s ? formatCurrencyCents(s.totalRevenue || 0, defaultCurrency) : '—'}
          loading={stats.isLoading}
        />
        <StatTile
          icon={<ShoppingCart className="h-4 w-4" />}
          label="Orders"
          value={s ? String(s.totalOrders || 0) : '—'}
          sub={s ? `${s.paidCount || 0} paid · ${s.pendingCount || 0} pending` : undefined}
          loading={stats.isLoading}
        />
        <StatTile
          icon={<Ticket className="h-4 w-4" />}
          label="Tickets sold"
          value={tierRows.reduce((sum, t) => sum + t.sold, 0).toLocaleString()}
          loading={tickets.isLoading}
        />
        <StatTile
          icon={<Undo2 className="h-4 w-4" />}
          label="Refund rate"
          value={`${refundRate}%`}
          sub={s ? `${s.refundedCount || 0} refunded` : undefined}
          loading={stats.isLoading}
        />
      </div>

      {/* ========== Per-tier breakdown ========== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Per-tier breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {tierRows.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No ticket tiers yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground bg-muted/40">
                  <tr>
                    <th className="px-4 py-2 font-medium">Tier</th>
                    <th className="px-4 py-2 font-medium">Sold</th>
                    <th className="px-4 py-2 font-medium">Capacity</th>
                    <th className="px-4 py-2 font-medium">Revenue (est.)</th>
                    <th className="px-4 py-2 font-medium w-40">% Full</th>
                  </tr>
                </thead>
                <tbody>
                  {tierRows.map(t => (
                    <tr key={t.id} className="border-t">
                      <td className="px-4 py-3 font-medium">{t.name}</td>
                      <td className="px-4 py-3">{t.sold.toLocaleString()}</td>
                      <td className="px-4 py-3">{t.capacity ?? <span className="text-muted-foreground">∞</span>}</td>
                      <td className="px-4 py-3">{formatCurrencyCents(t.revenueCents, t.currency)}</td>
                      <td className="px-4 py-3">
                        {t.pctFull === null ? (
                          <span className="text-muted-foreground text-xs">unlimited</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full ${t.pctFull >= 90 ? 'bg-red-500' : t.pctFull >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${t.pctFull}%` }}
                              />
                            </div>
                            <span className="text-xs tabular-nums w-9 text-right">{t.pctFull}%</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========== Filter chips ========== */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map(f => (
          <Button
            key={f.value}
            size="sm"
            variant={filter === f.value ? 'default' : 'outline'}
            onClick={() => { setFilter(f.value); setPage(1); }}
          >
            {f.label}
          </Button>
        ))}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => { utils.events.adminListOrders.invalidate({ eventId }); utils.events.adminGetOrderStats.invalidate({ eventId }); }}
          className="ml-auto"
        >
          <RefreshCcw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* ========== Orders table ========== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Orders {total > 0 && <span className="text-muted-foreground text-sm font-normal">({total.toLocaleString()})</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {orders.isLoading ? (
            <div className="p-6 flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading orders…
            </div>
          ) : orderRows.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No orders match this filter.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground bg-muted/40">
                  <tr>
                    <th className="px-4 py-2 font-medium">Date</th>
                    <th className="px-4 py-2 font-medium">Customer</th>
                    <th className="px-4 py-2 font-medium">Total</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {orderRows.map((o: any) => {
                    const badge = STATUS_BADGE[o.status as OrderStatus] || STATUS_BADGE.pending;
                    return (
                      <tr key={o.id} className="border-t">
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatDateShort(o.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{o.customerName || <span className="text-muted-foreground italic">no name</span>}</div>
                          <div className="text-xs text-muted-foreground">{o.customerEmail}</div>
                        </td>
                        <td className="px-4 py-3 tabular-nums">{formatCurrencyCents(o.totalCents || 0, o.currency || defaultCurrency)}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={badge.cls}>{badge.label}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <OrderRowMenu
                            order={o}
                            onRefund={(amountCents) => refundOrder.mutate({ orderId: o.id, amountCents })}
                            refunding={refundOrder.isPending}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========== Pagination ========== */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
              Previous
            </Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function StatTile({
  icon, label, value, sub, loading,
}: {
  icon: React.ReactNode; label: string; value: string; sub?: string; loading?: boolean;
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
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function OrderRowMenu({
  order, onRefund, refunding,
}: {
  order: any;
  onRefund: (amountCents?: number) => void;
  refunding: boolean;
}) {
  const [refundOpen, setRefundOpen] = useState(false);
  const [partialAmount, setPartialAmount] = useState<string>('');

  const canRefund = order.status === 'paid' && !!order.paymentRef;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              // View details — for v1 just dump the order to console.
              // Detail drawer can be added later without touching this row.
              // eslint-disable-next-line no-console
              console.info('[SalesDashboard] order', order);
              toast.message(`Order #${order.id}`, {
                description: `${order.customerEmail} — ${order.status}`,
              });
            }}
          >
            View details
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!canRefund}
            onClick={() => setRefundOpen(true)}
          >
            Refund…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={refundOpen} onOpenChange={setRefundOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refund order #{order.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will refund the charge in Stripe and decrement the tier's sold count. Leave the amount blank to refund the full
              {' '}<strong>{formatCurrencyCents(order.totalCents || 0, order.currency)}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="partial-amount" className="text-xs">Partial refund amount (cents, optional)</Label>
            <Input
              id="partial-amount"
              type="number"
              min={1}
              max={order.totalCents || undefined}
              placeholder={String(order.totalCents || '')}
              value={partialAmount}
              onChange={e => setPartialAmount(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={refunding}
              onClick={() => {
                const amt = partialAmount.trim() ? Math.max(1, parseInt(partialAmount, 10)) : undefined;
                onRefund(amt);
                setRefundOpen(false);
                setPartialAmount('');
              }}
            >
              {refunding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Refund
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ManualPaidDialog({
  eventId, tickets, onSubmit, pending,
}: {
  eventId: number;
  tickets: any[];
  onSubmit: (payload: {
    eventId: number;
    items: { ticketId: number; quantity: number }[];
    customer: { email: string; name?: string; phone?: string; company?: string };
    notes?: string;
  }) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<{ ticketId: number; quantity: number }[]>([]);

  function reset() {
    setEmail(''); setName(''); setCompany(''); setNotes(''); setItems([]);
  }

  function setQty(ticketId: number, quantity: number) {
    setItems(prev => {
      const next = prev.filter(i => i.ticketId !== ticketId);
      if (quantity > 0) next.push({ ticketId, quantity });
      return next;
    });
  }

  const valid = email.trim().length > 0 && items.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1.5" /> Mark paid manually
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Mark paid manually</DialogTitle>
          <DialogDescription>
            Comp tickets without charging the customer. The order is created with status=paid and counters bump as if it were a Stripe checkout.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="m-email" className="text-xs">Email *</Label>
              <Input id="m-email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="m-name" className="text-xs">Name</Label>
              <Input id="m-name" value={name} onChange={e => setName(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="m-company" className="text-xs">Company</Label>
            <Input id="m-company" value={company} onChange={e => setCompany(e.target.value)} />
          </div>

          <div>
            <Label className="text-xs">Tickets</Label>
            <div className="border rounded-md divide-y">
              {tickets.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">No tiers configured.</div>
              ) : tickets.map(t => {
                const current = items.find(i => i.ticketId === t.id)?.quantity || 0;
                return (
                  <div key={t.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{formatCurrencyCents(t.priceCents || 0, t.currency)}</div>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      max={t.maxPerOrder || 100}
                      value={current}
                      onChange={e => setQty(t.id, Math.max(0, parseInt(e.target.value || '0', 10)))}
                      className="w-20"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <Label htmlFor="m-notes" className="text-xs">Notes (internal)</Label>
            <Textarea id="m-notes" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            disabled={!valid || pending}
            onClick={() => {
              onSubmit({
                eventId,
                items,
                customer: {
                  email: email.trim(),
                  name: name.trim() || undefined,
                  company: company.trim() || undefined,
                },
                notes: notes.trim() || undefined,
              });
              setOpen(false);
              reset();
            }}
          >
            {pending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Create order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
