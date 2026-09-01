/**
 * Admin Event Submissions Queue  (/admin/events/submissions)
 * ---------------------------------------------------------------------
 * Triage UI for the rows piling up in `event_submissions`. Mirrors the
 * pattern in UserSubmissions.tsx: tabs across the top, list of rows,
 * approve/reject actions, expandable AI verdict.
 *
 * Tabs:
 *   - "Needs review"  : status in (pending, ai_approved, ai_flagged)
 *   - "Approved"      : status = approved
 *   - "Rejected"      : status = rejected
 *
 * Bulk approve is gated to ai_approved rows with score >= 90 — the
 * router enforces this defensively too, but we hide the button when
 * the filter doesn't qualify so admins don't reach for it on flagged
 * submissions by accident.
 */

import { useMemo, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Calendar,
  MapPin,
  Mail,
  Globe,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Sparkles,
  Loader2,
  Inbox,
} from "lucide-react";

type TabKey = "needs_review" | "approved" | "rejected";

const TABS: { key: TabKey; label: string; statusFilter: any }[] = [
  { key: "needs_review", label: "Needs review", statusFilter: "needs_review" },
  { key: "approved", label: "Approved", statusFilter: "approved" },
  { key: "rejected", label: "Rejected", statusFilter: "rejected" },
];

// AI verdict tag → visual treatment. Kept in one map so the badges,
// row borders, and tab counters always agree.
const STATUS_META: Record<
  string,
  { label: string; tone: string; icon: typeof Clock }
> = {
  pending: {
    label: "Pending AI",
    tone: "bg-gray-100 text-gray-700 border-gray-300",
    icon: Clock,
  },
  ai_approved: {
    label: "AI approved",
    tone: "bg-emerald-100 text-emerald-800 border-emerald-300",
    icon: CheckCircle2,
  },
  ai_flagged: {
    label: "AI flagged",
    tone: "bg-amber-100 text-amber-800 border-amber-300",
    icon: AlertTriangle,
  },
  approved: {
    label: "Approved",
    tone: "bg-blue-100 text-blue-800 border-blue-300",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    tone: "bg-red-100 text-red-800 border-red-300",
    icon: XCircle,
  },
};

