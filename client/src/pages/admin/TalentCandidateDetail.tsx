/**
 * Talent / Candidate Detail — recruiter page
 * ----------------------------------------------------------------------
 * Single candidate's profile with the full recruiter toolkit:
 *   - Profile (headline, parsed resume, contact)
 *   - Composite score (resume + github + assessment + match)
 *   - GitHub intelligence snapshot
 *   - Top job matches for this candidate (Qdrant-backed)
 *   - Quick actions: re-score, embed, archive
 *
 * Each section degrades gracefully when its backend service isn't
 * configured (Qdrant absent → empty matches, GitHub not connected →
 * "no profile linked", etc.).
 */

import { Link, useParams } from "wouter";
import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useState } from "react";
import {
  ArrowLeft,
  Archive,
  Award,
  ArchiveRestore,
  Github,
  RefreshCw,
  Sparkles,
  Target,
  MapPin,
  Briefcase,
} from "lucide-react";

export default function TalentCandidateDetail() {
  const params = useParams<{ id: string }>();
  const candidateId = Number(params.id);

  const utils = trpc.useUtils();
  const candidate = trpc.candidates.getById.useQuery({ id: candidateId });
  const score = trpc.matching.score.getCurrent.useQuery({ candidateId });
  const github = trpc.github.getForCandidate.useQuery({ candidateId });
  const matchJobs = trpc.matching.match.topJobsForCandidate.useQuery({
    candidateId,
    limit: 10,
  });

  const recomputeMut = trpc.matching.score.computeForCandidate.useMutation({
    onSuccess: () => {
      toast.success("Score recomputed.");
      utils.matching.score.getCurrent.invalidate({ candidateId });
    },
    onError: (e) => toast.error(e.message),
  });
  const embedMut = trpc.matching.index.embedCandidate.useMutation({
    onSuccess: () => {
      toast.success("Embedding refreshed.");
      utils.matching.match.topJobsForCandidate.invalidate({ candidateId });
    },
    onError: (e) => toast.error(e.message),
  });
  const archiveMut = trpc.candidates.archive.useMutation({
    onSuccess: () => {
      toast.success("Candidate archived.");
      utils.candidates.getById.invalidate({ id: candidateId });
    },
    onError: (e) => toast.error(e.message),
  });
  const unarchiveMut = trpc.candidates.unarchive.useMutation({
    onSuccess: () => {
      toast.success("Candidate restored.");
      utils.candidates.getById.invalidate({ id: candidateId });
    },
    onError: (e) => toast.error(e.message),
  });

  const c: any = candidate.data;
  const isArchived = !!c?.isArchived;

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/talent/candidates">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" /> All candidates
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {candidate.isLoading ? <Skeleton className="h-7 w-48" /> : c?.headline ?? `Candidate #${candidateId}`}
              </h1>
              {c?.currentTitle && (
                <p className="text-sm text-muted-foreground">
                  {c.currentTitle}
                  {c.currentCompany && ` · ${c.currentCompany}`}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <DraftOfferButton candidateId={candidateId} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => recomputeMut.mutate({ candidateId })}
              disabled={recomputeMut.isPending}
            >
              <Sparkles className="h-4 w-4 mr-2" /> Recompute score
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => embedMut.mutate({ candidateId })}
              disabled={embedMut.isPending}
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Re-embed
            </Button>
            {isArchived ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => unarchiveMut.mutate({ id: candidateId })}
                disabled={unarchiveMut.isPending}
              >
                <ArchiveRestore className="h-4 w-4 mr-2" /> Restore
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm("Archive this candidate? They'll be hidden from search.")) {
                    archiveMut.mutate({ id: candidateId });
                  }
                }}
                disabled={archiveMut.isPending}
              >
                <Archive className="h-4 w-4 mr-2" /> Archive
              </Button>
            )}
          </div>
        </div>

        {isArchived && (
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4 text-sm text-amber-800">
              This candidate is archived and hidden from recruiter search.
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Score card — spans 1 column */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-4 w-4" /> Composite score
              </CardTitle>
              <CardDescription>
                Weighted blend of resume, GitHub, assessments, and match.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {score.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : !score.data ? (
                <div className="text-sm text-muted-foreground">
                  No score computed yet. Click <em>Recompute score</em>.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-5xl font-bold tabular-nums">
                    {fmtScore((score.data as any).compositeScore)}
                  </div>
                  <ScoreBar label="Resume" value={(score.data as any).resumeScore} />
                  <ScoreBar label="GitHub" value={(score.data as any).githubScore} />
                  <ScoreBar label="Assessment" value={(score.data as any).assessmentScore} />
                  <ScoreBar label="Match" value={(score.data as any).matchScore} />
                  {(score.data as any).explanation && (
                    <p className="text-xs text-muted-foreground border-t pt-3">
                      {(score.data as any).explanation}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Profile card — spans 2 columns */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                Parsed from the candidate's resume + self-reported preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {candidate.isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : !c ? (
                <div className="text-sm text-muted-foreground">Candidate not found.</div>
              ) : (
                <>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <Field icon={<MapPin className="h-4 w-4" />} label="Location" value={c.location} />
                    <Field
                      icon={<Briefcase className="h-4 w-4" />}
                      label="Experience"
                      value={c.yearsExperience ? `${c.yearsExperience} years` : null}
                    />
                    <Field label="Open to remote" value={c.openToRemote ? "Yes" : "No"} />
                    <Field label="Open to relocation" value={c.openToRelocation ? "Yes" : "No"} />
                    <Field
                      label="Salary expectation"
                      value={
                        c.salaryExpectationMin || c.salaryExpectationMax
                          ? `${c.salaryExpectationMin ?? "—"} – ${c.salaryExpectationMax ?? "—"} ${c.salaryExpectationCurrency ?? "USD"}`
                          : null
                      }
                    />
                    <Field label="Notice period" value={c.noticePeriod} />
                    <Field label="Visa status" value={c.visaStatus} />
                    <Field label="GitHub" value={c.githubHandle ? `@${c.githubHandle}` : null} />
                  </div>

                  {c.parsedResumeJson?.skills?.length ? (
                    <div>
                      <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                        Skills
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {c.parsedResumeJson.skills.slice(0, 30).map((s: string) => (
                          <Badge key={s} variant="secondary">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {c.summary && (
                    <div>
                      <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                        Summary
                      </h3>
                      <p className="text-sm leading-relaxed">{c.summary}</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* GitHub Intelligence */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Github className="h-4 w-4" /> GitHub Intelligence
            </CardTitle>
            <CardDescription>
              Signals computed from this candidate's public + authorized repos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {github.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : !github.data ? (
              <div className="text-sm text-muted-foreground">
                No GitHub profile linked to this candidate.
              </div>
            ) : (
              <GithubPanel data={github.data} />
            )}
          </CardContent>
        </Card>

        {/* Top job matches */}
        <Card>
          <CardHeader>
            <CardTitle>Top job matches</CardTitle>
            <CardDescription>
              Semantic similarity between this candidate and open jobs in your tenant.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {matchJobs.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : matchJobs.error ? (
              <div className="text-sm text-muted-foreground">
                Matching unavailable: {matchJobs.error.message}
              </div>
            ) : (matchJobs.data?.length ?? 0) === 0 ? (
              <div className="text-sm text-muted-foreground">
                No matches yet. Click <em>Re-embed</em> if the candidate's profile was just updated.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left">
                  <tr>
                    <th className="py-2 font-medium">Job</th>
                    <th className="py-2 font-medium">Match score</th>
                  </tr>
                </thead>
                <tbody>
                  {matchJobs.data?.map((m: any) => (
                    <tr key={m.jobId} className="border-t">
                      <td className="py-2">{m.jobTitle ?? `Job #${m.jobId}`}</td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <ProgressBar value={m.matchScore} />
                          <span className="font-mono text-xs tabular-nums">
                            {fmtScore(m.matchScore)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function fmtScore(v: number | string | null | undefined): string {
  if (v === null || v === undefined) return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(1);
}

function ScoreBar({ label, value }: { label: string; value: number | string | null | undefined }) {
  const n = value === null || value === undefined ? null : Number(value);
  const pct = n !== null && Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span>{label}</span>
        <span className="font-mono tabular-nums">{fmtScore(value)}</span>
      </div>
      <ProgressBar value={pct} />
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
      <div
        className="h-full bg-primary transition-all"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

function Field({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="flex items-start gap-2">
      {icon && <div className="text-muted-foreground mt-0.5">{icon}</div>}
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm">{value ?? "—"}</div>
      </div>
    </div>
  );
}

function GithubPanel({ data }: { data: any }) {
  const profile = data.profile ?? data;
  const repos = data.repos ?? [];
  const signals = data.signals ?? [];
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-4 gap-3 text-sm">
        <Field label="Handle" value={profile.handle && `@${profile.handle}`} />
        <Field label="Followers" value={profile.followers} />
        <Field label="Public repos" value={profile.publicRepos} />
        <Field label="Last synced" value={profile.lastSyncedAt ? new Date(profile.lastSyncedAt).toLocaleDateString() : null} />
      </div>

      {signals.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
            Engineering signals
          </h3>
          <div className="grid sm:grid-cols-2 gap-2">
            {signals.slice(0, 8).map((s: any) => (
              <div key={s.id ?? s.signalType} className="border rounded-md p-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium uppercase">{s.signalType.replace(/_/g, " ")}</span>
                  {s.score !== null && s.score !== undefined && (
                    <Badge variant="outline" className="font-mono">{s.score}</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {repos.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
            Top repos
          </h3>
          <div className="space-y-1.5">
            {repos.slice(0, 5).map((r: any) => (
              <div key={r.id} className="text-sm flex justify-between items-center border-b pb-1.5">
                <div>
                  <span className="font-medium">{r.fullName ?? r.name}</span>
                  {r.primaryLanguage && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      {r.primaryLanguage}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground tabular-nums">
                  ★ {r.stars ?? 0}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * DraftOfferButton — opens a dialog to draft a new offer.
 *
 * Requires the recruiter to know which application this candidate
 * applied through — we ask for the application id rather than try
 * to fetch every application for the candidate (no `listForCandidate`
 * endpoint on jobApplications yet). The candidate's pipeline page
 * surfaces application ids next to each card, so the recruiter can
 * paste from there.
 */
function DraftOfferButton({ candidateId: _ }: { candidateId: number }) {
  const [open, setOpen] = useState(false);
  const [appId, setAppId] = useState("");
  const [baseSalary, setBaseSalary] = useState("");
  const [bonus, setBonus] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [startDate, setStartDate] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [letterBody, setLetterBody] = useState("");

  const draftMut = trpc.ats.offer.draft.useMutation({
    onSuccess: () => {
      toast.success("Offer drafted. Send it from /admin/talent/offers.");
      setOpen(false);
      setAppId("");
      setBaseSalary("");
      setBonus("");
      setCurrency("USD");
      setStartDate("");
      setExpiresAt("");
      setLetterBody("");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    const applicationId = Number(appId);
    if (!applicationId) {
      toast.error("Enter the application id.");
      return;
    }
    draftMut.mutate({
      applicationId,
      baseSalary: baseSalary ? Number(baseSalary) : undefined,
      bonus: bonus ? Number(bonus) : undefined,
      currency: currency || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      letterBody: letterBody || undefined,
    });
  };

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
            <div className="space-y-1.5">
              <Label className="text-xs">Application id *</Label>
              <Input
                type="number"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="Paste from the pipeline page"
              />
            </div>
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
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
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
              <Label className="text-xs">Offer letter body (optional)</Label>
              <Textarea
                value={letterBody}
                onChange={(e) => setLetterBody(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={draftMut.isPending}>
              Draft offer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
