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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9BA3B0]" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9 h-10 rounded-md bg-white border-[#E0E3E8]"
          />
        </div>
        {addFilterAction && <div className="shrink-0">{addFilterAction}</div>}
        <div className="flex items-center gap-2 shrink-0">
          {density && onDensityChange && (
            <div className="hidden sm:flex border border-[#E0E3E8] rounded-md bg-white p-0.5">
              <button
                aria-label="Comfortable view"
                onClick={() => onDensityChange("comfortable")}
                className={`p-1.5 rounded-md transition-colors ${
                  density === "comfortable" ? "bg-[#F0F2F5] text-[#1A1F36]" : "text-[#9BA3B0] hover:text-[#1A1F36]"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                aria-label="Compact view"
                onClick={() => onDensityChange("compact")}
                className={`p-1.5 rounded-md transition-colors ${
                  density === "compact" ? "bg-[#F0F2F5] text-[#1A1F36]" : "text-[#9BA3B0] hover:text-[#1A1F36]"
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
            <span className="text-xs text-[#697386] mr-1">
              {totalCount.toLocaleString()} {totalCount === 1 ? "result" : "results"}
            </span>
          )}
          {chips.map((c) => (
            <Badge
              key={c.key}
              variant="secondary"
              className="bg-[#F0F7FF] text-emerald-800 border border-[#C7DCFF] gap-1 px-2 py-0.5 text-xs font-normal"
            >
              <span className="text-[#0066FF]/70">{c.label}:</span>
              <span className="font-medium">{c.value}</span>
              {onChipRemove && (
                <button
                  onClick={() => onChipRemove(c.key)}
                  className="ml-0.5 text-[#0066FF]/70 hover:text-[#003D99]"
                  aria-label={`Remove ${c.label} filter`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
          {chips.length > 1 && onClearAll && (
            <Button variant="ghost" size="sm" onClick={onClearAll} className="h-6 text-xs text-[#697386]">
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
