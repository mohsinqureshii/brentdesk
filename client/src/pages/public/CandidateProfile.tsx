/**
 * Candidate Profile — public-facing self-service
 * ----------------------------------------------------------------------
 * The signed-in user's candidate profile. Idempotent: visiting this
 * page creates the candidate row on demand if it doesn't exist yet
 * (server-side via candidates.me).
 *
 * Sections:
 *   - Resume upload (paste extracted text for now; LLM parser fills
 *     in headline / skills / experience / education)
 *   - Editable profile (headline, location, salary, remote, links)
 *   - Consent toggles (GDPR / PDPL)
 */

import { useEffect, useRef, useState } from "react";
import { fmtNumber, fmtDateTime } from "@/lib/dates";
import { useLocation } from "wouter";
import { publication } from "@shared/publication";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { FileUp, Github, Loader2, Save, Sparkles, Upload } from "lucide-react";

const MAX_RESUME_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_RESUME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
];
const ACCEPTED_RESUME_EXTENSIONS = [".pdf", ".docx", ".txt", ".md"];

/**
 * Read a File as base64 (without the data: prefix). Used to ship a
 * binary resume to the tRPC `uploadResumeFile` endpoint without needing
 * multipart/form-data routing on the server.
 */
function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("File read failed"));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Unexpected file reader result."));
        return;
      }
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

interface FormState {
  headline: string;
  currentTitle: string;
  currentCompany: string;
  yearsExperience: string;
  location: string;
  openToRemote: boolean;
  openToRelocation: boolean;
  salaryExpectationMin: string;
  salaryExpectationMax: string;
  salaryExpectationCurrency: string;
  visaStatus: string;
  noticePeriod: string;
  githubHandle: string;
  linkedinUrl: string;
  portfolioUrl: string;
  summary: string;
}

const EMPTY: FormState = {
  headline: "",
  currentTitle: "",
  currentCompany: "",
  yearsExperience: "",
  location: "",
  openToRemote: false,
  openToRelocation: false,
  salaryExpectationMin: "",
  salaryExpectationMax: "",
  salaryExpectationCurrency: "USD",
  visaStatus: "",
  noticePeriod: "",
  githubHandle: "",
  linkedinUrl: "",
  portfolioUrl: "",
  summary: "",
};

