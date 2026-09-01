import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, ChevronDown, Filter, Sparkles, Check } from "lucide-react";
import { useState } from "react";

interface FilterOption {
  label: string;
  value: string;
  count?: number;
  icon?: React.ReactNode;
}

interface FilterGroup {
  title: string;
  key: string;
  options: FilterOption[];
  defaultOpen?: boolean;
  variant?: "checkbox" | "dropdown"; // New: support dropdown variant
}

interface FilterPanelProps {
  groups: FilterGroup[];
  activeFilters: Record<string, string[]>;
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
}

export function FilterPanel({ groups, activeFilters, onFilterChange, onClearFilters }: FilterPanelProps) {
  const totalActiveFilters = Object.values(activeFilters).flat().length;
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    groups.reduce((acc, group) => ({ ...acc, [group.key]: group.defaultOpen !== false }), {})
  );

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderFilterGroup = (group: FilterGroup) => {
    const activeCount = activeFilters[group.key]?.length || 0;
    const isOpen = openGroups[group.key];

    // Dropdown variant for multi-select
    if (group.variant === "dropdown") {
      return (
        <div key={group.key} className="py-2">
          <label className="text-sm font-medium text-foreground mb-2 block">{group.title}</label>
          <div className="relative">
            <Select
              value=""
              onValueChange={(value) => {
                if (value && !activeFilters[group.key]?.includes(value)) {
                  onFilterChange(group.key, value);
                }
              }}
            >
              <SelectTrigger className="w-full h-10 bg-background border border-border rounded-lg">
                <SelectValue placeholder={activeCount > 0 ? `${activeCount} selected` : `Select ${group.title.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border z-50">
                {group.options.map((option) => {
                  const isChecked = activeFilters[group.key]?.includes(option.value) || false;
                  return (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 border rounded flex items-center justify-center ${isChecked ? 'bg-foreground border-foreground' : 'border-muted-foreground'}`}>
                          {isChecked && <Check className="w-3 h-3 text-background" />}
                        </div>
                        <span>{option.label}</span>
                        {option.count !== undefined && (
                          <span className="text-xs text-muted-foreground ml-auto">({option.count})</span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {/* Show selected items as chips */}
            {activeCount > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {activeFilters[group.key]?.map((value) => {
                  const option = group.options.find(o => o.value === value);
                  return (
                    <Badge 
                      key={value}
                      variant="secondary" 
                      className="text-xs gap-1 bg-foreground text-background hover:bg-foreground/90 cursor-pointer"
                      onClick={() => onFilterChange(group.key, value)}
                    >
                      {option?.label || value}
                      <X className="w-3 h-3" />
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Default checkbox variant
    return (
      <Collapsible 
        key={group.key} 
        open={isOpen}
        onOpenChange={() => toggleGroup(group.key)}
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors group">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{group.title}</span>
            {activeCount > 0 && (
              <Badge 
                variant="secondary" 
                className="h-5 min-w-[20px] px-1.5 text-[10px] font-semibold bg-foreground text-background"
              >
                {activeCount}
              </Badge>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-1 pb-2">
          <div className="space-y-1 pl-1">
            {group.options.map((option) => {
              const isChecked = activeFilters[group.key]?.includes(option.value) || false;
              return (
                <div 
                  key={option.value} 
                  className={`flex items-center gap-3 py-2 px-3 rounded-lg cursor-pointer transition-all ${
                    isChecked 
                      ? 'bg-foreground/5 border border-foreground/10' 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => onFilterChange(group.key, option.value)}
                >
                  <Checkbox
                    id={`${group.key}-${option.value}`}
                    checked={isChecked}
                    onCheckedChange={() => onFilterChange(group.key, option.value)}
                    className="data-[state=checked]:bg-foreground data-[state=checked]:border-foreground"
                  />
                  {option.icon && (
                    <span className="text-muted-foreground">{option.icon}</span>
                  )}
                  <Label 
                    htmlFor={`${group.key}-${option.value}`}
                    className="text-sm text-muted-foreground cursor-pointer flex-grow flex items-center justify-between"
                  >
                    <span className={isChecked ? 'text-foreground font-medium' : ''}>{option.label}</span>
                    {option.count !== undefined && (
                      <span className="text-xs text-muted-foreground/60 tabular-nums">
                        {option.count}
                      </span>
                    )}
                  </Label>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
            <Filter className="w-4 h-4 text-background" />
          </div>
          <h3 className="font-semibold text-foreground">Filters</h3>
        </div>
        {totalActiveFilters > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClearFilters}
            className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2"
          >
            Clear ({totalActiveFilters})
          </Button>
        )}
      </div>

      {/* Filter Groups */}
      <div className="space-y-2">
        {groups.map((group) => renderFilterGroup(group))}
      </div>

      {/* Quick Filters Promo */}
      {totalActiveFilters === 0 && (
        <div className="mt-6 p-4 rounded-xl bg-muted/50 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Popular Filters</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {groups[0]?.options.slice(0, 3).map((option) => (
              <Badge 
                key={option.value}
                variant="outline" 
                className="cursor-pointer text-xs hover:bg-foreground hover:text-background transition-colors"
                onClick={() => onFilterChange(groups[0].key, option.value)}
              >
                {option.label}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Active filter tags component
export function ActiveFilterTags({ 
  activeFilters, 
  onRemove 
}: { 
  activeFilters: Record<string, string[]>; 
  onRemove: (key: string, value: string) => void;
}) {
  const allFilters = Object.entries(activeFilters).flatMap(([key, values]) =>
    values.map((value) => ({ key, value }))
  );

  if (allFilters.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {allFilters.map(({ key, value }) => (
        <Button
          key={`${key}-${value}`}
          variant="secondary"
          size="sm"
          className="h-8 gap-1.5 text-xs bg-foreground text-background hover:bg-foreground/90 rounded-full px-3"
          onClick={() => onRemove(key, value)}
        >
          {value}
          <X className="w-3 h-3" />
        </Button>
      ))}
    </div>
  );
}

// Category chips component (like the screenshot - horizontal scrollable)
export function CategoryChips({
  categories,
  activeCategory,
  onSelect,
}: {
  categories: { label: string; value: string; count?: number; icon?: React.ReactNode }[];
  activeCategory: string | null;
  onSelect: (value: string | null) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {categories.map((cat) => (
        <button
          key={cat.value}
          onClick={() => onSelect(activeCategory === cat.value ? null : cat.value)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full border whitespace-nowrap transition-all ${
            activeCategory === cat.value
              ? 'bg-foreground text-background border-foreground'
              : 'bg-background text-foreground border-border hover:border-foreground/30'
          }`}
        >
          {cat.icon && <span className="text-sm">{cat.icon}</span>}
          <span className="text-sm font-medium">{cat.label}</span>
          {cat.count !== undefined && (
            <span className={`text-xs ${activeCategory === cat.value ? 'text-background/70' : 'text-muted-foreground'}`}>
              {cat.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// Tab filter component
export function TabFilter({
  tabs,
  activeTab,
  onSelect,
}: {
  tabs: { label: string; value: string; count?: number }[];
  activeTab: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="flex border-b border-border">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onSelect(tab.value)}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === tab.value
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="text-xs">({tab.count})</span>
          )}
        </button>
      ))}
    </div>
  );
}

// Back to Resources navigation component
export function BackToResources() {
  return (
    <a 
      href="/resources" 
      className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium transition-colors mb-4"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      Back to Resources
    </a>
  );
}