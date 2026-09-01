/**
 * Admin: Editions
 * ----------------------------------------------------------------------
 * Reuters-style country views of the site. Each edition maps to one
 * country (or marks itself as the International catch-all). The
 * frontend reads the active set from this admin to populate the
 * header switcher and bias listing queries by the visitor's country.
 *
 * What this page does:
 *   - Lists every edition with country, slug, flag, active toggle,
 *     supported locales, sort order
 *   - "Add edition" lets the admin pick a country that doesn't yet
 *     have one and create the row with sensible defaults
 *   - Inline edit dialog for renaming, changing flag, toggling
 *     supportedLocales, adjusting sortOrder
 *   - Active toggle disables the edition without deleting (history
 *     preserved); International row can't be disabled
 *   - Drag-free reorder via up/down buttons (kept simple — we expect
 *     <20 editions long-term)
 *   - Delete button on non-International editions
 *
 * The supportedLocales editor is wired but visibly tagged as
 * "for the upcoming language switcher" so operators understand
 * they're configuring future infrastructure today.
 */
import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Globe, Plus, ChevronUp, ChevronDown, Pencil, Trash2, Loader2,
  Languages, Flag, Zap, RefreshCw,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface EditionRow {
  id: number;
  countryId: number | null;
  name: string;
  slug: string;
  flagEmoji: string | null;
  isInternational: number;
  isActive: number;
  supportedLocales: string[];
  sortOrder: number;
  countryName: string | null;
  countryIso2: string | null;
}

const ALL_LOCALES: { value: string; label: string }[] = [
  { value: "en", label: "English" },
  { value: "ar", label: "Arabic" },
  { value: "tr", label: "Turkish" },
  { value: "ur", label: "Urdu" },
  { value: "fr", label: "French" },
];

