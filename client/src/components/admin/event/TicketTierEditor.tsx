/**
 * TicketTierEditor
 *
 * Tier list editor used in the Tickets tab of the redesigned Event
 * Editor. Shows existing tiers, lets the admin add / edit / delete
 * (soft via isActive) tiers. Only mounts when ticketProvider=internal —
 * the parent hides it for external providers.
 *
 * Inline-row editing (no modal) — fewer clicks for the common case of
 * tweaking a price or capacity.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Save, X } from "lucide-react";

interface TierDraft {
  id?: number;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  capacity: number | null;
  salesStartAt: string | null;
  salesEndAt: string | null;
  isActive: boolean;
  sortOrder: number;
  maxPerOrder: number | null;
}

const emptyTier = (sortOrder: number): TierDraft => ({
  name: "",
  description: "",
  priceCents: 0,
  currency: "USD",
  capacity: null,
  salesStartAt: null,
  salesEndAt: null,
  isActive: true,
  sortOrder,
  maxPerOrder: 10,
});

export function TicketTierEditor({ eventId }: { eventId: number }) {
  const utils = trpc.useUtils();
  const { data: tiers = [], isLoading } = trpc.events.adminListTickets.useQuery({ eventId });

  const upsert = trpc.events.adminUpsertTicket.useMutation({
    onSuccess: () => {
      toast.success("Tier saved");
      setDraft(null);
      utils.events.adminListTickets.invalidate({ eventId });
    },
    onError: (e) => toast.error(e.message),
  });
  const del = trpc.events.adminDeleteTicket.useMutation({
    onSuccess: () => {
      toast.success("Tier deleted");
      utils.events.adminListTickets.invalidate({ eventId });
    },
    onError: (e) => toast.error(e.message),
  });

  const [draft, setDraft] = useState<TierDraft | null>(null);

  function startNew() {
    setDraft(emptyTier(tiers.length));
  }

  function startEdit(t: any) {
    setDraft({
      id: t.id,
      name: t.name ?? "",
      description: t.description ?? "",
      priceCents: t.priceCents ?? 0,
      currency: t.currency ?? "USD",
      capacity: t.capacity ?? null,
      salesStartAt: t.salesStartAt ?? null,
      salesEndAt: t.salesEndAt ?? null,
      isActive: !!t.isActive,
      sortOrder: t.sortOrder ?? 0,
      maxPerOrder: t.maxPerOrder ?? 10,
    });
  }

  function save() {
    if (!draft) return;
    if (!draft.name.trim()) { toast.error("Name required"); return; }
    upsert.mutate({ eventId, ...draft });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Ticket Tiers</h3>
          <p className="text-xs text-muted-foreground">
            Internal Stripe checkout — one row per tier (Early Bird, Standard, VIP, etc.)
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={startNew} disabled={!!draft}>
          <Plus className="h-4 w-4 mr-1" /> Add Tier
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <div className="space-y-2">
        {tiers.map((t: any) => (
          <Card key={t.id} className="p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t.name}</span>
                  {!t.isActive && <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">inactive</span>}
                </div>
                <div className="text-xs text-muted-foreground">
                  {(t.priceCents / 100).toFixed(2)} {t.currency} ·
                  {t.capacity !== null && t.capacity !== undefined
                    ? ` ${t.soldCount ?? 0}/${t.capacity} sold`
                    : ` ${t.soldCount ?? 0} sold (unlimited)`}
                  {t.salesStartAt && ` · opens ${new Date(t.salesStartAt).toLocaleString()}`}
                  {t.salesEndAt && ` · closes ${new Date(t.salesEndAt).toLocaleString()}`}
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => startEdit(t)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => del.mutate({ id: t.id })}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {!isLoading && tiers.length === 0 && !draft && (
          <p className="text-sm text-muted-foreground italic">No tiers yet — add one to start selling.</p>
        )}
      </div>

      {draft && (
        <Card className="p-4 border-primary/40">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Name</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Early Bird" />
            </div>
            <div>
              <Label>Price (USD)</Label>
              <Input
                type="number"
                step="0.01"
                value={(draft.priceCents / 100).toString()}
                onChange={(e) => setDraft({ ...draft, priceCents: Math.round(parseFloat(e.target.value || "0") * 100) })}
              />
            </div>
            <div>
              <Label>Currency</Label>
              <Input value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value.toUpperCase().slice(0, 3) })} />
            </div>
            <div>
              <Label>Capacity (blank = unlimited)</Label>
              <Input
                type="number"
                value={draft.capacity ?? ""}
                onChange={(e) => setDraft({ ...draft, capacity: e.target.value ? parseInt(e.target.value) : null })}
              />
            </div>
            <div>
              <Label>Sales Start</Label>
              <Input
                type="datetime-local"
                value={draft.salesStartAt?.slice(0, 16) ?? ""}
                onChange={(e) => setDraft({ ...draft, salesStartAt: e.target.value || null })}
              />
            </div>
            <div>
              <Label>Sales End</Label>
              <Input
                type="datetime-local"
                value={draft.salesEndAt?.slice(0, 16) ?? ""}
                onChange={(e) => setDraft({ ...draft, salesEndAt: e.target.value || null })}
              />
            </div>
            <div>
              <Label>Max per Order</Label>
              <Input
                type="number"
                value={draft.maxPerOrder ?? ""}
                onChange={(e) => setDraft({ ...draft, maxPerOrder: e.target.value ? parseInt(e.target.value) : null })}
              />
            </div>
            <div>
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={draft.sortOrder}
                onChange={(e) => setDraft({ ...draft, sortOrder: parseInt(e.target.value || "0") })}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Description</Label>
              <Input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Includes lunch + workshop access" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={draft.isActive} onCheckedChange={(c) => setDraft({ ...draft, isActive: c })} />
              <Label>Active</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={upsert.isPending}>
              <Save className="h-4 w-4 mr-1" /> {draft.id ? "Update" : "Create"} Tier
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

export function PromoCodeEditor({ eventId }: { eventId: number }) {
  const utils = trpc.useUtils();
  const { data: codes = [] } = trpc.events.adminListPromoCodes.useQuery({ eventId });
  const upsert = trpc.events.adminUpsertPromoCode.useMutation({
    onSuccess: () => {
      toast.success("Promo code saved");
      setDraft(null);
      utils.events.adminListPromoCodes.invalidate({ eventId });
    },
    onError: (e) => toast.error(e.message),
  });
  const del = trpc.events.adminDeletePromoCode.useMutation({
    onSuccess: () => {
      toast.success("Promo code deleted");
      utils.events.adminListPromoCodes.invalidate({ eventId });
    },
    onError: (e) => toast.error(e.message),
  });

  const [draft, setDraft] = useState<{
    id?: number;
    code: string;
    discountType: "percentage" | "fixed_cents";
    discountValue: number;
    maxUses: number | null;
    validFrom: string | null;
    validUntil: string | null;
    isActive: boolean;
  } | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Promo Codes</h3>
          <p className="text-xs text-muted-foreground">Discount codes applied at internal checkout.</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={!!draft}
          onClick={() => setDraft({
            code: "",
            discountType: "percentage",
            discountValue: 10,
            maxUses: null,
            validFrom: null,
            validUntil: null,
            isActive: true,
          })}
        >
          <Plus className="h-4 w-4 mr-1" /> Add Code
        </Button>
      </div>

      <div className="space-y-2">
        {codes.map((c: any) => (
          <Card key={c.id} className="p-3 flex items-center justify-between">
            <div>
              <span className="font-mono font-medium">{c.code}</span>
              <span className="text-xs text-muted-foreground ml-2">
                {c.discountType === "percentage" ? `${c.discountValue}% off` : `$${(c.discountValue / 100).toFixed(2)} off`}
                {" · "}
                {c.usedCount ?? 0}{c.maxUses != null ? `/${c.maxUses}` : ""} uses
                {!c.isActive && " · inactive"}
              </span>
            </div>
            <Button size="sm" variant="ghost" onClick={() => del.mutate({ id: c.id })}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </Card>
        ))}
        {codes.length === 0 && !draft && (
          <p className="text-sm text-muted-foreground italic">No promo codes.</p>
        )}
      </div>

      {draft && (
        <Card className="p-4 border-primary/40">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Code</Label>
              <Input
                value={draft.code}
                onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
                placeholder="EARLY25"
              />
            </div>
            <div>
              <Label>Type</Label>
              <select
                className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                value={draft.discountType}
                onChange={(e) => setDraft({ ...draft, discountType: e.target.value as any })}
              >
                <option value="percentage">% off</option>
                <option value="fixed_cents">Fixed (cents)</option>
              </select>
            </div>
            <div>
              <Label>Value ({draft.discountType === "percentage" ? "%" : "cents"})</Label>
              <Input
                type="number"
                value={draft.discountValue}
                onChange={(e) => setDraft({ ...draft, discountValue: parseInt(e.target.value || "0") })}
              />
            </div>
            <div>
              <Label>Max Uses (blank = unlimited)</Label>
              <Input
                type="number"
                value={draft.maxUses ?? ""}
                onChange={(e) => setDraft({ ...draft, maxUses: e.target.value ? parseInt(e.target.value) : null })}
              />
            </div>
            <div>
              <Label>Valid From</Label>
              <Input
                type="datetime-local"
                value={draft.validFrom?.slice(0, 16) ?? ""}
                onChange={(e) => setDraft({ ...draft, validFrom: e.target.value || null })}
              />
            </div>
            <div>
              <Label>Valid Until</Label>
              <Input
                type="datetime-local"
                value={draft.validUntil?.slice(0, 16) ?? ""}
                onChange={(e) => setDraft({ ...draft, validUntil: e.target.value || null })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={draft.isActive} onCheckedChange={(c) => setDraft({ ...draft, isActive: c })} />
              <Label>Active</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
            <Button
              size="sm"
              onClick={() => {
                if (!draft.code.trim()) { toast.error("Code required"); return; }
                upsert.mutate({ eventId, ...draft });
              }}
              disabled={upsert.isPending}
            >
              <Save className="h-4 w-4 mr-1" /> Save Code
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
