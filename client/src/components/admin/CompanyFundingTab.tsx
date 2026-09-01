/**
 * CompanyFundingTab
 * Inline funding round management inside the Company Editor.
 * Supports adding/editing/deleting rounds with investor picker (lead + co-investors).
 */
import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, Edit2, DollarSign, Calendar, TrendingUp, Star, X, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";

const ROUND_TYPES = [
  { value: "pre_seed", label: "Pre-Seed" },
  { value: "seed", label: "Seed" },
  { value: "series_a", label: "Series A" },
  { value: "series_b", label: "Series B" },
  { value: "series_c", label: "Series C" },
  { value: "series_d_plus", label: "Series D+" },
  { value: "bridge", label: "Bridge" },
  { value: "strategic", label: "Strategic" },
  { value: "venture_debt", label: "Venture Debt" },
  { value: "grant", label: "Grant" },
  { value: "undisclosed", label: "Undisclosed" },
];

const STATUS_OPTIONS = [
  { value: "confirmed", label: "Confirmed" },
  { value: "pending", label: "Pending" },
  { value: "disputed", label: "Disputed" },
];

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-[#EBF3FF] text-[#0066FF]",
  pending: "bg-yellow-100 text-yellow-700",
  disputed: "bg-red-100 text-red-700",
};

// ─── Investor search combobox ─────────────────────────────────────────────────
interface InvestorOption { id: number; name: string; logo?: string | null }