export default function EditionsPage() {
  const utils = trpc.useUtils();
  const editions = trpc.admin.editions.list.useQuery();
  const availableCountries = trpc.admin.editions.availableCountries.useQuery();

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<EditionRow | null>(null);
  const [deleting, setDeleting] = useState<EditionRow | null>(null);

  const invalidate = () => {
    utils.admin.editions.list.invalidate();
    utils.admin.editions.availableCountries.invalidate();
  };

  const toggleMut = trpc.admin.editions.toggleActive.useMutation({
    onSuccess: () => { invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const reorderMut = trpc.admin.editions.reorder.useMutation({
    onSuccess: () => { invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = trpc.admin.editions.delete.useMutation({
    onSuccess: () => {
      toast.success("Edition deleted");
      setDeleting(null);
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const rows: EditionRow[] = useMemo(
    () => ((editions.data || []) as EditionRow[]),
    [editions.data],
  );

  // Up/down reorder: swap sortOrder values with the neighbor and
  // post both pairs. Keeps the rest of the list untouched.
  const move = (rowId: number, direction: "up" | "down") => {
    const idx = rows.findIndex((r) => r.id === rowId);
    if (idx < 0) return;
    const neighborIdx = direction === "up" ? idx - 1 : idx + 1;
    if (neighborIdx < 0 || neighborIdx >= rows.length) return;
    const a = rows[idx];
    const b = rows[neighborIdx];
    reorderMut.mutate({
      items: [
        { id: a.id, sortOrder: b.sortOrder },
        { id: b.id, sortOrder: a.sortOrder },
      ],
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 flex items-center gap-2">
              <Globe className="h-6 w-6 text-blue-700" />
              Editions
            </h1>
            <p className="text-zinc-500 mt-1 text-sm sm:text-base max-w-2xl">
              Country views of the site. The active set drives the header
              switcher and biases every listing page (articles, jobs,
              companies, investors, people, events, accelerators) to show
              the visitor's country first.
            </p>
          </div>
          <Button
            onClick={() => setAddOpen(true)}
            disabled={(availableCountries.data?.length ?? 0) === 0}
            className="bg-blue-700 hover:bg-blue-800"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add edition
          </Button>
        </div>

        <Card className="border-blue-100 bg-blue-50/40">
          <CardContent className="p-4 text-sm text-blue-900">
            <p className="flex items-start gap-2">
              <Languages className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                <strong>Languages note.</strong> Each edition carries a
                "supported locales" list that the upcoming language
                switcher will read. You can set it today (e.g. UAE →
                English + Arabic, Turkey → English + Turkish) and it'll
                light up when the localization layer ships next month.
                Nothing visitor-facing changes from setting locales
                today.
              </span>
            </p>
          </CardContent>
        </Card>

        <BackfillCard />


        <Card>
          <CardHeader>
            <CardTitle className="text-base">All editions</CardTitle>
          </CardHeader>
          <CardContent>
            {editions.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : (
              <div className="space-y-2">
                {rows.map((r, idx) => (
                  <div
                    key={r.id}
                    className={`flex flex-wrap items-center gap-3 p-3 rounded-md border ${
                      r.isActive ? "bg-background" : "bg-muted/30 opacity-70"
                    }`}
                  >
                    <span className="text-2xl">{r.flagEmoji || "🏳️"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{r.name}</span>
                        <Badge variant="outline" className="font-mono text-[10px]">{r.slug}</Badge>
                        {r.isInternational ? (
                          <Badge className="text-[10px] bg-zinc-100 text-zinc-700">International</Badge>
                        ) : r.countryIso2 ? (
                          <Badge variant="secondary" className="text-[10px] font-mono">{r.countryIso2}</Badge>
                        ) : null}
                        {!r.isActive && <Badge variant="outline" className="text-[10px] text-red-700 border-red-300">disabled</Badge>}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          locales:
                        </span>
                        {r.supportedLocales.map((l) => (
                          <Badge key={l} variant="outline" className="text-[10px] font-mono">{l}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => move(r.id, "up")}
                        disabled={idx === 0 || reorderMut.isPending}
                        title="Move up"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => move(r.id, "down")}
                        disabled={idx === rows.length - 1 || reorderMut.isPending}
                        title="Move down"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Switch
                        checked={!!r.isActive}
                        onCheckedChange={(checked) => toggleMut.mutate({ id: r.id, isActive: checked })}
                        disabled={!!r.isInternational}
                        aria-label="active"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditing(r)}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleting(r)}
                        disabled={!!r.isInternational}
                        title={r.isInternational ? "International cannot be deleted" : "Delete"}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
                {rows.length === 0 && (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    No editions configured yet.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add edition dialog */}
      <AddEditionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        availableCountries={availableCountries.data || []}
        onSuccess={invalidate}
      />

      {/* Edit edition dialog */}
      {editing && (
        <EditEditionDialog
          edition={editing}
          onClose={() => setEditing(null)}
          onSuccess={() => { setEditing(null); invalidate(); }}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name} edition?</AlertDialogTitle>
            <AlertDialogDescription>
              Visitors currently on this edition (via cookie) will fall back
              to International on next visit. The country itself stays in
              the countries table — only the edition row is removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && deleteMut.mutate({ id: deleting.id })}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMut.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

// ============================================================
// Add edition dialog
// ============================================================
function AddEditionDialog({
  open, onOpenChange, availableCountries, onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableCountries: Array<{ id: number; name: string; iso2: string }>;
  onSuccess: () => void;
}) {
  const [countryId, setCountryId] = useState<string>("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [flagEmoji, setFlagEmoji] = useState("");
  const [locales, setLocales] = useState<string[]>(["en"]);

  const createMut = trpc.admin.editions.create.useMutation({
    onSuccess: () => {
      toast.success("Edition added");
      setCountryId("");
      setName("");
      setSlug("");
      setFlagEmoji("");
      setLocales(["en"]);
      onSuccess();
      onOpenChange(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const handlePickCountry = (idStr: string) => {
    setCountryId(idStr);
    const c = availableCountries.find((x) => String(x.id) === idStr);
    if (c) {
      // Auto-fill name + slug + flag from the country. Operator can edit
      // before saving — common case is "UAE" instead of "United Arab Emirates".
      if (!name) setName(c.name);
      if (!slug) setSlug(c.iso2.toLowerCase());
      if (!flagEmoji) setFlagEmoji(flagFromIso2(c.iso2));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-blue-700" /> Add edition
          </DialogTitle>
          <DialogDescription>
            Map a country to a new edition. The country list excludes any
            that already have an edition.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Country</Label>
            <Select value={countryId} onValueChange={handlePickCountry}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Pick a country…" />
              </SelectTrigger>
              <SelectContent>
                {availableCountries.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {flagFromIso2(c.iso2)} {c.name} ({c.iso2})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Display name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="UAE" />
            </div>
            <div>
              <Label>Slug</Label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="ae"
                className="font-mono"
              />
            </div>
          </div>
          <div>
            <Label>Flag emoji</Label>
            <Input value={flagEmoji} onChange={(e) => setFlagEmoji(e.target.value)} placeholder="🇦🇪" className="font-mono text-lg w-32" />
          </div>
          <LocalePicker value={locales} onChange={setLocales} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => createMut.mutate({
              countryId: Number(countryId),
              name,
              slug,
              flagEmoji: flagEmoji || undefined,
              supportedLocales: locales as any,
              sortOrder: 0,
            })}
            disabled={!countryId || !name || !slug || locales.length === 0 || createMut.isPending}
            className="bg-blue-700 hover:bg-blue-800"
          >
            {createMut.isPending ? "Saving…" : "Add edition"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Edit edition dialog
// ============================================================
function EditEditionDialog({
  edition, onClose, onSuccess,
}: {
  edition: EditionRow;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(edition.name);
  const [slug, setSlug] = useState(edition.slug);
  const [flagEmoji, setFlagEmoji] = useState(edition.flagEmoji || "");
  const [locales, setLocales] = useState<string[]>(edition.supportedLocales);

  const updateMut = trpc.admin.editions.update.useMutation({
    onSuccess: () => {
      toast.success("Edition updated");
      onSuccess();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" /> Edit {edition.name}
          </DialogTitle>
          {edition.isInternational ? (
            <DialogDescription>
              International is the system catch-all. You can rename it
              but the slug + country binding are locked.
            </DialogDescription>
          ) : (
            <DialogDescription>
              Update display name, slug, flag, or supported locales.
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Display name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Slug</Label>
              <Input
                value={slug}
                disabled={!!edition.isInternational}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                className="font-mono"
              />
            </div>
          </div>
          <div>
            <Label>Flag emoji</Label>
            <Input value={flagEmoji} onChange={(e) => setFlagEmoji(e.target.value)} className="font-mono text-lg w-32" />
          </div>
          <LocalePicker value={locales} onChange={setLocales} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => updateMut.mutate({
              id: edition.id,
              name,
              slug: edition.isInternational ? undefined : slug,
              flagEmoji: flagEmoji || null,
              supportedLocales: locales as any,
            })}
            disabled={!name || locales.length === 0 || updateMut.isPending}
            className="bg-blue-700 hover:bg-blue-800"
          >
            {updateMut.isPending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Locale picker — multi-select checkboxes for supportedLocales
// ============================================================
function LocalePicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (locale: string) => {
    if (value.includes(locale)) {
      // Prevent unticking the last locale — every edition needs at least one.
      if (value.length === 1) return;
      onChange(value.filter((l) => l !== locale));
    } else {
      onChange([...value, locale]);
    }
  };
  return (
    <div>
      <Label className="flex items-center gap-2">
        <Languages className="h-3.5 w-3.5" /> Supported locales
        <span className="text-xs font-normal text-muted-foreground">(for the upcoming language switcher)</span>
      </Label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
        {ALL_LOCALES.map((l) => (
          <label
            key={l.value}
            className="flex items-center gap-2 p-2 rounded-md border cursor-pointer hover:bg-muted/50"
          >
            <Checkbox checked={value.includes(l.value)} onCheckedChange={() => toggle(l.value)} />
            <span className="text-sm">
              <span className="font-mono text-xs mr-1">{l.value}</span>
              {l.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Backfill card — populates articles.coverageCountryId from
// existing articleLocations data so the news.list edition bias
// has data to work with.
// ============================================================
function BackfillCard() {
  const status = trpc.admin.editions.backfillStatus.useQuery(undefined, { staleTime: 30_000 });
  const utils = trpc.useUtils();

  // Auto-run-until-empty machinery. When the operator toggles "auto"
  // on a backfill button, each successful batch kicks off the next
  // one automatically until the relevant `*backfillable` count hits
  // zero. Toggling off mid-flight aborts after the in-flight batch.
  const [autoSql, setAutoSql] = useState(false);
  const [autoAi, setAutoAi] = useState(false);

  const runMut = trpc.admin.editions.backfillCoverageCountry.useMutation({
    onSuccess: async (data) => {
      toast.success(`Backfilled ${data.succeeded}/${data.processed}${data.failed ? ` (${data.failed} unmapped)` : ""}`);
      const next = await utils.admin.editions.backfillStatus.fetch();
      if (autoSql && (next?.backfillable ?? 0) > 0) {
        runMut.mutate({ limit: 100 });
      } else if (autoSql) {
        setAutoSql(false);
        toast.success("SQL backfill complete — no more candidates");
      }
    },
    onError: (e) => { setAutoSql(false); toast.error(e.message); },
  });

  const aiRunMut = trpc.admin.editions.backfillCoverageCountryAI.useMutation({
    onSuccess: async (data: any) => {
      toast.success(
        `AI-tagged ${data.succeeded}/${data.processed}` +
        (data.skipped ? ` (${data.skipped} low confidence)` : "") +
        (data.failed ? `, ${data.failed} errored` : "")
      );
      const next = await utils.admin.editions.backfillStatus.fetch();
      if (autoAi && ((next as any)?.aiBackfillable ?? 0) > 0) {
        aiRunMut.mutate({ limit: 25 });
      } else if (autoAi) {
        setAutoAi(false);
        toast.success("AI backfill complete — no more candidates");
      }
    },
    onError: (e) => { setAutoAi(false); toast.error(e.message); },
  });

  const missing = status.data?.missingTotal ?? 0;
  const backfillable = status.data?.backfillable ?? 0;
  const aiBackfillable = (status.data as any)?.aiBackfillable ?? 0;

  if (missing === 0 && !status.isLoading) return null;

  return (
    <Card className="border-emerald-200 bg-emerald-50/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-emerald-900">
          <Zap className="h-4 w-4" />
          Backfill article country coverage
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-emerald-900">
          The news edition bias surfaces articles by{" "}
          <code className="bg-emerald-100 px-1 rounded text-xs">coverageCountryId</code>.
          The admin Location tab already tags articles with country names —
          this backfill maps those names to country IDs so the edition
          ordering works on historical content too.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {status.isLoading ? (
            <span className="text-sm text-muted-foreground sm:col-span-3">
              <Loader2 className="h-3.5 w-3.5 animate-spin inline mr-1" /> Scanning…
            </span>
          ) : (
            <>
              <div>
                <span className="text-2xl font-bold text-emerald-900">{missing}</span>
                <span className="text-xs text-emerald-800 ml-2">missing coverage</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-emerald-900">{backfillable}</span>
                <span className="text-xs text-emerald-800 ml-2">from Location-tab data (free)</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-emerald-900">{aiBackfillable}</span>
                <span className="text-xs text-emerald-800 ml-2">need AI detection (~$0.001 each)</span>
              </div>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => { setAutoSql(true); runMut.mutate({ limit: 100 }); }}
            disabled={backfillable === 0 || runMut.isPending || aiRunMut.isPending || autoSql || autoAi}
            className="bg-emerald-700 hover:bg-emerald-800"
          >
            {runMut.isPending || autoSql
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing… ({backfillable} left)</>
              : <><Zap className="h-4 w-4 mr-2" /> Backfill ALL ({backfillable}, free)</>}
          </Button>
          <Button
            onClick={() => { setAutoAi(true); aiRunMut.mutate({ limit: 25 }); }}
            disabled={aiBackfillable === 0 || runMut.isPending || aiRunMut.isPending || autoSql || autoAi}
            variant="outline"
            className="border-emerald-300 text-emerald-800 hover:bg-emerald-100"
          >
            {aiRunMut.isPending || autoAi
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> AI detecting… ({aiBackfillable} left)</>
              : <>✨ AI-detect ALL ({aiBackfillable}, ~${(aiBackfillable * 0.001).toFixed(2)})</>}
          </Button>
          {(autoSql || autoAi) && (
            <Button
              variant="ghost"
              onClick={() => { setAutoSql(false); setAutoAi(false); }}
            >
              Stop after current batch
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => { status.refetch(); }}
            disabled={status.isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${status.isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Idempotent — safe to run multiple times. Articles with no
          Location-tab data stay untagged until an editor adds one.
        </p>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Helper — derive a flag emoji from a 2-letter country code
// ============================================================
function flagFromIso2(iso2: string): string {
  if (!iso2 || iso2.length !== 2) return "";
  const codePoints = iso2
    .toUpperCase()
    .split("")
    .map((c) => 0x1f1e6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}
