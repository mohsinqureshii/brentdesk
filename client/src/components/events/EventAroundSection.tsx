/**
 * EventAroundSection — "AROUND {EVENT}", a 4-up row of image cards.
 *
 * The cards are built from whatever real satellite content the event
 * has, in this order: approved side events (`events.getSideEvents`),
 * programme tracks (`events.getTracks`), then editor-written highlights
 * (`events.getHighlights`). Fewer than four cards is fine; zero cards
 * means the section does not render at all. No category is invented to
 * fill a slot.
 *
 * Side events are the only source with their own photography, so the
 * rest fall back to the deterministic gradient tile.
 */

import { ArrowRight } from "lucide-react";

import { stripHtml } from "@/lib/sanitizeHtml";
import { useT } from "@/lib/i18n";
import { EventFallbackTile, isUsableImage } from "./EventVisual";
import { type EventRow } from "./eventMeta";

interface AroundCard {
  key: string;
  label: string;
  description: string | null;
  image: string | null;
  seed: string;
  tab: string | null;
}

export function buildAroundCards({
  event,
  sideEvents,
  tracks,
  highlights,
}: {
  event: EventRow;
  sideEvents: any[];
  tracks: any[];
  highlights: any[];
}): AroundCard[] {
  const cards: AroundCard[] = [];

  for (const s of sideEvents || []) {
    if (!s?.name) continue;
    cards.push({
      key: `side-${s.id}`,
      label: String(s.name),
      description: s.description ? stripHtml(String(s.description)) : null,
      image: isUsableImage(s.imageUrl) ? String(s.imageUrl) : null,
      seed: `${event.slug}-side-${s.id}`,
      tab: "side-events",
    });
  }

  for (const t of tracks || []) {
    if (!t?.name) continue;
    cards.push({
      key: `track-${t.id}`,
      label: String(t.name),
      description: t.description ? stripHtml(String(t.description)) : null,
      image: null,
      seed: `${event.slug}-track-${t.id}`,
      tab: "agenda",
    });
  }

  for (const h of highlights || []) {
    if (!h?.title) continue;
    cards.push({
      key: `highlight-${h.id}`,
      label: String(h.title),
      description: h.description ? stripHtml(String(h.description)) : null,
      image: null,
      seed: `${event.slug}-highlight-${h.id}`,
      tab: null,
    });
  }

  return cards.slice(0, 4);
}

export default function EventAroundSection({
  event,
  sideEvents,
  tracks,
  highlights,
  onSelectTab,
}: {
  event: EventRow;
  sideEvents: any[];
  tracks: any[];
  highlights: any[];
  onSelectTab: (id: string, scroll?: boolean) => void;
}) {
  const t = useT();
  const cards = buildAroundCards({ event, sideEvents, tracks, highlights });
  if (cards.length === 0) return null;

  const exploreTab = cards.find((c) => c.tab)?.tab || null;

  return (
    <section aria-label={t("events.aroundEvent", { title: event.title })}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
          {t("events.aroundEvent", { title: event.title })}
        </h2>
        {exploreTab && (
          <button
            type="button"
            onClick={() => onSelectTab(exploreTab, true)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-emerald-700 dark:hover:text-emerald-400"
          >
            {t("events.exploreAll")}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      <ul className="-mx-1 mt-8 flex snap-x gap-5 overflow-x-auto px-1 pb-2 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-4">
        {cards.map((card) => {
          const inner = (
            <>
              <span className="absolute inset-0">
                {card.image ? (
                  <img
                    src={card.image}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                  />
                ) : (
                  <EventFallbackTile
                    title={card.label}
                    slug={card.seed}
                    type={event.type}
                    variant="compact"
                    interactive
                  />
                )}
              </span>
              <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
              <span className="relative flex h-full flex-col justify-end p-4">
                <span className="line-clamp-1 text-base font-bold leading-snug text-white">
                  {card.label}
                </span>
                {card.description && (
                  <span className="mt-1 line-clamp-2 text-[13px] leading-snug text-white/75">
                    {card.description}
                  </span>
                )}
              </span>
            </>
          );

          return (
            <li
              key={card.key}
              className="w-72 shrink-0 snap-start md:w-auto md:shrink"
            >
              {card.tab ? (
                <button
                  type="button"
                  onClick={() => onSelectTab(card.tab as string, true)}
                  className="group relative block h-40 w-full overflow-hidden rounded-xl border border-[var(--border)] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 lg:h-44"
                >
                  {inner}
                </button>
              ) : (
                <div className="group relative block h-40 w-full overflow-hidden rounded-xl border border-[var(--border)] lg:h-44">
                  {inner}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
