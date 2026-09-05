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
import { useT } from "@/lib/i18n";
import type { UiKey } from "@shared/uiStrings";
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

const EVENT_TYPES: ReadonlyArray<{ value: string; labelKey: UiKey }> = [
  { value: "conference", labelKey: "event.typeConference" },
  { value: "webinar", labelKey: "event.typeWebinar" },
  { value: "meetup", labelKey: "event.typeMeetup" },
  { value: "workshop", labelKey: "event.typeWorkshop" },
  { value: "hackathon", labelKey: "event.typeHackathon" },
  { value: "summit", labelKey: "event.typeSummit" },
  { value: "other", labelKey: "event.typeOther" },
];

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
  const t = useT();
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
      toast.error(err.message || t("event.submitFailed"));
    },
  });

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    const title = form.title.trim();
    if (title.length < 4 || title.length > 512) {
      next.title = t("event.errTitleLength");
    }
    if (form.tagline.length > 255) {
      next.tagline = t("event.errTaglineLength");
    }
    if (form.description.length > 5000) {
      next.description = t("event.errDescriptionLength");
    }
    if (!form.startDate) {
      next.startDate = t("event.errStartDateRequired");
    }
    if (form.websiteUrl && !isPlausibleUrl(form.websiteUrl)) {
      next.websiteUrl = t("event.errFullUrl");
    }
    if (form.registrationUrl && !isPlausibleUrl(form.registrationUrl)) {
      next.registrationUrl = t("event.errFullUrl");
    }
    if (form.organizerEmail && !/.+@.+\..+/.test(form.organizerEmail)) {
      next.organizerEmail = t("event.errValidEmail");
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error(t("event.errFixFields"));
      return;
    }

    // Build Date objects from yyyy-mm-dd + HH:MM. We don't try to
    // be clever with timezone math here — the server stores the
    // submitted instant, and the timezone field is kept on record
    // so a moderator can interpret it in EventEditor.
    const startISO = buildDate(form.startDate, form.startTime);
    if (!startISO) {
      setErrors((e) => ({ ...e, startDate: t("event.errInvalidStart") }));
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
              <div className="mx-auto w-14 h-14 rounded-full bg-primary/100/10 flex items-center justify-center mb-5">
                <CheckCircle2 className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-3xl font-bold mb-3">{t("event.submitThanks")}</h1>
              <p className="text-muted-foreground mb-2 max-w-lg mx-auto">
                {t("event.submitBody", { ref: `#${submittedId}` })}
              </p>
              <p className="text-sm text-muted-foreground mb-8 max-w-lg mx-auto">
                {t("event.submitApprovedNote")}
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
                  {t("event.submitAnother")}
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/events">
                    {t("state.backToEvents")} <ArrowRight className="ml-2 h-4 w-4" />
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
          <p className="text-sm text-muted-foreground mt-3">{t("state.loading")}</p>
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
            {t("events.submitYours")}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("event.submitIntro")}
          </p>
        </div>

        <Alert className="mb-8">
          <Sparkles className="h-4 w-4" />
          <AlertDescription>
            {t("event.submitReviewNotice")}
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ──────── Basics ──────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" /> {t("event.sectionBasics")}
              </CardTitle>
              <CardDescription>
                {t("event.sectionBasicsHint")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label={t("event.fieldTitle")} required error={errors.title}>
                <Input
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder={t("event.titlePlaceholder")}
                  maxLength={512}
                />
              </Field>
              <Field
                label={t("event.fieldTagline")}
                error={errors.tagline}
                hint={t("event.taglineHint")}
              >
                <Input
                  value={form.tagline}
                  onChange={(e) => update("tagline", e.target.value)}
                  placeholder={t("event.taglinePlaceholder")}
                  maxLength={255}
                />
              </Field>
              <Field
                label={t("event.fieldDescription")}
                error={errors.description}
                hint={t("event.descriptionHint", { count: form.description.length })}
              >
                <Textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  rows={6}
                  maxLength={5000}
                  placeholder={t("event.descriptionPlaceholder")}
                />
              </Field>
              <Field label={t("events.type")}>
                <Select value={form.type} onValueChange={(v) => update("type", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {t(opt.labelKey)}
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
                <CalendarDays className="w-5 h-5" /> {t("event.sectionWhen")}
              </CardTitle>
              <CardDescription>
                {t("event.sectionWhenHint")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={t("event.fieldStartDate")} required error={errors.startDate}>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => update("startDate", e.target.value)}
                  />
                </Field>
                <Field label={t("event.fieldStartTime")}>
                  <Input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => update("startTime", e.target.value)}
                  />
                </Field>
                <Field label={t("event.fieldEndDate")}>
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => update("endDate", e.target.value)}
                  />
                </Field>
                <Field label={t("event.fieldEndTime")}>
                  <Input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => update("endTime", e.target.value)}
                  />
                </Field>
              </div>
              <Field label={t("event.fieldTimezone")}>
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
                <MapPin className="w-5 h-5" /> {t("event.sectionWhere")}
              </CardTitle>
              <CardDescription>
                {t("event.sectionWhereHint")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label={t("event.fieldVenue")}>
                <Input
                  value={form.venue}
                  onChange={(e) => update("venue", e.target.value)}
                  placeholder={t("event.venuePlaceholder")}
                  maxLength={255}
                />
              </Field>
              <Field label={t("event.fieldAddress")}>
                <Input
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  placeholder={t("event.addressPlaceholder")}
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={t("event.fieldCity")}>
                  <Input
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                    placeholder={t("event.cityPlaceholder")}
                    maxLength={128}
                  />
                </Field>
                <Field label={t("event.fieldCountry")}>
                  <Select
                    value={form.country}
                    onValueChange={(v) => update("country", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("event.selectCountry")} />
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
                <Globe className="w-5 h-5" /> {t("event.sectionLinks")}
              </CardTitle>
              <CardDescription>
                {t("event.sectionLinksHint")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label={t("event.fieldWebsite")} error={errors.websiteUrl}>
                <Input
                  type="url"
                  value={form.websiteUrl}
                  onChange={(e) => update("websiteUrl", e.target.value)}
                  placeholder="https://your-event.com"
                />
              </Field>
              <Field
                label={t("event.fieldRegistrationUrl")}
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
                <User className="w-5 h-5" /> {t("event.sectionOrganizer")}
              </CardTitle>
              <CardDescription>
                {t("event.sectionOrganizerHint")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label={t("event.fieldOrganizerName")}>
                <Input
                  value={form.organizerName}
                  onChange={(e) => update("organizerName", e.target.value)}
                  placeholder={t("event.organizerNamePlaceholder")}
                  maxLength={255}
                />
              </Field>
              <Field
                label={t("event.fieldOrganizerEmail")}
                error={errors.organizerEmail}
                hint={t("event.organizerEmailHint")}
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
              <Link href="/events">{t("common.cancel")}</Link>
            </Button>
            <Button type="submit" disabled={submitMut.isPending}>
              {submitMut.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t("event.submitting")}
                </>
              ) : (
                <>
                  {t("event.submitEvent")} <ArrowRight className="ml-2 h-4 w-4" />
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
