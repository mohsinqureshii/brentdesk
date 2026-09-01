/**
 * Event Editor (Events Hub v2)
 *
 * Tabbed editor for the redesigned admin Event surface. Each tab maps
 * to a chunk of the editor brief:
 *
 *   Basics · Content · Speakers · Agenda · Tickets · Live ·
 *   Sponsors · Side Events · Recap · Settings
 *
 * One sticky toolbar on the right persists the "core" event row
 * (events.* columns) — child tabs that own their own tables (tickets,
 * recordings, correspondents) save independently via dedicated admin
 * procedures (see server/modules/events/events.router.ts adminXxx
 * endpoints).
 *
 * Tickets tab: when ticketProvider switches between internal / external
 * we hide the irrelevant UI but DO NOT delete saved data — operators
 * routinely flip between providers while shopping a deal.
 */

import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Save, Loader2, Plus, Trash2, Sparkles, Eye,
  Calendar, MapPin, Mic, LayoutGrid, Ticket, Radio, Award,
  CalendarPlus, FileText, Settings as SettingsIcon, Send,
  DollarSign, BarChart3, HelpCircle, Newspaper, Upload, Link2,
  Pencil, X, Check, ExternalLink, Star, Building2, ImageIcon,
  CheckCircle2, XCircle, Clock, Lock, BookOpen,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { TicketTierEditor, PromoCodeEditor } from "@/components/admin/event/TicketTierEditor";
import { LiveCoverageSettings } from "@/components/admin/event/LiveCoverageSettings";
import { CorrespondentList } from "@/components/admin/event/CorrespondentList";
import { RecordingsEditor } from "@/components/admin/event/RecordingsEditor";
import { SalesDashboard } from "@/components/admin/event/SalesDashboard";
import { EventAnalytics } from "@/components/admin/event/EventAnalytics";

// ============================================================
// TYPES
// ============================================================

type TicketProvider = "internal" | "eventbrite" | "luma" | "external" | "none";
type EventStatus = "draft" | "published" | "archived";

interface CoreForm {
  title: string;
  slug: string;
  tagline: string;
  shortDescription: string;
  description: string;
  type: string;
  format: string;
  featuredImage: string;
  startDate: string;
  endDate: string;
  timezone: string;
  venue: string;
  venueName: string;
  venueAddress: string;
  venueCity: string;
  country: string;
  venueMapUrl: string;
  venueImage: string;
  virtualUrl: string;
  organizerName: string;
  organizerEmail: string;
  organizerWebsite: string;
  organizerLogo: string;
  organizerDescription: string;
  organizerContactEmail: string;
  organizerCompanyId: number | null;
  whatToExpect: string;
  isFeatured: boolean;
  // Tickets
  ticketProvider: TicketProvider;
  externalTicketUrl: string;
  // Recap
  recapArticleId: number | null;
}

