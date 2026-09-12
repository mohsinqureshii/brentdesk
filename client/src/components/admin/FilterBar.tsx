import { ReactNode } from "react";
import { Search, X, LayoutGrid, List, Filter as FilterIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * FilterBar — Square-style listing toolbar.
 *
 * One row containing:
 *   - Search input (full width on mobile, fixed on desktop)
 *   - Active filter chips (each with an X to clear)
 *   - "Add filter" button (caller wires the dropdown)
 *   - Right-aligned slot for density/view toggle + bulk actions
 *
 * No state of its own — everything is controlled. The hosting list page
 * owns search query, filter set, and density preference. Reusing this
 * across listings (Articles, Jobs, Companies, etc.) gives the operator
 * one consistent way to slice every table.
 */

export interface FilterChip {
  /** Stable key — used for the X click handler. */
  key: string;
  /** "Category", "Status", etc. */
  label: string;
  /** "Startups", "Published", etc. */
  value: string;
}

export type Density = "comfortable" | "compact";

export interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;

  chips?: FilterChip[];
  onChipRemove?: (key: string) => void;
  onClearAll?: () => void;

  /** Slot for caller-provided "Add filter" dropdown trigger. */
  addFilterAction?: ReactNode;

  density?: Density;
  onDensityChange?: (next: Density) => void;

  /** Right-side actions — bulk actions, export, "+ New", etc. */
  rightSlot?: ReactNode;

  /** Total count to display in the toolbar. */
  totalCount?: number;
}

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  chips = [],
  onChipRemove,
  onClearAll,
  addFilterAction,
  density,
  onDensityChange,
  rightSlot,
  totalCount,
}: FilterBarProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8d8d8d]" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9 h-10 rounded-md bg-white border-[#e0e0e0]"
          />
        </div>
        {addFilterAction && <div className="shrink-0">{addFilterAction}</div>}
        <div className="flex items-center gap-2 shrink-0">
          {density && onDensityChange && (
            <div className="hidden sm:flex border border-[#e0e0e0] rounded-md bg-white p-0.5">
              <button
                aria-label="Comfortable view"
                onClick={() => onDensityChange("comfortable")}
                className={`p-1.5 rounded-md transition-colors ${
                  density === "comfortable" ? "bg-[#f4f4f4] text-[#161616]" : "text-[#8d8d8d] hover:text-[#161616]"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                aria-label="Compact view"
                onClick={() => onDensityChange("compact")}
                className={`p-1.5 rounded-md transition-colors ${
                  density === "compact" ? "bg-[#f4f4f4] text-[#161616]" : "text-[#8d8d8d] hover:text-[#161616]"
                }`}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {rightSlot}
        </div>
      </div>

      {(chips.length > 0 || typeof totalCount === "number") && (
        <div className="flex items-center flex-wrap gap-2">
          {typeof totalCount === "number" && (
            <span className="text-xs text-[#525252] mr-1">
              {totalCount.toLocaleString()} {totalCount === 1 ? "result" : "results"}
            </span>
          )}
          {chips.map((c) => (
            <Badge
              key={c.key}
              variant="secondary"
              className="bg-[#edf5ff] text-emerald-800 border border-[#a6c8ff] gap-1 px-2 py-0.5 text-xs font-normal"
            >
              <span className="text-[#0f62fe]/70">{c.label}:</span>
              <span className="font-medium">{c.value}</span>
              {onChipRemove && (
                <button
                  onClick={() => onChipRemove(c.key)}
                  className="ml-0.5 text-[#0f62fe]/70 hover:text-[#003D99]"
                  aria-label={`Remove ${c.label} filter`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
          {chips.length > 1 && onClearAll && (
            <Button variant="ghost" size="sm" onClick={onClearAll} className="h-6 text-xs text-[#525252]">
              Clear all
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/** Convenience export so callers don't have to re-import the icon. */
export { FilterIcon };
