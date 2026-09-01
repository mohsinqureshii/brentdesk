/**
 * LiveConsole — the reporter live console.
 *
 * Routed at /live-console/:eventId. Built for field reporters posting
 * from their phones on the venue floor (e.g. 5 correspondents at
 * LEAP 2026), so the whole page is a mobile-first single column:
 * a compact sticky header, a big composer, the AI suggestion queue,
 * and the recent-posts list with inline pin / edit / delete.
 *
 * Auth: requires login (redirects to /signin). Access is gated with
 * events.canPostLiveCheck — staff bypass OR per-event correspondent
 * OR event tenant. Unauthorized users get a polite "not assigned"
 * screen, not a hard redirect.
 */

import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronDown,
  DollarSign,
  ExternalLink,
  Loader2,
  Lock,
  Megaphone,
  MessageSquare,
  Mic,
  Pencil,
  Pin,
  PinOff,
  Quote as QuoteIcon,
  Radio,
  Sparkles,
  Trash2,
  Video as VideoIcon,
  X,
  Zap,
} from "lucide-react";

// ============================================================
// Post types
// ============================================================

type PostType =
  | "update"
  | "breaking"
  | "quote"
  | "funding"
  | "session"
  | "photo"
  | "video"
  | "sponsor";

const POST_TYPES: Array<{
  value: PostType;
  label: string;
  Icon: typeof MessageSquare;
  idle: string;
  active: string;
  badge: string;
}> = [
  { value: "update",   label: "Update",   Icon: MessageSquare, idle: "border-gray-300 text-gray-700",     active: "bg-gray-800 text-white border-gray-800",     badge: "bg-gray-100 text-gray-700" },
  { value: "breaking", label: "Breaking", Icon: Zap,           idle: "border-red-300 text-red-700",       active: "bg-red-600 text-white border-red-600",       badge: "bg-red-100 text-red-700" },
  { value: "quote",    label: "Quote",    Icon: QuoteIcon,     idle: "border-purple-300 text-purple-700", active: "bg-purple-600 text-white border-purple-600", badge: "bg-purple-100 text-purple-700" },
  { value: "funding",  label: "Funding",  Icon: DollarSign,    idle: "border-green-300 text-green-700",   active: "bg-green-600 text-white border-green-600",   badge: "bg-green-100 text-green-700" },
  { value: "session",  label: "Session",  Icon: Mic,           idle: "border-blue-300 text-blue-700",     active: "bg-blue-600 text-white border-blue-600",     badge: "bg-blue-100 text-blue-700" },
  { value: "photo",    label: "Photo",    Icon: Camera,        idle: "border-pink-300 text-pink-700",     active: "bg-pink-600 text-white border-pink-600",     badge: "bg-pink-100 text-pink-700" },
  { value: "video",    label: "Video",    Icon: VideoIcon,     idle: "border-indigo-300 text-indigo-700", active: "bg-indigo-600 text-white border-indigo-600", badge: "bg-indigo-100 text-indigo-700" },
  { value: "sponsor",  label: "Sponsor",  Icon: Megaphone,     idle: "border-amber-300 text-amber-700",   active: "bg-amber-600 text-white border-amber-600",   badge: "bg-amber-100 text-amber-700" },
];

function typeMeta(t: string | null | undefined) {
  return POST_TYPES.find((p) => p.value === t) || POST_TYPES[0];
}

function fmtTime(v: string | Date | null | undefined): string {
  if (!v) return "";
  try {
    const d = new Date(v);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    return sameDay
      ? d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(v);
  }
}

// Composer mode: writing a fresh post, editing an existing one, or
// editing an AI suggestion before approving it.
type ComposerMode =
  | { kind: "new" }
  | { kind: "editPost"; postId: number }
  | { kind: "approveSuggestion"; suggestionId: number };

// ============================================================
// Page entry — auth + permission gates
// ============================================================