export default function CandidateProfile() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  const me = trpc.candidates.me.useQuery(undefined, { enabled: !!user });
  const latestParse = trpc.candidates.getResumeParse.useQuery(undefined, {
    enabled: !!user,
  });

  const [form, setForm] = useState<FormState>(EMPTY);
  const [resumeText, setResumeText] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Hydrate the form once the candidate row arrives.
  useEffect(() => {
    if (!me.data) return;
    const c: any = me.data;
    setForm({
      headline: c.headline ?? "",
      currentTitle: c.currentTitle ?? "",
      currentCompany: c.currentCompany ?? "",
      yearsExperience: c.yearsExperience != null ? String(c.yearsExperience) : "",
      location: c.location ?? "",
      openToRemote: !!c.openToRemote,
      openToRelocation: !!c.openToRelocation,
      salaryExpectationMin:
        c.salaryExpectationMin != null ? String(c.salaryExpectationMin) : "",
      salaryExpectationMax:
        c.salaryExpectationMax != null ? String(c.salaryExpectationMax) : "",
      salaryExpectationCurrency: c.salaryExpectationCurrency ?? "USD",
      visaStatus: c.visaStatus ?? "",
      noticePeriod: c.noticePeriod ?? "",
      githubHandle: c.githubHandle ?? "",
      linkedinUrl: c.linkedinUrl ?? "",
      portfolioUrl: c.portfolioUrl ?? "",
      summary: c.summary ?? "",
    });
  }, [me.data]);

  const updateMut = trpc.candidates.updateMyProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile saved.");
      utils.candidates.me.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const uploadMut = trpc.candidates.uploadResume.useMutation({
    onSuccess: () => {
      toast.success("Resume parsed.");
      utils.candidates.me.invalidate();
      utils.candidates.getResumeParse.invalidate();
      setResumeText("");
    },
    onError: (e) => toast.error(e.message),
  });

  const uploadFileMut = trpc.candidates.uploadResumeFile.useMutation({
    onSuccess: () => {
      toast.success("Resume parsed.");
      utils.candidates.me.invalidate();
      utils.candidates.getResumeParse.invalidate();
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (e) => toast.error(e.message),
  });

  const consentMut = trpc.candidates.recordConsent.useMutation({
    onSuccess: () => {
      utils.candidates.me.invalidate();
      toast.success("Preferences saved.");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    updateMut.mutate({
      headline: form.headline || null,
      currentTitle: form.currentTitle || null,
      currentCompany: form.currentCompany || null,
      yearsExperience: form.yearsExperience ? Number(form.yearsExperience) : null,
      location: form.location || null,
      openToRemote: form.openToRemote,
      openToRelocation: form.openToRelocation,
      salaryExpectationMin: form.salaryExpectationMin
        ? Number(form.salaryExpectationMin)
        : null,
      salaryExpectationMax: form.salaryExpectationMax
        ? Number(form.salaryExpectationMax)
        : null,
      salaryExpectationCurrency: form.salaryExpectationCurrency || null,
      visaStatus: form.visaStatus || null,
      noticePeriod: form.noticePeriod || null,
      githubHandle: form.githubHandle || null,
      linkedinUrl: form.linkedinUrl || null,
      portfolioUrl: form.portfolioUrl || null,
      summary: form.summary || null,
    });
  };

  const handleParseResume = () => {
    if (resumeText.trim().length < 20) {
      toast.error("Paste at least a few sentences of resume text first.");
      return;
    }
    // PHASE_2_TODO: real file upload to media. For now we pass mediaId=0
    // and let the parser run on the raw text; the candidate row stores
    // parsedResumeJson but no file binary is attached. File-binary upload
    // ships in the Phase 2.5 candidate-file follow-up.
    uploadMut.mutate({ mediaId: 0, rawText: resumeText });
  };

  /**
   * Pick a binary resume, read it as base64 client-side, hand it to the
   * server for extraction + parse. We keep the paste-text path as a
   * fallback for when extraction misbehaves (scanned PDFs, etc).
   */
  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_RESUME_FILE_BYTES) {
      toast.error("File too large. Max 10MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    try {
      const fileBase64 = await readFileAsBase64(file);
      // WARN_MEDIA_BIND_TODO: mediaId=0 — wire the actual media row in
      // the Phase 2.5 candidate-file follow-up.
      uploadFileMut.mutate({
        mediaId: 0,
        fileBase64,
        filename: file.name,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read file.");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (authLoading || me.isLoading) {
    return (
      <>
        <Header />
        <div className="container max-w-4xl mx-auto py-8 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
        <Footer />
      </>
    );
  }

  const c: any = me.data;
  const parsed = c?.parsedResumeJson as any;

  return (
    <>
      <Header />
      <div className="container max-w-4xl mx-auto py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My candidate profile</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Recruiters at companies you've applied to (and ones using {publication.name}'s matching) see this profile.
          </p>
        </div>

        {/* Resume upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Resume → AI parse
            </CardTitle>
            <CardDescription>
              Paste your resume text and we'll extract skills, experience, and education
              automatically. You can edit the parsed fields below.
              {c?.parsedResumeAt && (
                <span className="block mt-1 text-xs">
                  Last parsed: {fmtDateTime(c.parsedResumeAt)}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md border border-dashed p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-sm">
                <p className="font-medium">Upload a resume file</p>
                <p className="text-xs text-muted-foreground">
                  PDF, DOCX, TXT or MD · max 10MB
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={[...ACCEPTED_RESUME_TYPES, ...ACCEPTED_RESUME_EXTENSIONS].join(",")}
                  onChange={handleFilePicked}
                  className="hidden"
                  data-testid="resume-file-input"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadFileMut.isPending}
                >
                  {uploadFileMut.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileUp className="h-4 w-4 mr-2" />
                  )}
                  {uploadFileMut.isPending ? "Extracting..." : "Choose file"}
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  or paste text
                </span>
              </div>
            </div>
            <Textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste your full resume here — at least a few hundred characters works best."
              rows={8}
              className="font-mono text-xs"
            />
            <div className="flex justify-end">
              <Button onClick={handleParseResume} disabled={uploadMut.isPending}>
                {uploadMut.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Parse with AI
              </Button>
            </div>

            {parsed?.skills?.length ? (
              <div className="border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                  Extracted skills
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {parsed.skills.slice(0, 40).map((s: string) => (
                    <Badge key={s} variant="secondary">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}

            {parsed?.experience?.length ? (
              <div className="border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                  Experience
                </p>
                <ul className="text-sm space-y-1">
                  {parsed.experience.slice(0, 8).map((e: any, i: number) => (
                    <li key={i} className="flex justify-between">
                      <span>
                        <strong>{e.title}</strong> at {e.company}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {e.startDate}
                        {e.endDate ? ` – ${e.endDate}` : " – present"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {latestParse.data?.qualityScore != null && (
              <div className="text-xs text-muted-foreground border-t pt-3">
                Parser confidence: <span className="font-mono">{latestParse.data.qualityScore}/100</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profile fields */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Override anything the parser got wrong. Recruiters search by these fields.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <Field label="Headline">
              <Input
                value={form.headline}
                onChange={(e) => setForm({ ...form, headline: e.target.value })}
                placeholder="Senior backend engineer · payments + infra"
              />
            </Field>
            <Field label="Years of experience">
              <Input
                type="number"
                min={0}
                max={80}
                value={form.yearsExperience}
                onChange={(e) => setForm({ ...form, yearsExperience: e.target.value })}
              />
            </Field>
            <Field label="Current title">
              <Input
                value={form.currentTitle}
                onChange={(e) => setForm({ ...form, currentTitle: e.target.value })}
              />
            </Field>
            <Field label="Current company">
              <Input
                value={form.currentCompany}
                onChange={(e) => setForm({ ...form, currentCompany: e.target.value })}
              />
            </Field>
            <Field label="Location">
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Riyadh, Saudi Arabia"
              />
            </Field>
            <Field label="Visa status">
              <Input
                value={form.visaStatus}
                onChange={(e) => setForm({ ...form, visaStatus: e.target.value })}
                placeholder="EU passport · need US sponsorship"
              />
            </Field>
            <Field label="Notice period">
              <Input
                value={form.noticePeriod}
                onChange={(e) => setForm({ ...form, noticePeriod: e.target.value })}
                placeholder="30 days"
              />
            </Field>
            <Field label="Salary expectation (min)">
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={form.salaryExpectationMin}
                  onChange={(e) =>
                    setForm({ ...form, salaryExpectationMin: e.target.value })
                  }
                />
                <Input
                  value={form.salaryExpectationCurrency}
                  onChange={(e) =>
                    setForm({ ...form, salaryExpectationCurrency: e.target.value.toUpperCase() })
                  }
                  className="w-20"
                  maxLength={3}
                />
              </div>
            </Field>
            <Field label="Salary expectation (max)">
              <Input
                type="number"
                value={form.salaryExpectationMax}
                onChange={(e) =>
                  setForm({ ...form, salaryExpectationMax: e.target.value })
                }
              />
            </Field>
            <Field label="GitHub handle">
              <div className="flex gap-2">
                <Input
                  value={form.githubHandle}
                  onChange={(e) => setForm({ ...form, githubHandle: e.target.value })}
                  placeholder="octocat"
                  className="flex-1"
                />
                <GithubConnectButton />
              </div>
            </Field>
            <Field label="LinkedIn URL">
              <Input
                value={form.linkedinUrl}
                onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })}
              />
            </Field>
            <Field label="Portfolio URL">
              <Input
                value={form.portfolioUrl}
                onChange={(e) => setForm({ ...form, portfolioUrl: e.target.value })}
              />
            </Field>
            <div className="md:col-span-2 flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.openToRemote}
                  onCheckedChange={(v) => setForm({ ...form, openToRemote: !!v })}
                />
                Open to remote
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.openToRelocation}
                  onCheckedChange={(v) => setForm({ ...form, openToRelocation: !!v })}
                />
                Open to relocation
              </label>
            </div>
            <Field label="Summary" className="md:col-span-2">
              <Textarea
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                placeholder="Short bio — what you're best at and what you're looking for."
                rows={4}
              />
            </Field>
          </CardContent>
        </Card>

        {/* Consent */}
        <Card>
          <CardHeader>
            <CardTitle>Privacy preferences</CardTitle>
            <CardDescription>
              Required under GDPR / PDPL. You can change these any time.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ConsentRow
              label="Allow recruiters to process my profile to match me to jobs."
              consentedAt={c?.consentDataProcessingAt}
              onConsent={() => consentMut.mutate({ kind: "data_processing" })}
            />
            <ConsentRow
              label={`Allow ${publication.name} to send me job recommendations and product updates.`}
              consentedAt={c?.consentMarketingAt}
              onConsent={() => consentMut.mutate({ kind: "marketing" })}
            />
            <ConsentRow
              label="Allow my profile to be shared with third-party recruiters."
              consentedAt={c?.consentThirdPartyAt}
              onConsent={() => consentMut.mutate({ kind: "third_party" })}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end sticky bottom-4 z-10">
          <Button size="lg" onClick={handleSave} disabled={updateMut.isPending}>
            {updateMut.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save profile
          </Button>
        </div>
      </div>
      <Footer />
    </>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}

function ConsentRow({
  label,
  consentedAt,
  onConsent,
}: {
  label: string;
  consentedAt: string | null | undefined;
  onConsent: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border rounded-md p-3">
      <div>
        <p>{label}</p>
        {consentedAt && (
          <p className="text-xs text-muted-foreground mt-1">
            Given: {new Date(consentedAt).toLocaleDateString()}
          </p>
        )}
      </div>
      {consentedAt ? (
        <Badge variant="outline" className="bg-primary/10 text-primary">
          Granted
        </Badge>
      ) : (
        <Button size="sm" variant="outline" onClick={onConsent}>
          I consent
        </Button>
      )}
    </div>
  );
}

/**
 * Connect-GitHub button. Opens the GitHub App authorization URL in a
 * new tab so the candidate can grant repo access without losing their
 * unsaved profile edits. The OAuth callback should land at
 * /api/auth/github/callback (route registration is a Phase 4 op TODO);
 * for now the button kicks off the flow even though the round-trip
 * isn't yet handled — clicking degrades to a "Not configured" toast
 * when the GitHub App isn't registered.
 */
function GithubConnectButton() {
  const authorizeQ = trpc.github.authorizeUrl.useQuery(
    { state: typeof crypto !== "undefined" ? crypto.randomUUID() : String(Date.now()) },
    { enabled: false },
  );
  return (
    <Button
      variant="outline"
      type="button"
      onClick={async () => {
        try {
          const res = await authorizeQ.refetch();
          if (res.data?.url) {
            window.open(res.data.url, "_blank", "noopener,noreferrer");
          } else if (res.error) {
            toast.error(res.error.message);
          }
        } catch (err) {
          toast.error("GitHub not configured.");
        }
      }}
    >
      <Github className="h-4 w-4 mr-2" /> Connect
    </Button>
  );
}
