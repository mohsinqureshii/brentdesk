/**
 * Profile Enrichment Panel
 * ----------------------------------------------------------------------
 * Admin UI for the bulk AI enrichment workflow targeted at the GSC
 * "Crawled — currently not indexed" bucket. Operator picks an entity
 * type, previews how many rows are below the description threshold,
 * runs a dry-run to inspect the AI output, then applies in batches.
 *
 * Wraps `trpc.admin.entityEnrichment.{listThin,enrichBatch,enrichOne}`.
 *
 * Why this exists: lever #1 in the broader SEO recovery — every
 * profile/detail page should carry enough on-page text for Google to
 * consider indexing it. Long-form descriptions are the cheapest copy
 * to fill in en masse since each entity already has structured fields
 * the LLM can summarize from.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sparkles, Loader2, RefreshCw, Eye, Zap, AlertTriangle, CheckCircle2,
  Wand2, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const TYPES = [
  { value: "article",     label: "Articles",     hint: "fills empty seoDescription + excerpt on published articles" },
  { value: "person",      label: "People",       hint: "bios for /people/:slug" },
  { value: "company",     label: "Companies",    hint: "descriptions for /companies/:slug" },
  { value: "investor",    label: "Investors",    hint: "descriptions for /investors/:slug" },
  { value: "event",       label: "Events",       hint: "descriptions for /events/:slug" },
  { value: "accelerator", label: "Accelerators", hint: "descriptions for /accelerators/:slug" },
] as const;

type EntityType = typeof TYPES[number]["value"];

interface BatchResultItem {
  id: number;
  ok: boolean;
  name?: string;
  description?: string;
  excerpt?: string;
  error?: string;
}

interface RowState {
  /** Per-row context the operator can paste before regenerating or
   *  applying — LinkedIn bio, Wikipedia paragraph, press release.
   *  Each preview card holds its own copy so reviewing 5 entities at
   *  once doesn't cross-contaminate. */
  context: string;
  /** Whether the row's context textarea is expanded (collapsed by
   *  default to keep the preview list scannable). */
  expanded: boolean;
  /** True after a successful Apply — flips the row green and disables
   *  further action so the operator can see what was already written. */
  applied: boolean;
  /** Field names the server reported having written, e.g.
   *  ["description", "logo"]. Surfaced as small badges so the
   *  operator can see the logo backfill happened too. */
  appliedFields?: string[];
}

