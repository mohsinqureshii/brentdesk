/**
 * EventTabBar — the sticky, underline-style section switcher on the
 * public event page.
 *
 * Why not the shadcn/Radix `Tabs` primitive: Radix unmounts the inactive
 * `TabsContent`, so only the visible panel exists in the document. This
 * page needs every panel in the markup (agenda, speakers, FAQs) whether
 * or not the reader clicks — panels are hidden with the `hidden`
 * attribute, never conditionally rendered.
 *
 * Keyboard contract (WAI-ARIA "tabs with manual activation" — the
 * arrow keys move AND activate, which is fine here because switching a
 * panel is cheap and never navigates):
 *
 *   ← / →   previous / next tab (wraps)
 *   Home    first tab
 *   End     last tab
 *
 * Only the active tab is in the page tab order (roving tabindex), so a
 * keyboard user tabs once to reach the bar and once more to leave it.
 */

import { useRef } from "react";

import { useT } from "@/lib/i18n";

export interface EventTab {
  id: string;
  label: string;
  /** Optional leading glyph (lucide component) — purely decorative. */
  icon?: React.ComponentType<{ className?: string }>;
}

export function tabPanelId(id: string): string {
  return `event-panel-${id}`;
}

export function tabButtonId(id: string): string {
  return `event-tab-${id}`;
}

export default function EventTabBar({
  tabs,
  active,
  onChange,
  className = "",
}: {
  tabs: EventTab[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  const t = useT();
  const listRef = useRef<HTMLDivElement | null>(null);

  const focusTab = (index: number) => {
    const wrapped = (index + tabs.length) % tabs.length;
    const next = tabs[wrapped];
    if (!next) return;
    onChange(next.id);
    const el = listRef.current?.querySelector<HTMLButtonElement>(
      `#${CSS.escape(tabButtonId(next.id))}`,
    );
    el?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.id === active);
    if (i < 0) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      focusTab(i + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusTab(i - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusTab(0);
    } else if (e.key === "End") {
      e.preventDefault();
      focusTab(tabs.length - 1);
    }
  };

  return (
    <div
      className={`sticky top-20 z-30 -mx-1 border-b border-[var(--border)] bg-background/95 px-1 backdrop-blur supports-[backdrop-filter]:bg-background/80 ${className}`}
    >
      <div
        ref={listRef}
        role="tablist"
        aria-label={t("events.sections")}
        onKeyDown={onKeyDown}
        className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab) => {
          const selected = tab.id === active;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              id={tabButtonId(tab.id)}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={tabPanelId(tab.id)}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.id)}
              className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:px-5 ${
                selected
                  ? "border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400"
                  : "border-transparent text-muted-foreground hover:border-[var(--border)] hover:text-foreground"
              }`}
            >
              {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
