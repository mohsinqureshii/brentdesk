/**
 * EventOverviewSplit — the overview section of the event page.
 *
 *   OVERVIEW
 *   Editorial headline with its final clause in emerald
 *   description, clamped to five lines · Read more ↓
 *   ┌────────────┬────────────┬────────────┐
 *   │ 👥 200K+   │ 🎤 10      │ 🚀 600     │
 *   │ Attendees  │ Speakers   │ Startups   │
 *   ├────────────┼────────────┴────────────┤
 *   │ ▤ 18       │ 💼 1,900                │
 *   └────────────┴─────────────────────────┘
 *
 * The numbers used to sit opposite the copy. Against a short description
 * that left half the section empty, so they now run underneath it as a
 * full-width band inside a card.
 *
 * The description is clamped with CSS, never conditionally rendered, so
 * the full copy is in the DOM for crawlers whether or not the reader
 * expands it.
 *
 * STATS HONESTY: every figure maps to a populated column —
 * `expectedAttendees`, the real speaker count, `expectedStartups`, the
 * real track count, `expectedInvestors`, `expectedCountries`, and a
 * deals figure only when live posts of type `funding` exist. Nulls are
 * dropped rather than defaulted to zero, and the grid is withheld below
 * two figures because one lonely number reads as a mistake.
 */

import { useState } from "react";
import {
  Briefcase,
  ChevronDown,
  Globe2,
  Handshake,
  Layers,
  Mic2,
  Rocket,
  Users,
} from "lucide-react";

import { type UiKey } from "@shared/uiStrings";
import { useT } from "@/lib/i18n";
import { splitFinalClause, type EventRow } from "./eventMeta";
import { RichText } from "./eventFormat";
import { stripHtml } from "@/lib/sanitizeHtml";

type IconCmp = React.ComponentType<{ className?: string; strokeWidth?: number }>;

interface Stat {
  key: string;
  value: number;
  /** Plural form, as a UI-strings key. */
  labelKey: UiKey;
  /** Form used when the figure is exactly one. */
  singularKey: UiKey;
  Icon: IconCmp;
  /** True for counts we hold exactly; those are never rounded. */
  exact?: boolean;
}

