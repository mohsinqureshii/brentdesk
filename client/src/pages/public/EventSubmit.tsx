/**
 * Public Event Submission Page  (/events/submit)
 * ---------------------------------------------------------------------
 * Logged-in visitors propose a tech event for the Events Hub. The
 * mutation drops a row into `event_submissions` with status='pending'
 * and kicks off background AI moderation — we don't wait on it here.
 *
 * Auth: required. If the user is anonymous we send them to
 * /signin?redirect=/events/submit before any form even renders.
 *
 * Organizer name/email default to the logged-in user's name/email so
 * the form already feels half-filled for the common case (a person
 * submitting their own event).
 *
 * Validation: minimal local checks (zod-like) before firing the
 * mutation. The server schema is the source of truth — we just want
 * to fail fast on obvious errors so the user gets inline feedback.
 */

import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  CalendarDays,
  Loader2,
  CheckCircle2,
  ArrowRight,
  MapPin,
  Globe,
  User,
  Mail,
  Info,
  Sparkles,
} from "lucide-react";

const EVENT_TYPES = [
  { value: "conference", label: "Conference" },
  { value: "webinar", label: "Webinar" },
  { value: "meetup", label: "Meetup" },
  { value: "workshop", label: "Workshop" },
  { value: "hackathon", label: "Hackathon" },
  { value: "summit", label: "Summit" },
  { value: "other", label: "Other" },
] as const;

// Minimal timezone picker — covers MENA + the cities most submitters
// will reach for. The full IANA list is overwhelming and gives no
// editorial benefit on a submission form.
const TIMEZONES = [
  "Asia/Riyadh",
  "Asia/Dubai",
  "Africa/Cairo",
  "Asia/Karachi",
  "Europe/Istanbul",
  "Asia/Amman",
  "Asia/Beirut",
  "Africa/Casablanca",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Singapore",
  "UTC",
] as const;

interface FormState {
  title: string;
  tagline: string;
  description: string;
  type: string;
  startDate: string; // yyyy-mm-dd
  startTime: string; // HH:MM
  endDate: string;
  endTime: string;
  timezone: string;
  venue: string;
  address: string;
  city: string;
  country: string;
  websiteUrl: string;
  registrationUrl: string;
  organizerName: string;
  organizerEmail: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  tagline: "",
  description: "",
  type: "conference",
  startDate: "",
  startTime: "09:00",
  endDate: "",
  endTime: "17:00",
  timezone: "Asia/Riyadh",
  venue: "",
  address: "",
  city: "",
  country: "",
  websiteUrl: "",
  registrationUrl: "",
  organizerName: "",
  organizerEmail: "",
};

