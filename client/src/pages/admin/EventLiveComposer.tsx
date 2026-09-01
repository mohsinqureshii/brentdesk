/**
 * EventLiveComposer
 *
 * The in-event live blog composer. Routed at /admin/events/:id/live
 * and intended to be used from a phone on the venue floor — so the
 * layout is mobile-first, the composer card is sticky, and the post
 * button is a fat thumb target.
 *
 * Auth: this page is reachable to event_correspondent and event_tenant
 * users who would normally be blocked by the admin <ProtectedRoute>.
 * We deliberately register the route without ProtectedRoute and gate
 * inside the component with `events.canPostLiveCheck`, which delegates
 * to the canPostLive() helper (staff bypass OR correspondents row OR
 * event tenant). Non-authorised viewers see an UnauthorizedView block
 * instead of a redirect — clearer for users who hit the URL from a
 * shared link.
 *
 * The feed below the composer reuses events.listLivePosts (the same
 * query the public page uses), so what an editor sees here matches
 * what the public site shows in live mode 1:1. Inline pin / edit /
 * delete buttons live next to each post.
 */

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { MediaPicker } from "@/components/MediaPicker";
import {
  ArrowLeft,
  ExternalLink,
  Image as ImageIcon,
  Pin,
  PinOff,
  Pencil,
  Trash2,
  Radio,
  Lock,
} from "lucide-react";

type PostType =
  | "update"
  | "quote"
  | "funding"
  | "session"
  | "sponsor"
  | "photo"
  | "video"
  | "breaking";

// Visual chip metadata. Each post type carries its own colour cue
// the public page uses too — we mirror them here so authors can
// preview the styling intent at compose time.
const POST_TYPES: Array<{
  value: PostType;
  label: string;
  classes: string;
  activeClasses: string;
}> = [
  { value: "update",   label: "Update",   classes: "border-gray-300 text-gray-700",      activeClasses: "bg-gray-800 text-white border-gray-800" },
  { value: "quote",    label: "Quote",    classes: "border-purple-300 text-purple-700",  activeClasses: "bg-purple-600 text-white border-purple-600" },
  { value: "funding",  label: "Funding",  classes: "border-green-300 text-green-700",    activeClasses: "bg-green-600 text-white border-green-600" },
  { value: "session",  label: "Session",  classes: "border-blue-300 text-blue-700",      activeClasses: "bg-blue-600 text-white border-blue-600" },
  { value: "sponsor",  label: "Sponsor",  classes: "border-amber-300 text-amber-700",    activeClasses: "bg-amber-600 text-white border-amber-600" },
  { value: "photo",    label: "Photo",    classes: "border-pink-300 text-pink-700",      activeClasses: "bg-pink-600 text-white border-pink-600" },
  { value: "video",    label: "Video",    classes: "border-indigo-300 text-indigo-700",  activeClasses: "bg-indigo-600 text-white border-indigo-600" },
  { value: "breaking", label: "Breaking", classes: "border-red-300 text-red-700",        activeClasses: "bg-red-600 text-white border-red-600" },
];

// ============================================================
// Helpers
// ============================================================

function parseEmbedPreviewUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // YouTube — handles youtu.be short links and watch?v= long links.
  const yt =
    raw.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = raw.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

function fmtTime(v: string | null | undefined): string {
  if (!v) return "";
  try {
    return new Date(v).toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return v;
  }
}

// ============================================================
// Page entry
// ============================================================

export default function EventLiveComposer() {
  const params = useParams<{ id: string }>();
  const eventId = Number(params.id);
  const { user, loading: authLoading } = useAuth();

  // Auth guard. We don't redirect — we render the UnauthorizedView
  // so users who hit the link without permission get a clear message
  // and a path forward (ask an admin).
  const canPostQuery = trpc.events.canPostLiveCheck.useQuery(
    { eventId },
    { enabled: Boolean(eventId) && Boolean(user) },
  );

  if (!eventId || Number.isNaN(eventId)) {
    return <UnauthorizedView reason="No event id." />;
  }
  if (authLoading || (user && canPostQuery.isLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner />
      </div>
    );
  }
  if (!user) {
    return <UnauthorizedView reason="Sign in to access the live composer." showSignin />;
  }
  if (!canPostQuery.data?.canPost) {
    return (
      <UnauthorizedView
        reason={canPostQuery.data?.reason || "You do not have access to this composer."}
      />
    );
  }

  return <ComposerScreen eventId={eventId} />;
}

