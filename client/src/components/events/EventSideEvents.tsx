/**
 * Side events — the fringe programme around a main event.
 *
 * Reads `events.getSideEvents` (approved rows only; pending community
 * submissions stay invisible until an editor moderates them) and renders
 * them as cards. Below the list sits the "Host a side event" CTA, which
 * opens the public submission form.
 *
 * The submission mutation is a `publicProcedure` — the whole flow works
 * logged out, which is the point: most side-event hosts are partner orgs
 * who will never make an account on the publication. On success we are explicit
 * that the listing is queued for review, never that it is live.
 */

import { useState } from "react";
import { useT } from "@/lib/i18n";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ExternalLink,
  Globe,
  PartyPopper,
  ImagePlus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RichText, formatDate } from "./eventFormat";

// Mirrors the server's sideEventTypeEnum exactly.
const SIDE_EVENT_TYPES = [
  { value: "side_event", labelKey: "sideEvent.typeSideEvent" },
  { value: "workshop", labelKey: "sideEvent.typeWorkshop" },
  { value: "networking", labelKey: "sideEvent.typeNetworking" },
  { value: "party", labelKey: "sideEvent.typeParty" },
  { value: "dinner", labelKey: "sideEvent.typeDinner" },
  { value: "tour", labelKey: "sideEvent.typeTour" },
  { value: "other", labelKey: "sideEvent.typeOther" },
] as const;

type SideEventType = (typeof SIDE_EVENT_TYPES)[number]["value"];

type SideEventRow = {
  id: number;
  name: string;
  description: string | null;
  sideEventType: string | null;
  dayNumber: number | null;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  venue: string | null;
  capacity: number | null;
  registrationUrl: string | null;
  websiteUrl: string | null;
  imageUrl: string | null;
  isFree: boolean;
  sortOrder?: number | null;
};

function typeLabelKey(value: string | null | undefined) {
  const found = SIDE_EVENT_TYPES.find((x) => x.value === value);
  return found ? found.labelKey : ("sideEvent.typeSideEvent" as const);
}

const TYPE_TONE: Record<string, string> = {
  side_event: "bg-primary/10 text-primary border-primary/25",
  workshop:
    "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/25",
  networking:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25",
  party: "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/25",
  dinner:
    "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25",
  tour: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/25",
  other: "bg-muted text-muted-foreground border-border",
};