export function ProfileEnrichmentPanel() {
  const [type, setType] = useState<EntityType>("person");
  const [previewBatch, setPreviewBatch] = useState<BatchResultItem[] | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  /** Per-row state keyed by entity id. Built lazily as preview rows
   *  arrive. Clears whenever the operator switches entity type or
   *  generates a new preview. */
  const [rowState, setRowState] = useState<Record<number, RowState>>({});
  /** Id of the row whose Apply / Regenerate is currently in flight,
   *  so we only spin one action at a time and can disable other rows. */
  const [busyRowId, setBusyRowId] = useState<number | null>(null);

  // Single-entity enrich state (bottom of panel) — for cases where the
  // operator already knows an entity ID and just wants to paste context
  // without generating a preview batch first.
  const [singleId, setSingleId] = useState("");
  const [singleContext, setSingleContext] = useState("");
  const [singleResult, setSingleResult] = useState<{ description: string; name: string } | null>(null);
  const [singleForce, setSingleForce] = useState(false);

  const thinQuery = trpc.admin.entityEnrichment.listThin.useQuery(
    { type, limit: 20 },
    { staleTime: 10_000 },
  );

  const dryRunMut = trpc.admin.entityEnrichment.enrichBatch.useMutation({
    onSuccess: (data) => {
      setPreviewBatch(data.results);
      // Initialize per-row state for the new previews. We don't reset
      // applied flags — once a row is applied, leaving it visible
      // and disabled gives the operator a record of what shipped.
      setRowState((prev) => {
        const next = { ...prev };
        for (const r of data.results) {
          if (!next[r.id]) next[r.id] = { context: "", expanded: false, applied: false };
        }
        return next;
      });
      toast.success(`Generated ${data.succeeded}/${data.attempted} previews — review and Apply per row`);
    },
    onError: (e) => toast.error(e.message),
  });

  // Used both by the per-row Apply/Regenerate AND the bottom
  // "Enrich one with extra context" card. Both paths point at the
  // same enrichOne procedure.
  const enrichOneMut = trpc.admin.entityEnrichment.enrichOne.useMutation();

  const singlePreviewMut = trpc.admin.entityEnrichment.enrichOne.useMutation({
    onSuccess: (data: any) => {
      if (data.skipped) {
        toast.message(`Skipped: ${data.reason} (${data.existingLength} chars). Toggle "Force overwrite" to regenerate.`);
        setSingleResult(null);
        return;
      }
      setSingleResult({ description: data.description, name: data.name });
      toast.success(`Preview generated for ${data.name}`);
    },
    onError: (e) => {
      setSingleResult(null);
      toast.error(e.message);
    },
  });

  const singleApplyMut = trpc.admin.entityEnrichment.enrichOne.useMutation({
    onSuccess: (data: any) => {
      if (data.skipped) {
        toast.message(`Skipped: ${data.reason}`);
        return;
      }
      const fields = (data.appliedFields || ["description"]).join(", ");
      toast.success(`Saved (${fields}) for ${data.name}`);
      setSingleResult(null);
      setSingleId("");
      setSingleContext("");
      thinQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSwitchType = (next: EntityType) => {
    setType(next);
    setPreviewBatch(null);
    setRowState({});
    setCurrentPage(1);
    setSelectedIds(new Set());
  };

  const updateRowState = (id: number, patch: Partial<RowState>) => {
    setRowState((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  /** Re-run the AI on a single preview row, optionally with the
   *  context the operator pasted into that row's textarea. Replaces
   *  the row's description in-place so the rest of the preview list
   *  stays intact. */
  const handleRegenerateRow = async (id: number) => {
    setBusyRowId(id);
    try {
      const ctx = rowState[id]?.context;
      const res: any = await enrichOneMut.mutateAsync({
        type, id,
        dryRun: true,
        force: true,
        extraContext: ctx || undefined,
      });
      setPreviewBatch((prev) => prev?.map((r) =>
        r.id === id
          ? { ...r, ok: true, error: undefined, name: res.name, description: res.description, excerpt: res.excerpt }
          : r,
      ) ?? null);
      toast.success(ctx ? "Regenerated with your context" : "Regenerated");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusyRowId(null);
    }
  };

  /** Persist this single row to the DB, with whatever context the
   *  operator added. Marks the row applied (green, disabled) on
   *  success and refreshes the thin count. */
  const handleApplyRow = async (id: number) => {
    setBusyRowId(id);
    try {
      const ctx = rowState[id]?.context;
      const res: any = await enrichOneMut.mutateAsync({
        type, id,
        dryRun: false,
        force: true,
        extraContext: ctx || undefined,
      });
      const fields: string[] = res.appliedFields || ["description"];
      updateRowState(id, { applied: true, appliedFields: fields });
      // Sync the row's preview with whatever was actually written
      // (regenerate may have produced different text than the apply
      // pass when the LLM is non-deterministic).
      setPreviewBatch((prev) => prev?.map((r) =>
        r.id === id
          ? { ...r, ok: true, error: undefined, name: res.name, description: res.description, excerpt: res.excerpt }
          : r,
      ) ?? null);
      toast.success(`Saved (${fields.join(", ")}) for ${res.name}`);
      thinQuery.refetch();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusyRowId(null);
    }
  };

  const isBusy = dryRunMut.isPending || busyRowId !== null;

  // Pagination
  const ITEMS_PER_PAGE = 20;
  const totalPages = previewBatch ? Math.ceil(previewBatch.length / ITEMS_PER_PAGE) : 0;
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIdx = startIdx + ITEMS_PER_PAGE;
  const paginatedBatch = previewBatch?.slice(startIdx, endIdx) ?? [];

  // Multi-select handlers
  const toggleRowSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedBatch.length && paginatedBatch.length > 0) {
      setSelectedIds(new Set());
    } else {
      const allIds = new Set(paginatedBatch.map(r => r.id));
      setSelectedIds(allIds);
    }
  };

  // Bulk apply handler
  const handleBulkApply = async () => {
    if (selectedIds.size === 0) {
      toast.error("No rows selected");
      return;
    }

    setBusyRowId(-1); // Mark as busy
    try {
      let successCount = 0;
      for (const id of Array.from(selectedIds)) {
        try {
          const ctx = rowState[id]?.context;
          const res: any = await enrichOneMut.mutateAsync({
            type, id,
            dryRun: false,
            force: true,
            extraContext: ctx || undefined,
          });
          const fields: string[] = res.appliedFields || ["description"];
          updateRowState(id, { applied: true, appliedFields: fields });
          setPreviewBatch((prev) => prev?.map((r) =>
            r.id === id
              ? { ...r, ok: true, error: undefined, name: res.name, description: res.description, excerpt: res.excerpt }
              : r,
          ) ?? null);
          successCount++;
        } catch (e: any) {
          console.error(`Failed to apply row ${id}:`, e.message);
        }
      }
      toast.success(`Applied ${successCount}/${selectedIds.size} rows`);
      setSelectedIds(new Set());
      thinQuery.refetch();
    } finally {
      setBusyRowId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-emerald-200 bg-emerald-50/40">
        <CardContent className="p-5 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-emerald-700 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-900">AI bulk enrichment</p>
              <p className="text-sm text-emerald-800">
                <strong>Articles</strong>: fills empty SEO meta description + excerpt
                from the article body. Useful for clearing the SEO Manager's
                "missing meta description" / "missing excerpt" issue counts.
                <br />
                <strong>Profiles</strong> (people, companies, investors, events,
                accelerators): generates a factual long-form description from
                each row's structured fields plus excerpts from any articles
                that already mention it (via the entity-link tables) — no
                facts invented. For one-off entities with very little data,
                use the "Enrich one with extra context" box at the bottom
                to paste a LinkedIn bio or About-page paragraph.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pick entity type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TYPES.map((t) => {
              const isActive = type === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => handleSwitchType(t.value)}
                  className={`text-left p-4 rounded-md border-2 transition-all ${
                    isActive
                      ? "border-emerald-700 bg-emerald-50 shadow-sm"
                      : "border-border bg-background hover:border-muted-foreground/30 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold">{t.label}</span>
                    {isActive && <CheckCircle2 className="h-4 w-4 text-emerald-700" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{t.hint}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Thin {type === "person" ? "people" : `${type}s`}</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              Rows below the description floor — these are the candidates for enrichment.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => thinQuery.refetch()}
            disabled={thinQuery.isFetching}
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${thinQuery.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {thinQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Scanning…
            </div>
          ) : thinQuery.data ? (
            <>
              <div className="flex items-baseline gap-3 mb-4">
                <span className="text-3xl font-bold">{thinQuery.data.count}</span>
                <span className="text-sm text-muted-foreground">
                  {type === "person" ? "people" : `${type}s`}
                  {type === "article"
                    ? " need a meta description and/or excerpt"
                    : " need a longer description"}
                </span>
              </div>

              {thinQuery.data.sample.length > 0 ? (
                <div className="rounded-md border bg-muted/30 p-3 max-h-48 overflow-y-auto">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Sample</p>
                  <ul className="text-sm space-y-1">
                    {thinQuery.data.sample.slice(0, 12).map((r: any) => (
                      <li key={r.id} className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-mono">#{r.id}</Badge>
                        <span className="truncate">{r.name}</span>
                        <span className="text-xs text-muted-foreground font-mono truncate">/{r.slug}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  All {type === "person" ? "people" : `${type}s`} pass the threshold — nothing to do.
                </p>
              )}
            </>
          ) : null}
        </CardContent>
      </Card>

      {(thinQuery.data?.count ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Generate previews</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              onClick={() => {
                setCurrentPage(1);
                setSelectedIds(new Set());
                dryRunMut.mutate({ type, limit: 20, dryRun: true });
              }}
              disabled={isBusy}
              className="w-full"
            >
              {dryRunMut.isPending
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating previews…</>
                : <><Eye className="h-4 w-4 mr-2" /> Preview next 20 (dry-run)</>}
            </Button>
            <p className="text-xs text-muted-foreground">
              Generates 20 AI previews per batch. Nothing is written yet — review each
              preview below, select the ones you want to apply, then click <strong>Apply Selected</strong>.
              ≈ $0.001 per preview.
            </p>
          </CardContent>
        </Card>
      )}

      {previewBatch && previewBatch.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  Previews — review and Apply
                  <Badge variant="secondary" className="text-xs">{previewBatch.length} total</Badge>
                  {selectedIds.size > 0 && (
                    <Badge className="bg-blue-100 text-blue-800 text-xs">{selectedIds.size} selected</Badge>
                  )}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Nothing has been saved yet. Select rows and click <strong>Apply Selected</strong>. Use <strong>Add context</strong> to
                  paste a LinkedIn bio, Wikipedia paragraph, or About-page text
                  before regenerating — the AI weaves it in.
                </p>
              </div>
              {selectedIds.size > 0 && (
                <Button
                  onClick={handleBulkApply}
                  disabled={isBusy}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                >
                  {isBusy ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Applying…</>
                  ) : (
                    <><Zap className="h-4 w-4 mr-2" /> Apply Selected ({selectedIds.size})</>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Select all checkbox for current page */}
            {paginatedBatch.length > 0 && (
              <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md mb-2">
                <Checkbox
                  checked={selectedIds.size === paginatedBatch.length && paginatedBatch.length > 0}
                  onCheckedChange={toggleSelectAll}
                  id="select-all"
                />
                <Label htmlFor="select-all" className="text-xs cursor-pointer">
                  Select all on this page ({paginatedBatch.length})
                </Label>
              </div>
            )}
            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
            {paginatedBatch.map((r) => {
              const state = rowState[r.id] || { context: "", expanded: false, applied: false };
              const isThisRowBusy = busyRowId === r.id;
              const otherRowBusy = busyRowId !== null && busyRowId !== r.id;
              const cardCls = state.applied
                ? "rounded-md border-2 border-emerald-300 bg-emerald-50/40 p-4"
                : "rounded-md border p-4";
              return (
                <div key={r.id} className={cardCls}>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {!state.applied && (
                      <Checkbox
                        checked={selectedIds.has(r.id)}
                        onCheckedChange={() => toggleRowSelect(r.id)}
                        id={`row-${r.id}`}
                      />
                    )}
                    <Badge variant="outline" className="text-[10px] font-mono">#{r.id}</Badge>
                    <span className="font-medium text-sm">{r.name || "—"}</span>
                    {state.applied ? (
                      <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> applied
                      </Badge>
                    ) : r.ok ? (
                      <Badge className="bg-blue-100 text-blue-800 text-[10px]">preview</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800 text-[10px]">error</Badge>
                    )}
                    {state.applied && state.appliedFields && state.appliedFields.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        wrote: {state.appliedFields.join(", ")}
                      </span>
                    )}
                  </div>

                  {r.ok ? (
                    <>
                      <p className="text-sm text-foreground whitespace-pre-wrap mb-2">{r.description}</p>
                      {r.excerpt && (
                        <div className="mt-2 rounded-md bg-muted/50 p-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Excerpt</p>
                          <p className="text-xs text-foreground whitespace-pre-wrap">{r.excerpt}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-red-700 flex items-start gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      {r.error}
                    </p>
                  )}

                  {/* Per-row context + actions. Hidden once the row is
                      applied so the operator gets a clean visual cue
                      that this one is done. */}
                  {!state.applied && (
                    <div className="mt-3 space-y-2">
                      <button
                        type="button"
                        onClick={() => updateRowState(r.id, { expanded: !state.expanded })}
                        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                      >
                        <Wand2 className="h-3 w-3" />
                        {state.expanded ? "Hide context" : "Add context"}
                      </button>
                      {state.expanded && (
                        <Textarea
                          value={state.context}
                          onChange={(e) => updateRowState(r.id, { context: e.target.value })}
                          placeholder={
                            type === "person"
                              ? "Paste a LinkedIn bio, Wikipedia paragraph, or any factual note about this person."
                              : type === "article"
                              ? "Paste source material the article was based on, press release, etc."
                              : "Paste an About-page paragraph, Wikipedia entry, press release, or any factual note."
                          }
                          rows={4}
                          className="text-xs font-mono"
                        />
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRegenerateRow(r.id)}
                          disabled={isThisRowBusy || otherRowBusy}
                        >
                          {isThisRowBusy
                            ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Working…</>
                            : <><RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Regenerate{state.context ? " with context" : ""}</>}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApplyRow(r.id)}
                          disabled={isThisRowBusy || otherRowBusy || !r.ok}
                          className="bg-emerald-700 hover:bg-emerald-800"
                        >
                          {isThisRowBusy
                            ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Saving…</>
                            : <><Zap className="h-3.5 w-3.5 mr-1.5" /> Apply (writes to DB)</>}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Single-entity enrich with optional extra context. For
          profiles that returned "AI description too short" in batch
          mode, or for high-priority entities where the operator wants
          to paste in source material the prompt couldn't find on its
          own. */}
      <Card className="border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-blue-700" />
            Enrich one with extra context
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Use this for sparse entities where the structured fields aren't
            enough — paste a LinkedIn bio, About-page paragraph, or press
            release. The AI combines your text with the entity's row data
            and any existing news coverage.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="single-id">{type} ID</Label>
              <Input
                id="single-id"
                type="number"
                placeholder="e.g. 42"
                value={singleId}
                onChange={(e) => setSingleId(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2 flex items-end gap-2">
              <label className="text-sm flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={singleForce}
                  onChange={(e) => setSingleForce(e.target.checked)}
                  className="h-4 w-4"
                />
                Force overwrite (replace existing description even if it passes the floor)
              </label>
            </div>
          </div>
          <div>
            <Label htmlFor="single-context">Extra context (optional, max 5000 chars)</Label>
            <Textarea
              id="single-context"
              placeholder={`Paste any factual material about this ${type} — bio, About page, press release, news clipping. The AI will treat it as fact and weave it into the description.`}
              value={singleContext}
              onChange={(e) => setSingleContext(e.target.value)}
              rows={6}
              className="mt-1 font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {singleContext.length}/5000 characters
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              disabled={!singleId || singlePreviewMut.isPending || singleApplyMut.isPending}
              onClick={() => singlePreviewMut.mutate({
                type,
                id: parseInt(singleId, 10),
                dryRun: true,
                force: singleForce,
                extraContext: singleContext || undefined,
              })}
              className="flex-1"
            >
              {singlePreviewMut.isPending
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating preview…</>
                : <><Eye className="h-4 w-4 mr-2" /> Preview</>}
            </Button>
            <Button
              disabled={!singleId || singlePreviewMut.isPending || singleApplyMut.isPending}
              onClick={() => singleApplyMut.mutate({
                type,
                id: parseInt(singleId, 10),
                dryRun: false,
                force: singleForce,
                extraContext: singleContext || undefined,
              })}
              className="flex-1 bg-blue-700 hover:bg-blue-800"
            >
              {singleApplyMut.isPending
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Applying…</>
                : <><Zap className="h-4 w-4 mr-2" /> Apply (writes to DB)</>}
            </Button>
          </div>
          {singleResult && (
            <div className="rounded-md border bg-muted/30 p-3 mt-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Preview · {singleResult.name}</p>
              <p className="text-sm whitespace-pre-wrap">{singleResult.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}

export default ProfileEnrichmentPanel;
