/**
 * Talent / Application Detail — recruiter deep-view of a single applicant.
 * ----------------------------------------------------------------------
 * Companion to TalentPipeline (the kanban). This page is the drill-in
 * after a recruiter clicks a card: the full story of one application
 * including timeline, notes, interviews, offers, and raw application
 * data the candidate submitted.
 *
 * Backend wiring:
 *   - jobApplications.getJobApplications + client-side filter
 *       (no `getById` endpoint exists yet — see TODO below)
 *   - ats.pipeline.listStages          — stage picker
 *   - ats.pipeline.moveApplication     — stage move
 *   - ats.interview.listForApplication — interview list
 *   - ats.interview.schedule           — schedule dialog
 *   - ats.note.list / ats.note.add     — recruiter notes
 *   - ats.offer.findForApplication     — offer list
 *   - ats.offer.draft                  — offer dialog
 *
 * TODO(server): expose a `jobApplications.getById({ id })` so we don't
 * have to round-trip every application for the parent job just to load
 * one. Tracked alongside the pipeline rework.
 */

import { Link, useParams } from "wouter";
import { useMemo, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Award,
  Calendar,
  ExternalLink,
  Kanban,
  Linkedin,
  MessageSquare,
  Plus,
  User,
} from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  sourcing: "bg-slate-100 text-slate-700 border-slate-200",
  screening: "bg-blue-100 text-blue-700 border-blue-200",
  interviewing: "bg-purple-100 text-purple-700 border-purple-200",
  offer: "bg-amber-100 text-amber-700 border-amber-200",
  hired: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

const OFFER_STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  withdrawn: "bg-amber-100 text-amber-700",
};

const INTERVIEW_STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  rescheduled: "bg-amber-100 text-amber-700",
};

const INTERVIEW_TYPES = [
  "phone_screen",
  "technical",
  "system_design",
  "behavioral",
  "culture",
  "final",
  "ai_interview",
] as const;

type TimelineEvent = {
  kind: "stage" | "interview" | "note" | "offer";
  at: Date;
  actor: string | null;
  summary: string;
  detail?: string | null;
  raw: any;
};