export function buildEventStats({
  event,
  speakerCount,
  trackCount,
  dealCount,
}: {
  event: EventRow;
  speakerCount: number;
  trackCount: number;
  dealCount?: number;
}): Stat[] {
  const num = (v: any): number | null => {
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const candidates: Array<Omit<Stat, "value"> & { value: number | null }> = [
    {
      key: "attendees",
      value: num(event.expectedAttendees),
      labelKey: "stats.attendees",
      singularKey: "stats.attendee",
      Icon: Users,
    },
    {
      key: "speakers",
      exact: true,
      value: num(speakerCount),
      labelKey: "stats.speakers",
      singularKey: "stats.speaker",
      Icon: Mic2,
    },
    {
      key: "startups",
      value: num(event.expectedStartups),
      labelKey: "stats.exhibitors",
      singularKey: "stats.exhibitor",
      Icon: Rocket,
    },
    {
      key: "tracks",
      exact: true,
      value: num(trackCount),
      labelKey: "stats.tracks",
      singularKey: "stats.track",
      Icon: Layers,
    },
    {
      key: "investors",
      value: num(event.expectedInvestors),
      labelKey: "stats.investors",
      singularKey: "stats.investor",
      Icon: Briefcase,
    },
    {
      key: "countries",
      value: num(event.expectedCountries),
      labelKey: "stats.countries",
      singularKey: "stats.country",
      Icon: Globe2,
    },
    // Only present once our live coverage has actually logged funding
    // posts for this event — there is no "deals" column to invent from.
    {
      key: "deals",
      exact: true,
      value: num(dealCount),
      labelKey: "stats.dealsAnnounced",
      singularKey: "stats.dealAnnounced",
      Icon: Handshake,
    },
  ];

  return candidates.filter((c): c is Stat => c.value !== null).slice(0, 6);
}

/**
 * Three across, centred, icon above the figure — the arrangement in the
 * design. Laid out on a six-unit grid with each cell spanning two, so a
 * short final row (four or five stats) can be offset into the middle
 * instead of hanging off the left with a hole beside it.
 */
function StatsGrid({ stats }: { stats: Stat[] }) {
  const t = useT();
  const perRow = stats.length >= 3 ? 3 : stats.length;
  const remainder = stats.length % perRow;
  const firstOfLastRow = remainder ? stats.length - remainder : -1;
  // A trailing row of two starts one unit in, a trailing row of one starts
  // two units in — both land centred under the full rows above. Written as
  // whole literals because Tailwind scans source text: a class assembled
  // from a variable is never generated.
  const offsetClass =
    remainder === 2 ? "sm:col-start-2" : remainder === 1 ? "sm:col-start-3" : "";

  return (
    <dl className={`grid ${perRow === 3 ? "grid-cols-2 sm:grid-cols-6" : "grid-cols-2"}`}>
      {stats.map(({ key, value, labelKey, singularKey, Icon, exact }, i) => {
        const inLastRow = firstOfLastRow >= 0 && i >= firstOfLastRow;
        const isLastInRow = (i + 1) % perRow === 0 || i === stats.length - 1;
        return (
          <div
            key={key}
            className={[
              "px-4 py-6 text-center sm:px-5 sm:py-8",
              perRow === 3 ? "sm:col-span-2" : "",
              i === firstOfLastRow ? offsetClass : "",
              isLastInRow ? "" : "border-r border-[var(--border)]",
              inLastRow ? "" : "border-b border-[var(--border)]",
            ].join(" ")}
          >
            <Icon
              className="mx-auto h-7 w-7 text-emerald-600 dark:text-emerald-400"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <dd className="mt-3 text-3xl font-black tabular-nums leading-none text-foreground lg:text-[2.5rem]">
              {exact ? value.toLocaleString() : compactNumber(value)}
            </dd>
            <dt className="mt-2 text-sm text-muted-foreground">
              {t(value === 1 ? singularKey : labelKey)}
            </dt>
          </div>
        );
      })}
    </dl>
  );
}

/**
 * 201,000 -> "201K+", 1,900 -> "1,900". Organiser projections read better
 * abbreviated above 10,000. Stats flagged `exact` — the real speaker,
 * track and deal counts — never come through here, so a number we hold
 * precisely is never restated as an approximation.
 */
function compactNumber(n: number): string {
  if (n >= 1_000_000) return `${Math.round(n / 100_000) / 10}M+`;
  if (n >= 10_000) return `${Math.round(n / 1_000)}K+`;
  return n.toLocaleString();
}

export default function EventOverviewSplit({
  event,
  speakerCount,
  trackCount,
  dealCount,
}: {
  event: EventRow;
  speakerCount: number;
  trackCount: number;
  dealCount?: number;
}) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);

  const stats = buildEventStats({ event, speakerCount, trackCount, dealCount });

  // The editorial headline is the event's own tagline (or its short
  // description when there is no tagline) — never invented copy.
  const headlineSource =
    event.tagline || stripHtml(event.shortDescription || "") || "";
  const [head, tail] = splitFinalClause(headlineSource);

  const body = event.description || event.shortDescription || null;
  const hasStats = stats.length >= 2;

  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
        {t("events.overview")}
      </h2>

      {headlineSource && (
        <p className="mt-5 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-foreground lg:text-4xl">
          {head && <span>{head} </span>}
          <span className="text-emerald-700 dark:text-emerald-400">{tail}</span>
        </p>
      )}

      {body ? (
        <>
          <div
            id={`event-${event.id}-description`}
            className={`mt-6 max-w-3xl ${expanded ? "line-clamp-none" : "line-clamp-5"}`}
          >
            <RichText html={body} className="text-[15px] leading-relaxed" />
          </div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-controls={`event-${event.id}-description`}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
          >
            {expanded ? t("article.readLess") : t("article.readMore")}
            <ChevronDown
              className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
        </>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">
          {t("events.noDescription")}
        </p>
      )}

      {/* The numbers sit UNDER the copy rather than opposite it. Beside a
          short description they left half the section empty; across the
          full width they read as a band and the row divides evenly. */}
      {hasStats && (
        <div
          className="mt-10 rounded-2xl border border-[var(--border)] bg-card"
          aria-label={t("events.byTheNumbers")}
        >
          <StatsGrid stats={stats} />
        </div>
      )}
    </section>
  );
}
