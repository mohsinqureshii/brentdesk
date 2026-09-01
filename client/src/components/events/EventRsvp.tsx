/**
 * Event RSVP — shared state and controls.
 * ----------------------------------------------------------------------
 * RSVP is not the same thing as the bookmark next to it. "Save Event"
 * writes a private bookmark; RSVP writes an attendance intention
 * (`going` / `interested` / `not_going`) that feeds the event's going
 * count and its reminder emails.
 *
 * The control appears in two places — the hero, beside Get Tickets, and
 * the closing follow band — so the mutation and its optimistic state
 * live here rather than in either component. Both render from the same
 * `events.getMyRsvp` query, which react-query dedupes, so pressing
 * "I'm going" in the hero updates the band immediately and vice versa.
 *
 * `events.rsvp` is a protectedProcedure: a signed-out click is caught
 * before it can 401 and turned into a sign-in prompt.
 */

import { useState } from "react";
import { Bell, Check, Users } from "lucide-react";
import { publication } from "@shared/publication";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";

export type RsvpStatus = "going" | "interested" | "not_going";

export function useEventRsvp(eventId: number, slug: string) {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const myRsvpQ = trpc.events.getMyRsvp.useQuery(
    { eventId },
    { enabled: !!eventId && !!user },
  );
  const [optimistic, setOptimistic] = useState<RsvpStatus | null>(null);
  const current = optimistic ?? ((myRsvpQ.data?.status as RsvpStatus) ?? null);

  const rsvp = trpc.events.rsvp.useMutation({
    onSuccess: (data: any) => {
      setOptimistic(data.status as RsvpStatus);
      utils.events.getMyRsvp.invalidate({ eventId });
      utils.events.getBySlug.invalidate({ slug });
    },
    onError: (e: any) => {
      setOptimistic(null);
      toast.error(e?.message || "Could not update your RSVP");
    },
  });

  const setStatus = (status: RsvpStatus) => {
    if (!user) {
      toast("Sign in to RSVP", {
        description: `Your RSVP and reminder emails live on your ${publication.name} account.`,
        action: { label: "Sign in", onClick: () => { window.location.href = "/signin"; } },
      });
      return;
    }
    // Pressing the active state again clears it, so an RSVP is never a
    // one-way door the visitor has to hunt for a way out of.
    const next = current === status ? "not_going" : status;
    setOptimistic(next);
    rsvp.mutate({ eventId, status: next });
  };

  return { current, setStatus, isPending: rsvp.isPending, isGoing: current === "going" };
}

/**
 * `hero` is the compact pair that sits beside Get Tickets / Save Event.
 * `band` is the larger pair in the closing follow band.
 */
export function EventRsvpButtons({
  eventId,
  slug,
  variant = "hero",
  className = "",
}: {
  eventId: number;
  slug: string;
  variant?: "hero" | "band";
  className?: string;
}) {
  const { current, setStatus, isPending } = useEventRsvp(eventId, slug);

  const going = current === "going";
  const interested = current === "interested";
  const height = variant === "hero" ? "h-12" : "h-11";

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <Button
        onClick={() => setStatus("going")}
        disabled={isPending}
        aria-pressed={going}
        variant={going ? "default" : "outline"}
        className={`${height} gap-2 rounded-lg px-6 text-sm font-semibold ${
          going
            ? "bg-emerald-600 text-white hover:bg-emerald-700"
            : "border-[var(--border)] text-foreground hover:border-emerald-600/50 hover:text-emerald-700 dark:hover:text-emerald-400"
        }`}
      >
        {going ? (
          <Check className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Users className="h-4 w-4" aria-hidden="true" />
        )}
        {going ? "You're going" : "I'm going"}
      </Button>

      <Button
        onClick={() => setStatus("interested")}
        disabled={isPending}
        aria-pressed={interested}
        variant="outline"
        className={`${height} gap-2 rounded-lg px-5 text-sm font-semibold ${
          interested
            ? "border-emerald-600 text-emerald-700 dark:text-emerald-400"
            : "border-[var(--border)] text-foreground hover:border-emerald-600/50 hover:text-emerald-700 dark:hover:text-emerald-400"
        }`}
      >
        {interested ? (
          <Check className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Bell className="h-4 w-4" aria-hidden="true" />
        )}
        {interested ? "Following" : "Follow"}
      </Button>
    </div>
  );
}