function InvestorCombobox({
  onSelect,
  excludeIds = [],
}: {
  onSelect: (inv: InvestorOption) => void;
  excludeIds?: number[];
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const { data } = trpc.investors.adminList.useQuery(
    { search: query, limit: 20 } as any,
    { enabled: query.length >= 1, keepPreviousData: true } as any
  );

  const results: InvestorOption[] = ((data as any)?.items || []).filter(
    (inv: InvestorOption) => !excludeIds.includes(inv.id)
  );

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Search and add investors…"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {results.map(inv => (
            <button
              key={inv.id}
              type="button"
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted text-left"
              onMouseDown={() => {
                onSelect(inv);
                setQuery("");
                setOpen(false);
              }}
            >
              {inv.logo ? (
                <img src={inv.logo} alt={inv.name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                  {inv.name?.charAt(0)}
                </div>
              )}
              <span className="truncate">{inv.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface InvestorEntry {
  linkId?: number; // fundingRoundInvestors.id (for existing DB rows)
  investorId: number;
  name: string;
  logo?: string | null;
  role: "lead" | "participant";
}

type RoundForm = {
  roundType: string;
  amountRaised: string;
  currency: string;
  isUndisclosed: boolean;
  fundingDate: string;
  valuationPost: string;
  status: string;
  notes: string;
  sourceUrls: string; // newline-separated
  investors: InvestorEntry[];
};

const EMPTY_FORM: RoundForm = {
  roundType: "seed",
  amountRaised: "",
  currency: "USD",
  isUndisclosed: false,
  fundingDate: new Date().toISOString().split("T")[0],
  valuationPost: "",
  status: "confirmed",
  notes: "",
  sourceUrls: "",
  investors: [],
};

function formatAmount(amount: string | null | undefined, currency: string | null | undefined) {
  if (!amount) return "Undisclosed";
  const num = parseFloat(amount);
  if (num >= 1_000_000_000) return `${currency || "USD"} ${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${currency || "USD"} ${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${currency || "USD"} ${(num / 1_000).toFixed(0)}K`;
  return `${currency || "USD"} ${num.toLocaleString()}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function CompanyFundingTab({ companyId, companyName }: { companyId: number; companyName: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<RoundForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.funding.list.useQuery({ companyId, limit: 50 });
  const rounds = data?.rounds || [];

  const createMut = trpc.funding.create.useMutation({
    onSuccess: () => {
      utils.funding.list.invalidate({ companyId });
      toast.success("Funding round added");
      setDialogOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    },
    onError: (e) => {
      console.error("Create error:", e);
      toast.error(e.message);
    },
  });

  const updateMut = trpc.funding.update.useMutation({
    onSuccess: () => {
      utils.funding.list.invalidate({ companyId });
      toast.success("Funding round updated");
      setDialogOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = trpc.funding.delete.useMutation({
    onSuccess: () => {
      utils.funding.list.invalidate({ companyId });
      toast.success("Funding round deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const addInvestorMut = trpc.funding.addInvestor.useMutation();
  const removeInvestorMut = trpc.funding.removeInvestor.useMutation();

  // ── Dialog helpers ──────────────────────────────────────────────────────────
  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  async function openEdit(round: any) {
    setEditingId(round.id);
    // Fetch full round with investors
    const full = await utils.funding.getById.fetch({ id: round.id });
    const inv: InvestorEntry[] = ((full as any)?.investors || []).map((i: any) => ({
      linkId: i.id,
      investorId: i.investorId ?? i.investor?.id,
      name: i.investor?.name || "",
      logo: i.investor?.logo,
      role: (i.role as "lead" | "participant") || "participant",
    }));
    setForm({
      roundType: round.roundType,
      amountRaised: round.amountRaised || "",
      currency: round.currency || "USD",
      isUndisclosed: !!round.isUndisclosed,
      fundingDate: round.fundingDate ? new Date(round.fundingDate).toISOString().split("T")[0] : "",
      valuationPost: round.valuationPost || "",
      status: round.status || "confirmed",
      notes: round.notes || "",
      sourceUrls: Array.isArray((full as any)?.sourceUrls)
        ? (full as any).sourceUrls.join("\n")
        : (typeof (full as any)?.sourceUrls === "string" ? (full as any).sourceUrls : ""),
      investors: inv,
    });
    setDialogOpen(true);
  }

  function addInvestorToForm(inv: InvestorOption) {
    if (form.investors.find(i => i.investorId === inv.id)) return;
    setForm(f => ({
      ...f,
      investors: [...f.investors, { investorId: inv.id, name: inv.name, logo: inv.logo, role: "participant" }],
    }));
  }

  function removeInvestorFromForm(investorId: number) {
    setForm(f => ({ ...f, investors: f.investors.filter(i => i.investorId !== investorId) }));
  }

  function toggleLead(investorId: number) {
    setForm(f => ({
      ...f,
      investors: f.investors.map(i => ({
        ...i,
        role: i.investorId === investorId ? "lead" : "participant",
      })),
    }));
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.fundingDate || !form.roundType) {
      toast.error("Round type and date are required");
      return;
    }
    setSaving(true);
    try {
      const sourceUrlsArr = form.sourceUrls.split("\n").map(s => s.trim()).filter(Boolean);
      const investorIds = form.investors.map(i => ({ investorId: i.investorId, role: i.role }));

      if (editingId) {
        // 1. Update round fields
        await updateMut.mutateAsync({
          id: editingId,
          roundType: form.roundType as any,
          amountRaised: form.isUndisclosed ? undefined : form.amountRaised || undefined,
          currency: form.currency,
          isUndisclosed: form.isUndisclosed,
          fundingDate: form.fundingDate,
          valuationPost: form.valuationPost || undefined,
          status: form.status as any,
          notes: form.notes || undefined,
          sourceUrls: sourceUrlsArr.length > 0 ? sourceUrlsArr : undefined,
        });

        // 2. Sync investors: remove ones no longer in form, upsert current ones
        const currentFull = await utils.funding.getById.fetch({ id: editingId });
        const currentInvIds = new Set(form.investors.map(i => i.investorId));
        const toRemove = ((currentFull as any)?.investors || []).filter(
          (i: any) => !currentInvIds.has(i.investorId ?? i.investor?.id)
        );
        await Promise.all(toRemove.map((i: any) => removeInvestorMut.mutateAsync({ id: i.id })));
        await Promise.all(form.investors.map(i =>
          addInvestorMut.mutateAsync({
            fundingRoundId: editingId!,
            investorId: i.investorId,
            role: i.role,
          })
        ));

        utils.funding.list.invalidate({ companyId });
        setDialogOpen(false);
        setEditingId(null);
        setForm(EMPTY_FORM);
        toast.success("Funding round updated");
      } else {
        await createMut.mutateAsync({
          companyId,
          roundType: form.roundType as any,
          amountRaised: form.isUndisclosed ? undefined : form.amountRaised || undefined,
          currency: form.currency,
          isUndisclosed: form.isUndisclosed,
          fundingDate: form.fundingDate,
          valuationPost: form.valuationPost || undefined,
          status: form.status as any,
          notes: form.notes || undefined,
          sourceUrls: sourceUrlsArr.length > 0 ? sourceUrlsArr : undefined,
          investorIds,
        });
        // Dialog will close via createMut.onSuccess
      }
    } catch (error) {
      console.error("Error saving funding round:", error);
      toast.error("Failed to save funding round");
    } finally {
      setSaving(false);
    }
  }

  // ── Stats ───────────────────────────────────────────────────────────────────
  const totalRaised = rounds
    .filter(r => !r.isUndisclosed && r.amountRaised)
    .reduce((sum, r) => sum + parseFloat(r.amountRaised || "0"), 0);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#EBF3FF] rounded-md"><DollarSign className="h-5 w-5 text-[#0066FF]" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Total Raised</p>
                <p className="font-bold text-lg">{formatAmount(totalRaised.toString(), "USD")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-md"><TrendingUp className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Rounds</p>
                <p className="font-bold text-lg">{rounds.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-md"><Calendar className="h-5 w-5 text-purple-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Latest Round</p>
                <p className="font-bold text-lg">
                  {rounds[0] ? ROUND_TYPES.find(r => r.value === rounds[0].roundType)?.label || rounds[0].roundType : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rounds list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" />Funding Rounds</CardTitle>
            <CardDescription>All funding rounds for {companyName}. Changes here are reflected on the public company profile and Funding Tracker.</CardDescription>
          </div>
          <Button onClick={openAdd} className="bg-emerald-500 hover:bg-[#0066FF] text-white">
            <Plus className="h-4 w-4 mr-1" /> Add Round
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>}
          {!isLoading && rounds.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No funding rounds yet</p>
              <p className="text-sm mt-1">Add past and future rounds to build the funding history.</p>
              <Button onClick={openAdd} variant="outline" className="mt-4"><Plus className="h-4 w-4 mr-1" />Add First Round</Button>
            </div>
          )}
          {rounds.length > 0 && (
            <div className="space-y-3">
              {rounds.map((round: any) => (
                <div key={round.id} className="flex items-center justify-between p-4 rounded-md border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[60px]">
                      <p className="text-xs text-muted-foreground">{round.fundingDate ? new Date(round.fundingDate).getFullYear() : "—"}</p>
                      <p className="font-bold text-sm">{ROUND_TYPES.find(r => r.value === round.roundType)?.label || round.roundType}</p>
                    </div>
                    <div>
                      <p className="font-semibold">
                        {round.isUndisclosed ? "Undisclosed" : formatAmount(round.amountRaised, round.currency)}
                      </p>
                      {round.valuationPost && (
                        <p className="text-xs text-muted-foreground">Post-money: {formatAmount(round.valuationPost, round.currency)}</p>
                      )}
                      {round.notes && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{round.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[round.status] || "bg-[#F0F2F5] text-[#697386]"}`}>
                      {round.status}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(round)}><Edit2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => {
                      if (confirm("Delete this funding round?")) deleteMut.mutate({ id: round.id });
                    }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Funding Round" : "Add Funding Round"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Round type + Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Round Type *</Label>
                <Select value={form.roundType} onValueChange={v => setForm({ ...form, roundType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROUND_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input type="date" value={form.fundingDate} onChange={e => setForm({ ...form, fundingDate: e.target.value })} />
              </div>
            </div>

            {/* Amount */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-2">
                <Label>Amount Raised</Label>
                <Input value={form.amountRaised} onChange={e => setForm({ ...form, amountRaised: e.target.value })} placeholder="e.g. 5000000" disabled={form.isUndisclosed} />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["USD", "EUR", "GBP", "AED", "SAR"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isUndisclosed" checked={form.isUndisclosed} onChange={e => setForm({ ...form, isUndisclosed: e.target.checked, amountRaised: e.target.checked ? "" : form.amountRaised })} className="rounded" />
              <Label htmlFor="isUndisclosed" className="cursor-pointer text-sm">Amount is undisclosed</Label>
            </div>

            {/* Valuation */}
            <div className="space-y-2">
              <Label>Post-Money Valuation (optional)</Label>
              <Input value={form.valuationPost} onChange={e => setForm({ ...form, valuationPost: e.target.value })} placeholder="e.g. 50000000" />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* ── Investors ─────────────────────────────────────────────── */}
            <div className="space-y-3">
              <Label className="flex items-center gap-1.5">
                <UserPlus className="h-4 w-4 text-purple-500" />
                Investors
              </Label>

              {/* Selected investors list */}
              {form.investors.length > 0 && (
                <div className="space-y-2">
                  {form.investors.map(inv => (
                    <div key={inv.investorId} className="flex items-center gap-2 p-2.5 rounded-md border border-border bg-muted/30">
                      {inv.logo ? (
                        <img src={inv.logo} alt={inv.name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                          {inv.name?.charAt(0)}
                        </div>
                      )}
                      <span className="flex-1 text-sm font-medium truncate">{inv.name}</span>
                      {/* Lead toggle */}
                      <button
                        type="button"
                        onClick={() => toggleLead(inv.investorId)}
                        title={inv.role === "lead" ? "Lead investor — click to demote" : "Click to set as lead"}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors ${
                          inv.role === "lead"
                            ? "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400"
                            : "bg-muted text-muted-foreground border-border hover:border-amber-300 hover:text-amber-600"
                        }`}
                      >
                        <Star className="h-3 w-3" />
                        {inv.role === "lead" ? "Lead" : "Co-investor"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeInvestorFromForm(inv.investorId)}
                        className="text-muted-foreground hover:text-red-500 transition-colors ml-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Investor search */}
              <InvestorCombobox
                onSelect={addInvestorToForm}
                excludeIds={form.investors.map(i => i.investorId)}
              />
              <p className="text-xs text-muted-foreground">
                Click the role badge to toggle between Lead and Co-investor. Multiple co-investors are supported.
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional context about this round..." rows={2} />
            </div>

            {/* Source URLs */}
            <div className="space-y-2">
              <Label>Source URLs (one per line)</Label>
              <Textarea value={form.sourceUrls} onChange={e => setForm({ ...form, sourceUrls: e.target.value })} placeholder="https://techcrunch.com/..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-emerald-500 hover:bg-[#0066FF] text-white"
              onClick={handleSave}
              disabled={saving || !form.fundingDate || !form.roundType}
            >
              {saving ? "Saving..." : editingId ? "Update Round" : "Add Round"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