function SideEventCard({ item }: { item: SideEventRow }) {
  const t = useT();
  const timeStr = [item.startTime, item.endTime].filter(Boolean).join(" – ");

  return (
    <Card className="overflow-hidden transition hover:border-primary/30 hover:shadow-sm">
      <div className="flex flex-col sm:flex-row">
        {item.imageUrl && (
          <div className="shrink-0 sm:w-56">
            <img
              src={item.imageUrl}
              alt=""
              aria-hidden="true"
              className="h-40 w-full object-cover sm:h-full"
              loading="lazy"
            />
          </div>
        )}
        <CardContent className="min-w-0 flex-1 p-4 sm:p-5">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={`text-[11px] font-medium ${
                TYPE_TONE[item.sideEventType || "side_event"] ||
                TYPE_TONE.side_event
              }`}
            >
              {t(typeLabelKey(item.sideEventType))}
            </Badge>
            <Badge
              variant="outline"
              className={
                item.isFree
                  ? "border-emerald-500/25 bg-emerald-500/10 text-[11px] text-emerald-700 dark:text-emerald-400"
                  : "text-[11px]"
              }
            >
              {item.isFree ? t("sideEvent.free") : t("sideEvent.paid")}
            </Badge>
          </div>

          <h3 className="text-base font-semibold leading-snug sm:text-lg">
            {item.name}
          </h3>

          {item.description && (
            <RichText
              html={item.description}
              className="mt-1.5 text-sm text-muted-foreground prose-p:my-1"
            />
          )}

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            {item.date && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(item.date)}
              </span>
            )}
            {timeStr && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {timeStr}
              </span>
            )}
            {item.venue && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {item.venue}
              </span>
            )}
            {item.capacity ? (
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {t("sideEvent.places", { n: item.capacity.toLocaleString() })}
              </span>
            ) : null}
          </div>

          {(item.registrationUrl || item.websiteUrl) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {item.registrationUrl && (
                <a
                  href={item.registrationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="sm" className="gap-1.5">
                    {t("sideEvent.register")}{" "}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </a>
              )}
              {item.websiteUrl && (
                <a
                  href={item.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <Globe className="h-3.5 w-3.5" /> {t("company.website")}
                  </Button>
                </a>
              )}
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  );
}

// ----------------------------------------------------------------
// Submission form
// ----------------------------------------------------------------

type FormState = {
  name: string;
  sideEventType: SideEventType;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  capacity: string;
  websiteUrl: string;
  registrationUrl: string;
  imageUrl: string;
  isFree: boolean;
  submitterName: string;
  submitterEmail: string;
  submitterOrganisation: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  sideEventType: "side_event",
  description: "",
  date: "",
  startTime: "",
  endTime: "",
  venue: "",
  capacity: "",
  websiteUrl: "",
  registrationUrl: "",
  imageUrl: "",
  isFree: true,
  submitterName: "",
  submitterEmail: "",
  submitterOrganisation: "",
};

function HostSideEventDialog({ eventId }: { eventId: number }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submitMut = trpc.events.submitSideEvent.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setErrorMsg(null);
      toast.success(t("sideEvent.toastSubmitted"));
    },
    onError: (e) => {
      // The server caps un-moderated submissions per email per event and
      // returns a human-readable sentence — surface it verbatim rather
      // than a generic failure.
      setErrorMsg(e.message || t("state.errorTryAgain"));
      toast.error(t("sideEvent.toastSubmitFailed"));
    },
  });

  function resetAndClose(next: boolean) {
    setOpen(next);
    if (!next) {
      // Give the close animation a beat before wiping the panel.
      setTimeout(() => {
        setSubmitted(false);
        setErrorMsg(null);
        if (submitted) setForm(EMPTY_FORM);
      }, 200);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("upload.chooseImage"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("upload.imageTooLarge"));
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      set("imageUrl", String(url));
      toast.success(t("upload.imageUploaded"));
    } catch {
      toast.error(t("upload.imageFailed"));
    } finally {
      setUploading(false);
      // Allow re-picking the same file after a failure.
      e.target.value = "";
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const name = form.name.trim();
    const description = form.description.trim();
    const submitterName = form.submitterName.trim();
    const submitterEmail = form.submitterEmail.trim();

    if (!name || !description || !submitterName || !submitterEmail) {
      setErrorMsg(t("form.fillRequired"));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitterEmail)) {
      setErrorMsg(t("form.validEmail"));
      return;
    }

    const capacity = form.capacity.trim() ? Number(form.capacity) : undefined;
    if (capacity !== undefined && (!Number.isFinite(capacity) || capacity < 0)) {
      setErrorMsg(t("sideEvent.capacityPositive"));
      return;
    }

    // Optional string fields are omitted rather than sent as "" so the
    // row stays NULL when the host left them blank.
    const optional = (v: string) => {
      const trimmed = v.trim();
      return trimmed ? trimmed : undefined;
    };

    submitMut.mutate({
      eventId,
      name,
      description,
      sideEventType: form.sideEventType,
      date: optional(form.date),
      startTime: optional(form.startTime),
      endTime: optional(form.endTime),
      venue: optional(form.venue),
      capacity,
      registrationUrl: optional(form.registrationUrl),
      websiteUrl: optional(form.websiteUrl),
      imageUrl: optional(form.imageUrl),
      isFree: form.isFree,
      submitterName,
      submitterEmail,
      submitterOrganisation: optional(form.submitterOrganisation),
    });
  }

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <PartyPopper className="h-4 w-4" />
          {t("sideEvent.host")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {submitted ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl font-semibold">
              {t("sideEvent.submittedTitle")}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {t("sideEvent.submittedIntro")}
              <strong className="font-medium text-foreground">
                {" "}
                {t("sideEvent.submittedNotLive")}
              </strong>{" "}
              {t("sideEvent.submittedOutro", {
                email: form.submitterEmail || t("common.you"),
              })}
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSubmitted(false);
                  setForm(EMPTY_FORM);
                }}
              >
                {t("sideEvent.submitAnother")}
              </Button>
              <Button onClick={() => resetAndClose(false)}>
                {t("common.done")}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t("sideEvent.host")}</DialogTitle>
              <DialogDescription>{t("sideEvent.hostBlurb")}</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
                  <div className="space-y-1.5">
                    <Label htmlFor="se-name">{t("sideEvent.nameLabel")}</Label>
                    <Input
                      id="se-name"
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      placeholder={t("sideEvent.namePlaceholder")}
                      maxLength={255}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="se-type">{t("sideEvent.typeLabel")}</Label>
                    <Select
                      value={form.sideEventType}
                      onValueChange={(v) =>
                        set("sideEventType", v as SideEventType)
                      }
                    >
                      <SelectTrigger id="se-type">
                        <SelectValue placeholder={t("sideEvent.selectType")} />
                      </SelectTrigger>
                      <SelectContent>
                        {SIDE_EVENT_TYPES.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {t(opt.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="se-description">
                    {t("sideEvent.descriptionLabel")}
                  </Label>
                  <Textarea
                    id="se-description"
                    rows={4}
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    placeholder={t("sideEvent.descriptionPlaceholder")}
                    required
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="se-date">{t("form.date")}</Label>
                    <Input
                      id="se-date"
                      type="date"
                      value={form.date}
                      onChange={(e) => set("date", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="se-start">{t("form.startTime")}</Label>
                    <Input
                      id="se-start"
                      type="time"
                      value={form.startTime}
                      onChange={(e) => set("startTime", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="se-end">{t("form.endTime")}</Label>
                    <Input
                      id="se-end"
                      type="time"
                      value={form.endTime}
                      onChange={(e) => set("endTime", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
                  <div className="space-y-1.5">
                    <Label htmlFor="se-venue">{t("form.venue")}</Label>
                    <Input
                      id="se-venue"
                      value={form.venue}
                      onChange={(e) => set("venue", e.target.value)}
                      placeholder={t("sideEvent.venuePlaceholder")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="se-capacity">{t("form.capacity")}</Label>
                    <Input
                      id="se-capacity"
                      type="number"
                      min={0}
                      value={form.capacity}
                      onChange={(e) => set("capacity", e.target.value)}
                      placeholder="60"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="se-registration">
                      {t("form.registrationUrl")}
                    </Label>
                    <Input
                      id="se-registration"
                      type="url"
                      value={form.registrationUrl}
                      onChange={(e) => set("registrationUrl", e.target.value)}
                      placeholder="https://lu.ma/..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="se-website">{t("company.website")}</Label>
                    <Input
                      id="se-website"
                      type="url"
                      value={form.websiteUrl}
                      onChange={(e) => set("websiteUrl", e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="se-free"
                    checked={form.isFree}
                    onCheckedChange={(v) => set("isFree", v === true)}
                  />
                  <Label htmlFor="se-free" className="font-normal">
                    {t("sideEvent.isFreeLabel")}
                  </Label>
                </div>

                {/* Cover image */}
                <div className="space-y-1.5">
                  <Label htmlFor="se-image">{t("form.coverImage")}</Label>
                  {form.imageUrl ? (
                    <div className="relative w-fit">
                      <img
                        src={form.imageUrl}
                        alt={t("sideEvent.coverAlt")}
                        className="h-28 w-48 rounded-lg object-cover ring-1 ring-border"
                      />
                      <button
                        type="button"
                        onClick={() => set("imageUrl", "")}
                        className="absolute -right-2 -top-2 rounded-full border bg-background p-1 text-muted-foreground shadow-sm hover:text-foreground"
                        aria-label={t("form.removeImage")}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="se-image"
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ImagePlus className="h-4 w-4" />
                      )}
                      {uploading ? t("state.uploading") : t("form.uploadCover")}
                    </label>
                  )}
                  <input
                    id="se-image"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </div>
              </div>

              {/* Submitter */}
              <div className="space-y-4 border-t pt-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("form.aboutYou")}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="se-submitter-name">
                      {t("form.yourName")}
                    </Label>
                    <Input
                      id="se-submitter-name"
                      value={form.submitterName}
                      onChange={(e) => set("submitterName", e.target.value)}
                      maxLength={255}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="se-submitter-email">
                      {t("form.yourEmail")}
                    </Label>
                    <Input
                      id="se-submitter-email"
                      type="email"
                      value={form.submitterEmail}
                      onChange={(e) => set("submitterEmail", e.target.value)}
                      maxLength={255}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="se-submitter-org">
                    {t("form.organisation")}
                  </Label>
                  <Input
                    id="se-submitter-org"
                    value={form.submitterOrganisation}
                    onChange={(e) =>
                      set("submitterOrganisation", e.target.value)
                    }
                    maxLength={255}
                    placeholder={t("sideEvent.orgPlaceholder")}
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <p className="text-xs text-muted-foreground">
                  {t("sideEvent.moderationNote")}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => resetAndClose(false)}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitMut.isPending || uploading}
                    className="gap-2"
                  >
                    {submitMut.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    {t("sideEvent.submitForReview")}
                  </Button>
                </div>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------------------

export default function EventSideEvents({ eventId }: { eventId: number }) {
  const t = useT();
  const { data = [], isLoading } = trpc.events.getSideEvents.useQuery(
    { eventId },
    { enabled: !!eventId },
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-36 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const items = data as unknown as SideEventRow[];

  return (
    <div className="space-y-5">
      {items.length > 0 && (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <SideEventCard item={item} />
            </li>
          ))}
        </ul>
      )}

      {/* Host CTA — deliberately shown even with an empty list; the whole
          point is to seed the fringe programme. */}
      <Card className="border-dashed bg-muted/30">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 font-semibold">
              <PartyPopper className="h-4 w-4 text-primary" />
              {items.length > 0
                ? t("sideEvent.ctaRunning")
                : t("sideEvent.ctaEmpty")}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("sideEvent.ctaBlurb")}
            </p>
          </div>
          <HostSideEventDialog eventId={eventId} />
        </CardContent>
      </Card>
    </div>
  );
}