export default function EventSubmit() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { data: countriesList } = trpc.jobs.listCountries.useQuery(undefined, {
    staleTime: 60_000,
  });

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submittedId, setSubmittedId] = useState<number | null>(null);

  // ───── Auth gate ─────
  // We deliberately don't render the form for anonymous users — they
  // bounce to /signin with a redirect param so they come back here
  // automatically after auth.
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      window.location.href = "/signin?redirect=/events/submit";
    }
  }, [authLoading, isAuthenticated]);

  // ───── Pre-fill organizer from logged-in user ─────
  useEffect(() => {
    if (!user) return;
    setForm((f) => ({
      ...f,
      organizerName: f.organizerName || user.name || "",
      organizerEmail: f.organizerEmail || user.email || "",
    }));
  }, [user]);

  const submitMut = trpc.events.submit.useMutation({
    onSuccess: (data: any) => {
      setSubmittedId(data.id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: (err: any) => {
      toast.error(err.message || "Submission failed. Please try again.");
    },
  });

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    const t = form.title.trim();
    if (t.length < 4 || t.length > 512) {
      next.title = "Title must be between 4 and 512 characters.";
    }
    if (form.tagline.length > 255) {
      next.tagline = "Tagline must be 255 characters or fewer.";
    }
    if (form.description.length > 5000) {
      next.description = "Description must be 5000 characters or fewer.";
    }
    if (!form.startDate) {
      next.startDate = "Start date is required.";
    }
    if (form.websiteUrl && !isPlausibleUrl(form.websiteUrl)) {
      next.websiteUrl = "Enter a full URL (https://...).";
    }
    if (form.registrationUrl && !isPlausibleUrl(form.registrationUrl)) {
      next.registrationUrl = "Enter a full URL (https://...).";
    }
    if (form.organizerEmail && !/.+@.+\..+/.test(form.organizerEmail)) {
      next.organizerEmail = "Enter a valid email address.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fix the highlighted fields and try again.");
      return;
    }

    // Build Date objects from yyyy-mm-dd + HH:MM. We don't try to
    // be clever with timezone math here — the server stores the
    // submitted instant, and the timezone field is kept on record
    // so a moderator can interpret it in EventEditor.
    const startISO = buildDate(form.startDate, form.startTime);
    if (!startISO) {
      setErrors((e) => ({ ...e, startDate: "Invalid start date/time." }));
      return;
    }
    const endISO = form.endDate
      ? buildDate(form.endDate, form.endTime || form.startTime)
      : null;

    submitMut.mutate({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      type: form.type as any,
      startDate: startISO.toISOString(),
      endDate: endISO ? endISO.toISOString() : undefined,
      city: form.city.trim() || undefined,
      country: form.country.trim() || undefined,
      venue:
        [form.venue, form.address].filter(Boolean).join(" — ").trim() || undefined,
      registrationUrl: form.registrationUrl.trim() || undefined,
      organizerName: form.organizerName.trim() || undefined,
      organizerEmail: form.organizerEmail.trim() || undefined,
    });
  };

  // Success view — confirmation + reset CTA.
  if (submittedId) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Card className="text-center">
            <CardContent className="pt-10 pb-10">
              <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mb-5">
                <CheckCircle2 className="w-7 h-7 text-emerald-500" />
              </div>
              <h1 className="text-3xl font-bold mb-3">Thanks — we got it</h1>
              <p className="text-muted-foreground mb-2 max-w-lg mx-auto">
                Your event has been submitted (ref{" "}
                <span className="font-mono text-foreground">#{submittedId}</span>).
                It will go through AI review first, then a human editor.
              </p>
              <p className="text-sm text-muted-foreground mb-8 max-w-lg mx-auto">
                If approved, it will appear on the public Events page and
                you'll see it listed under your account submissions.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => {
                    setSubmittedId(null);
                    setForm({
                      ...EMPTY_FORM,
                      // keep organizer pre-fills so submitting a 2nd event
                      // for the same org doesn't make them retype it
                      organizerName: user?.name || "",
                      organizerEmail: user?.email || "",
                    });
                  }}
                >
                  Submit another event
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/events">
                    Back to Events <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // While auth is resolving, show a thin skeleton instead of a flash
  // of the form (which would then unmount when we redirect).
  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-20 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-3">Loading…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Submit your event
          </h1>
          <p className="text-muted-foreground mt-2">
            Tell us about your tech event and we'll review it for the Events
            Hub. Conferences, webinars, hackathons, meetups — bring it on.
          </p>
        </div>

        <Alert className="mb-8">
          <Sparkles className="h-4 w-4" />
          <AlertDescription>
            Submissions are checked by AI for spam/test entries, then
            reviewed by an editor. You'll see your event live within 1–2
            business days if everything checks out.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ──────── Basics ──────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" /> The basics
              </CardTitle>
              <CardDescription>
                Title and a short summary of what the event is about.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Event title" required error={errors.title}>
                <Input
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder="e.g. LEAP 2026"
                  maxLength={512}
                />
              </Field>
              <Field
                label="Tagline"
                error={errors.tagline}
                hint="One-line headline (optional, max 255 chars)."
              >
                <Input
                  value={form.tagline}
                  onChange={(e) => update("tagline", e.target.value)}
                  placeholder="The largest tech event in the MENA region"
                  maxLength={255}
                />
              </Field>
              <Field
                label="Description"
                error={errors.description}
                hint={`What's the event about? Who should attend? (${form.description.length} / 5000)`}
              >
                <Textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  rows={6}
                  maxLength={5000}
                  placeholder="A few sentences explaining the agenda, audience, and what attendees will get."
                />
              </Field>
              <Field label="Event type">
                <Select value={form.type} onValueChange={(v) => update("type", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </CardContent>
          </Card>

          {/* ──────── When ──────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5" /> When
              </CardTitle>
              <CardDescription>
                Leave the end date blank for a single-day event.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Start date" required error={errors.startDate}>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => update("startDate", e.target.value)}
                  />
                </Field>
                <Field label="Start time">
                  <Input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => update("startTime", e.target.value)}
                  />
                </Field>
                <Field label="End date">
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => update("endDate", e.target.value)}
                  />
                </Field>
                <Field label="End time">
                  <Input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => update("endTime", e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Timezone">
                <Select
                  value={form.timezone}
                  onValueChange={(v) => update("timezone", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </CardContent>
          </Card>

          {/* ──────── Where ──────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" /> Where
              </CardTitle>
              <CardDescription>
                Venue + address for in-person events. Leave blank for fully
                virtual.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Venue name">
                <Input
                  value={form.venue}
                  onChange={(e) => update("venue", e.target.value)}
                  placeholder="e.g. Riyadh Front"
                  maxLength={255}
                />
              </Field>
              <Field label="Address">
                <Input
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  placeholder="Street, district"
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="City">
                  <Input
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                    placeholder="Riyadh"
                    maxLength={128}
                  />
                </Field>
                <Field label="Country">
                  <Select
                    value={form.country}
                    onValueChange={(v) => update("country", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {(countriesList || []).map((c) => (
                        <SelectItem key={c.id} value={c.name}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </CardContent>
          </Card>

          {/* ──────── Links ──────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" /> Links
              </CardTitle>
              <CardDescription>
                Optional but recommended — the AI moderator weighs real
                websites positively.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Event website" error={errors.websiteUrl}>
                <Input
                  type="url"
                  value={form.websiteUrl}
                  onChange={(e) => update("websiteUrl", e.target.value)}
                  placeholder="https://your-event.com"
                />
              </Field>
              <Field
                label="Registration / ticket URL"
                error={errors.registrationUrl}
              >
                <Input
                  type="url"
                  value={form.registrationUrl}
                  onChange={(e) => update("registrationUrl", e.target.value)}
                  placeholder="https://your-event.com/register"
                />
              </Field>
            </CardContent>
          </Card>

          {/* ──────── Organizer ──────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" /> Organizer
              </CardTitle>
              <CardDescription>
                Who's running this. We'll use this if we need to reach out
                with questions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Organizer name">
                <Input
                  value={form.organizerName}
                  onChange={(e) => update("organizerName", e.target.value)}
                  placeholder="Org name or your name"
                  maxLength={255}
                />
              </Field>
              <Field
                label="Organizer email"
                error={errors.organizerEmail}
                hint="Use a domain that matches the organizer where possible — it helps approval go faster."
              >
                <Input
                  type="email"
                  value={form.organizerEmail}
                  onChange={(e) => update("organizerEmail", e.target.value)}
                  placeholder="you@org.com"
                  maxLength={320}
                />
              </Field>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Button variant="outline" type="button" asChild>
              <Link href="/events">Cancel</Link>
            </Button>
            <Button type="submit" disabled={submitMut.isPending}>
              {submitMut.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…
                </>
              ) : (
                <>
                  Submit event <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
}

/* ───────────────────── Helpers ───────────────────── */

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function isPlausibleUrl(s: string): boolean {
  try {
    const u = new URL(s.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function buildDate(date: string, time: string): Date | null {
  if (!date) return null;
  const d = new Date(`${date}T${time || "00:00"}:00`);
  return isNaN(d.getTime()) ? null : d;
}