// ============================================================
// Unauthorized view
// ============================================================

function UnauthorizedView({ reason, showSignin }: { reason: string; showSignin?: boolean }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-6 text-center space-y-4">
          <Lock className="h-10 w-10 mx-auto text-gray-400" />
          <h1 className="text-xl font-semibold">Live composer locked</h1>
          <p className="text-sm text-muted-foreground">{reason}</p>
          {showSignin ? (
            <Button asChild className="w-full">
              <Link href="/admin/login">Sign in</Link>
            </Button>
          ) : (
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/events">Back to events</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Composer screen
// ============================================================

function ComposerScreen({ eventId }: { eventId: number }) {
  const utils = trpc.useUtils();
  const eventQuery = trpc.events.adminGet.useQuery({ id: eventId });
  const modeQuery = trpc.events.getResolvedMode.useQuery({ eventId });
  const postsQuery = trpc.events.listLivePosts.useQuery(
    { eventId },
    { refetchInterval: 15_000 },
  );

  const event = eventQuery.data;
  const isLive = modeQuery.data?.mode === "live";

  // Composer form state. Reset after a successful post.
  const [postType, setPostType] = useState<PostType>("update");
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");
  const [speakerName, setSpeakerName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [fundingAmount, setFundingAmount] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  const post = trpc.events.postLiveUpdate.useMutation({
    onSuccess: () => {
      toast.success("Live update posted");
      resetForm();
      utils.events.listLivePosts.invalidate({ eventId });
    },
    onError: (e) => toast.error(e.message),
  });

  const togglePin = trpc.events.togglePinLiveUpdate.useMutation({
    onSuccess: () => utils.events.listLivePosts.invalidate({ eventId }),
    onError: (e) => toast.error(e.message),
  });

  const del = trpc.events.deleteLiveUpdate.useMutation({
    onSuccess: () => {
      toast.success("Post deleted");
      utils.events.listLivePosts.invalidate({ eventId });
    },
    onError: (e) => toast.error(e.message),
  });

  function resetForm() {
    setHeadline("");
    setBody("");
    setImageUrl("");
    setEmbedUrl("");
    setSpeakerName("");
    setCompanyName("");
    setFundingAmount("");
    setIsPinned(false);
    // Keep postType — correspondents typically post the same type
    // in bursts (5 quotes from one session, then switch).
  }

  function submit() {
    if (!body.trim()) {
      toast.error("Body is required");
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

  // Posts come back in (pinned desc, publishedAt desc) order from the
  // server — pinned stay on top automatically.
  const posts = postsQuery.data || [];

  const embedPreview = parseEmbedPreviewUrl(embedUrl);

  if (eventQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner />
      </div>
    );
  }
  if (!event) {
    return <UnauthorizedView reason="Event not found." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky header — visible at all scroll positions so authors
          can flip back to the editor or jump to the public page mid-feed. */}
      <header className="sticky top-0 z-30 bg-white border-b">
        <div className="px-3 sm:px-4 py-2 flex items-center gap-2 flex-wrap">
          <Link
            href={`/admin/events/${eventId}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to editor</span>
          </Link>
          <h1 className="text-sm sm:text-base font-semibold truncate flex-1 min-w-0">
            {event.title}
          </h1>
          {isLive && (
            <Badge className="bg-red-600 text-white animate-pulse">
              <Radio className="h-3 w-3 mr-1" /> LIVE
            </Badge>
          )}
          {event.slug && (
            <a
              href={`/events/${event.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="hidden sm:inline">Public page</span>
            </a>
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 space-y-4">
        {/* Composer card. Sticky on scroll so it stays accessible
            even when the feed is long. On mobile the safe top is the
            header's bottom edge. */}
        <Card
          className={`sticky top-[52px] z-20 shadow-sm ${
            postType === "breaking" ? "border-2 border-red-500" : ""
          }`}
        >
          <CardContent className="p-3 sm:p-4 space-y-3">
            {/* Type chips — large touch targets, wrap freely on small screens. */}
            <div className="flex flex-wrap gap-2">
              {POST_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setPostType(t.value)}
                  className={`px-3 py-2 rounded-full border text-sm font-medium transition ${
                    postType === t.value ? t.activeClasses : `bg-white hover:bg-gray-50 ${t.classes}`
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Type-conditional fields. Order chosen so the most-used
                composer fields (body) are always lowest = thumb-reach. */}
            <TypeFields
              postType={postType}
              headline={headline} setHeadline={setHeadline}
              body={body} setBody={setBody}
              imageUrl={imageUrl} setImageUrl={setImageUrl}
              embedUrl={embedUrl} setEmbedUrl={setEmbedUrl}
              embedPreview={embedPreview}
              speakerName={speakerName} setSpeakerName={setSpeakerName}
              companyName={companyName} setCompanyName={setCompanyName}
              fundingAmount={fundingAmount} setFundingAmount={setFundingAmount}
              onPickImage={() => setShowMediaPicker(true)}
            />

            <div className="flex items-center justify-between gap-2 pt-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <Checkbox
                  checked={isPinned}
                  onCheckedChange={(v) => setIsPinned(Boolean(v))}
                />
                <Pin className="h-4 w-4" /> Pin to top
              </label>
              <Button
                size="lg"
                onClick={submit}
                disabled={post.isPending || !body.trim()}
                className="h-12 px-6 text-base font-semibold"
              >
                {post.isPending ? "Posting…" : "Post live"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Feed */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Live feed
            </h2>
            <span className="text-xs text-muted-foreground">
              {posts.length} post{posts.length === 1 ? "" : "s"}
            </span>
          </div>
          {postsQuery.isLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : posts.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                No posts yet. Use the composer above to start the stream.
              </CardContent>
            </Card>
          ) : (
            posts.map((p: any) => (
              <PostRow
                key={p.id}
                post={p}
                onTogglePin={() => togglePin.mutate({ id: p.id })}
                onDelete={() => del.mutate({ id: p.id })}
                eventId={eventId}
              />
            ))
          )}
        </section>
      </div>

      {/* Media picker for the photo post type */}
      <MediaPicker
        open={showMediaPicker}
        onOpenChange={setShowMediaPicker}
        onSelect={(media) => {
          setImageUrl(media.url);
          setShowMediaPicker(false);
        }}
      />
    </div>
  );
}

// ============================================================
// Type-conditional composer fields
// ============================================================

function TypeFields(props: {
  postType: PostType;
  headline: string; setHeadline: (v: string) => void;
  body: string; setBody: (v: string) => void;
  imageUrl: string; setImageUrl: (v: string) => void;
  embedUrl: string; setEmbedUrl: (v: string) => void;
  embedPreview: string | null;
  speakerName: string; setSpeakerName: (v: string) => void;
  companyName: string; setCompanyName: (v: string) => void;
  fundingAmount: string; setFundingAmount: (v: string) => void;
  onPickImage: () => void;
}) {
  const {
    postType, headline, setHeadline, body, setBody,
    imageUrl, setImageUrl, embedUrl, setEmbedUrl, embedPreview,
    speakerName, setSpeakerName, companyName, setCompanyName,
    fundingAmount, setFundingAmount, onPickImage,
  } = props;

  const bodyLabel =
    postType === "quote"   ? "Quote"
  : postType === "photo"   ? "Caption"
  : postType === "video"   ? "Caption"
  : "Body";

  return (
    <div className="space-y-3">
      {/* Headline for types that use it */}
      {(postType === "update" || postType === "session" || postType === "sponsor" || postType === "breaking") && (
        <div>
          <Label className="text-xs">
            Headline {postType === "update" && <span className="text-muted-foreground">(optional)</span>}
          </Label>
          <Input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Short headline"
            maxLength={512}
            className="h-11"
          />
        </div>
      )}

      {/* Speaker name for quote / session */}
      {(postType === "quote" || postType === "session") && (
        <div>
          <Label className="text-xs">Speaker</Label>
          <Input
            value={speakerName}
            onChange={(e) => setSpeakerName(e.target.value)}
            placeholder="Speaker name"
            maxLength={255}
            className="h-11"
          />
        </div>
      )}

      {/* Company + amount for funding */}
      {postType === "funding" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Company</Label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Company name"
              maxLength={255}
              className="h-11"
            />
          </div>
          <div>
            <Label className="text-xs">Amount</Label>
            <Input
              value={fundingAmount}
              onChange={(e) => setFundingAmount(e.target.value)}
              placeholder="$2.5M"
              maxLength={64}
              className="h-11"
            />
          </div>
        </div>
      )}

      {/* Image (photo) */}
      {postType === "photo" && (
        <div className="space-y-2">
          <Label className="text-xs">Image</Label>
          <div className="flex gap-2">
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
              className="h-11"
            />
            <Button type="button" variant="outline" onClick={onPickImage} className="h-11 shrink-0">
              <ImageIcon className="h-4 w-4 mr-1" /> Pick
            </Button>
          </div>
          {imageUrl && (
            <img
              src={imageUrl}
              alt="preview"
              className="rounded-md max-h-56 w-full object-cover border"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          )}
        </div>
      )}

      {/* Video embed */}
      {postType === "video" && (
        <div className="space-y-2">
          <Label className="text-xs">Video URL (YouTube / Vimeo)</Label>
          <Input
            value={embedUrl}
            onChange={(e) => setEmbedUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=…"
            className="h-11"
          />
          {embedPreview && (
            <div className="rounded-md overflow-hidden border aspect-video">
              <iframe
                src={embedPreview}
                title="video preview"
                className="w-full h-full"
                allow="encrypted-media"
              />
            </div>
          )}
        </div>
      )}

      {/* Body / quote / caption — always shown. Sized for thumb typing. */}
      <div>
        <Label className="text-xs">{bodyLabel}</Label>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={postType === "quote" ? "“…”" : "What's happening right now?"}
          className="min-h-[110px] text-base"
          autoFocus
        />
      </div>
    </div>
  );
}

// ============================================================
// Single post row (in the feed)
// ============================================================

function PostRow({
  post, onTogglePin, onDelete, eventId,
}: {
  post: any;
  onTogglePin: () => void;
  onDelete: () => void;
  eventId: number;
}) {
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const typeMeta = POST_TYPES.find((t) => t.value === post.postType) || POST_TYPES[0];

  const borderTone =
    post.postType === "breaking" ? "border-l-4 border-l-red-500"
  : post.postType === "funding"  ? "border-l-4 border-l-green-500"
  : post.postType === "quote"    ? "border-l-4 border-l-purple-500"
  : "";

  return (
    <Card className={`${borderTone}`}>
      <CardContent className="p-3 sm:p-4 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          {Boolean(post.isPinned) && (
            <Badge variant="outline" className="bg-yellow-50 border-yellow-300 text-yellow-800">
              📌 Pinned
            </Badge>
          )}
          <Badge variant="outline" className={typeMeta.classes}>
            {typeMeta.label}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {fmtTime(post.publishedAt)}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={onTogglePin} title={post.isPinned ? "Unpin" : "Pin"}>
              {post.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowEdit(true)} title="Edit">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowDelete(true)}
              title="Delete"
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {post.headline && (
          <h3 className="font-semibold leading-snug">{post.headline}</h3>
        )}
        {post.postType === "funding" && (post.companyName || post.fundingAmount) && (
          <div className="text-sm">
            <span className="font-medium">{post.companyName}</span>
            {post.companyName && post.fundingAmount && " — "}
            <span className="text-green-700 font-semibold">{post.fundingAmount}</span>
          </div>
        )}
        {(post.postType === "quote" || post.postType === "session") && post.speakerName && (
          <div className="text-xs text-muted-foreground">{post.speakerName}</div>
        )}
        {post.imageUrl && (
          <img src={post.imageUrl} alt="" className="rounded-md max-h-72 object-cover w-full border" />
        )}
        {post.body && (
          <p
            className={`text-sm whitespace-pre-wrap ${
              post.postType === "quote" ? "italic text-gray-800" : "text-gray-800"
            }`}
          >
            {post.body}
          </p>
        )}
      </CardContent>

      <EditPostDialog
        open={showEdit}
        onOpenChange={setShowEdit}
        post={post}
        eventId={eventId}
      />
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              The post will be hidden from the public feed. This is a soft delete —
              it can be recovered from the database if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => { onDelete(); setShowDelete(false); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ============================================================
// Edit modal — pre-filled with the post's current values
// ============================================================

function EditPostDialog({
  open, onOpenChange, post, eventId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  post: any;
  eventId: number;
}) {
  const utils = trpc.useUtils();
  const [postType, setPostType] = useState<PostType>(post.postType);
  const [headline, setHeadline] = useState(post.headline ?? "");
  const [body, setBody] = useState(post.body ?? "");
  const [imageUrl, setImageUrl] = useState(post.imageUrl ?? "");
  const [embedUrl, setEmbedUrl] = useState(post.embedUrl ?? "");
  const [speakerName, setSpeakerName] = useState(post.speakerName ?? "");
  const [companyName, setCompanyName] = useState(post.companyName ?? "");
  const [fundingAmount, setFundingAmount] = useState(post.fundingAmount ?? "");

  // Re-sync when post changes (e.g. after another edit refetches).
  useEffect(() => {
    if (!open) return;
    setPostType(post.postType);
    setHeadline(post.headline ?? "");
    setBody(post.body ?? "");
    setImageUrl(post.imageUrl ?? "");
    setEmbedUrl(post.embedUrl ?? "");
    setSpeakerName(post.speakerName ?? "");
    setCompanyName(post.companyName ?? "");
    setFundingAmount(post.fundingAmount ?? "");
  }, [open, post]);

  const edit = trpc.events.editLiveUpdate.useMutation({
    onSuccess: () => {
      toast.success("Post updated");
      utils.events.listLivePosts.invalidate({ eventId });
      onOpenChange(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const embedPreview = useMemo(() => parseEmbedPreviewUrl(embedUrl), [embedUrl]);

  function save() {
    if (!body.trim()) { toast.error("Body is required"); return; }
    edit.mutate({
      id: post.id,
      postType,
      headline: headline.trim() || null,
      body: body.trim(),
      imageUrl: imageUrl.trim() || null,
      embedUrl: embedUrl.trim() || null,
      speakerName: speakerName.trim() || null,
      companyName: companyName.trim() || null,
      fundingAmount: fundingAmount.trim() || null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit live post</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {POST_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setPostType(t.value)}
                className={`px-3 py-1.5 rounded-full border text-xs font-medium transition ${
                  postType === t.value ? t.activeClasses : `bg-white hover:bg-gray-50 ${t.classes}`
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <TypeFields
            postType={postType}
            headline={headline} setHeadline={setHeadline}
            body={body} setBody={setBody}
            imageUrl={imageUrl} setImageUrl={setImageUrl}
            embedUrl={embedUrl} setEmbedUrl={setEmbedUrl}
            embedPreview={embedPreview}
            speakerName={speakerName} setSpeakerName={setSpeakerName}
            companyName={companyName} setCompanyName={setCompanyName}
            fundingAmount={fundingAmount} setFundingAmount={setFundingAmount}
            onPickImage={() => { /* edit dialog skips the media picker — paste url */ }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={edit.isPending || !body.trim()}>
            {edit.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