export default function TalentApplicationDetail() {
  const params = useParams<{ id: string }>();
  const applicationId = Number(params.id);
  const utils = trpc.useUtils();

  // -- Fetch the application via getJobApplications + filter (see TODO).
  // We don't know the jobId from the URL, so we have to discover it.
  // Strategy: list all jobs the recruiter owns, then probe each until we
  // find the application. For now, we lean on a single bulk call to the
  // recruiter's first job and accept that this is iteration-1.
  // Practically: the link source (pipeline page) will already have
  // the jobId, but since we route by id only, we walk a few jobs.
  const jobs = trpc.jobs.adminList.useQuery({
    page: 1,
    limit: 50,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const jobIds = useMemo(
    () => ((jobs.data?.items as any[]) ?? []).map((j) => j.id as number),
    [jobs.data],
  );

  // Probe up to 10 jobs in parallel. This is a workaround until a
  // dedicated `getById` lands; see TODO above.
  const probe0 = useApplicationProbe(jobIds[0], applicationId);
  const probe1 = useApplicationProbe(jobIds[1], applicationId);
  const probe2 = useApplicationProbe(jobIds[2], applicationId);
  const probe3 = useApplicationProbe(jobIds[3], applicationId);
  const probe4 = useApplicationProbe(jobIds[4], applicationId);
  const probe5 = useApplicationProbe(jobIds[5], applicationId);
  const probe6 = useApplicationProbe(jobIds[6], applicationId);
  const probe7 = useApplicationProbe(jobIds[7], applicationId);
  const probe8 = useApplicationProbe(jobIds[8], applicationId);
  const probe9 = useApplicationProbe(jobIds[9], applicationId);
  const probes = [
    probe0,
    probe1,
    probe2,
    probe3,
    probe4,
    probe5,
    probe6,
    probe7,
    probe8,
    probe9,
  ];

  const found = probes.find((p) => p.application);
  const application: any = found?.application ?? null;
  const jobId: number | null = found?.jobId ?? null;
  const loading = jobs.isLoading || probes.some((p) => p.isLoading);

  // -- ATS queries (only enabled once we have the application id, which
  // is the URL param — independent of resolving the job).
  const stages = trpc.ats.pipeline.listStages.useQuery(
    { jobId: jobId ?? undefined },
    { enabled: !!jobId },
  );
  const interviews = trpc.ats.interview.listForApplication.useQuery({
    applicationId,
  });
  const notes = trpc.ats.note.list.useQuery({ applicationId });
  const offers = trpc.ats.offer.findForApplication.useQuery({ applicationId });

  const moveMut = trpc.ats.pipeline.moveApplication.useMutation({
    onSuccess: () => {
      toast.success("Stage updated.");
      utils.ats.pipeline.listStages.invalidate();
      utils.jobApplications.getJobApplications.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const addNoteMut = trpc.ats.note.add.useMutation({
    onSuccess: () => {
      toast.success("Note added.");
      utils.ats.note.list.invalidate({ applicationId });
    },
    onError: (e) => toast.error(e.message),
  });

  // -- Build timeline by merging all event sources.
  const timeline: TimelineEvent[] = useMemo(() => {
    const events: TimelineEvent[] = [];
    for (const iv of (interviews.data as any[]) ?? []) {
      events.push({
        kind: "interview",
        at: new Date(iv.scheduledAt ?? iv.createdAt ?? Date.now()),
        actor: iv.scheduledByName ?? null,
        summary: `${prettyInterviewType(iv.type)} interview ${iv.status ?? "scheduled"}`,
        detail: iv.meetingUrl ?? iv.location ?? null,
        raw: iv,
      });
    }
    for (const n of (notes.data as any[]) ?? []) {
      events.push({
        kind: "note",
        at: new Date(n.createdAt ?? Date.now()),
        actor: n.authorName ?? null,
        summary: `Note (${n.visibility ?? "team"})`,
        detail: n.body ?? null,
        raw: n,
      });
    }
    const offerList = offerToList(offers.data);
    for (const o of offerList) {
      events.push({
        kind: "offer",
        at: new Date(o.createdAt ?? o.draftedAt ?? Date.now()),
        actor: o.createdByName ?? null,
        summary: `Offer ${o.status ?? "drafted"}`,
        detail:
          o.baseSalary != null
            ? `${o.baseSalary} ${o.currency ?? "USD"}`
            : null,
        raw: o,
      });
    }
    // Synthetic "applied" event from the application itself.
    if (application?.appliedAt) {
      events.push({
        kind: "stage",
        at: new Date(application.appliedAt),
        actor: application.applicantName ?? null,
        summary: "Application submitted",
        detail: null,
        raw: application,
      });
    }
    events.sort((a, b) => b.at.getTime() - a.at.getTime());
    return events;
  }, [application, interviews.data, notes.data, offers.data]);

  const currentStage = ((stages.data as any[]) ?? []).find(
    (s) => s.id === application?.currentStageId,
  );

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link href="/admin/talent/pipeline">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" /> Pipeline
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Application #{applicationId}
              </h1>
              {loading ? (
                <Skeleton className="h-4 w-64 mt-1" />
              ) : application ? (
                <p className="text-sm text-muted-foreground">
                  {application.applicantName ?? "Unknown"}{" "}
                  <span className="text-muted-foreground/60">→</span>{" "}
                  {application.jobTitle ?? `Job #${jobId ?? "?"}`}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Application not found.
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <StagePicker
              stages={(stages.data as any[]) ?? []}
              currentStageId={application?.currentStageId ?? null}
              onMove={(toStageId) =>
                moveMut.mutate({ applicationId, toStageId })
              }
              disabled={moveMut.isPending || !application}
            />
            <DraftOfferButton applicationId={applicationId} />
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-4">
          {/* LEFT — 8 cols */}
          <div className="lg:col-span-8 space-y-4">
            {/* Candidate snapshot */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" /> Candidate
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-24 w-full" />
                ) : !application ? (
                  <p className="text-sm text-muted-foreground">
                    No candidate data available.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div>
                        <div className="font-medium">
                          {application.applicantName ?? "—"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {application.applicantEmail ?? "—"}
                        </div>
                        {(application.currentTitle ||
                          application.currentCompany) && (
                          <div className="text-sm mt-1">
                            {application.currentTitle}
                            {application.currentCompany &&
                              ` at ${application.currentCompany}`}
                          </div>
                        )}
                      </div>
                      {application.candidateId && (
                        <Link
                          href={`/admin/talent/candidates/${application.candidateId}`}
                        >
                          <Button variant="outline" size="sm">
                            Full profile{" "}
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                      )}
                    </div>
                    {application.skills?.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {application.skills
                          .slice(0, 20)
                          .map((s: string) => (
                            <Badge key={s} variant="secondary">
                              {s}
                            </Badge>
                          ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
                <CardDescription>
                  Stage moves, interviews, notes and offers — most recent first.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {interviews.isLoading ||
                notes.isLoading ||
                offers.isLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : timeline.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No activity recorded yet.
                  </p>
                ) : (
                  <ol className="relative border-l border-muted pl-5 space-y-4">
                    {timeline.map((ev, i) => (
                      <TimelineRow key={i} event={ev} />
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>

            {/* Recruiter notes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Recruiter notes
                </CardTitle>
                <CardDescription>
                  Notes are filtered server-side by visibility.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <NoteForm
                  pending={addNoteMut.isPending}
                  onSubmit={(body, visibility) =>
                    addNoteMut.mutate({
                      applicationId,
                      body,
                      visibility,
                    })
                  }
                />
                {notes.isLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : ((notes.data as any[]) ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No notes yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {((notes.data as any[]) ?? []).map((n) => (
                      <li
                        key={n.id}
                        className="border rounded-md p-3 text-sm space-y-1"
                      >
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {n.authorName ?? `User #${n.authorId ?? "?"}`}
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {n.visibility ?? "team"}
                            </Badge>
                            <span>{fmtDate(n.createdAt)}</span>
                          </div>
                        </div>
                        <p className="whitespace-pre-wrap">{n.body}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT — 4 cols */}
          <div className="lg:col-span-4 space-y-4">
            {/* Stage */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Kanban className="h-4 w-4" /> Stage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {currentStage ? (
                  <Badge
                    variant="outline"
                    className={
                      CATEGORY_COLORS[currentStage.category] ?? ""
                    }
                  >
                    {currentStage.name}
                  </Badge>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No stage assigned.
                  </p>
                )}
                <StagePicker
                  stages={(stages.data as any[]) ?? []}
                  currentStageId={application?.currentStageId ?? null}
                  onMove={(toStageId) =>
                    moveMut.mutate({ applicationId, toStageId })
                  }
                  disabled={moveMut.isPending || !application}
                  inline
                />
              </CardContent>
            </Card>

            {/* Interviews */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Interviews
                </CardTitle>
                <ScheduleInterviewButton applicationId={applicationId} />
              </CardHeader>
              <CardContent>
                {interviews.isLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : ((interviews.data as any[]) ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No interviews scheduled.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {((interviews.data as any[]) ?? []).map((iv) => (
                      <li
                        key={iv.id}
                        className="border rounded-md p-2 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {prettyInterviewType(iv.type)}
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              INTERVIEW_STATUS_COLORS[iv.status] ?? ""
                            }
                          >
                            {iv.status ?? "—"}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {fmtDate(iv.scheduledAt)}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Offers */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-4 w-4" /> Offers
                </CardTitle>
                <Link href="/admin/talent/offers">
                  <Button variant="ghost" size="sm">
                    Manage
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {offers.isLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : offerToList(offers.data).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No offers drafted.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {offerToList(offers.data).map((o) => (
                      <li
                        key={o.id}
                        className="border rounded-md p-2 text-sm space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <Badge
                            variant="outline"
                            className={
                              OFFER_STATUS_COLORS[o.status] ?? ""
                            }
                          >
                            {o.status ?? "draft"}
                          </Badge>
                          {o.baseSalary != null && (
                            <span className="font-mono text-xs">
                              {Number(o.baseSalary).toLocaleString()}{" "}
                              {o.currency ?? "USD"}
                            </span>
                          )}
                        </div>
                        {o.startDate && (
                          <div className="text-xs text-muted-foreground">
                            Starts {fmtDate(o.startDate)}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Raw application data */}
            <Card>
              <CardHeader>
                <CardTitle>Application details</CardTitle>
                <CardDescription>
                  Submitted by the applicant.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {loading ? (
                  <Skeleton className="h-32 w-full" />
                ) : !application ? (
                  <p className="text-muted-foreground">No data.</p>
                ) : (
                  <>
                    <RawField label="Cover letter" multiline>
                      {application.coverLetter ?? null}
                    </RawField>
                    <RawField label="LinkedIn">
                      {application.linkedinUrl ? (
                        <a
                          href={application.linkedinUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline inline-flex items-center gap-1"
                        >
                          <Linkedin className="h-3 w-3" />
                          {application.linkedinUrl}
                        </a>
                      ) : null}
                    </RawField>
                    <RawField label="Portfolio">
                      {application.portfolioUrl ? (
                        <a
                          href={application.portfolioUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline inline-flex items-center gap-1"
                        >
                          {application.portfolioUrl}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </RawField>
                    <RawField label="Expected salary">
                      {application.expectedSalary != null
                        ? `${Number(
                            application.expectedSalary,
                          ).toLocaleString()} ${
                            application.expectedSalaryCurrency ?? "USD"
                          }`
                        : null}
                    </RawField>
                    <RawField label="Notice period">
                      {application.noticePeriod ?? null}
                    </RawField>
                    <RawField label="CV">
                      {application.cvUrl ? (
                        <a
                          href={application.cvUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline inline-flex items-center gap-1"
                        >
                          View CV <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </RawField>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

// ============================================================
// Hooks / helpers
// ============================================================

/**
 * Probe a single job's application list for a specific application id.
 * Returns the matched application (if any) plus the jobId that owned it.
 * Disabled when jobId is undefined so React Query stays stable across renders.
 */
function useApplicationProbe(jobId: number | undefined, applicationId: number) {
  const q = trpc.jobApplications.getJobApplications.useQuery(
    {
      jobId: jobId ?? 0,
      status: "all",
      page: 1,
      limit: 500,
    },
    { enabled: !!jobId },
  );
  const list = ((q.data as any)?.applications ?? []) as any[];
  const application = list.find((a) => a.id === applicationId) ?? null;
  return { application, jobId: application ? (jobId ?? null) : null, isLoading: q.isLoading };
}

/**
 * `ats.offer.findForApplication` returns a single offer (or null). The
 * UI lists it like an array for forward-compatibility with a future
 * `listForApplication` endpoint that supports multiple revisions.
 */
function offerToList(data: unknown): any[] {
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
}

function prettyInterviewType(t: string | null | undefined): string {
  if (!t) return "Interview";
  return t
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

// ============================================================
// Subcomponents
// ============================================================

function TimelineRow({ event }: { event: TimelineEvent }) {
  const [open, setOpen] = useState(false);
  const Icon = iconForKind(event.kind);
  return (
    <li className="ml-2">
      <span className="absolute -left-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-background border">
        <Icon className="h-3 w-3 text-muted-foreground" />
      </span>
      <button
        className="text-left w-full"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">{event.summary}</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {fmtDate(event.at)}
          </span>
        </div>
        {event.actor && (
          <div className="text-xs text-muted-foreground">
            by {event.actor}
          </div>
        )}
      </button>
      {open && event.detail && (
        <div className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap border-l-2 border-muted pl-3">
          {event.detail}
        </div>
      )}
    </li>
  );
}

function iconForKind(kind: TimelineEvent["kind"]) {
  switch (kind) {
    case "interview":
      return Calendar;
    case "note":
      return MessageSquare;
    case "offer":
      return Award;
    case "stage":
    default:
      return Kanban;
  }
}

function StagePicker({
  stages,
  currentStageId,
  onMove,
  disabled,
  inline,
}: {
  stages: any[];
  currentStageId: number | null;
  onMove: (toStageId: number) => void;
  disabled: boolean;
  inline?: boolean;
}) {
  const ordered = [...stages].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0),
  );
  return (
    <Select
      value={currentStageId != null ? String(currentStageId) : ""}
      onValueChange={(v) => v && onMove(Number(v))}
      disabled={disabled}
    >
      <SelectTrigger className={inline ? "w-full" : "w-48"}>
        <SelectValue placeholder="Move stage…" />
      </SelectTrigger>
      <SelectContent>
        {ordered.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            No stages configured.
          </div>
        ) : (
          ordered.map((s) => (
            <SelectItem key={s.id} value={String(s.id)}>
              {s.name}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

function NoteForm({
  pending,
  onSubmit,
}: {
  pending: boolean;
  onSubmit: (
    body: string,
    visibility: "private" | "team" | "tenant",
  ) => void;
}) {
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<
    "private" | "team" | "tenant"
  >("team");
  const submit = () => {
    if (!body.trim()) {
      toast.error("Note can't be empty.");
      return;
    }
    onSubmit(body, visibility);
    setBody("");
  };
  return (
    <div className="space-y-2 border rounded-md p-3 bg-muted/30">
      <Textarea
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Leave a note about this applicant…"
      />
      <div className="flex items-center justify-between gap-2">
        <Select
          value={visibility}
          onValueChange={(v) =>
            setVisibility(v as "private" | "team" | "tenant")
          }
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="private">Private</SelectItem>
            <SelectItem value="team">Team</SelectItem>
            <SelectItem value="tenant">Tenant</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={submit} disabled={pending}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add note
        </Button>
      </div>
    </div>
  );
}

function ScheduleInterviewButton({
  applicationId,
}: {
  applicationId: number;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<(typeof INTERVIEW_TYPES)[number]>(
    "phone_screen",
  );
  const [scheduledAt, setScheduledAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [interviewerIds, setInterviewerIds] = useState("");

  const utils = trpc.useUtils();
  const scheduleMut = trpc.ats.interview.schedule.useMutation({
    onSuccess: () => {
      toast.success("Interview scheduled.");
      utils.ats.interview.listForApplication.invalidate({ applicationId });
      setOpen(false);
      setScheduledAt("");
      setMeetingUrl("");
      setInterviewerIds("");
    },
    onError: (e) => toast.error(e.message),
  });

  const submit = () => {
    if (!scheduledAt) {
      toast.error("Pick a date and time.");
      return;
    }
    const ids = interviewerIds
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (ids.length === 0) {
      toast.error("At least one interviewer id is required.");
      return;
    }
    scheduleMut.mutate({
      applicationId,
      type,
      scheduledAt: new Date(scheduledAt),
      durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
      meetingUrl: meetingUrl || undefined,
      assignedInterviewerIds: ids,
    } as any);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Schedule
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule interview</DialogTitle>
            <DialogDescription>
              Interviewers are notified once scheduled.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select
                value={type}
                onValueChange={(v) =>
                  setType(v as (typeof INTERVIEW_TYPES)[number])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVIEW_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {prettyInterviewType(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">When</Label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Duration (min)</Label>
                <Input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Meeting URL</Label>
              <Input
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Interviewer user ids (comma-separated)
              </Label>
              <Input
                value={interviewerIds}
                onChange={(e) => setInterviewerIds(e.target.value)}
                placeholder="42, 88"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={scheduleMut.isPending}>
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DraftOfferButton({ applicationId }: { applicationId: number }) {
  const [open, setOpen] = useState(false);
  const [baseSalary, setBaseSalary] = useState("");
  const [bonus, setBonus] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [startDate, setStartDate] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [letterBody, setLetterBody] = useState("");

  const utils = trpc.useUtils();
  const draftMut = trpc.ats.offer.draft.useMutation({
    onSuccess: () => {
      toast.success("Offer drafted.");
      utils.ats.offer.findForApplication.invalidate({ applicationId });
      setOpen(false);
      setBaseSalary("");
      setBonus("");
      setCurrency("USD");
      setStartDate("");
      setExpiresAt("");
      setLetterBody("");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Award className="h-4 w-4 mr-2" /> Draft offer
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Draft an offer</DialogTitle>
            <DialogDescription>
              Saves as a draft. Send it from the Offers page when ready.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Base salary</Label>
                <Input
                  type="number"
                  value={baseSalary}
                  onChange={(e) => setBaseSalary(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Bonus</Label>
                <Input
                  type="number"
                  value={bonus}
                  onChange={(e) => setBonus(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Currency</Label>
                <Input
                  value={currency}
                  onChange={(e) =>
                    setCurrency(e.target.value.toUpperCase())
                  }
                  maxLength={3}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Start date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Expires</Label>
                <Input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Offer letter (optional)</Label>
              <Textarea
                rows={4}
                value={letterBody}
                onChange={(e) => setLetterBody(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                draftMut.mutate({
                  applicationId,
                  baseSalary: baseSalary ? Number(baseSalary) : undefined,
                  bonus: bonus ? Number(bonus) : undefined,
                  currency: currency || undefined,
                  startDate: startDate ? new Date(startDate) : undefined,
                  expiresAt: expiresAt ? new Date(expiresAt) : undefined,
                  letterBody: letterBody || undefined,
                })
              }
              disabled={draftMut.isPending}
            >
              Draft offer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function RawField({
  label,
  children,
  multiline,
}: {
  label: string;
  children: React.ReactNode;
  multiline?: boolean;
}) {
  const isEmpty =
    children == null || children === "" || children === false;
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">
        {label}
      </div>
      <div
        className={
          multiline
            ? "text-sm whitespace-pre-wrap mt-1"
            : "text-sm mt-1"
        }
      >
        {isEmpty ? <span className="text-muted-foreground">—</span> : children}
      </div>
    </div>
  );
}