export default function LiveConsole() {
  const params = useParams<{ eventId: string }>();
  const eventId = Number(params.eventId);
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // Not signed in → send to signin.
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/signin");
    }
  }, [loading, isAuthenticated, setLocation]);

  const canPostQuery = trpc.events.canPostLiveCheck.useQuery(
    { eventId },
    { enabled: Boolean(eventId) && Boolean(user) },
  );

  if (!eventId || Number.isNaN(eventId)) {
    return <BlockedScreen title="Invalid link" body="This live console link is missing an event id." />;
  }

  if (loading || !isAuthenticated || canPostQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner />
      </div>
    );
  }

  if (!canPostQuery.data?.canPost) {
    return (
      <BlockedScreen
        title="You're not assigned to this event"
        body={
          (canPostQuery.data as any)?.reason ||
          "You don't have posting access for this event's live blog. Ask an admin to add you as a correspondent."
        }
      />
    );
  }

  return <ConsoleScreen eventId={eventId} />;
}

function BlockedScreen({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-6 text-center space-y-4">
          <Lock className="h-10 w-10 mx-auto text-gray-400" />
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{body}</p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/live-console">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to my events
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Console screen
// ============================================================

function ConsoleScreen({ eventId }: { eventId: number }) {
  const utils = trpc.useUtils();
  const eventQuery = trpc.events.adminGet.useQuery({ id: eventId });
  const modeQuery = trpc.events.getResolvedMode.useQuery({ eventId });
  const postsQuery = trpc.events.listLivePosts.useQuery(
    { eventId },
    { refetchInterval: 20_000 },
  );

  // AI suggestion queue. These procedures are shipped by a parallel
  // workstream — go through an `any` cast so the client builds even
  // before the router lands, and fail soft (empty queue) if the
  // endpoint 404s.
  const suggestionsQuery = (trpc.events as any).listLiveSuggestions?.useQuery(
    { eventId },
    { refetchInterval: 60_000, retry: false },
  );
  const suggestions: any[] = Array.isArray(suggestionsQuery?.data)
    ? suggestionsQuery.data
    : [];

  const event = eventQuery.data as any;
  const isLive = modeQuery.data?.mode === "live";

  // ---------- Composer state ----------
  const [mode, setMode] = useState<ComposerMode>({ kind: "new" });
  const [postType, setPostType] = useState<PostType>("update");
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");
  const [speakerName, setSpeakerName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [fundingAmount, setFundingAmount] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);

  const composerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Auto-grow the body textarea as the reporter types.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 320)}px`;
  }, [body]);

  function resetComposer() {
    setMode({ kind: "new" });
    setHeadline("");
    setBody("");
    setImageUrl("");
    setEmbedUrl("");
    setSpeakerName("");
    setCompanyName("");
    setFundingAmount("");
    setIsPinned(false);
    // Keep postType — reporters post the same type in bursts.
  }

  function scrollToComposer() {
    composerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---------- Mutations ----------
  const post = trpc.events.postLiveUpdate.useMutation({
    onSuccess: () => {
      toast.success("Update posted");
      resetComposer();
      utils.events.listLivePosts.invalidate({ eventId });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const edit = trpc.events.editLiveUpdate.useMutation({
    onSuccess: () => {
      toast.success("Post updated");
      resetComposer();
      utils.events.listLivePosts.invalidate({ eventId });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const togglePin = trpc.events.togglePinLiveUpdate.useMutation({
    onSuccess: () => utils.events.listLivePosts.invalidate({ eventId }),
    onError: (e: any) => toast.error(e.message),
  });

  const del = trpc.events.deleteLiveUpdate.useMutation({
    onSuccess: () => {
      toast.success("Post deleted");
      utils.events.listLivePosts.invalidate({ eventId });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const approveSuggestion = (trpc.events as any).approveLiveSuggestion?.useMutation({
    onSuccess: () => {
      toast.success("Suggestion published");
      resetComposer();
      utils.events.listLivePosts.invalidate({ eventId });
      suggestionsQuery?.refetch?.();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rejectSuggestion = (trpc.events as any).rejectLiveSuggestion?.useMutation({
    onSuccess: () => {
      toast.success("Suggestion rejected");
      suggestionsQuery?.refetch?.();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const isSubmitting =
    post.isPending || edit.isPending || Boolean(approveSuggestion?.isPending);

  // ---------- Photo upload ----------
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Max 10MB"); return; }
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      const { url } = await res.json();
      setImageUrl(url);
      toast.success("Photo uploaded");
    } catch (err) {
      toast.error("Upload failed: " + String(err));
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // ---------- Load helpers ----------
  function loadPostIntoComposer(p: any) {
    setMode({ kind: "editPost", postId: p.id });
    setPostType((p.postType as PostType) || "update");
    setHeadline(p.headline || "");
    setBody(p.body || "");
    setImageUrl(p.imageUrl || "");
    setEmbedUrl(p.embedUrl || "");
    setSpeakerName(p.speakerName || "");
    setCompanyName(p.companyName || "");
    setFundingAmount(p.fundingAmount || "");
    setIsPinned(Boolean(p.isPinned));
    scrollToComposer();
  }

  function loadSuggestionIntoComposer(s: any) {
    setMode({ kind: "approveSuggestion", suggestionId: s.id });
    setPostType((s.postType as PostType) || "update");
    setHeadline(s.headline || "");
    setBody(s.body || "");
    setImageUrl("");
    setEmbedUrl("");
    setSpeakerName("");
    setCompanyName("");
    setFundingAmount("");
    setIsPinned(false);
    scrollToComposer();
  }

  // ---------- Submit ----------
  function submit() {
    if (!body.trim()) {
      toast.error("Body is required");
      return;
    }
    if (mode.kind === "editPost") {
      edit.mutate({
        id: mode.postId,
        postType,
        headline: headline.trim() || null,
        body: body.trim(),
        imageUrl: imageUrl.trim() || null,
        embedUrl: embedUrl.trim() || null,
        speakerName: speakerName.trim() || null,
        companyName: companyName.trim() || null,
        fundingAmount: fundingAmount.trim() || null,
        isPinned,
      });
      return;
    }
    if (mode.kind === "approveSuggestion") {
      if (!approveSuggestion) {
        toast.error("Suggestion queue is not available yet");
        return;
      }
      approveSuggestion.mutate({
        id: mode.suggestionId,
        headline: headline.trim() || undefined,
        body: body.trim(),
      });
      return;
    }
    post.mutate({
      eventId,
      postType,
      headline: headline.trim() || undefined,
      body: body.trim(),
      imageUrl: imageUrl.trim() || undefined,
      embedUrl: embedUrl.trim() || undefined,
      speakerName: speakerName.trim() || undefined,
      companyName: companyName.trim() || undefined,
      fundingAmount: fundingAmount.trim() || undefined,
      isPinned,
    });
  }

  const posts: any[] = (postsQuery.data as any[]) || [];
  const recentPosts = posts.slice(0, 20);

  if (eventQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner />
      </div>
    );
  }
  if (!event) {
    return <BlockedScreen title="Event not found" body="This event doesn't exist or was removed." />;
  }

  const submitLabel =
    mode.kind === "editPost"
      ? "Save changes"
      : mode.kind === "approveSuggestion"
        ? "Approve & publish"
        : "Post update";

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* ---------- Compact sticky header ---------- */}
      <header className="sticky top-0 z-30 bg-white border-b">
        <div className="max-w-lg mx-auto px-3 py-2 flex items-center gap-2">
          <Link
            href="/live-console"
            className="text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Back to my events"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-sm font-semibold truncate flex-1 min-w-0">
            {event.title}
          </h1>
          {isLive && (
            <Badge className="bg-red-600 text-white animate-pulse shrink-0">
              <Radio className="h-3 w-3 mr-1" /> LIVE
            </Badge>
          )}
          {event.slug && (
            <a
              href={`/events/${event.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground shrink-0"
              aria-label="Open public live page"
            >
              <ExternalLink className="h-5 w-5" />
            </a>
          )}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-3 py-4 space-y-4">
        {/* ---------- COMPOSER ---------- */}
        <div ref={composerRef} className="scroll-mt-14">
          <Card
            className={
              postType === "breaking"
                ? "border-2 border-red-500"
                : mode.kind !== "new"
                  ? "border-2 border-blue-400"
                  : ""
            }
          >
            <CardContent className="p-3 sm:p-4 space-y-3">
              {/* Edit / approve banner */}
              {mode.kind !== "new" && (
                <div className="flex items-center justify-between gap-2 rounded-md bg-blue-50 text-blue-800 text-xs font-medium px-3 py-2">
                  <span>
                    {mode.kind === "editPost"
                      ? "Editing post — saving updates the live feed"
                      : "Editing AI suggestion — approving publishes it"}
                  </span>
                  <button
                    type="button"
                    onClick={resetComposer}
                    className="inline-flex items-center gap-1 hover:underline shrink-0"
                  >
                    <X className="h-3.5 w-3.5" /> Cancel
                  </button>
                </div>
              )}

              {/* Post-type chips — horizontal scroll on phones */}
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [-webkit-overflow-scrolling:touch]">
                {POST_TYPES.map(({ value, label, Icon, idle, active }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPostType(value)}
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition-colors shrink-0 ${
                      postType === value ? active : `${idle} bg-white`
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Type-specific fields */}
              {postType === "quote" && (
                <div className="space-y-1">
                  <Label htmlFor="lc-speaker">Speaker name</Label>
                  <Input
                    id="lc-speaker"
                    value={speakerName}
                    onChange={(e) => setSpeakerName(e.target.value)}
                    placeholder="e.g. Sarah Al-Otaibi, CEO of Foo"
                  />
                </div>
              )}

              {postType === "funding" && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="lc-company">Company</Label>
                    <Input
                      id="lc-company"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Company name"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="lc-amount">Amount</Label>
                    <Input
                      id="lc-amount"
                      value={fundingAmount}
                      onChange={(e) => setFundingAmount(e.target.value)}
                      placeholder="$10M Series A"
                    />
                  </div>
                </div>
              )}

              {postType === "photo" && (
                <div className="space-y-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12"
                    disabled={isUploading}
                    onClick={() => fileRef.current?.click()}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading…
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4 mr-2" />
                        {imageUrl ? "Replace photo" : "Take / choose photo"}
                      </>
                    )}
                  </Button>
                  {imageUrl && (
                    <div className="relative">
                      <img
                        src={imageUrl}
                        alt="Upload preview"
                        className="w-full max-h-64 object-cover rounded-md border"
                      />
                      <button
                        type="button"
                        onClick={() => setImageUrl("")}
                        className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5"
                        aria-label="Remove photo"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {postType === "video" && (
                <div className="space-y-1">
                  <Label htmlFor="lc-embed">Video / embed URL</Label>
                  <Input
                    id="lc-embed"
                    type="url"
                    inputMode="url"
                    value={embedUrl}
                    onChange={(e) => setEmbedUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=…"
                  />
                </div>
              )}

              {/* Shared fields */}
              <div className="space-y-1">
                <Label htmlFor="lc-headline">
                  Headline <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="lc-headline"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Short punchy headline"
                  maxLength={512}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="lc-body">Body</Label>
                <Textarea
                  id="lc-body"
                  ref={bodyRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="What's happening?"
                  rows={3}
                  className="resize-none overflow-hidden text-base"
                />
              </div>

              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <Checkbox
                  checked={isPinned}
                  onCheckedChange={(v) => setIsPinned(Boolean(v))}
                />
                <span className="inline-flex items-center gap-1">
                  <Pin className="h-3.5 w-3.5" /> Pin to top of feed
                </span>
              </label>

              <Button
                type="button"
                className="w-full h-12 text-base font-semibold"
                disabled={isSubmitting || isUploading || !body.trim()}
                onClick={submit}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Posting…
                  </>
                ) : (
                  submitLabel
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ---------- AI SUGGESTIONS ---------- */}
        <Collapsible open={suggestionsOpen} onOpenChange={setSuggestionsOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="w-full flex items-center gap-2 px-4 py-3 text-left"
              >
                <Sparkles className="h-4 w-4 text-violet-600 shrink-0" />
                <span className="text-sm font-semibold flex-1">AI suggestions</span>
                {suggestions.length > 0 && (
                  <Badge className="bg-violet-600 text-white">{suggestions.length}</Badge>
                )}
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    suggestionsOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-4 pb-4 pt-0 space-y-3">
                {suggestionsQuery?.isError || !suggestionsQuery ? (
                  <p className="text-sm text-muted-foreground">
                    Suggestion queue unavailable.
                  </p>
                ) : suggestions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No pending suggestions. New ones appear here automatically.
                  </p>
                ) : (
                  suggestions.map((s: any) => {
                    const meta = typeMeta(s.postType);
                    return (
                      <div key={s.id} className="rounded-lg border bg-white p-3 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${meta.badge}`}>
                            {meta.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {fmtTime(s.createdAt ?? s.publishedAt)}
                          </span>
                          {s.sourceUrl && (
                            <a
                              href={s.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline inline-flex items-center gap-0.5 ml-auto"
                            >
                              Source <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        {s.headline && (
                          <p className="text-sm font-semibold">{s.headline}</p>
                        )}
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{s.body}</p>
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            className="flex-1"
                            disabled={Boolean(approveSuggestion?.isPending)}
                            onClick={() => approveSuggestion?.mutate({ id: s.id })}
                          >
                            <Check className="h-4 w-4 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => loadSuggestionIntoComposer(s)}
                          >
                            <Pencil className="h-4 w-4 mr-1" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            disabled={Boolean(rejectSuggestion?.isPending)}
                            onClick={() => rejectSuggestion?.mutate({ id: s.id })}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* ---------- RECENT POSTS ---------- */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground px-1">
            Recent posts
          </h2>
          {postsQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : recentPosts.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                Nothing posted yet. Your first update will appear here.
              </CardContent>
            </Card>
          ) : (
            recentPosts.map((p: any) => {
              const meta = typeMeta(p.postType);
              const pinned = Boolean(p.isPinned);
              return (
                <div
                  key={p.id}
                  className={`rounded-lg border bg-white p-3 ${pinned ? "border-amber-400" : ""}`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${meta.badge}`}>
                      {meta.label}
                    </span>
                    {pinned && (
                      <span className="text-xs text-amber-600 inline-flex items-center gap-0.5">
                        <Pin className="h-3 w-3" /> Pinned
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {fmtTime(p.publishedAt)}
                    </span>
                  </div>
                  <p className="text-sm mt-1.5 line-clamp-2">
                    {p.headline ? (
                      <span className="font-semibold">{p.headline} — </span>
                    ) : null}
                    {p.body}
                  </p>
                  {p.authorName && (
                    <p className="text-xs text-muted-foreground mt-1">by {p.authorName}</p>
                  )}
                  <div className="flex gap-1 mt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-muted-foreground"
                      disabled={togglePin.isPending}
                      onClick={() => togglePin.mutate({ id: p.id })}
                    >
                      {pinned ? (
                        <>
                          <PinOff className="h-4 w-4 mr-1" /> Unpin
                        </>
                      ) : (
                        <>
                          <Pin className="h-4 w-4 mr-1" /> Pin
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-muted-foreground"
                      onClick={() => loadPostIntoComposer(p)}
                    >
                      <Pencil className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-red-600 hover:text-red-700 ml-auto"
                      onClick={() => setDeleteTargetId(p.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be removed from the public live feed immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteTargetId !== null) del.mutate({ id: deleteTargetId });
                setDeleteTargetId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