export default function EventSubmissionsQueue() {
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<TabKey>("needs_review");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Filter (within Needs Review tab only) — handy for narrowing the
  // bulk-approve scope to ai_approved rows.
  const [verdictFilter, setVerdictFilter] = useState<
    "all" | "pending" | "ai_approved" | "ai_flagged"
  >("all");

  // Active submission for the approve dialog
  const [approveTarget, setApproveTarget] = useState<any | null>(null);
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});

  const listQuery = trpc.events.adminListSubmissions.useQuery(
    {
      status: TABS.find((t) => t.key === tab)!.statusFilter,
      page: 1,
      limit: 50,
    },
    { refetchInterval: 30_000 },
  );

  const approveMut = trpc.events.adminApproveSubmission.useMutation({
    onSuccess: () => {
      toast.success("Submission approved and event created.");
      utils.events.adminListSubmissions.invalidate();
      setApproveTarget(null);
      setEditedFields({});
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rejectMut = trpc.events.adminRejectSubmission.useMutation({
    onSuccess: () => {
      toast.success("Submission rejected.");
      utils.events.adminListSubmissions.invalidate();
      setRejectTarget(null);
      setRejectReason("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkApproveMut = trpc.events.adminBulkApproveSubmissions.useMutation({
    onSuccess: (res: any) => {
      toast.success(
        `Bulk approve done — ${res.created} created${
          res.skipped ? `, ${res.skipped} skipped` : ""
        }.`,
      );
      utils.events.adminListSubmissions.invalidate();
      setSelected(new Set());
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reModerateMut = trpc.events.adminReModerateSubmission.useMutation({
    onSuccess: () => {
      toast.success("Re-moderated.");
      utils.events.adminListSubmissions.invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const counts = listQuery.data?.counts;
  const allItems = listQuery.data?.items ?? [];

  // Apply the verdict filter only on the Needs Review tab.
  const items = useMemo(() => {
    if (tab !== "needs_review" || verdictFilter === "all") return allItems;
    return allItems.filter((i: any) => i.moderationStatus === verdictFilter);
  }, [allItems, tab, verdictFilter]);

  // Bulk-approve gate: only when filtered to ai_approved AND every
  // selected row has score >= 90.
  const bulkApproveAllowed =
    verdictFilter === "ai_approved" &&
    selected.size > 0 &&
    items
      .filter((i: any) => selected.has(i.id))
      .every((i: any) => (i.moderationScore ?? 0) >= 90);

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleApprove = () => {
    if (!approveTarget) return;
    // Only send overrides for fields the admin actually changed —
    // empty/unchanged values fall through to the submission's
    // stored value on the server.
    const overrides: any = {};
    for (const [k, v] of Object.entries(editedFields)) {
      if (v && v !== approveTarget[k]) overrides[k] = v;
    }
    approveMut.mutate({
      submissionId: approveTarget.id,
      eventData: Object.keys(overrides).length ? overrides : undefined,
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Event Submissions
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Public-submitted events awaiting approval. AI does first-pass
              triage; you make the call.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => listQuery.refetch()}
          >
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => { setTab(v as TabKey); setSelected(new Set()); }}>
          <TabsList>
            {TABS.map((t) => {
              const n =
                t.key === "needs_review"
                  ? counts?.needs_review
                  : counts?.[t.key];
              return (
                <TabsTrigger key={t.key} value={t.key} className="gap-2">
                  {t.label}
                  {typeof n === "number" && (
                    <Badge variant="secondary" className="ml-1">
                      {n}
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {/* Verdict sub-filter — Needs Review only */}
        {tab === "needs_review" && (
          <div className="flex flex-wrap items-center gap-2">
            {(["all", "ai_approved", "ai_flagged", "pending"] as const).map((v) => (
              <button
                key={v}
                onClick={() => { setVerdictFilter(v); setSelected(new Set()); }}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  verdictFilter === v
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:bg-accent"
                }`}
              >
                {v === "all" ? "All" : STATUS_META[v]?.label || v}
              </button>
            ))}
            {bulkApproveAllowed && (
              <Button
                size="sm"
                className="ml-auto"
                onClick={() =>
                  bulkApproveMut.mutate({
                    submissionIds: Array.from(selected),
                  })
                }
                disabled={bulkApproveMut.isPending}
              >
                {bulkApproveMut.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                )}
                Bulk approve ({selected.size})
              </Button>
            )}
          </div>
        )}

        {/* List */}
        {listQuery.isLoading ? (
          <div className="text-center py-20 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            Loading submissions…
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Inbox className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p>No submissions in this view.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {items.map((sub: any) => {
              const meta = STATUS_META[sub.moderationStatus] || STATUS_META.pending;
              const Icon = meta.icon;
              const isExpanded = expanded.has(sub.id);
              const isSelected = selected.has(sub.id);
              const canSelect =
                tab === "needs_review" &&
                verdictFilter === "ai_approved" &&
                (sub.moderationScore ?? 0) >= 90;

              return (
                <Card key={sub.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {canSelect && (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(sub.id)}
                          className="mt-1"
                        />
                      )}

                      <div className="flex-1 min-w-0">
                        {/* Title row */}
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-base">{sub.title}</h3>
                            {sub.tagline && (
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {sub.tagline}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant="outline" className={meta.tone}>
                              <Icon className="h-3 w-3 mr-1" />
                              {meta.label}
                            </Badge>
                            {typeof sub.moderationScore === "number" && (
                              <Badge variant="secondary">
                                {sub.moderationScore}%
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Meta line */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                          {sub.startDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(sub.startDate).toLocaleDateString()}
                            </span>
                          )}
                          {(sub.city || sub.country) && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {[sub.city, sub.country].filter(Boolean).join(", ")}
                            </span>
                          )}
                          {sub.type && <span>· {sub.type}</span>}
                          <span>
                            · Submitted by{" "}
                            <Link
                              href={`/admin/users?id=${sub.submitterId}`}
                              className="underline hover:text-foreground"
                            >
                              {sub.submitterName || `User #${sub.submitterId}`}
                            </Link>{" "}
                            on {new Date(sub.createdAt).toLocaleDateString()}
                          </span>
                          {sub.approvedEventId && (
                            <Link
                              href={`/admin/events/${sub.approvedEventId}`}
                              className="flex items-center gap-1 text-blue-600 hover:underline"
                            >
                              View event <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}
                        </div>

                        {/* AI reasoning (collapsible) */}
                        {sub.moderationReasoning && (
                          <div className="mt-2">
                            <button
                              onClick={() => toggleExpand(sub.id)}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )}
                              AI reasoning
                            </button>
                            {isExpanded && (
                              <div className="mt-2 p-3 rounded-md bg-muted/50 text-xs text-foreground">
                                <Sparkles className="inline h-3 w-3 mr-1 text-amber-500" />
                                {sub.moderationReasoning}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Expanded full details */}
                        {isExpanded && (
                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            {sub.description && (
                              <div className="sm:col-span-2">
                                <Label className="text-muted-foreground">
                                  Description
                                </Label>
                                <p className="whitespace-pre-line mt-1">
                                  {sub.description}
                                </p>
                              </div>
                            )}
                            {sub.venue && (
                              <DetailRow label="Venue" value={sub.venue} />
                            )}
                            {sub.organizerName && (
                              <DetailRow
                                label="Organizer"
                                value={sub.organizerName}
                              />
                            )}
                            {sub.organizerEmail && (
                              <DetailRow
                                label="Organizer email"
                                value={sub.organizerEmail}
                                icon={Mail}
                              />
                            )}
                            {sub.websiteUrl && (
                              <DetailRow
                                label="Website"
                                value={sub.websiteUrl}
                                icon={Globe}
                                href={sub.websiteUrl}
                              />
                            )}
                            {sub.registrationUrl && (
                              <DetailRow
                                label="Registration"
                                value={sub.registrationUrl}
                                icon={ExternalLink}
                                href={sub.registrationUrl}
                              />
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        {(sub.moderationStatus === "pending" ||
                          sub.moderationStatus === "ai_approved" ||
                          sub.moderationStatus === "ai_flagged") && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            <Button
                              size="sm"
                              onClick={() => {
                                setApproveTarget(sub);
                                setEditedFields({
                                  title: sub.title || "",
                                  tagline: sub.tagline || "",
                                  description: sub.description || "",
                                  venue: sub.venue || "",
                                  city: sub.city || "",
                                  country: sub.country || "",
                                  websiteUrl: sub.websiteUrl || "",
                                  registrationUrl: sub.registrationUrl || "",
                                  organizerName: sub.organizerName || "",
                                  organizerEmail: sub.organizerEmail || "",
                                });
                              }}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRejectTarget(sub)}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                reModerateMut.mutate({ submissionId: sub.id })
                              }
                              disabled={reModerateMut.isPending}
                            >
                              <Sparkles className="h-3.5 w-3.5 mr-1" />
                              Re-moderate
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ───────────────── Approve dialog ───────────────── */}
      <Dialog
        open={!!approveTarget}
        onOpenChange={(o) => !o && setApproveTarget(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Approve event submission</DialogTitle>
            <DialogDescription>
              Edit any fields before publishing. Blank/unchanged fields
              fall back to the submission's stored value.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-3 py-2">
              {(
                [
                  ["title", "Title"],
                  ["tagline", "Tagline"],
                  ["description", "Description"],
                  ["venue", "Venue"],
                  ["city", "City"],
                  ["country", "Country"],
                  ["websiteUrl", "Website"],
                  ["registrationUrl", "Registration"],
                  ["organizerName", "Organizer"],
                  ["organizerEmail", "Organizer email"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  {key === "description" ? (
                    <Textarea
                      rows={4}
                      value={editedFields[key] || ""}
                      onChange={(e) =>
                        setEditedFields((f) => ({ ...f, [key]: e.target.value }))
                      }
                    />
                  ) : (
                    <Input
                      value={editedFields[key] || ""}
                      onChange={(e) =>
                        setEditedFields((f) => ({ ...f, [key]: e.target.value }))
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={approveMut.isPending}>
              {approveMut.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Approving…
                </>
              ) : (
                "Approve & publish"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────────────── Reject dialog ───────────────── */}
      <Dialog
        open={!!rejectTarget}
        onOpenChange={(o) => !o && setRejectTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject submission</DialogTitle>
            <DialogDescription>
              The submission stays visible under the Rejected tab. Optionally
              note why for the audit trail.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason (optional)"
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                rejectTarget &&
                rejectMut.mutate({
                  submissionId: rejectTarget.id,
                  reason: rejectReason.trim() || undefined,
                })
              }
              disabled={rejectMut.isPending}
            >
              {rejectMut.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Rejecting…
                </>
              ) : (
                "Reject"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function DetailRow({
  label,
  value,
  icon: Icon,
  href,
}: {
  label: string;
  value: string;
  icon?: typeof Globe;
  href?: string;
}) {
  return (
    <div>
      <Label className="text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-1 mt-0.5 break-all">
        {Icon && <Icon className="h-3 w-3 flex-shrink-0" />}
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline"
          >
            {value}
          </a>
        ) : (
          <span>{value}</span>
        )}
      </div>
    </div>
  );
}
