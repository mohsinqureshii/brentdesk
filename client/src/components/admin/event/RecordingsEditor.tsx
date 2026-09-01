/**
 * RecordingsEditor
 *
 * Session recording links shown in the Recap tab. Used post-event to
 * publish YouTube / Vimeo links per session — the public page renders
 * these as a video grid (and emits VideoObject schema).
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Video } from "lucide-react";

export function RecordingsEditor({ eventId }: { eventId: number }) {
  const utils = trpc.useUtils();
  const { data: rows = [] } = trpc.events.adminListRecordings.useQuery({ eventId });
  const upsert = trpc.events.adminUpsertRecording.useMutation({
    onSuccess: () => {
      toast.success("Recording saved");
      setDraft(null);
      utils.events.adminListRecordings.invalidate({ eventId });
    },
    onError: (e) => toast.error(e.message),
  });
  const del = trpc.events.adminDeleteRecording.useMutation({
    onSuccess: () => {
      toast.success("Deleted");
      utils.events.adminListRecordings.invalidate({ eventId });
    },
  });

  const [draft, setDraft] = useState<{
    id?: number;
    title: string;
    speakerName: string;
    videoUrl: string;
    thumbnailUrl: string;
    durationSeconds: number | null;
    sortOrder: number;
  } | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Video className="h-4 w-4" /> Session Recordings
        </h3>
        <Button
          size="sm"
          variant="outline"
          disabled={!!draft}
          onClick={() => setDraft({
            title: "",
            speakerName: "",
            videoUrl: "",
            thumbnailUrl: "",
            durationSeconds: null,
            sortOrder: rows.length,
          })}
        >
          <Plus className="h-4 w-4 mr-1" /> Add Recording
        </Button>
      </div>

      <div className="space-y-2">
        {rows.map((r: any) => (
          <Card key={r.id} className="p-3 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{r.title}</div>
              <div className="text-xs text-muted-foreground truncate">
                {r.speakerName ? `${r.speakerName} · ` : ""}
                <a href={r.videoUrl} target="_blank" rel="noreferrer" className="underline">{r.videoUrl}</a>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDraft({
                id: r.id,
                title: r.title,
                speakerName: r.speakerName ?? "",
                videoUrl: r.videoUrl,
                thumbnailUrl: r.thumbnailUrl ?? "",
                durationSeconds: r.durationSeconds,
                sortOrder: r.sortOrder ?? 0,
              })}
            >Edit</Button>
            <Button size="sm" variant="ghost" onClick={() => del.mutate({ id: r.id })}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </Card>
        ))}
        {rows.length === 0 && !draft && (
          <p className="text-sm text-muted-foreground italic">No recordings yet.</p>
        )}
      </div>

      {draft && (
        <Card className="p-4 border-primary/40">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Label>Title</Label>
              <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </div>
            <div>
              <Label>Speaker</Label>
              <Input value={draft.speakerName} onChange={(e) => setDraft({ ...draft, speakerName: e.target.value })} />
            </div>
            <div>
              <Label>Sort Order</Label>
              <Input type="number" value={draft.sortOrder}
                onChange={(e) => setDraft({ ...draft, sortOrder: parseInt(e.target.value || "0") })} />
            </div>
            <div className="md:col-span-2">
              <Label>Video URL (YouTube / Vimeo)</Label>
              <Input value={draft.videoUrl} onChange={(e) => setDraft({ ...draft, videoUrl: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Thumbnail URL</Label>
              <Input value={draft.thumbnailUrl} onChange={(e) => setDraft({ ...draft, thumbnailUrl: e.target.value })} />
            </div>
            <div>
              <Label>Duration (seconds)</Label>
              <Input
                type="number"
                value={draft.durationSeconds ?? ""}
                onChange={(e) => setDraft({ ...draft, durationSeconds: e.target.value ? parseInt(e.target.value) : null })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
            <Button
              size="sm"
              onClick={() => {
                if (!draft.title.trim() || !draft.videoUrl.trim()) {
                  toast.error("Title and video URL required");
                  return;
                }
                upsert.mutate({ eventId, ...draft });
              }}
              disabled={upsert.isPending}
            >Save</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
