/**
 * EventFeaturedSpeakers — the horizontal row of portrait cards.
 *
 * Up to five speakers, then a "+N more" tile that switches to the
 * Speakers tab. Cards link to `/people/{personSlug}` when the speaker
 * has been linked to a real profile.
 *
 * The small emerald line under each card is the title of the session
 * this speaker is actually on, resolved from `events.getSchedule`.
 * There is no "topic" column on the speaker record, so a speaker with
 * no scheduled session simply has no emerald line — nothing is
 * invented to fill it.
 */

import { useMemo } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";

import { trpc } from "@/lib/trpc";
import { initialsOf } from "./eventFormat";

interface Speaker {
  id: number;
  name: string;
  title?: string | null;
  company?: string | null;
  photo?: string | null;
  personSlug?: string | null;
}

function Portrait({ speaker }: { speaker: Speaker }) {
  if (speaker.photo) {
    return (
      <img
        src={speaker.photo}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className="aspect-[4/5] w-full rounded-2xl object-cover ring-1 ring-[var(--border)] transition-transform duration-500 group-hover:scale-[1.02]"
      />
    );
  }
  return (
    <span
      className="flex aspect-[4/5] w-full items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600/20 via-emerald-600/10 to-transparent text-4xl font-black text-emerald-700 ring-1 ring-[var(--border)] dark:text-emerald-400"
      aria-hidden="true"
    >
      {initialsOf(speaker.name)}
    </span>
  );
}

export default function EventFeaturedSpeakers({
  eventId,
  speakers,
  onViewAll,
}: {
  eventId: number;
  speakers: Speaker[];
  onViewAll: () => void;
}) {
  // Same query the agenda uses — react-query dedupes it, so this costs
  // nothing extra on a page that already renders the agenda preview.
  const { data: scheduleRows = [] } = trpc.events.getSchedule.useQuery(
    { eventId },
    { enabled: !!eventId && (speakers?.length ?? 0) > 0 },
  );

  const sessionBySpeakerId = useMemo(() => {
    const m = new Map<number, string>();
    for (const s of scheduleRows as any[]) {
      for (const sp of (s?.speakers || []) as Array<{ id: number }>) {
        if (sp?.id != null && !m.has(sp.id) && s.title) m.set(sp.id, String(s.title));
      }
    }
    return m;
  }, [scheduleRows]);

  if (!speakers || speakers.length === 0) return null;

  // Six portraits fill the row exactly. Only give up a slot to the
  // "+N more" tile when there is genuinely more than one left to show —
  // a "+1" tile costs a real portrait to say almost nothing.
  const shown = speakers.length <= 6 ? speakers : speakers.slice(0, 5);
  const remaining = speakers.length - shown.length;

  return (
    <section aria-label="Featured speakers">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
          Featured speakers
        </h2>
        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-emerald-700 dark:hover:text-emerald-400"
        >
          View all speakers
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* Horizontal scroll row on small screens, an even grid from md. */}
      <ul className="-mx-1 mt-8 flex snap-x gap-5 overflow-x-auto px-1 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 lg:grid-cols-6">
        {shown.map((s) => {
          const topic = sessionBySpeakerId.get(s.id) || null;
          const card = (
            <>
              <Portrait speaker={s} />
              <h3 className="mt-4 text-base font-bold leading-snug text-foreground">
                {s.name}
              </h3>
              {s.title && (
                <p className="mt-1 text-sm leading-snug text-muted-foreground">
                  {s.title}
                </p>
              )}
              {s.company && (
                <p className="text-sm font-medium leading-snug text-foreground/80">
                  {s.company}
                </p>
              )}
              {topic && (
                <p className="mt-2 line-clamp-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  {topic}
                </p>
              )}
            </>
          );

          return (
            <li
              key={s.id}
              className="group w-56 shrink-0 snap-start md:w-auto md:shrink"
            >
              {s.personSlug ? (
                <Link href={`/people/${s.personSlug}`} className="block">
                  {card}
                </Link>
              ) : (
                card
              )}
            </li>
          );
        })}

        {remaining > 0 && (
          <li className="w-56 shrink-0 snap-start md:w-auto md:shrink">
            <button
              type="button"
              onClick={onViewAll}
              className="flex aspect-[4/5] w-full flex-col items-start justify-end rounded-2xl border border-dashed border-[var(--border)] bg-muted/30 p-5 text-left transition-colors hover:border-emerald-600/50 hover:bg-emerald-600/5"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-emerald-600/40 text-emerald-700 dark:text-emerald-400">
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="mt-4 text-2xl font-black leading-none text-foreground">
                +{remaining}
              </span>
              <span className="mt-1.5 text-sm text-muted-foreground">
                More speaker{remaining === 1 ? "" : "s"} on the programme
              </span>
            </button>
          </li>
        )}
      </ul>
    </section>
  );
}
