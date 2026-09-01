/**
 * Talent / Interview Feedback — submission UI
 * ----------------------------------------------------------------------
 * Per-interviewer feedback form for a single interview. Submits to
 * `ats.feedback.submit`. The backend enforces anti-bias gating: other
 * interviewers' feedback is only readable after the current user has
 * submitted their own. After a successful submit we toggle a local flag
 * and render the peer-feedback panel from `ats.feedback.listForInterview`.
 *
 * We fetch the interview metadata via `ats.interview.listForApplication`
 * because there is no `findById` on the interview router. We don't know
 * the applicationId from the URL, so we render a graceful header that
 * falls back to "Interview #{id}" if we can't pull the row cheaply.
 * Strategy: we attempt `listUpcoming` (the cheapest broad query) and
 * filter for our id; if not found, header degrades.
 */

import { useState } from "react";
import { Link, useParams } from "wouter";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Star,
} from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  phone_screen: "Phone screen",
  technical: "Technical",
  system_design: "System design",
  behavioral: "Behavioral",
  culture: "Culture fit",
  final: "Final",
  ai_interview: "AI interview",
};

const RECOMMENDATION_OPTIONS: { value: string; label: string }[] = [
  { value: "strong_hire", label: "Strong hire" },
  { value: "hire", label: "Hire" },
  { value: "unsure", label: "Unsure" },
  { value: "no_hire", label: "No hire" },
  { value: "strong_no_hire", label: "Strong no hire" },
];

const RECOMMENDATION_STYLES: Record<string, string> = {
  strong_hire: "bg-green-100 text-green-800",
  hire: "bg-emerald-100 text-emerald-800",
  unsure: "bg-amber-100 text-amber-800",
  no_hire: "bg-orange-100 text-orange-800",
  strong_no_hire: "bg-red-100 text-red-800",
};