const EMPTY_FORM: CoreForm = {
  title: "",
  slug: "",
  tagline: "",
  shortDescription: "",
  description: "",
  type: "conference",
  format: "in_person",
  featuredImage: "",
  startDate: "",
  endDate: "",
  timezone: "Asia/Qatar",
  venue: "",
  venueName: "",
  venueAddress: "",
  venueCity: "",
  country: "",
  venueMapUrl: "",
  venueImage: "",
  virtualUrl: "",
  organizerName: "",
  organizerEmail: "",
  organizerWebsite: "",
  organizerLogo: "",
  organizerDescription: "",
  organizerContactEmail: "",
  organizerCompanyId: null,
  whatToExpect: "",
  isFeatured: false,
  ticketProvider: "none",
  externalTicketUrl: "",
  recapArticleId: null,
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function EventEditor() {
  const params = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const isNew = !params.id || params.id === "new";
  const eventId = isNew ? null : parseInt(params.id!);

  const [form, setForm] = useState<CoreForm>(EMPTY_FORM);
  const [activeTab, setActiveTab] = useState("basics");
  const [isSaving, setIsSaving] = useState(false);

  // Cached "stash" of ticket-provider-specific fields, kept in component
  // state so flipping providers doesn't erase what the editor typed.
  // Persisted to the server only when Save is hit.
  const [externalUrlStash, setExternalUrlStash] = useState<string>("");

  const utils = trpc.useUtils();

  const { data: existing, isLoading } = trpc.events.adminGet.useQuery(
    { id: eventId! },
    { enabled: !isNew && !!eventId },
  );

  // Drives the count badge on the Side Events tab so editors can see
  // there is moderation work waiting without opening the tab.
  const { data: pendingSideEvents = [] } =
    trpc.events.adminListSideEventSubmissions.useQuery(
      { eventId: eventId!, status: "pending" },
      { enabled: !isNew && !!eventId },
    );
  const pendingSideEventCount = pendingSideEvents.length;

  // Hydrate the form once on load.
  useEffect(() => {
    if (!existing) return;
    const e = existing as any;
    setForm({
      title: e.title ?? "",
      slug: e.slug ?? "",
      tagline: e.tagline ?? "",
      shortDescription: e.shortDescription ?? "",
      description: e.description ?? "",
      type: e.type ?? "conference",
      format: e.format ?? "in_person",
      featuredImage: e.featuredImage ?? "",
      startDate: e.startDate ? String(e.startDate).slice(0, 16) : "",
      endDate: e.endDate ? String(e.endDate).slice(0, 16) : "",
      timezone: e.timezone ?? "Asia/Qatar",
      venue: e.venue ?? "",
      venueName: e.venueName ?? "",
      venueAddress: e.venueAddress ?? "",
      venueCity: e.city ?? e.venueCity ?? "",
      country: e.country ?? "",
      venueMapUrl: e.venueMapUrl ?? "",
      venueImage: e.venueImage ?? "",
      virtualUrl: e.virtualUrl ?? "",
      organizerName: e.organizerName ?? "",
      organizerEmail: e.organizerEmail ?? "",
      organizerWebsite: e.organizerWebsite ?? "",
      organizerLogo: e.organizerLogo ?? "",
      organizerDescription: e.organizerDescription ?? "",
      organizerContactEmail: e.organizerContactEmail ?? "",
      organizerCompanyId: e.organizerCompanyId ?? null,
      whatToExpect: e.whatToExpect ?? "",
      isFeatured: !!e.isFeatured,
      ticketProvider: (e.ticketProvider ?? "none") as TicketProvider,
      externalTicketUrl: e.externalTicketUrl ?? "",
      recapArticleId: e.recapArticleId ?? null,
    });
    setExternalUrlStash(e.externalTicketUrl ?? "");
  }, [existing]);

  // ----------------------------------------------------------------
  // Core save (events.* row)
  // ----------------------------------------------------------------
  const create = trpc.events.create.useMutation({
    onSuccess: (d: any) => {
      toast.success("Event created");
      navigate(`/admin/events/${d.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const update = trpc.events.update.useMutation({
    onSuccess: () => {
      toast.success("Event saved");
      utils.events.adminGet.invalidate({ id: eventId! });
    },
    onError: (e) => toast.error(e.message),
  });

  const del = trpc.events.delete.useMutation({
    onSuccess: () => {
      toast.success("Event deleted");
      navigate("/admin/events");
    },
    onError: (e) => toast.error(e.message),
  });

  function buildSavePayload() {
    return {
      title: form.title,
      slug: form.slug || undefined,
      tagline: form.tagline,
      description: form.description,
      shortDescription: form.shortDescription,
      type: form.type as any,
      format: form.format as any,
      featuredImage: form.featuredImage,
      featuredImageUrl: form.featuredImage,
      venueName: form.venueName,
      venueAddress: form.venueAddress,
      venueMapUrl: form.venueMapUrl,
      venueImage: form.venueImage,
      venue: form.venue,
      venueCity: form.venueCity,
      city: form.venueCity,
      country: form.country,
      virtualUrl: form.virtualUrl,
      startDate: form.startDate ? new Date(form.startDate) : undefined,
      endDate: form.endDate ? new Date(form.endDate) : undefined,
      timezone: form.timezone,
      organizerName: form.organizerName,
      organizerEmail: form.organizerEmail,
      organizerWebsite: form.organizerWebsite,
      organizerLogo: form.organizerLogo || null,
      organizerDescription: form.organizerDescription || null,
      organizerContactEmail: form.organizerContactEmail || null,
      organizerCompanyId: form.organizerCompanyId,
      isFeatured: form.isFeatured,
      ticketProvider: form.ticketProvider,
      externalTicketUrl: form.ticketProvider === "internal" || form.ticketProvider === "none"
        ? null
        : (form.externalTicketUrl || externalUrlStash || null),
      recapArticleId: form.recapArticleId,
    };
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setIsSaving(true);
    try {
      if (isNew) {
        const payload = buildSavePayload();
        if (!payload.startDate) {
          toast.error("Start date is required");
          return;
        }
        await create.mutateAsync(payload as any);
      } else {
        await update.mutateAsync({ id: eventId!, ...buildSavePayload() } as any);
      }
    } finally {
      setIsSaving(false);
    }
  }

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  if (!isNew && isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Main editor column */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate("/admin/events")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{isNew ? "New Event" : form.title || "Untitled Event"}</h1>
                {!isNew && (
                  <p className="text-xs text-muted-foreground">/events/{form.slug}</p>
                )}
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* Sticky tab strip */}
            <div className="sticky top-0 z-10 -mx-2 px-2 py-2 bg-background/95 backdrop-blur border-b">
              <TabsList className="w-full h-auto flex-wrap justify-start gap-1">
                <TabsTrigger value="basics" className="gap-1"><Calendar className="h-3.5 w-3.5" /> Basics</TabsTrigger>
                <TabsTrigger value="content" className="gap-1"><FileText className="h-3.5 w-3.5" /> Content</TabsTrigger>
                <TabsTrigger value="faqs" className="gap-1"><HelpCircle className="h-3.5 w-3.5" /> FAQs</TabsTrigger>
                <TabsTrigger value="speakers" className="gap-1"><Mic className="h-3.5 w-3.5" /> Speakers</TabsTrigger>
                <TabsTrigger value="agenda" className="gap-1"><LayoutGrid className="h-3.5 w-3.5" /> Agenda</TabsTrigger>
                <TabsTrigger value="tickets" className="gap-1"><Ticket className="h-3.5 w-3.5" /> Tickets</TabsTrigger>
                <TabsTrigger value="live" className="gap-1"><Radio className="h-3.5 w-3.5" /> Live</TabsTrigger>
                <TabsTrigger value="sponsors" className="gap-1"><Award className="h-3.5 w-3.5" /> Sponsors</TabsTrigger>
                <TabsTrigger value="side" className="gap-1">
                  <CalendarPlus className="h-3.5 w-3.5" /> Side Events
                  {pendingSideEventCount > 0 && (
                    <Badge className="ml-1 h-4 px-1.5 text-[10px] bg-amber-100 text-amber-800">
                      {pendingSideEventCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="recap" className="gap-1"><Sparkles className="h-3.5 w-3.5" /> Recap</TabsTrigger>
                <TabsTrigger value="coverage" className="gap-1"><Newspaper className="h-3.5 w-3.5" /> Coverage</TabsTrigger>
                <TabsTrigger value="articles" className="gap-1"><BookOpen className="h-3.5 w-3.5" /> Articles</TabsTrigger>
                {/* Sales tab — only meaningful when we run our own checkout. */}
                {form.ticketProvider === 'internal' && (
                  <TabsTrigger value="sales" className="gap-1"><DollarSign className="h-3.5 w-3.5" /> Sales</TabsTrigger>
                )}
                <TabsTrigger value="analytics" className="gap-1"><BarChart3 className="h-3.5 w-3.5" /> Analytics</TabsTrigger>
                <TabsTrigger value="settings" className="gap-1"><SettingsIcon className="h-3.5 w-3.5" /> Settings</TabsTrigger>
              </TabsList>
            </div>

            <div className="mt-4">
              <TabsContent value="basics"><BasicsTab form={form} setForm={setForm} /></TabsContent>
              <TabsContent value="content"><ContentTab form={form} setForm={setForm} eventId={eventId} /></TabsContent>
              <TabsContent value="faqs">{eventId ? <FaqsTab eventId={eventId} /> : <SaveFirstNote />}</TabsContent>
              <TabsContent value="speakers">{eventId ? <SpeakersTab eventId={eventId} /> : <SaveFirstNote />}</TabsContent>
              <TabsContent value="agenda">{eventId ? <AgendaTab eventId={eventId} /> : <SaveFirstNote />}</TabsContent>
              <TabsContent value="tickets">
                {eventId ? (
                  <TicketsTab
                    eventId={eventId}
                    form={form}
                    setForm={setForm}
                    externalUrlStash={externalUrlStash}
                    setExternalUrlStash={setExternalUrlStash}
                  />
                ) : <SaveFirstNote />}
              </TabsContent>
              <TabsContent value="live">{eventId ? <LiveTab eventId={eventId} /> : <SaveFirstNote />}</TabsContent>
              <TabsContent value="sponsors">{eventId ? <SponsorsTab eventId={eventId} /> : <SaveFirstNote />}</TabsContent>
              <TabsContent value="side">{eventId ? <SideEventsTab eventId={eventId} /> : <SaveFirstNote />}</TabsContent>
              <TabsContent value="recap">{eventId ? <RecapTab eventId={eventId} form={form} setForm={setForm} /> : <SaveFirstNote />}</TabsContent>
              <TabsContent value="coverage">{eventId ? <CoverageTab eventId={eventId} /> : <SaveFirstNote />}</TabsContent>
              <TabsContent value="articles">{eventId ? <ArticlesTab eventId={eventId} /> : <SaveFirstNote />}</TabsContent>
              {form.ticketProvider === 'internal' && (
                <TabsContent value="sales">
                  {eventId ? <SalesDashboard eventId={eventId} /> : <SaveFirstNote />}
                </TabsContent>
              )}
              <TabsContent value="analytics">
                {eventId ? (
                  <EventAnalytics eventId={eventId} ticketProvider={form.ticketProvider} />
                ) : <SaveFirstNote />}
              </TabsContent>
              <TabsContent value="settings">
                <SettingsTab
                  eventId={eventId}
                  existing={existing as any}
                  form={form}
                  setForm={setForm}
                  onDelete={() => del.mutate({ id: eventId! })}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Sticky right toolbar */}
        <aside className="xl:w-72 xl:sticky xl:top-2 xl:self-start space-y-3">
          <Card>
            <CardContent className="p-4 space-y-3">
              <Button className="w-full" onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {isNew ? "Create Draft" : "Save Draft"}
              </Button>
              {!isNew && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(`/events/${form.slug}`, "_blank")}
                  disabled={!form.slug}
                >
                  <Eye className="h-4 w-4 mr-2" /> Preview
                </Button>
              )}
              {!isNew && (
                <PublishButton eventId={eventId!} />
              )}
            </CardContent>
          </Card>

          {!isNew && (
            <Card>
              <CardContent className="p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium">{(existing as any)?.statusName ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mode</span>
                  <span className="font-medium uppercase">{(existing as any)?.mode ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Provider</span>
                  <span className="font-medium">{form.ticketProvider}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </AdminLayout>
  );
}

// ============================================================
// SHARED HELPERS
// ============================================================

function SaveFirstNote() {
  return (
    <Card>
      <CardContent className="p-8 text-center text-sm text-muted-foreground">
        Save the event first to unlock this tab.
      </CardContent>
    </Card>
  );
}

/**
 * Shared upload helper. Every uploader in this file posts a FormData
 * field named "file" to /api/upload and gets back `{ url }` — same
 * contract CompanyEditor uses.
 */
async function uploadToApi(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error(await res.text());
  const { url } = await res.json();
  if (!url) throw new Error("Upload returned no URL");
  return url as string;
}

/**
 * Image field with both "paste a URL" and "upload a file" affordances.
 * Shows a thumbnail preview once a value is present.
 */
function ImageUploadField({
  label, value, onChange, placeholder = "https://… or upload",
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
}) {
  const [busy, setBusy] = useState(false);
  const inputId = useMemo(
    () => `img-up-${Math.random().toString(36).slice(2, 9)}`,
    [],
  );

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Max 10MB"); return; }
    setBusy(true);
    try {
      onChange(await uploadToApi(file));
      toast.success("Image uploaded");
    } catch (err) {
      toast.error("Upload failed: " + String(err));
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
        <input id={inputId} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="shrink-0"
          disabled={busy}
          onClick={() => document.getElementById(inputId)?.click()}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        </Button>
        {value && (
          <Button type="button" size="sm" variant="ghost" className="shrink-0" onClick={() => onChange("")}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {value && (
        <img src={value} alt="" className="mt-2 h-20 w-auto rounded border object-contain" />
      )}
    </div>
  );
}

/** Debounce any value — used by the sponsor / people typeaheads. */
function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** Small confirm-then-delete button used across the new tabs. */
function ConfirmDeleteButton({
  onConfirm, title, description, label,
}: {
  onConfirm: () => void;
  title: string;
  description: string;
  label?: string;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-destructive">
          <Trash2 className="h-4 w-4" />
          {label ? <span className="ml-1">{label}</span> : null}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** `Date | string | null` → "HH:MM" for <input type="time">. */
function toTimeInput(v: any): string {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return typeof v === "string" ? v.slice(0, 5) : "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** `Date | string | null` → "YYYY-MM-DD" for <input type="date">. */
function toDateInput(v: any): string {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return typeof v === "string" ? v.slice(0, 10) : "";
  return d.toISOString().slice(0, 10);
}

const SIDE_EVENT_TYPES = [
  "side_event", "workshop", "networking", "party", "dinner", "tour", "other",
] as const;
type SideEventType = (typeof SIDE_EVENT_TYPES)[number];

const COVERAGE_TYPES = [
  "article", "video", "photos", "report", "press_release", "social", "other",
] as const;
type CoverageType = (typeof COVERAGE_TYPES)[number];

function labelise(v: string) {
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const SIDE_EVENT_STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

function PublishButton({ eventId }: { eventId: number }) {
  // Placeholder — wired into the workflow.transition pipeline in a
  // follow-up. For now just exposes the existing transition route.
  return (
    <Button variant="secondary" className="w-full" onClick={() => toast.message("Use workflow page to publish")}>
      <Send className="h-4 w-4 mr-2" /> Publish
    </Button>
  );
}

// ============================================================
// TAB: Basics
// ============================================================

function BasicsTab({ form, setForm }: { form: CoreForm; setForm: (f: CoreForm) => void }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Identity</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label>Slug</Label>
            <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated" />
          </div>
          <div>
            <Label>Tagline</Label>
            <Input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="conference">Conference</SelectItem>
                <SelectItem value="webinar">Webinar</SelectItem>
                <SelectItem value="meetup">Meetup</SelectItem>
                <SelectItem value="workshop">Workshop</SelectItem>
                <SelectItem value="hackathon">Hackathon</SelectItem>
                <SelectItem value="summit">Summit</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Format</Label>
            <Select value={form.format} onValueChange={(v) => setForm({ ...form, format: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="in_person">In-Person</SelectItem>
                <SelectItem value="virtual">Virtual</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <ImageUploadField
              label="Cover image"
              value={form.featuredImage}
              onChange={(url) => setForm({ ...form, featuredImage: url })}
              placeholder="https://… or upload a cover image"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dates & Timezone</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Start *</Label>
            <Input type="datetime-local" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </div>
          <div>
            <Label>End</Label>
            <Input type="datetime-local" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </div>
          <div>
            <Label>Timezone</Label>
            <Input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} placeholder="Asia/Qatar" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Venue</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Name</Label>
            <Input value={form.venueName} onChange={(e) => setForm({ ...form, venueName: e.target.value })} />
          </div>
          <div>
            <Label>Address</Label>
            <Input value={form.venueAddress} onChange={(e) => setForm({ ...form, venueAddress: e.target.value })} />
          </div>
          <div>
            <Label>City</Label>
            <Input value={form.venueCity} onChange={(e) => setForm({ ...form, venueCity: e.target.value })} />
          </div>
          <div>
            <Label>Country</Label>
            <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Map URL</Label>
            <Input value={form.venueMapUrl} onChange={(e) => setForm({ ...form, venueMapUrl: e.target.value })} placeholder="https://maps.google.com/…" />
          </div>
          <div className="md:col-span-2">
            <ImageUploadField
              label="Venue image"
              value={form.venueImage}
              onChange={(url) => setForm({ ...form, venueImage: url })}
              placeholder="https://… or upload a venue photo"
            />
          </div>
          <div className="md:col-span-2">
            <Label>Virtual URL (for hybrid / virtual)</Label>
            <Input value={form.virtualUrl} onChange={(e) => setForm({ ...form, virtualUrl: e.target.value })} placeholder="https://zoom.us/…" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organizer</CardTitle>
          <CardDescription>
            Link a Company record where we have one — the profile page then
            cross-references this event.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Name</Label>
            <Input value={form.organizerName} onChange={(e) => setForm({ ...form, organizerName: e.target.value })} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.organizerEmail} onChange={(e) => setForm({ ...form, organizerEmail: e.target.value })} />
          </div>
          <div>
            <Label>Website</Label>
            <Input value={form.organizerWebsite} onChange={(e) => setForm({ ...form, organizerWebsite: e.target.value })} />
          </div>
          <div>
            <Label>Contact email</Label>
            <Input
              type="email"
              value={form.organizerContactEmail}
              onChange={(e) => setForm({ ...form, organizerContactEmail: e.target.value })}
              placeholder="Public enquiries inbox"
            />
          </div>
          <div className="md:col-span-2">
            <OrganizerCompanyPicker
              companyId={form.organizerCompanyId}
              onChange={(id, company) => setForm({
                ...form,
                organizerCompanyId: id,
                // Prefill blanks from the company, never overwrite typed values.
                organizerName: form.organizerName || company?.name || "",
                organizerWebsite: form.organizerWebsite || company?.websiteUrl || "",
                organizerLogo: form.organizerLogo || company?.logo || "",
              })}
            />
          </div>
          <div className="md:col-span-2">
            <ImageUploadField
              label="Logo"
              value={form.organizerLogo}
              onChange={(url) => setForm({ ...form, organizerLogo: url })}
              placeholder="https://… or upload the organizer logo"
            />
          </div>
          <div className="md:col-span-2">
            <Label>Description</Label>
            <Textarea
              rows={4}
              value={form.organizerDescription}
              onChange={(e) => setForm({ ...form, organizerDescription: e.target.value })}
              placeholder="Short bio of the organising body, shown on the event page."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Links the event's organizer to a canonical Company record. Reuses the
 * sponsor entity typeahead (kind: 'company'); the chip label is resolved
 * via companies.get so a previously-saved link still shows a name.
 */
function OrganizerCompanyPicker({
  companyId, onChange,
}: {
  companyId: number | null;
  onChange: (id: number | null, company?: any) => void;
}) {
  const [q, setQ] = useState("");
  const debouncedQ = useDebounced(q);
  const { data: results = [], isFetching } = trpc.events.adminSearchSponsorEntities.useQuery(
    { q: debouncedQ, kind: "company" },
    { enabled: !companyId && debouncedQ.trim().length > 1 },
  );
  const { data: linked } = trpc.companies.get.useQuery(
    { id: companyId! },
    { enabled: !!companyId },
  );

  if (companyId) {
    return (
      <div>
        <Label>Organizer company</Label>
        <div className="flex items-center gap-2 border rounded px-3 py-2 bg-muted/30">
          {(linked as any)?.logo
            ? <img src={(linked as any).logo} alt="" className="h-7 w-7 rounded object-contain shrink-0" />
            : <div className="h-7 w-7 rounded bg-muted shrink-0 flex items-center justify-center">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              </div>}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">
              Linked to {(linked as any)?.name ?? `company #${companyId}`}
            </div>
            {(linked as any)?.slug && (
              <a
                href={`/companies/${(linked as any).slug}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" /> /companies/{(linked as any).slug}
              </a>
            )}
          </div>
          <Badge className="bg-blue-100 text-blue-700 shrink-0 gap-1">
            <Link2 className="h-3 w-3" /> Company
          </Badge>
          <Button size="sm" variant="ghost" onClick={() => onChange(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Label>Organizer company</Label>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search companies…" />
      {debouncedQ.trim().length > 1 && (
        <div className="mt-1 border rounded max-h-56 overflow-auto divide-y bg-background">
          {isFetching && <p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p>}
          {!isFetching && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground italic">No companies match “{debouncedQ}”.</p>
          )}
          {(results as any[]).map((c) => (
            <button
              key={c.id}
              type="button"
              className="w-full flex items-center gap-2 text-left px-3 py-2 hover:bg-muted"
              onClick={() => { onChange(c.id, c); setQ(""); }}
            >
              {c.logo
                ? <img src={c.logo} alt="" className="h-7 w-7 rounded object-contain shrink-0" />
                : <div className="h-7 w-7 rounded bg-muted shrink-0 flex items-center justify-center">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>}
              <span className="min-w-0">
                <span className="block text-sm font-medium truncate">{c.name}</span>
                <span className="block text-xs text-muted-foreground truncate">/{c.slug}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      <p className="mt-1 text-xs text-muted-foreground">
        Optional. Leave blank to keep the organizer as free text.
      </p>
    </div>
  );
}

// ============================================================
// TAB: Content
// ============================================================

function ContentTab({
  form, setForm, eventId,
}: {
  form: CoreForm;
  setForm: (f: CoreForm) => void;
  eventId: number | null;
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Descriptions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Short description</Label>
            <Textarea
              value={form.shortDescription}
              onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
              rows={3}
              placeholder="1–2 sentence summary for cards / search snippets"
            />
          </div>
          <div>
            <Label>Long description</Label>
            <RichTextEditor
              content={form.description}
              onChange={(c) => setForm({ ...form, description: c })}
              placeholder="Full event description (HTML / Markdown)"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What to expect</CardTitle>
          <CardDescription>One bullet per line.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={6}
            value={form.whatToExpect}
            onChange={(e) => setForm({ ...form, whatToExpect: e.target.value })}
            placeholder={"500+ founders\n40 sessions\nDemo Day finale"}
          />
        </CardContent>
      </Card>

      {eventId ? <HighlightsEditor eventId={eventId} /> : null}
    </div>
  );
}

// ============================================================
// TAB: FAQs
// ============================================================

interface FaqDraft {
  id: number | null;
  question: string;
  answer: string;
  sortOrder: number;
}

const EMPTY_FAQ: FaqDraft = { id: null, question: "", answer: "", sortOrder: 0 };

function FaqsTab({ eventId }: { eventId: number }) {
  const utils = trpc.useUtils();
  const { data: faqs = [], isLoading } = trpc.events.getFaqs.useQuery({ eventId });
  const [draft, setDraft] = useState<FaqDraft>(EMPTY_FAQ);

  const upsert = trpc.events.adminUpsertFaq.useMutation({
    onSuccess: () => {
      toast.success(draft.id ? "FAQ updated" : "FAQ added");
      setDraft(EMPTY_FAQ);
      utils.events.getFaqs.invalidate({ eventId });
    },
    onError: (e) => toast.error(e.message),
  });

  // Silent variant for the inline sortOrder inputs — a toast per
  // keystroke-blur would be noise.
  const reorder = trpc.events.adminUpsertFaq.useMutation({
    onSuccess: () => utils.events.getFaqs.invalidate({ eventId }),
    onError: (e) => toast.error(e.message),
  });

  const del = trpc.events.adminDeleteFaq.useMutation({
    onSuccess: () => {
      toast.success("FAQ deleted");
      utils.events.getFaqs.invalidate({ eventId });
    },
    onError: (e) => toast.error(e.message),
  });

  function submit() {
    if (!draft.question.trim()) { toast.error("Question is required"); return; }
    if (!draft.answer.trim()) { toast.error("Answer is required"); return; }
    upsert.mutate({
      ...(draft.id ? { id: draft.id } : {}),
      eventId,
      question: draft.question.trim(),
      answer: draft.answer.trim(),
      sortOrder: draft.sortOrder,
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{draft.id ? "Edit FAQ" : "Add FAQ"}</CardTitle>
          <CardDescription>Shown in the FAQ accordion on the public event page.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-3">
              <Label>Question *</Label>
              <Input
                value={draft.question}
                onChange={(e) => setDraft({ ...draft, question: e.target.value })}
                placeholder="Is there parking on site?"
              />
            </div>
            <div>
              <Label>Sort order</Label>
              <Input
                type="number"
                value={draft.sortOrder}
                onChange={(e) => setDraft({ ...draft, sortOrder: parseInt(e.target.value || "0", 10) })}
              />
            </div>
          </div>
          <div>
            <Label>Answer *</Label>
            <Textarea
              rows={4}
              value={draft.answer}
              onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
              placeholder="Yes — the venue has 400 free parking spaces."
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={submit} disabled={upsert.isPending}>
              {upsert.isPending
                ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                : draft.id ? <Check className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              {draft.id ? "Save FAQ" : "Add FAQ"}
            </Button>
            {draft.id && (
              <Button size="sm" variant="ghost" onClick={() => setDraft(EMPTY_FAQ)}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>FAQs ({faqs.length})</CardTitle>
          <CardDescription>Lower sort order shows first. Edit the number and tab away to save.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : faqs.length === 0 ? (
            <div className="py-10 text-center">
              <HelpCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No FAQs yet.</p>
              <p className="text-xs text-muted-foreground">Add the questions attendees keep emailing about.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(faqs as any[]).map((f) => (
                <div key={f.id} className="border rounded px-3 py-2">
                  <div className="flex items-start gap-2">
                    <Input
                      type="number"
                      className="w-16 shrink-0"
                      defaultValue={f.sortOrder ?? 0}
                      onBlur={(e) => {
                        const next = parseInt(e.target.value || "0", 10);
                        if (next === (f.sortOrder ?? 0)) return;
                        reorder.mutate({
                          id: f.id, eventId, question: f.question,
                          answer: f.answer, sortOrder: next,
                        });
                      }}
                    />
                    <Accordion type="single" collapsible className="flex-1 min-w-0">
                      <AccordionItem value={`faq-${f.id}`} className="border-0">
                        <AccordionTrigger className="py-1 text-sm text-left">{f.question}</AccordionTrigger>
                        <AccordionContent className="whitespace-pre-wrap text-sm text-muted-foreground">
                          {f.answer}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                    <div className="flex shrink-0 items-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDraft({
                          id: f.id, question: f.question, answer: f.answer, sortOrder: f.sortOrder ?? 0,
                        })}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <ConfirmDeleteButton
                        onConfirm={() => del.mutate({ id: f.id })}
                        title="Delete this FAQ?"
                        description={`"${f.question}" will be removed from the public event page.`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// TAB: Coverage (press / media)
// ============================================================

interface CoverageDraft {
  id: number | null;
  title: string;
  url: string;
  coverageType: CoverageType;
  sourceName: string;
  imageUrl: string;
  isUploaded: boolean;
  publishedAt: string;
  sortOrder: number;
}

const EMPTY_COVERAGE: CoverageDraft = {
  id: null, title: "", url: "", coverageType: "article",
  sourceName: "", imageUrl: "", isUploaded: false,
  publishedAt: "", sortOrder: 0,
};

const COVERAGE_TYPE_STYLES: Record<string, string> = {
  article: "bg-blue-100 text-blue-700",
  video: "bg-purple-100 text-purple-700",
  photos: "bg-pink-100 text-pink-700",
  report: "bg-slate-100 text-slate-700",
  press_release: "bg-amber-100 text-amber-800",
  social: "bg-cyan-100 text-cyan-700",
  other: "bg-muted text-muted-foreground",
};

function CoverageTab({ eventId }: { eventId: number }) {
  const utils = trpc.useUtils();
  const { data: rows = [], isLoading } = trpc.events.getCoverage.useQuery({ eventId });
  const [draft, setDraft] = useState<CoverageDraft>(EMPTY_COVERAGE);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedName, setUploadedName] = useState("");

  const upsert = trpc.events.adminUpsertCoverage.useMutation({
    onSuccess: () => {
      toast.success(draft.id ? "Coverage updated" : "Coverage added");
      setDraft(EMPTY_COVERAGE);
      setUploadedName("");
      utils.events.getCoverage.invalidate({ eventId });
    },
    onError: (e) => toast.error(e.message),
  });

  const del = trpc.events.adminDeleteCoverage.useMutation({
    onSuccess: () => {
      toast.success("Coverage deleted");
      utils.events.getCoverage.invalidate({ eventId });
    },
    onError: (e) => toast.error(e.message),
  });

  // "Upload a file" branch of the URL field: the uploaded asset's URL
  // becomes the coverage URL and we flag the row as self-hosted.
  async function handleUrlFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) { toast.error("Max 25MB"); return; }
    setUploadingFile(true);
    try {
      const url = await uploadToApi(file);
      setDraft((d) => ({ ...d, url, isUploaded: true }));
      setUploadedName(file.name);
      toast.success("File uploaded");
    } catch (err) {
      toast.error("Upload failed: " + String(err));
    } finally {
      setUploadingFile(false);
      e.target.value = "";
    }
  }

  function submit() {
    if (!draft.title.trim()) { toast.error("Title is required"); return; }
    if (!draft.url.trim()) { toast.error("Paste a link or upload a file"); return; }
    upsert.mutate({
      ...(draft.id ? { id: draft.id } : {}),
      eventId,
      title: draft.title.trim(),
      url: draft.url.trim(),
      coverageType: draft.coverageType,
      sourceName: draft.sourceName.trim() || null,
      imageUrl: draft.imageUrl.trim() || null,
      isUploaded: draft.isUploaded,
      publishedAt: draft.publishedAt || null,
      sortOrder: draft.sortOrder,
    });
  }

  function edit(c: any) {
    setDraft({
      id: c.id,
      title: c.title ?? "",
      url: c.url ?? "",
      coverageType: (c.coverageType ?? "article") as CoverageType,
      sourceName: c.sourceName ?? "",
      imageUrl: c.imageUrl ?? "",
      isUploaded: !!c.isUploaded,
      publishedAt: toDateInput(c.publishedAt),
      sortOrder: c.sortOrder ?? 0,
    });
    setUploadedName("");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{draft.id ? "Edit coverage" : "Add coverage"}</CardTitle>
          <CardDescription>
            Press mentions, recap videos, photo sets and reports. Link out to the
            original, or upload the asset if we're hosting it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-3">
              <Label>Title *</Label>
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Reuters: 500 founders descend on Riyadh"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select
                value={draft.coverageType}
                onValueChange={(v) => setDraft({ ...draft, coverageType: v as CoverageType })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COVERAGE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{labelise(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Source</Label>
              <Input
                value={draft.sourceName}
                onChange={(e) => setDraft({ ...draft, sourceName: e.target.value })}
                placeholder="Reuters"
              />
            </div>
            <div>
              <Label>Published</Label>
              <Input
                type="date"
                value={draft.publishedAt}
                onChange={(e) => setDraft({ ...draft, publishedAt: e.target.value })}
              />
            </div>
          </div>

          {/* URL: paste a link OR upload a file. */}
          <div>
            <Label>Link or file *</Label>
            <div className="flex gap-2">
              <Input
                value={draft.url}
                onChange={(e) => setDraft({ ...draft, url: e.target.value, isUploaded: false })}
                placeholder="https://www.reuters.com/…"
              />
              <input
                id="coverage-file"
                type="file"
                className="hidden"
                onChange={handleUrlFile}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0"
                disabled={uploadingFile}
                onClick={() => document.getElementById("coverage-file")?.click()}
              >
                {uploadingFile
                  ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  : <Upload className="h-4 w-4 mr-1" />}
                Upload file
              </Button>
            </div>
            {draft.isUploaded && draft.url && (
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <Badge className="bg-green-100 text-green-700">Uploaded</Badge>
                <span className="truncate">{uploadedName || draft.url}</span>
              </div>
            )}
            {!draft.isUploaded && draft.url && (
              <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                <Link2 className="h-3 w-3" /> External link
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-3">
              <ImageUploadField
                label="Thumbnail (optional)"
                value={draft.imageUrl}
                onChange={(url) => setDraft((d) => ({ ...d, imageUrl: url }))}
              />
            </div>
            <div>
              <Label>Sort order</Label>
              <Input
                type="number"
                value={draft.sortOrder}
                onChange={(e) => setDraft({ ...draft, sortOrder: parseInt(e.target.value || "0", 10) })}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={submit} disabled={upsert.isPending}>
              {upsert.isPending
                ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                : draft.id ? <Check className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              {draft.id ? "Save coverage" : "Add coverage"}
            </Button>
            {draft.id && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setDraft(EMPTY_COVERAGE); setUploadedName(""); }}
              >
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Coverage ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center">
              <Newspaper className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No coverage yet.</p>
              <p className="text-xs text-muted-foreground">Add press mentions and recap media after the event.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(rows as any[]).map((c) => (
                <div key={c.id} className="flex items-start gap-3 border rounded px-3 py-2">
                  {c.imageUrl ? (
                    <img src={c.imageUrl} alt="" className="h-14 w-20 shrink-0 rounded object-cover border" />
                  ) : (
                    <div className="h-14 w-20 shrink-0 rounded border bg-muted flex items-center justify-center">
                      <ImageIcon className="h-4 w-4 text-muted-foreground/60" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{c.title}</span>
                      <Badge className={COVERAGE_TYPE_STYLES[c.coverageType] ?? COVERAGE_TYPE_STYLES.other}>
                        {labelise(c.coverageType ?? "other")}
                      </Badge>
                      {c.isUploaded && <Badge variant="outline" className="text-xs">Uploaded</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {c.sourceName || "—"}
                      {c.publishedAt && ` · ${new Date(c.publishedAt).toLocaleDateString()}`}
                    </div>
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 mt-0.5 truncate max-w-full"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span className="truncate">{c.url}</span>
                    </a>
                  </div>
                  <div className="flex shrink-0 items-center">
                    <Button size="sm" variant="ghost" onClick={() => edit(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <ConfirmDeleteButton
                      onConfirm={() => del.mutate({ id: c.id })}
                      title="Delete this coverage item?"
                      description={`"${c.title}" will no longer appear in the event's press section.`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// TAB: Articles (TechScoop articles linked to this event)
// ============================================================

/**
 * `article_events.mentionType` — how a linked article relates to the
 * event. Order here is the order the Select renders in; the enum lives
 * on adminLinkArticle in server/modules/events/events.router.ts.
 */
const MENTION_TYPES = [
  "primary", "mentioned", "interview", "partner", "speaker", "sponsor", "investor_in_round",
] as const;
type MentionType = (typeof MENTION_TYPES)[number];

const MENTION_TYPE_LABELS: Record<MentionType, string> = {
  primary: "Primary coverage",
  mentioned: "Mentioned",
  interview: "Interview",
  partner: "Partner",
  speaker: "Speaker",
  sponsor: "Sponsor",
  investor_in_round: "Investor in round",
};

const MENTION_TYPE_STYLES: Record<string, string> = {
  primary: "bg-blue-100 text-blue-700",
  mentioned: "bg-muted text-muted-foreground",
  interview: "bg-purple-100 text-purple-700",
  partner: "bg-green-100 text-green-700",
  speaker: "bg-amber-100 text-amber-800",
  sponsor: "bg-pink-100 text-pink-700",
  investor_in_round: "bg-cyan-100 text-cyan-700",
};

function mentionLabel(v: string | null | undefined) {
  const key = (v ?? "mentioned") as MentionType;
  return MENTION_TYPE_LABELS[key] ?? labelise(String(v ?? "mentioned"));
}

/**
 * Public URL for a linked article. Articles live under their primary
 * category when they have one, and fall back to /news otherwise.
 */
function articlePublicHref(a: { categorySlug?: string | null; slug: string }) {
  return a.categorySlug ? `/${a.categorySlug}/${a.slug}` : `/news/${a.slug}`;
}

function ArticlesTab({ eventId }: { eventId: number }) {
  const utils = trpc.useUtils();
  const { data: linked = [], isLoading } = trpc.events.getEventArticles.useQuery({ eventId, includeUnpublished: true });

  const [q, setQ] = useState("");
  const debouncedQ = useDebounced(q);
  const [mentionType, setMentionType] = useState<MentionType>("mentioned");

  const { data: results = [], isFetching } = trpc.events.adminSearchArticlesForLink.useQuery(
    { q: debouncedQ },
    { enabled: debouncedQ.trim().length > 1 },
  );

  // Two instances of the same upsert mutation so the toast can say what
  // actually happened — linking a new article vs. retyping an existing link.
  const link = trpc.events.adminLinkArticle.useMutation({
    onSuccess: () => {
      toast.success("Article linked");
      setQ("");
      utils.events.getEventArticles.invalidate({ eventId });
    },
    onError: (e) => toast.error(e.message),
  });

  const retype = trpc.events.adminLinkArticle.useMutation({
    onSuccess: () => {
      toast.success("Mention type updated");
      utils.events.getEventArticles.invalidate({ eventId });
    },
    onError: (e) => toast.error(e.message),
  });

  const unlink = trpc.events.adminUnlinkArticle.useMutation({
    onSuccess: () => {
      toast.success("Article unlinked");
      utils.events.getEventArticles.invalidate({ eventId });
    },
    onError: (e) => toast.error(e.message),
  });

  const rows = linked as any[];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Link a TechScoop article</CardTitle>
          <CardDescription>
            Optional. Linked articles surface on the public event page as
            related coverage — search our own published articles and pick how
            each one relates to the event.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <Select value={mentionType} onValueChange={(v) => setMentionType(v as MentionType)}>
              <SelectTrigger className="w-48 shrink-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MENTION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{MENTION_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search published articles by title…"
            />
          </div>
          {debouncedQ.trim().length > 1 && (
            <div className="border rounded max-h-56 overflow-auto divide-y">
              {isFetching && <p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p>}
              {!isFetching && results.length === 0 && (
                <p className="px-3 py-2 text-xs text-muted-foreground italic">No articles match “{debouncedQ}”.</p>
              )}
              {(results as any[]).map((a) => (
                <button
                  key={a.id}
                  type="button"
                  disabled={link.isPending}
                  className="w-full flex items-center gap-2 text-left px-3 py-2 hover:bg-muted disabled:opacity-60"
                  onClick={() => link.mutate({ eventId, articleId: a.id, mentionType })}
                >
                  <Newspaper className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium truncate">{a.title}</span>
                    <span className="block text-xs text-muted-foreground truncate">
                      {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString() : "Unpublished"} · /{a.slug}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Re-linking an article you already linked just updates its mention type.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Linked articles ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center">
              <BookOpen className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No articles linked yet.</p>
              <p className="text-xs text-muted-foreground">
                Search above to attach our coverage of this event.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map((a) => (
                <div key={a.id} className="flex items-start gap-3 border rounded px-3 py-2">
                  {a.featuredImage ? (
                    <img src={a.featuredImage} alt="" className="h-14 w-20 shrink-0 rounded object-cover border" />
                  ) : (
                    <div className="h-14 w-20 shrink-0 rounded border bg-muted flex items-center justify-center">
                      <ImageIcon className="h-4 w-4 text-muted-foreground/60" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <a
                        href={articlePublicHref(a)}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-sm hover:underline inline-flex items-center gap-1 min-w-0"
                      >
                        <span className="truncate">{a.title}</span>
                        <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                      </a>
                      <Badge className={MENTION_TYPE_STYLES[a.mentionType] ?? MENTION_TYPE_STYLES.mentioned}>
                        {mentionLabel(a.mentionType)}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString() : "—"}
                      {a.categoryName && ` · ${a.categoryName}`}
                    </div>
                    {a.excerpt && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.excerpt}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Select
                      value={(a.mentionType ?? "mentioned") as MentionType}
                      onValueChange={(v) =>
                        retype.mutate({ eventId, articleId: a.articleId, mentionType: v as MentionType })
                      }
                    >
                      <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MENTION_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{MENTION_TYPE_LABELS[t]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <ConfirmDeleteButton
                      onConfirm={() => unlink.mutate({ id: a.id })}
                      title="Unlink this article?"
                      description={`"${a.title}" will no longer appear as related coverage on the event page. The article itself is not deleted.`}
                      label="Unlink"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function HighlightsEditor({ eventId }: { eventId: number }) {
  const utils = trpc.useUtils();
  const { data: highlights = [] } = trpc.events.getHighlights.useQuery({ eventId });
  const add = trpc.events.addHighlight.useMutation({
    onSuccess: () => {
      setT(""); setD("");
      utils.events.getHighlights.invalidate({ eventId });
    },
    onError: (e) => toast.error(e.message),
  });
  const del = trpc.events.deleteHighlight.useMutation({
    onSuccess: () => utils.events.getHighlights.invalidate({ eventId }),
  });

  const [t, setT] = useState("");
  const [d, setD] = useState("");

  return (
    <Card>
      <CardHeader><CardTitle>Highlights</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input value={t} onChange={(e) => setT(e.target.value)} placeholder="Highlight title" />
          <Input value={d} onChange={(e) => setD(e.target.value)} placeholder="Description (optional)" />
          <Button
            size="sm"
            onClick={() => t.trim() && add.mutate({ eventId, title: t, description: d, sortOrder: highlights.length })}
          >Add</Button>
        </div>
        <div className="space-y-1">
          {highlights.map((h: any) => (
            <div key={h.id} className="flex items-center justify-between border rounded px-2 py-1.5">
              <div>
                <div className="font-medium text-sm">{h.title}</div>
                {h.description && <div className="text-xs text-muted-foreground">{h.description}</div>}
              </div>
              <Button size="sm" variant="ghost" onClick={() => del.mutate({ id: h.id })}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// TAB: Speakers
// ============================================================

/**
 * Typeahead over the `people` table. Picking a result hands the caller
 * the whole person record so the speaker form can prefill from it.
 */
function PeoplePicker({
  onPick, placeholder = "Search people…",
}: {
  onPick: (p: any) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const debouncedQ = useDebounced(q);
  const { data: results = [], isFetching } = trpc.events.adminSearchPeople.useQuery(
    { q: debouncedQ },
    { enabled: debouncedQ.trim().length > 1 },
  );

  return (
    <div className="relative">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} />
      {debouncedQ.trim().length > 1 && (
        <div className="mt-1 border rounded max-h-56 overflow-auto divide-y bg-background">
          {isFetching && <p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p>}
          {!isFetching && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground italic">No people match “{debouncedQ}”.</p>
          )}
          {(results as any[]).map((p) => (
            <button
              key={p.id}
              type="button"
              className="w-full flex items-center gap-2 text-left px-3 py-2 hover:bg-muted"
              onClick={() => { onPick(p); setQ(""); }}
            >
              {p.photo
                ? <img src={p.photo} alt="" className="h-7 w-7 rounded-full object-cover shrink-0" />
                : <div className="h-7 w-7 rounded-full bg-muted shrink-0" />}
              <span className="min-w-0">
                <span className="block text-sm font-medium truncate">{p.name}</span>
                <span className="block text-xs text-muted-foreground truncate">
                  {[p.title, p.company].filter(Boolean).join(" · ") || `/people/${p.slug}`}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Fields the People record owns once a speaker is linked. `getSpeakers`
 * splits them per speaker into `inheritedFields` (person has a value —
 * read-only here, edit it on the profile) and `missingOnPerson` (gaps —
 * still editable here, and saving writes them BACK to the person via
 * adminFillPersonGaps). Everything else on the row (websiteUrl,
 * isFeatured, sortOrder) is speaker-only and keeps using updateSpeaker.
 */
const PERSON_GAP_FIELDS = ["title", "company", "bio", "photo", "linkedinUrl", "twitterUrl"] as const;
type PersonGapField = typeof PERSON_GAP_FIELDS[number];

const PERSON_FIELD_LABELS: Record<string, string> = {
  name: "Name",
  title: "Title",
  company: "Company",
  bio: "Bio",
  photo: "Photo",
  linkedinUrl: "LinkedIn",
  twitterUrl: "X / Twitter",
};

/** "Nadia" → "Nadia's", "Chris" → "Chris'". */
function possessive(name: string) {
  const n = (name || "this person").trim();
  return /s$/i.test(n) ? `${n}'` : `${n}'s`;
}

/** A value that lives on the Person record — shown, never typed into. */
function InheritedField({
  label, value, personName, isPhoto = false,
}: {
  label: string;
  value?: string | null;
  personName: string;
  isPhoto?: boolean;
}) {
  return (
    <div>
      <Label className="flex items-center gap-1 text-muted-foreground">
        {label} <Lock className="h-3 w-3" />
      </Label>
      {isPhoto ? (
        value
          ? <img src={value} alt="" className="mt-1 h-20 w-auto rounded border object-contain" />
          : <div className="mt-1 h-20 w-20 rounded border bg-muted/40" />
      ) : (
        <div className="mt-1 rounded border bg-muted/40 px-3 py-2 text-sm whitespace-pre-wrap break-words">
          {value || <span className="text-muted-foreground italic">—</span>}
        </div>
      )}
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        From {possessive(personName)} profile
      </p>
    </div>
  );
}

/** Label + amber chip for a field the linked person is missing. */
function GapLabel({ label }: { label: string }) {
  return (
    <Label className="flex items-center gap-2">
      {label}
      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-[10px] px-1.5 py-0 font-normal">
        Missing on profile
      </Badge>
    </Label>
  );
}

function GapHint({ personName }: { personName: string }) {
  return (
    <p className="mt-0.5 text-[11px] text-amber-700">
      Not on their profile yet — saving adds it to {possessive(personName)} People record.
    </p>
  );
}

/**
 * Editor card for a speaker LINKED to a person. The person is the single
 * source of truth: inherited fields are locked, gaps are fillable and go
 * to the person, speaker-only fields go to the speaker row.
 */
function LinkedSpeakerCard({
  speaker, onDelete, onUnlink,
}: {
  speaker: any;
  onDelete: () => void;
  onUnlink: () => void;
}) {
  const utils = trpc.useUtils();
  const fillGaps = trpc.events.adminFillPersonGaps.useMutation();
  const updateSpeaker = trpc.events.updateSpeaker.useMutation();

  const personName: string = speaker.name || "this person";
  const inherited: string[] = speaker.inheritedFields ?? [];
  const missing: string[] = speaker.missingOnPerson ?? [];
  const isInherited = (f: string) => inherited.includes(f);
  const isGap = (f: string) => missing.includes(f);

  // Drafts for the gap fields only — inherited ones are never editable.
  const [gaps, setGaps] = useState<Record<string, string>>({});
  const [websiteUrl, setWebsiteUrl] = useState<string>(speaker.websiteUrl ?? "");
  const [isFeatured, setIsFeatured] = useState<boolean>(Boolean(speaker.isFeatured));
  const [sortOrder, setSortOrder] = useState<string>(String(speaker.sortOrder ?? 0));
  const [saving, setSaving] = useState(false);

  // Re-sync when the row comes back from the server (post-invalidate).
  useEffect(() => {
    setGaps({});
    setWebsiteUrl(speaker.websiteUrl ?? "");
    setIsFeatured(Boolean(speaker.isFeatured));
    setSortOrder(String(speaker.sortOrder ?? 0));
  }, [speaker.id, speaker.websiteUrl, speaker.isFeatured, speaker.sortOrder]);

  const setGap = (f: PersonGapField, v: string) => setGaps((g) => ({ ...g, [f]: v }));
  const gapValue = (f: PersonGapField) => gaps[f] ?? "";

  async function handleSave() {
    // Only the gap fields the admin actually filled in.
    const gapPayload: Record<string, string> = {};
    for (const f of PERSON_GAP_FIELDS) {
      if (!isGap(f)) continue;
      const v = gapValue(f).trim();
      if (v) gapPayload[f] = v;
    }
    // Speaker-only diffs.
    const speakerPatch: Record<string, unknown> = {};
    if (websiteUrl !== (speaker.websiteUrl ?? "")) speakerPatch.websiteUrl = websiteUrl;
    if (isFeatured !== Boolean(speaker.isFeatured)) speakerPatch.isFeatured = isFeatured;
    const parsedSort = parseInt(sortOrder, 10);
    if (!Number.isNaN(parsedSort) && parsedSort !== (speaker.sortOrder ?? 0)) {
      speakerPatch.sortOrder = parsedSort;
    }

    const hasGaps = Object.keys(gapPayload).length > 0;
    const hasSpeakerChanges = Object.keys(speakerPatch).length > 0;
    if (!hasGaps && !hasSpeakerChanges) { toast("Nothing to save"); return; }

    setSaving(true);
    try {
      let written: string[] = [];
      if (hasGaps) {
        const res = await fillGaps.mutateAsync({ speakerId: speaker.id, ...gapPayload });
        written = res?.written ?? [];
      }
      if (hasSpeakerChanges) {
        await updateSpeaker.mutateAsync({ id: speaker.id, ...speakerPatch });
      }

      // One toast, whatever combination ran.
      if (hasGaps && written.length) {
        const names = written.map((f) => (PERSON_FIELD_LABELS[f] ?? f).toLowerCase());
        toast.success(`Added ${names.join(", ")} to ${possessive(personName)} profile`);
      } else if (hasGaps) {
        toast.success("No changes — profile already has those details");
      } else {
        toast.success("Speaker updated");
      }

      setGaps({});
      utils.events.getSpeakers.invalidate();
      utils.events.getSchedule.invalidate();
    } catch (err: any) {
      toast.error(err?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {isInherited("name") ? (
            <InheritedField label="Name" value={speaker.name} personName={personName} />
          ) : (
            <div>
              <Label>Name</Label>
              <Input
                defaultValue={speaker.name}
                className="font-medium"
                onBlur={(e) => e.target.value !== speaker.name && updateSpeaker.mutate(
                  { id: speaker.id, name: e.target.value },
                  { onSuccess: () => utils.events.getSpeakers.invalidate() },
                )}
              />
            </div>
          )}
        </div>
        <Button size="sm" variant="ghost" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* The person owns this row's identity — send admins there first. */}
      <a
        href={`/admin/people/${speaker.personId}`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:underline"
      >
        <Lock className="h-3.5 w-3.5 shrink-0" />
        <span className="min-w-0 flex-1 truncate">
          Managed in People — Edit {possessive(personName)} profile →
        </span>
        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
      </a>

      <div className="flex items-center gap-2 flex-wrap">
        <Badge className="bg-blue-100 text-blue-700">Linked to People</Badge>
        {speaker.personSlug && (
          <a
            href={`/people/${speaker.personSlug}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" /> /people/{speaker.personSlug}
          </a>
        )}
        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={onUnlink}>
          Unlink
        </Button>
      </div>

      {/* Title */}
      {isInherited("title") ? (
        <InheritedField label="Title" value={speaker.title} personName={personName} />
      ) : isGap("title") ? (
        <div>
          <GapLabel label="Title" />
          <Input
            value={gapValue("title")}
            placeholder="Title"
            onChange={(e) => setGap("title", e.target.value)}
          />
          <GapHint personName={personName} />
        </div>
      ) : null}

      {/* Company */}
      {isInherited("company") ? (
        <InheritedField label="Company" value={speaker.company} personName={personName} />
      ) : isGap("company") ? (
        <div>
          <GapLabel label="Company" />
          <Input
            value={gapValue("company")}
            placeholder="Company"
            onChange={(e) => setGap("company", e.target.value)}
          />
          <GapHint personName={personName} />
        </div>
      ) : null}

      {/* Bio */}
      {isInherited("bio") ? (
        <InheritedField label="Bio" value={speaker.bio} personName={personName} />
      ) : isGap("bio") ? (
        <div>
          <GapLabel label="Bio" />
          <Textarea
            rows={3}
            value={gapValue("bio")}
            placeholder="Short bio"
            onChange={(e) => setGap("bio", e.target.value)}
          />
          <GapHint personName={personName} />
        </div>
      ) : null}

      {/* Photo — uploads land on the Person record. */}
      {isInherited("photo") ? (
        <InheritedField label="Photo" value={speaker.photo} personName={personName} isPhoto />
      ) : isGap("photo") ? (
        <div>
          <GapLabel label="Photo" />
          <ImageUploadField
            label=""
            value={gapValue("photo")}
            onChange={(url) => setGap("photo", url)}
            placeholder="https://… or upload a headshot"
          />
          <GapHint personName={personName} />
        </div>
      ) : null}

      {/* LinkedIn */}
      {isInherited("linkedinUrl") ? (
        <InheritedField label="LinkedIn" value={speaker.linkedinUrl} personName={personName} />
      ) : isGap("linkedinUrl") ? (
        <div>
          <GapLabel label="LinkedIn" />
          <Input
            value={gapValue("linkedinUrl")}
            placeholder="https://linkedin.com/in/…"
            onChange={(e) => setGap("linkedinUrl", e.target.value)}
          />
          <GapHint personName={personName} />
        </div>
      ) : null}

      {/* X / Twitter */}
      {isInherited("twitterUrl") ? (
        <InheritedField label="X / Twitter" value={speaker.twitterUrl} personName={personName} />
      ) : isGap("twitterUrl") ? (
        <div>
          <GapLabel label="X / Twitter" />
          <Input
            value={gapValue("twitterUrl")}
            placeholder="https://x.com/…"
            onChange={(e) => setGap("twitterUrl", e.target.value)}
          />
          <GapHint personName={personName} />
        </div>
      ) : null}

      <Separator />

      {/* Speaker-only — the People record does not own these. */}
      <p className="text-[11px] text-muted-foreground">This event only</p>
      <div>
        <Label>Website</Label>
        <Input
          value={websiteUrl}
          placeholder="https://…"
          onChange={(e) => setWebsiteUrl(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
          <Label className="font-normal">Featured</Label>
        </div>
        <div className="flex items-center gap-2">
          <Label className="font-normal">Order</Label>
          <Input
            type="number"
            className="w-20"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </div>
      </div>

      <Button size="sm" onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
        Save
      </Button>
    </Card>
  );
}

function SpeakersTab({ eventId }: { eventId: number }) {
  const utils = trpc.useUtils();
  const { data: speakers = [] } = trpc.events.getSpeakers.useQuery({ eventId });
  const add = trpc.events.addSpeaker.useMutation({
    onSuccess: () => {
      utils.events.getSpeakers.invalidate({ eventId });
      utils.events.getSchedule.invalidate({ eventId });
    },
    onError: (e) => toast.error(e.message),
  });
  const del = trpc.events.deleteSpeaker.useMutation({
    onSuccess: () => {
      utils.events.getSpeakers.invalidate({ eventId });
      utils.events.getSchedule.invalidate({ eventId });
    },
    onError: (e) => toast.error(e.message),
  });
  const update = trpc.events.updateSpeaker.useMutation({
    onSuccess: () => {
      utils.events.getSpeakers.invalidate({ eventId });
      utils.events.getSchedule.invalidate({ eventId });
    },
    onError: (e) => toast.error(e.message),
  });

  const [bulk, setBulk] = useState("");
  const [singleName, setSingleName] = useState("");
  const [singleCompany, setSingleCompany] = useState("");
  const [singleTitle, setSingleTitle] = useState("");
  const [singlePhoto, setSinglePhoto] = useState("");
  // Person link staged by the autocomplete before the row is created.
  const [linkedPerson, setLinkedPerson] = useState<any | null>(null);
  const [createPerson, setCreatePerson] = useState(false);

  function resetSingle() {
    setSingleName(""); setSingleTitle(""); setSingleCompany(""); setSinglePhoto("");
    setLinkedPerson(null); setCreatePerson(false);
  }

  function addOne() {
    if (!singleName.trim()) return;
    add.mutate({
      eventId,
      name: singleName,
      title: singleTitle,
      company: singleCompany,
      photo: singlePhoto,
      personId: linkedPerson?.id ?? null,
      // Never ask the server to mint a person when we already linked one.
      createPersonRecord: !linkedPerson && createPerson,
      sortOrder: speakers.length,
    }, {
      onSuccess: () => {
        toast.success(
          linkedPerson
            ? `Added ${singleName} (linked to /people/${linkedPerson.slug})`
            : `Added ${singleName}`,
        );
        resetSingle();
      },
    });
  }

  async function bulkAdd() {
    const names = bulk.split("\n").map(s => s.trim()).filter(Boolean);
    if (!names.length) return;
    for (const n of names) {
      // Sequential to keep sortOrder stable. 50 speakers ≈ 50 round trips.
      await add.mutateAsync({ eventId, name: n, sortOrder: speakers.length });
    }
    setBulk("");
    toast.success(`Added ${names.length} speaker${names.length === 1 ? "" : "s"}`);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bulk add</CardTitle>
          <CardDescription>One speaker name per line. Auto-creates rows — fill in details inline below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            rows={5}
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            placeholder={"Sundar Pichai\nSheryl Sandberg\nMarc Benioff"}
          />
          <Button size="sm" onClick={bulkAdd} disabled={!bulk.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Bulk add
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add one</CardTitle>
          <CardDescription>
            Search /people first — linking keeps the name, title, company and
            photo in sync with the canonical profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Link to an existing person</Label>
            {linkedPerson ? (
              <div className="flex items-center gap-2 border rounded px-3 py-2 bg-muted/30">
                {linkedPerson.photo
                  ? <img src={linkedPerson.photo} alt="" className="h-7 w-7 rounded-full object-cover" />
                  : <div className="h-7 w-7 rounded-full bg-muted" />}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{linkedPerson.name}</div>
                  <div className="text-xs text-muted-foreground truncate">/people/{linkedPerson.slug}</div>
                </div>
                <Badge className="bg-blue-100 text-blue-700 shrink-0">Linked</Badge>
                <Button size="sm" variant="ghost" onClick={() => setLinkedPerson(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <PeoplePicker
                onPick={(p) => {
                  setLinkedPerson(p);
                  setSingleName(p.name ?? "");
                  setSingleTitle(p.title ?? "");
                  setSingleCompany(p.company ?? "");
                  setSinglePhoto(p.photo ?? "");
                  setCreatePerson(false);
                }}
              />
            )}
          </div>

          {linkedPerson && (
            <a
              href={`/admin/people/${linkedPerson.id}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:underline"
            >
              <Lock className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 flex-1 truncate">
                Managed in People — Edit {possessive(linkedPerson.name ?? "")} profile →
              </span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            </a>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {linkedPerson?.name ? (
              <InheritedField label="Name" value={linkedPerson.name} personName={linkedPerson.name} />
            ) : (
              <div>
                <Label>Name *</Label>
                <Input placeholder="Name" value={singleName} onChange={(e) => setSingleName(e.target.value)} />
              </div>
            )}
            {linkedPerson?.title ? (
              <InheritedField label="Title" value={linkedPerson.title} personName={linkedPerson.name} />
            ) : (
              <div>
                {linkedPerson ? <GapLabel label="Title" /> : <Label>Title</Label>}
                <Input placeholder="Title" value={singleTitle} onChange={(e) => setSingleTitle(e.target.value)} />
              </div>
            )}
            {linkedPerson?.company ? (
              <InheritedField label="Company" value={linkedPerson.company} personName={linkedPerson.name} />
            ) : (
              <div>
                {linkedPerson ? <GapLabel label="Company" /> : <Label>Company</Label>}
                <Input placeholder="Company" value={singleCompany} onChange={(e) => setSingleCompany(e.target.value)} />
              </div>
            )}
          </div>

          {linkedPerson?.photo ? (
            <InheritedField label="Photo" value={linkedPerson.photo} personName={linkedPerson.name} isPhoto />
          ) : (
            <>
              {linkedPerson && <GapLabel label="Photo" />}
              <ImageUploadField
                label={linkedPerson ? "" : "Photo"}
                value={singlePhoto}
                onChange={setSinglePhoto}
                placeholder="https://… or upload a headshot"
              />
            </>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id="create-person"
              checked={createPerson}
              disabled={!!linkedPerson}
              onCheckedChange={(c) => setCreatePerson(c === true)}
            />
            <Label htmlFor="create-person" className="text-sm font-normal">
              Also create a Person profile
              {linkedPerson && (
                <span className="text-muted-foreground"> — already linked to one</span>
              )}
            </Label>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={addOne} disabled={add.isPending || !singleName.trim()}>
              {add.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Add speaker
            </Button>
            {(singleName || linkedPerson) && (
              <Button size="sm" variant="ghost" onClick={resetSingle}>
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Speakers ({speakers.length})</CardTitle>
          <CardDescription>Edits autosave on blur.</CardDescription>
        </CardHeader>
        <CardContent>
          {speakers.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No speakers yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {speakers.map((s: any) => (
                (s.personLinked ?? !!s.personId) ? (
                  // Linked → the People record owns the identity fields.
                  <LinkedSpeakerCard
                    key={s.id}
                    speaker={s}
                    onDelete={() => del.mutate({ id: s.id })}
                    onUnlink={() => update.mutate({ id: s.id, personId: null })}
                  />
                ) : (
                <Card key={s.id} className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Input
                      defaultValue={s.name}
                      onBlur={(e) => e.target.value !== s.name && update.mutate({ id: s.id, name: e.target.value })}
                      className="font-medium"
                    />
                    <Button size="sm" variant="ghost" onClick={() => del.mutate({ id: s.id })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Not linked yet — picker + "create profile" shortcut.
                      Every field stays freely editable on the speaker row. */}
                  <div className="space-y-2">
                    <PeoplePicker
                      placeholder="Link to a person…"
                      onPick={(p) => update.mutate({
                        id: s.id,
                        personId: p.id,
                        name: p.name ?? s.name,
                        title: p.title ?? s.title ?? "",
                        company: p.company ?? s.company ?? "",
                        photo: p.photo ?? s.photo ?? "",
                      }, {
                        onSuccess: () => toast.success(`Linked to /people/${p.slug}`),
                      })}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => update.mutate(
                        { id: s.id, createPersonRecord: true },
                        { onSuccess: () => toast.success("Person profile created") },
                      )}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Create Person profile
                    </Button>
                  </div>

                  <Input
                    defaultValue={s.title ?? ""}
                    placeholder="Title"
                    onBlur={(e) => update.mutate({ id: s.id, title: e.target.value })}
                  />
                  <Input
                    defaultValue={s.company ?? ""}
                    placeholder="Company"
                    onBlur={(e) => update.mutate({ id: s.id, company: e.target.value })}
                  />
                  <Input
                    defaultValue={s.photo ?? ""}
                    placeholder="Photo URL"
                    onBlur={(e) => update.mutate({ id: s.id, photo: e.target.value })}
                  />
                </Card>
                )
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// TAB: Agenda (tracks + schedule)
// ============================================================

/**
 * Checkbox list of this event's speakers. Stores `speakerIds` — the
 * legacy single `speakerId` column is left alone so old rows keep
 * rendering (getSchedule folds it into speakerIds for us).
 */
function SpeakerMultiSelect({
  speakers, value, onChange,
}: {
  speakers: any[];
  value: number[];
  onChange: (ids: number[]) => void;
}) {
  const selected = speakers.filter((s) => value.includes(s.id));

  function toggle(id: number) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  if (speakers.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Add speakers on the Speakers tab first.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((s) => (
            <Badge key={s.id} variant="secondary" className="gap-1 pl-1">
              {s.photo
                ? <img src={s.photo} alt="" className="h-4 w-4 rounded-full object-cover" />
                : <span className="h-4 w-4 rounded-full bg-muted-foreground/30" />}
              {s.name}
              <button type="button" onClick={() => toggle(s.id)} className="ml-0.5">×</button>
            </Badge>
          ))}
        </div>
      )}
      <div className="border rounded max-h-40 overflow-auto divide-y">
        {speakers.map((s) => (
          <label key={s.id} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-muted">
            <Checkbox checked={value.includes(s.id)} onCheckedChange={() => toggle(s.id)} />
            {s.photo
              ? <img src={s.photo} alt="" className="h-6 w-6 rounded-full object-cover" />
              : <span className="h-6 w-6 rounded-full bg-muted" />}
            <span className="min-w-0">
              <span className="block text-sm truncate">{s.name}</span>
              {(s.title || s.company) && (
                <span className="block text-xs text-muted-foreground truncate">
                  {[s.title, s.company].filter(Boolean).join(" · ")}
                </span>
              )}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

/** Avatar chips for a session's resolved `speakers` array. */
function SpeakerChips({ speakers }: { speakers: any[] }) {
  if (!speakers?.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {speakers.map((sp) => (
        <span
          key={sp.id}
          className="inline-flex items-center gap-1 rounded-full border bg-background pl-0.5 pr-2 py-0.5 text-xs"
        >
          {sp.photo
            ? <img src={sp.photo} alt="" className="h-5 w-5 rounded-full object-cover" />
            : <span className="h-5 w-5 rounded-full bg-muted" />}
          <span className="truncate max-w-[10rem]">{sp.name}</span>
        </span>
      ))}
    </div>
  );
}

interface SessionDraft {
  dayNumber: number;
  title: string;
  startTime: string;
  endTime: string;
  trackId: number | null;
  location: string;
  imageUrl: string;
  speakerIds: number[];
  isFeatured: boolean;
}

function AgendaTab({ eventId }: { eventId: number }) {
  const utils = trpc.useUtils();
  const { data: tracks = [] } = trpc.events.getTracks.useQuery({ eventId });
  const { data: schedule = [] } = trpc.events.getSchedule.useQuery({ eventId });
  const { data: speakers = [] } = trpc.events.getSpeakers.useQuery({ eventId });

  const addTrack = trpc.events.addTrack.useMutation({
    onSuccess: () => utils.events.getTracks.invalidate({ eventId }),
    onError: (e) => toast.error(e.message),
  });
  const delTrack = trpc.events.deleteTrack.useMutation({
    onSuccess: () => utils.events.getTracks.invalidate({ eventId }),
    onError: (e) => toast.error(e.message),
  });
  const addSession = trpc.events.addScheduleItem.useMutation({
    onSuccess: () => {
      toast.success("Session added");
      utils.events.getSchedule.invalidate({ eventId });
    },
    onError: (e) => toast.error(e.message),
  });
  const updateSession = trpc.events.updateScheduleItem.useMutation({
    onSuccess: () => {
      toast.success("Session saved");
      utils.events.getSchedule.invalidate({ eventId });
    },
    onError: (e) => toast.error(e.message),
  });
  const delSession = trpc.events.deleteScheduleItem.useMutation({
    onSuccess: () => {
      toast.success("Session deleted");
      utils.events.getSchedule.invalidate({ eventId });
    },
    onError: (e) => toast.error(e.message),
  });

  const [trackName, setTrackName] = useState("");
  const [trackColor, setTrackColor] = useState("#22c55e");

  const [draft, setDraft] = useState<SessionDraft>({
    dayNumber: 1, title: "", startTime: "09:00", endTime: "10:00",
    trackId: null, location: "", imageUrl: "", speakerIds: [], isFeatured: false,
  });

  // Which session row has its inline editor open.
  const [editingId, setEditingId] = useState<number | null>(null);

  const groupedByDay = useMemo(() => {
    const g: Record<number, any[]> = {};
    for (const item of schedule as any[]) {
      const d = item.dayNumber ?? 1;
      (g[d] ||= []).push(item);
    }
    return g;
  }, [schedule]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Tracks</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Track name (e.g. Investor)" value={trackName} onChange={(e) => setTrackName(e.target.value)} />
            <Input type="color" value={trackColor} onChange={(e) => setTrackColor(e.target.value)} className="w-16" />
            <Button
              size="sm"
              onClick={() => {
                if (!trackName.trim()) return;
                addTrack.mutate({ eventId, name: trackName, color: trackColor, sortOrder: tracks.length });
                setTrackName("");
              }}
            >Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {tracks.map((t: any) => (
              <Badge key={t.id} variant="outline" className="flex items-center gap-2" style={{ borderColor: t.color }}>
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: t.color }} />
                {t.name}
                <button onClick={() => delTrack.mutate({ id: t.id })} className="ml-1 text-xs">×</button>
              </Badge>
            ))}
            {tracks.length === 0 && <span className="text-xs text-muted-foreground">No tracks yet.</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add Session</CardTitle>
          <CardDescription>Drag-drop reorder is a P2 follow-up.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
            <div>
              <Label>Day</Label>
              <Input
                type="number"
                value={draft.dayNumber}
                onChange={(e) => setDraft({ ...draft, dayNumber: parseInt(e.target.value || "1", 10) })}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Title</Label>
              <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </div>
            <div>
              <Label>Start</Label>
              <Input type="time" value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} />
            </div>
            <div>
              <Label>End</Label>
              <Input type="time" value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} />
            </div>
            <div>
              <Label>Track</Label>
              <select
                className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                value={draft.trackId ?? ""}
                onChange={(e) => setDraft({ ...draft, trackId: e.target.value ? parseInt(e.target.value, 10) : null })}
              >
                <option value="">—</option>
                {tracks.map((t: any) => (<option key={t.id} value={t.id}>{t.name}</option>))}
              </select>
            </div>
            <div className="md:col-span-3">
              <Label>Location</Label>
              <Input value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} placeholder="Hall A" />
            </div>
            <div className="md:col-span-3">
              <ImageUploadField
                label="Session image"
                value={draft.imageUrl}
                onChange={(url) => setDraft((d) => ({ ...d, imageUrl: url }))}
              />
            </div>
          </div>

          <div>
            <Label>Speakers</Label>
            <SpeakerMultiSelect
              speakers={speakers as any[]}
              value={draft.speakerIds}
              onChange={(ids) => setDraft((d) => ({ ...d, speakerIds: ids }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="flex flex-col gap-0.5">
              <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5" /> Featured session</span>
              <span className="text-xs font-normal text-muted-foreground">Pinned to the top of the public agenda.</span>
            </Label>
            <Switch
              checked={draft.isFeatured}
              onCheckedChange={(c) => setDraft((d) => ({ ...d, isFeatured: c }))}
            />
          </div>

          <Button
            size="sm"
            disabled={addSession.isPending || !draft.title.trim()}
            onClick={() => {
              if (!draft.title.trim()) return;
              addSession.mutate({
                eventId,
                dayNumber: draft.dayNumber,
                title: draft.title,
                startTime: draft.startTime,
                endTime: draft.endTime,
                trackId: draft.trackId,
                location: draft.location,
                imageUrl: draft.imageUrl || null,
                speakerIds: draft.speakerIds,
                isFeatured: draft.isFeatured,
                sortOrder: groupedByDay[draft.dayNumber]?.length ?? 0,
              }, {
                onSuccess: () => setDraft((d) => ({
                  ...d, title: "", location: "", imageUrl: "", speakerIds: [], isFeatured: false,
                })),
              });
            }}
          >
            {addSession.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
            Add session
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Schedule</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {Object.keys(groupedByDay).length === 0 && (
            <p className="text-sm text-muted-foreground italic">No sessions yet.</p>
          )}
          {Object.keys(groupedByDay).sort((a, b) => parseInt(a) - parseInt(b)).map((dayStr) => (
            <div key={dayStr}>
              <h3 className="font-semibold text-sm mb-2">Day {dayStr}</h3>
              <div className="space-y-2">
                {groupedByDay[parseInt(dayStr)].map((it: any) => (
                  <div key={it.id} className="border rounded px-3 py-2">
                    <div className="flex items-start gap-3">
                      {it.imageUrl ? (
                        <img src={it.imageUrl} alt="" className="h-12 w-16 shrink-0 rounded object-cover border" />
                      ) : null}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{it.title}</span>
                          {it.isFeatured && (
                            <Badge className="bg-amber-100 text-amber-800 gap-1">
                              <Star className="h-3 w-3" /> Featured
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {it.startTime && new Date(it.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {it.endTime && ` – ${new Date(it.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                          {it.location && ` · ${it.location}`}
                        </div>
                        <SpeakerChips speakers={it.speakers ?? []} />
                      </div>
                      <div className="flex shrink-0 items-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingId(editingId === it.id ? null : it.id)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <ConfirmDeleteButton
                          onConfirm={() => delSession.mutate({ id: it.id })}
                          title="Delete this session?"
                          description={`"${it.title}" will be removed from the agenda.`}
                        />
                      </div>
                    </div>

                    {editingId === it.id && (
                      <SessionEditor
                        session={it}
                        tracks={tracks as any[]}
                        speakers={speakers as any[]}
                        isSaving={updateSession.isPending}
                        onCancel={() => setEditingId(null)}
                        onSave={(payload) => updateSession.mutate(
                          { id: it.id, ...payload },
                          { onSuccess: () => setEditingId(null) },
                        )}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SessionEditor({
  session, tracks, speakers, isSaving, onSave, onCancel,
}: {
  session: any;
  tracks: any[];
  speakers: any[];
  isSaving: boolean;
  onSave: (payload: {
    dayNumber: number; title: string; startTime: string; endTime: string;
    trackId: number | null; location: string; imageUrl: string | null;
    speakerIds: number[]; isFeatured: boolean;
  }) => void;
  onCancel: () => void;
}) {
  const [d, setD] = useState<SessionDraft>({
    dayNumber: session.dayNumber ?? 1,
    title: session.title ?? "",
    startTime: toTimeInput(session.startTime),
    endTime: toTimeInput(session.endTime),
    trackId: session.trackId ?? null,
    location: session.location ?? "",
    imageUrl: session.imageUrl ?? "",
    speakerIds: session.speakerIds ?? [],
    isFeatured: !!session.isFeatured,
  });

  return (
    <div className="mt-3 border-t pt-3 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
        <div>
          <Label>Day</Label>
          <Input type="number" value={d.dayNumber} onChange={(e) => setD({ ...d, dayNumber: parseInt(e.target.value || "1", 10) })} />
        </div>
        <div className="md:col-span-2">
          <Label>Title</Label>
          <Input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} />
        </div>
        <div>
          <Label>Start</Label>
          <Input type="time" value={d.startTime} onChange={(e) => setD({ ...d, startTime: e.target.value })} />
        </div>
        <div>
          <Label>End</Label>
          <Input type="time" value={d.endTime} onChange={(e) => setD({ ...d, endTime: e.target.value })} />
        </div>
        <div>
          <Label>Track</Label>
          <select
            className="w-full h-9 rounded-md border bg-background px-2 text-sm"
            value={d.trackId ?? ""}
            onChange={(e) => setD({ ...d, trackId: e.target.value ? parseInt(e.target.value, 10) : null })}
          >
            <option value="">—</option>
            {tracks.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
          </select>
        </div>
        <div className="md:col-span-3">
          <Label>Location</Label>
          <Input value={d.location} onChange={(e) => setD({ ...d, location: e.target.value })} />
        </div>
        <div className="md:col-span-3">
          <ImageUploadField
            label="Session image"
            value={d.imageUrl}
            onChange={(url) => setD((prev) => ({ ...prev, imageUrl: url }))}
          />
        </div>
      </div>

      <div>
        <Label>Speakers</Label>
        <SpeakerMultiSelect
          speakers={speakers}
          value={d.speakerIds}
          onChange={(ids) => setD((prev) => ({ ...prev, speakerIds: ids }))}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1">
          <Star className="h-3.5 w-3.5" /> Featured session
        </Label>
        <Switch checked={d.isFeatured} onCheckedChange={(c) => setD((prev) => ({ ...prev, isFeatured: c }))} />
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={isSaving}
          onClick={() => onSave({
            dayNumber: d.dayNumber,
            title: d.title,
            startTime: d.startTime,
            endTime: d.endTime,
            trackId: d.trackId,
            location: d.location,
            imageUrl: d.imageUrl || null,
            speakerIds: d.speakerIds,
            isFeatured: d.isFeatured,
          })}
        >
          {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
          Save session
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          <X className="h-4 w-4 mr-1" /> Cancel
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// TAB: Tickets
// ============================================================

function TicketsTab({
  eventId, form, setForm, externalUrlStash, setExternalUrlStash,
}: {
  eventId: number;
  form: CoreForm;
  setForm: (f: CoreForm) => void;
  externalUrlStash: string;
  setExternalUrlStash: (v: string) => void;
}) {
  // The "stash" pattern keeps the URL in component state even if the
  // operator flips back to internal — they don't lose what they typed.
  // On save, we send null if not relevant for the chosen provider.
  function setProvider(p: TicketProvider) {
    // Snapshot the current URL to the stash before switching away from
    // external-type providers (so it survives the round trip).
    if (form.ticketProvider !== "internal" && form.ticketProvider !== "none" && form.externalTicketUrl) {
      setExternalUrlStash(form.externalTicketUrl);
    }
    setForm({
      ...form,
      ticketProvider: p,
      // Re-hydrate URL when switching back to an external provider
      externalTicketUrl: (p !== "internal" && p !== "none") ? (form.externalTicketUrl || externalUrlStash) : form.externalTicketUrl,
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Provider</CardTitle>
          <CardDescription>How tickets are sold for this event.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={form.ticketProvider} onValueChange={(v) => setProvider(v as TicketProvider)}>
            <SelectTrigger className="md:w-72"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None / RSVP elsewhere</SelectItem>
              <SelectItem value="internal">Internal (Stripe Checkout)</SelectItem>
              <SelectItem value="eventbrite">Eventbrite (affiliate link)</SelectItem>
              <SelectItem value="luma">Luma (affiliate link)</SelectItem>
              <SelectItem value="external">External URL</SelectItem>
            </SelectContent>
          </Select>

          {(form.ticketProvider === "eventbrite" || form.ticketProvider === "luma" || form.ticketProvider === "external") && (
            <div>
              <Label>External ticket URL</Label>
              <Input
                value={form.externalTicketUrl}
                onChange={(e) => setForm({ ...form, externalTicketUrl: e.target.value })}
                placeholder={form.ticketProvider === "eventbrite"
                  ? "https://www.eventbrite.com/e/…"
                  : form.ticketProvider === "luma"
                  ? "https://lu.ma/…"
                  : "https://…"}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Click-tracking via <code>event_external_clicks</code> fires on every outbound click.
              </p>
            </div>
          )}

          {form.ticketProvider === "none" && (
            <p className="text-xs text-muted-foreground">Ticket UI is hidden on the public page.</p>
          )}
        </CardContent>
      </Card>

      {form.ticketProvider === "internal" && (
        <>
          <Card>
            <CardContent className="p-4">
              <TicketTierEditor eventId={eventId} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <PromoCodeEditor eventId={eventId} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ============================================================
// TAB: Live
// ============================================================

function LiveTab({ eventId }: { eventId: number }) {
  return (
    <div className="space-y-6">
      <LiveCoverageSettings eventId={eventId} />
      <Card>
        <CardContent className="p-4">
          <CorrespondentList eventId={eventId} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Live blog composer</CardTitle>
          <CardDescription>
            Posts are written from a dedicated composer page (separate scope).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => window.open(`/admin/events/${eventId}/live`, "_blank")}>
            Open Live Composer
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// TAB: Sponsors
// ============================================================

type SponsorTier = "platinum" | "gold" | "silver" | "bronze" | "partner";
type SponsorEntityKind = "company" | "investor";

interface SponsorDraft {
  id: number | null;
  name: string;
  logo: string;
  websiteUrl: string;
  tier: SponsorTier;
  description: string;
  isConfirmed: boolean;
  companyId: number | null;
  investorId: number | null;
  /** Purely for the "inherited values" note — not persisted. */
  linkedLabel: string;
}

const EMPTY_SPONSOR: SponsorDraft = {
  id: null, name: "", logo: "", websiteUrl: "", tier: "partner",
  description: "", isConfirmed: false, companyId: null, investorId: null,
  linkedLabel: "",
};

const SPONSOR_TIERS: SponsorTier[] = ["platinum", "gold", "silver", "bronze", "partner"];

/** Debounced typeahead over companies / investors. */
function SponsorEntityPicker({ onPick }: { onPick: (e: any, kind: SponsorEntityKind) => void }) {
  const [kind, setKind] = useState<SponsorEntityKind>("company");
  const [q, setQ] = useState("");
  const debouncedQ = useDebounced(q);
  const { data: results = [], isFetching } = trpc.events.adminSearchSponsorEntities.useQuery(
    { q: debouncedQ, kind },
    { enabled: debouncedQ.trim().length > 1 },
  );

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Select value={kind} onValueChange={(v) => setKind(v as SponsorEntityKind)}>
          <SelectTrigger className="w-36 shrink-0"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="company">Company</SelectItem>
            <SelectItem value="investor">Investor</SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${kind === "company" ? "companies" : "investors"}…`}
        />
      </div>
      {debouncedQ.trim().length > 1 && (
        <div className="border rounded max-h-56 overflow-auto divide-y">
          {isFetching && <p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p>}
          {!isFetching && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground italic">No matches for “{debouncedQ}”.</p>
          )}
          {(results as any[]).map((r) => (
            <button
              key={r.id}
              type="button"
              className="w-full flex items-center gap-2 text-left px-3 py-2 hover:bg-muted"
              onClick={() => { onPick(r, kind); setQ(""); }}
            >
              {r.logo
                ? <img src={r.logo} alt="" className="h-7 w-7 rounded object-contain shrink-0" />
                : <div className="h-7 w-7 rounded bg-muted shrink-0 flex items-center justify-center">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>}
              <span className="min-w-0">
                <span className="block text-sm font-medium truncate">{r.name}</span>
                <span className="block text-xs text-muted-foreground truncate">/{r.slug}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SponsorsTab({ eventId }: { eventId: number }) {
  const utils = trpc.useUtils();
  // getSponsors resolves the linked company/investor and hands back the
  // raw (typed-in) values too, so the editor can tell inherited apart
  // from manual. adminListSponsors returns only the raw row.
  const { data: rows = [], isLoading } = trpc.events.getSponsors.useQuery({ eventId });

  const invalidate = () => {
    utils.events.getSponsors.invalidate({ eventId });
    utils.events.adminListSponsors.invalidate({ eventId });
  };

  const [draft, setDraft] = useState<SponsorDraft>(EMPTY_SPONSOR);

  const upsert = trpc.events.adminUpsertSponsor.useMutation({
    onSuccess: () => {
      toast.success(draft.id ? "Sponsor updated" : "Sponsor added");
      setDraft(EMPTY_SPONSOR);
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const del = trpc.events.adminDeleteSponsor.useMutation({
    onSuccess: () => { toast.success("Sponsor removed"); invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const isLinked = draft.companyId != null || draft.investorId != null;

  function submit() {
    if (!draft.name.trim()) { toast.error("Sponsor name is required"); return; }
    upsert.mutate({
      ...(draft.id ? { id: draft.id } : {}),
      eventId,
      name: draft.name.trim(),
      logo: draft.logo.trim() || null,
      websiteUrl: draft.websiteUrl.trim() || null,
      tier: draft.tier,
      description: draft.description.trim() || null,
      isConfirmed: draft.isConfirmed,
      companyId: draft.companyId,
      investorId: draft.investorId,
      // Keep the existing position when editing; append when adding.
      sortOrder: draft.id ? undefined : rows.length,
    });
  }

  function edit(s: any) {
    setDraft({
      id: s.id,
      // Show what was actually typed in — the resolved name/logo comes
      // from the linked entity and must not be written back as manual.
      name: s.rawName ?? s.name ?? "",
      logo: s.rawLogo ?? "",
      websiteUrl: s.rawWebsiteUrl ?? "",
      tier: (s.tier ?? "partner") as SponsorTier,
      description: s.description ?? "",
      isConfirmed: !!s.isConfirmed,
      companyId: s.companyId ?? null,
      investorId: s.investorId ?? null,
      linkedLabel: s.companyId
        ? `company /${s.companySlug ?? s.companyId}`
        : s.investorId
        ? `investor /${s.investorSlug ?? s.investorId}`
        : "",
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{draft.id ? "Edit sponsor" : "Add sponsor"}</CardTitle>
          <CardDescription>
            Link to a company or investor where we have one — the public tile
            then inherits that record's name, logo and website.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Link to company / investor</Label>
            {isLinked ? (
              <div className="flex items-center gap-2 border rounded px-3 py-2 bg-muted/30">
                <Link2 className="h-4 w-4 shrink-0 text-blue-600" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{draft.name || draft.linkedLabel}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    Linked to {draft.linkedLabel || (draft.companyId ? "a company" : "an investor")}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDraft((d) => ({ ...d, companyId: null, investorId: null, linkedLabel: "" }))}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <SponsorEntityPicker
                onPick={(entity, kind) => setDraft((d) => ({
                  ...d,
                  companyId: kind === "company" ? entity.id : null,
                  investorId: kind === "investor" ? entity.id : null,
                  name: d.name || entity.name || "",
                  logo: d.logo || entity.logo || "",
                  websiteUrl: d.websiteUrl || entity.websiteUrl || "",
                  linkedLabel: `${kind} /${entity.slug}`,
                }))}
              />
            )}
            {isLinked && (
              <p className="mt-1 text-xs text-muted-foreground">
                Name, logo and website below are a fallback — the public page shows
                the linked record's values whenever they exist.
              </p>
            )}
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Name *</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div>
              <Label>Website</Label>
              <Input
                value={draft.websiteUrl}
                onChange={(e) => setDraft({ ...draft, websiteUrl: e.target.value })}
                placeholder="https://…"
              />
            </div>
            <div>
              <Label>Tier</Label>
              <Select value={draft.tier} onValueChange={(v) => setDraft({ ...draft, tier: v as SponsorTier })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SPONSOR_TIERS.map((t) => (
                    <SelectItem key={t} value={t}>{labelise(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <ImageUploadField
            label="Logo"
            value={draft.logo}
            onChange={(url) => setDraft((d) => ({ ...d, logo: url }))}
          />

          <div>
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="One line about why they're backing the event."
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="flex flex-col gap-0.5">
              <span>Confirmed</span>
              <span className="text-xs font-normal text-muted-foreground">
                Unconfirmed sponsors stay hidden from the public page.
              </span>
            </Label>
            <Switch
              checked={draft.isConfirmed}
              onCheckedChange={(c) => setDraft((d) => ({ ...d, isConfirmed: c }))}
            />
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={submit} disabled={upsert.isPending}>
              {upsert.isPending
                ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                : draft.id ? <Check className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              {draft.id ? "Save sponsor" : "Add sponsor"}
            </Button>
            {(draft.id || draft.name) && (
              <Button size="sm" variant="ghost" onClick={() => setDraft(EMPTY_SPONSOR)}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Sponsors ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center">
              <Award className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No sponsors yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(rows as any[]).map((s) => (
                <div key={s.id} className="flex items-center justify-between border rounded px-3 py-2 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {s.logo
                      ? <img src={s.logo} alt="" className="h-8 w-auto max-w-16 object-contain shrink-0" />
                      : <div className="h-8 w-8 rounded bg-muted shrink-0 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        </div>}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{s.name}</span>
                        {s.companyId && (
                          <Badge className="bg-blue-100 text-blue-700 gap-1">
                            <Link2 className="h-3 w-3" /> Company
                          </Badge>
                        )}
                        {s.investorId && (
                          <Badge className="bg-purple-100 text-purple-700 gap-1">
                            <Link2 className="h-3 w-3" /> Investor
                          </Badge>
                        )}
                        <Badge variant={s.isConfirmed ? "default" : "outline"}>
                          {s.isConfirmed ? "Confirmed" : "Unconfirmed"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground capitalize truncate">
                        {s.tier}
                        {(s.companySlug || s.investorSlug) &&
                          ` · /${s.companySlug ? "companies" : "investors"}/${s.companySlug ?? s.investorSlug}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center">
                    <Button size="sm" variant="ghost" onClick={() => edit(s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <ConfirmDeleteButton
                      onConfirm={() => del.mutate({ id: s.id })}
                      title="Remove this sponsor?"
                      description={`"${s.name}" will be detached from this event. The company/investor record itself is untouched.`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// TAB: Side Events
// ============================================================

interface SideEventDraft {
  id: number | null;
  name: string;
  description: string;
  sideEventType: SideEventType;
  dayNumber: number;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  capacity: string;
  registrationUrl: string;
  websiteUrl: string;
  imageUrl: string;
  isFree: boolean;
}

const EMPTY_SIDE_EVENT: SideEventDraft = {
  id: null, name: "", description: "", sideEventType: "side_event",
  dayNumber: 1, date: "", startTime: "", endTime: "", venue: "",
  capacity: "", registrationUrl: "", websiteUrl: "", imageUrl: "", isFree: true,
};

function SideEventsTab({ eventId }: { eventId: number }) {
  const utils = trpc.useUtils();
  // Admin list — unlike the public getSideEvents this returns pending and
  // rejected rows too, which is what the moderation queue needs.
  const { data: rows = [], isLoading } = trpc.events.adminListSideEventSubmissions.useQuery({ eventId });

  const invalidate = () => {
    utils.events.adminListSideEventSubmissions.invalidate();
    utils.events.getSideEvents.invalidate({ eventId });
  };

  const [draft, setDraft] = useState<SideEventDraft>(EMPTY_SIDE_EVENT);

  const add = trpc.events.addSideEvent.useMutation({
    onSuccess: () => { toast.success("Side event added"); setDraft(EMPTY_SIDE_EVENT); invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const update = trpc.events.updateSideEvent.useMutation({
    onSuccess: () => { toast.success("Side event saved"); setDraft(EMPTY_SIDE_EVENT); invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const del = trpc.events.deleteSideEvent.useMutation({
    onSuccess: () => { toast.success("Side event deleted"); invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const moderate = trpc.events.adminModerateSideEvent.useMutation({
    onSuccess: (r) => {
      toast.success(r.status === "approved" ? "Submission approved" : "Submission rejected");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const pending = useMemo(
    () => (rows as any[]).filter((r) => r.status === "pending"),
    [rows],
  );

  function submit() {
    if (!draft.name.trim()) { toast.error("Name is required"); return; }
    const capacity = draft.capacity.trim() ? parseInt(draft.capacity, 10) : null;
    const shared = {
      name: draft.name.trim(),
      description: draft.description,
      sideEventType: draft.sideEventType,
      dayNumber: draft.dayNumber,
      date: draft.date || undefined,
      startTime: draft.startTime || undefined,
      endTime: draft.endTime || undefined,
      venue: draft.venue,
      capacity: capacity !== null && !Number.isNaN(capacity) ? capacity : null,
      registrationUrl: draft.registrationUrl,
      websiteUrl: draft.websiteUrl || null,
      imageUrl: draft.imageUrl || null,
      isFree: draft.isFree,
    };
    if (draft.id) {
      update.mutate({ id: draft.id, ...shared });
    } else {
      add.mutate({ eventId, ...shared, sortOrder: rows.length });
    }
  }

  function edit(s: any) {
    setDraft({
      id: s.id,
      name: s.name ?? "",
      description: s.description ?? "",
      sideEventType: (s.sideEventType ?? "side_event") as SideEventType,
      dayNumber: s.dayNumber ?? 1,
      date: toDateInput(s.date),
      startTime: toTimeInput(s.startTime),
      endTime: toTimeInput(s.endTime),
      venue: s.venue ?? "",
      capacity: s.capacity != null ? String(s.capacity) : "",
      registrationUrl: s.registrationUrl ?? "",
      websiteUrl: s.websiteUrl ?? "",
      imageUrl: s.imageUrl ?? "",
      isFree: !!s.isFree,
    });
  }

  return (
    <div className="space-y-6">
      {/* ---- (b) Moderation queue ---- */}
      <Card className={pending.length ? "border-amber-300" : undefined}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Requests
            {pending.length > 0 && (
              <Badge className="bg-amber-100 text-amber-800">{pending.length} pending</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Side events proposed via the public submission form. Approving makes
            them visible on the event page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No pending requests.</p>
          ) : (
            <div className="space-y-3">
              {pending.map((s) => (
                <SideEventRequestRow
                  key={s.id}
                  submission={s}
                  isSaving={moderate.isPending}
                  onModerate={(status, notes) => moderate.mutate({
                    id: s.id,
                    status,
                    ...(notes ? { moderationNotes: notes } : {}),
                  })}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---- Editor form ---- */}
      <Card>
        <CardHeader>
          <CardTitle>{draft.id ? "Edit side event" : "Add side event"}</CardTitle>
          <CardDescription>Editor-created side events go live immediately.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-3">
              <Label>Name *</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Type</Label>
              <Select
                value={draft.sideEventType}
                onValueChange={(v) => setDraft({ ...draft, sideEventType: v as SideEventType })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SIDE_EVENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{labelise(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Day</Label>
              <Input
                type="number"
                value={draft.dayNumber}
                onChange={(e) => setDraft({ ...draft, dayNumber: parseInt(e.target.value || "1", 10) })}
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
            </div>
            <div>
              <Label>Start</Label>
              <Input type="time" value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} />
            </div>
            <div>
              <Label>End</Label>
              <Input type="time" value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Venue</Label>
              <Input value={draft.venue} onChange={(e) => setDraft({ ...draft, venue: e.target.value })} />
            </div>
            <div>
              <Label>Capacity</Label>
              <Input
                type="number"
                value={draft.capacity}
                onChange={(e) => setDraft({ ...draft, capacity: e.target.value })}
                placeholder="—"
              />
            </div>
            <div className="md:col-span-3">
              <Label>Registration URL</Label>
              <Input
                value={draft.registrationUrl}
                onChange={(e) => setDraft({ ...draft, registrationUrl: e.target.value })}
                placeholder="https://lu.ma/…"
              />
            </div>
            <div className="md:col-span-3">
              <Label>Website</Label>
              <Input
                value={draft.websiteUrl}
                onChange={(e) => setDraft({ ...draft, websiteUrl: e.target.value })}
                placeholder="https://…"
              />
            </div>
          </div>

          <ImageUploadField
            label="Image"
            value={draft.imageUrl}
            onChange={(url) => setDraft((d) => ({ ...d, imageUrl: url }))}
          />

          <div>
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="flex flex-col gap-0.5">
              <span>Free to attend</span>
              <span className="text-xs font-normal text-muted-foreground">Shows a "Free" pill on the public card.</span>
            </Label>
            <Switch checked={draft.isFree} onCheckedChange={(c) => setDraft((d) => ({ ...d, isFree: c }))} />
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={submit} disabled={add.isPending || update.isPending}>
              {(add.isPending || update.isPending)
                ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                : draft.id ? <Check className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              {draft.id ? "Save side event" : "Add side event"}
            </Button>
            {(draft.id || draft.name) && (
              <Button size="sm" variant="ghost" onClick={() => setDraft(EMPTY_SIDE_EVENT)}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ---- (a) Full list ---- */}
      <Card>
        <CardHeader><CardTitle>Side events ({rows.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center">
              <CalendarPlus className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No side events.</p>
            </div>
          ) : (
            (rows as any[]).map((s) => (
              <div key={s.id} className="flex items-start justify-between border rounded px-3 py-2 gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  {s.imageUrl && (
                    <img src={s.imageUrl} alt="" className="h-12 w-16 shrink-0 rounded object-cover border" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{s.name}</span>
                      <Badge className={SIDE_EVENT_STATUS_STYLES[s.status] ?? "bg-muted text-muted-foreground"}>
                        {labelise(s.status ?? "approved")}
                      </Badge>
                      <Badge variant="outline">{labelise(s.sideEventType ?? "side_event")}</Badge>
                      {s.isFree && <Badge variant="secondary">Free</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Day {s.dayNumber ?? 1}
                      {s.venue && ` · ${s.venue}`}
                      {s.date && ` · ${new Date(s.date).toLocaleDateString()}`}
                    </div>
                    {s.moderationNotes && (
                      <div className="text-xs text-muted-foreground italic mt-0.5">
                        Notes: {s.moderationNotes}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center">
                  <Button size="sm" variant="ghost" onClick={() => edit(s)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <ConfirmDeleteButton
                    onConfirm={() => del.mutate({ id: s.id })}
                    title="Delete this side event?"
                    description={`"${s.name}" will be permanently removed.`}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * One pending submission with its submitter details and the
 * approve / reject controls. Reject reveals a notes field first so the
 * decision is always recorded with a reason.
 */
function SideEventRequestRow({
  submission, isSaving, onModerate,
}: {
  submission: any;
  isSaving: boolean;
  onModerate: (status: "approved" | "rejected", notes?: string) => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [notes, setNotes] = useState("");

  return (
    <div className="border rounded px-3 py-2 bg-amber-50/40">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {submission.imageUrl && (
            <img src={submission.imageUrl} alt="" className="h-12 w-16 shrink-0 rounded object-cover border" />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium truncate">{submission.name}</span>
              <Badge className="bg-amber-100 text-amber-800 gap-1">
                <Clock className="h-3 w-3" /> Pending
              </Badge>
              <Badge variant="outline">{labelise(submission.sideEventType ?? "side_event")}</Badge>
              {submission.isFree && <Badge variant="secondary">Free</Badge>}
            </div>
            <div className="text-xs text-muted-foreground">
              Day {submission.dayNumber ?? 1}
              {submission.venue && ` · ${submission.venue}`}
              {submission.date && ` · ${new Date(submission.date).toLocaleDateString()}`}
              {submission.startTime && ` · ${toTimeInput(submission.startTime)}`}
            </div>
            {submission.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{submission.description}</p>
            )}
            <div className="text-xs mt-1">
              <span className="text-muted-foreground">Submitted by </span>
              <span className="font-medium">{submission.submitterName || "—"}</span>
              {submission.submitterOrganisation && (
                <span className="text-muted-foreground"> · {submission.submitterOrganisation}</span>
              )}
              {submission.submitterEmail && (
                <>
                  {" · "}
                  <a href={`mailto:${submission.submitterEmail}`} className="text-blue-600 hover:underline">
                    {submission.submitterEmail}
                  </a>
                </>
              )}
            </div>
            {(submission.websiteUrl || submission.registrationUrl) && (
              <div className="flex gap-3 mt-1">
                {submission.websiteUrl && (
                  <a
                    href={submission.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" /> Website
                  </a>
                )}
                {submission.registrationUrl && (
                  <a
                    href={submission.registrationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" /> Registration
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700"
            disabled={isSaving}
            onClick={() => onModerate("approved")}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive"
            disabled={isSaving}
            onClick={() => setRejecting((v) => !v)}
          >
            <XCircle className="h-4 w-4 mr-1" /> Reject
          </Button>
        </div>
      </div>

      {rejecting && (
        <div className="mt-2 border-t pt-2 space-y-2">
          <Label className="text-xs">Rejection notes (shared internally)</Label>
          <Textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Why is this being rejected?"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              disabled={isSaving}
              onClick={() => { onModerate("rejected", notes.trim() || undefined); setRejecting(false); setNotes(""); }}
            >
              Confirm reject
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setRejecting(false); setNotes(""); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// TAB: Recap
// ============================================================

function RecapTab({
  eventId, form, setForm,
}: {
  eventId: number;
  form: CoreForm;
  setForm: (f: CoreForm) => void;
}) {
  const [q, setQ] = useState("");
  const { data: articles = [] } = trpc.events.adminSearchArticlesForRecap.useQuery({ query: q });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Recap article</CardTitle>
          <CardDescription>Drives the "Read the recap" CTA in post-event mode.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Search articles…" value={q} onChange={(e) => setQ(e.target.value)} />
          {form.recapArticleId && (
            <div className="flex items-center justify-between border rounded px-3 py-2 bg-muted/30">
              <span className="text-sm">
                Linked article: <strong>#{form.recapArticleId}</strong>
              </span>
              <Button size="sm" variant="ghost" onClick={() => setForm({ ...form, recapArticleId: null })}>
                Unlink
              </Button>
            </div>
          )}
          <div className="border rounded max-h-72 overflow-auto divide-y">
            {articles.map((a: any) => (
              <button
                key={a.id}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                onClick={() => {
                  setForm({ ...form, recapArticleId: a.id });
                  toast.success(`Linked: ${a.title}`);
                }}
              >
                <div className="font-medium">{a.title}</div>
                <div className="text-xs text-muted-foreground">/{a.slug}</div>
              </button>
            ))}
            {articles.length === 0 && <p className="px-3 py-4 text-sm text-muted-foreground italic">No matches.</p>}
          </div>
          <p className="text-xs text-muted-foreground">
            Selection is staged — hit "Save Draft" in the sidebar to persist.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <RecordingsEditor eventId={eventId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generate recap with AI</CardTitle>
          <CardDescription>Stub — wired in a later wave.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" disabled>
            <Sparkles className="h-4 w-4 mr-1" /> Generate recap draft
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// TAB: Settings
// ============================================================

function SettingsTab({
  eventId, existing, form, setForm, onDelete,
}: {
  eventId: number | null;
  existing: any;
  form: CoreForm;
  setForm: (f: CoreForm) => void;
  onDelete: () => void;
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Visibility</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex flex-col gap-0.5">
              <span>Featured event</span>
              <span className="text-xs font-normal text-muted-foreground">Highlight on the homepage / events index.</span>
            </Label>
            <Switch checked={form.isFeatured} onCheckedChange={(c) => setForm({ ...form, isFeatured: c })} />
          </div>
          <Separator />
          <div className="text-sm text-muted-foreground">
            Status:{" "}
            <span className="font-medium text-foreground">{existing?.statusName ?? "—"}</span>
            <p className="text-xs mt-1">Use the editorial workflow page to publish / archive.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Claim status</CardTitle></CardHeader>
        <CardContent>
          {existing?.claimedByUserId ? (
            <div className="text-sm">
              Claimed by user <strong>#{existing.claimedByUserId}</strong>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Not claimed.</div>
          )}
        </CardContent>
      </Card>

      {eventId && (
        <Card className="border-destructive/50">
          <CardHeader><CardTitle className="text-destructive">Danger zone</CardTitle></CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-1" /> Delete event
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this event?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes the event and its taxonomy links. Tickets, orders,
                    recordings, and live posts are not auto-deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