export default function TalentInterviewFeedback() {
  const params = useParams<{ id: string }>();
  const interviewId = Number(params.id);

  // Anti-bias gating happens server-side; we also keep a local flag so
  // the peer panel renders as soon as the mutation resolves.
  const [submitted, setSubmitted] = useState(false);

  // Form state — all optional except recommendation.
  const [overallRating, setOverallRating] = useState<number | null>(null);
  const [technicalRating, setTechnicalRating] = useState<number | null>(null);
  const [communicationRating, setCommunicationRating] = useState<number | null>(null);
  const [cultureRating, setCultureRating] = useState<number | null>(null);
  const [recommendation, setRecommendation] = useState<string>("");
  const [strengths, setStrengths] = useState("");
  const [concerns, setConcerns] = useState("");
  const [notes, setNotes] = useState("");

  // No findById exists; surface a cheap pull of the upcoming window so we
  // can show a useful header. Falls back gracefully if not present.
  const upcoming = trpc.ats.interview.listUpcoming.useQuery({ days: 90 });
  const interview: any =
    (upcoming.data as any[] | undefined)?.find((iv) => iv.id === interviewId) ?? null;

  const peerList = trpc.ats.feedback.listForInterview.useQuery(
    { interviewId },
    { enabled: submitted && Number.isFinite(interviewId) },
  );

  const submitMut = trpc.ats.feedback.submit.useMutation({
    onSuccess: () => {
      toast.success("Feedback submitted.");
      setSubmitted(true);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!Number.isFinite(interviewId)) {
      toast.error("Missing interview id.");
      return;
    }
    if (!recommendation) {
      toast.error("Pick a recommendation before submitting.");
      return;
    }
    submitMut.mutate({
      interviewId,
      overallRating: overallRating ?? undefined,
      technicalRating: technicalRating ?? undefined,
      communicationRating: communicationRating ?? undefined,
      cultureRating: cultureRating ?? undefined,
      recommendation: recommendation as any,
      strengths: strengths.trim() || undefined,
      concerns: concerns.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/admin/talent/interviews">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to interviews
            </Button>
          </Link>
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">Interview feedback</h1>
          {upcoming.isLoading ? (
            <Skeleton className="h-4 w-72 mt-2" />
          ) : interview ? (
            <>
              <p className="text-sm text-muted-foreground mt-1">
                {TYPE_LABELS[interview.type] ?? interview.type} interview for application{" "}
                <Link href={`/admin/jobs/${interview.jobId ?? ""}/applications`}>
                  <span className="text-primary hover:underline cursor-pointer">
                    #{interview.applicationId}
                  </span>
                </Link>
              </p>
              {interview.scheduledAt && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Calendar className="h-3.5 w-3.5" /> Scheduled:{" "}
                  {new Date(interview.scheduledAt).toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">Interview #{interviewId}</p>
          )}
        </div>

        {/* Anti-bias notice */}
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4 text-sm text-amber-900">
            Submit your feedback BEFORE seeing other interviewers' comments to
            keep the read clean.
          </CardContent>
        </Card>

        {/* Form */}
        {!submitted ? (
          <Card>
            <CardHeader>
              <CardTitle>Your feedback</CardTitle>
              <CardDescription>
                Rate the candidate on each axis, then pick a recommendation.
                Only the recommendation is required.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <RatingRow label="Overall" value={overallRating} onChange={setOverallRating} />
                <RatingRow label="Technical" value={technicalRating} onChange={setTechnicalRating} />
                <RatingRow
                  label="Communication"
                  value={communicationRating}
                  onChange={setCommunicationRating}
                />
                <RatingRow label="Culture" value={cultureRating} onChange={setCultureRating} />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Recommendation <span className="text-red-600">*</span>
                </Label>
                <RadioGroup
                  value={recommendation}
                  onValueChange={setRecommendation}
                  className="grid sm:grid-cols-5 gap-2"
                >
                  {RECOMMENDATION_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      htmlFor={`rec-${opt.value}`}
                      className="flex items-center gap-2 border rounded-md p-2.5 cursor-pointer hover:bg-muted/40"
                    >
                      <RadioGroupItem value={opt.value} id={`rec-${opt.value}`} />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Strengths</Label>
                <Textarea
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                  rows={4}
                  placeholder="What did they do well?"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Concerns</Label>
                <Textarea
                  value={concerns}
                  onChange={(e) => setConcerns(e.target.value)}
                  rows={4}
                  placeholder="Where did they struggle? Any reservations?"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={6}
                  placeholder="General remarks, signals, follow-up items."
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSubmit} disabled={submitMut.isPending}>
                  {submitMut.isPending ? "Submitting…" : "Submit feedback"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-700 mt-0.5" />
                <div>
                  <div className="font-medium text-green-900">Submitted</div>
                  <p className="text-sm text-green-800">
                    Your feedback was recorded. You can now see other
                    interviewers' feedback.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Other interviewers</CardTitle>
                <CardDescription>
                  Feedback from everyone assigned to this interview.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {peerList.isLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : peerList.error ? (
                  <div className="text-sm text-muted-foreground">
                    Couldn't load peer feedback: {peerList.error.message}
                  </div>
                ) : (peerList.data?.length ?? 0) === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No other feedback submitted yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(peerList.data as any[]).map((row) => (
                      <PeerRow key={row.id} row={row} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

// ------------------------------------------------------------
// Inline star rating — 5 clickable buttons. Click again to clear.
// ------------------------------------------------------------
function RatingRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label} rating</Label>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = value !== null && n <= value;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(value === n ? null : n)}
              className="p-0.5 rounded hover:bg-muted/60"
              aria-label={`${label} ${n} of 5`}
            >
              <Star
                className={`h-6 w-6 ${
                  filled ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                }`}
              />
            </button>
          );
        })}
        {value !== null && (
          <span className="text-xs text-muted-foreground ml-1 tabular-nums">{value}/5</span>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Expandable peer feedback row.
// ------------------------------------------------------------
function PeerRow({ row }: { row: any }) {
  const [open, setOpen] = useState(false);
  const rec = row.recommendation as string | null;
  const hasDetails = row.strengths || row.concerns || row.notes;

  return (
    <div className="border rounded-md">
      <button
        type="button"
        onClick={() => hasDetails && setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left ${
          hasDetails ? "hover:bg-muted/30 cursor-pointer" : "cursor-default"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {hasDetails ? (
            open ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            )
          ) : (
            <span className="w-4 shrink-0" />
          )}
          <div className="min-w-0">
            <div className="text-sm font-medium">Interviewer #{row.interviewerId}</div>
            <div className="text-xs text-muted-foreground">
              {row.submittedAt
                ? new Date(row.submittedAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "—"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {row.overallRating !== null && row.overallRating !== undefined && (
            <span className="flex items-center gap-1 text-sm">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="tabular-nums">{row.overallRating}/5</span>
            </span>
          )}
          {rec && (
            <Badge variant="outline" className={RECOMMENDATION_STYLES[rec] ?? ""}>
              {rec.replace(/_/g, " ")}
            </Badge>
          )}
        </div>
      </button>
      {open && hasDetails && (
        <div className="border-t px-3 py-3 space-y-3 text-sm bg-muted/10">
          {row.strengths && (
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Strengths
              </div>
              <p className="whitespace-pre-wrap">{row.strengths}</p>
            </div>
          )}
          {row.concerns && (
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Concerns
              </div>
              <p className="whitespace-pre-wrap">{row.concerns}</p>
            </div>
          )}
          {row.notes && (
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Notes
              </div>
              <p className="whitespace-pre-wrap">{row.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
