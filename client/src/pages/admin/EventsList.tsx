/**
 * Events List Page
 * Admin management for events
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { AdvancedPagination } from "@/components/admin/AdvancedPagination";
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Calendar,
  MapPin,
  Users,
  Video,
  Clock,
  Loader2,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  FileX,
  Image as ImageIcon,
  Sparkles,
  X,
} from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { exportToCSV, eventExportColumns } from "@/lib/exportUtils";

const typeLabels: Record<string, { label: string; color: string }> = {
  conference: { label: "Conference", color: "bg-blue-100 text-blue-600" },
  meetup: { label: "Meetup", color: "bg-green-100 text-green-600" },
  webinar: { label: "Webinar", color: "bg-purple-100 text-purple-600" },
  workshop: { label: "Workshop", color: "bg-orange-100 text-orange-600" },
  hackathon: { label: "Hackathon", color: "bg-red-100 text-red-600" },
  summit: { label: "Summit", color: "bg-indigo-100 text-indigo-600" },
  other: { label: "Other", color: "bg-[#F0F2F5] text-[#697386]" },
};

const formatLabels: Record<string, { label: string; icon: React.ElementType }> = {
  in_person: { label: "In-Person", icon: MapPin },
  virtual: { label: "Virtual", icon: Video },
  hybrid: { label: "Hybrid", icon: Users },
};

const statusColors: Record<string, string> = {
  draft: "bg-[#F0F2F5] text-[#697386]",
  published: "bg-green-100 text-green-600",
  cancelled: "bg-red-100 text-red-600",
  completed: "bg-blue-100 text-blue-600",
};

/**
 * Column classes live in one place so the <TableHead> and the matching
 * <TableCell> can never drift apart — a previous version of this table
 * had the header and the body hidden at different breakpoints, which
 * shifted every cell one column to the left on small screens.
 *
 * Widths are fixed pixels, not percentages: percentages can never
 * overflow their container, so the table could never be scrolled
 * sideways — it just squeezed every column until it was unreadable.
 * With real widths the table overflows and TABLE_MIN_W below gives the
 * scroll container something to scroll.
 *
 * Hiding order (least important first): Side events/Registrations (xl)
 * → Days/Sector/Tickets (lg) → To/Type/City (md) → select/When (sm).
 * Event, From, Status and the row menu are always visible; everything
 * hidden below xl is reachable by scrolling once xl is available.
 */
const COL = {
  select: "w-10 hidden sm:table-cell",
  event: "w-[260px]",
  when: "w-[96px] hidden sm:table-cell",
  from: "w-[120px]",
  to: "w-[120px] hidden md:table-cell",
  days: "w-[64px] hidden lg:table-cell text-right",
  type: "w-[132px] hidden md:table-cell",
  city: "w-[132px] hidden md:table-cell",
  sector: "w-[180px] hidden lg:table-cell",
  tickets: "w-[84px] hidden lg:table-cell",
  sideEvents: "w-[96px] hidden xl:table-cell",
  registrations: "w-[96px] hidden xl:table-cell",
  status: "w-[112px]",
  actions: "w-[52px]",
} as const;

/**
 * Floor width per breakpoint = the sum of the columns visible there.
 * Below the floor the wrapper scrolls horizontally instead of crushing
 * the columns; above it `w-full` lets them share the extra space.
 */
const TABLE_MIN_W =
  "min-w-[560px] sm:min-w-[700px] md:min-w-[1060px] lg:min-w-[1390px] xl:min-w-[1580px]";

const PAGE_SIZE_KEY = "brentdesk_events_page_size";

type Timeframe = "upcoming" | "past" | "all";
type TicketsFilter = "any" | "yes" | "no";
type Phase = "upcoming" | "live" | "past";

/**
 * Live is deliberately the loudest of the three — it's the one state an
 * editor may need to act on right now, and it has to be unmistakably
 * different from "upcoming" at a glance.
 */
const phaseStyles: Record<Phase, string> = {
  upcoming: "bg-blue-50 text-blue-700 border border-blue-100",
  live: "bg-red-600 text-white border border-red-600 uppercase tracking-wide shadow-sm",
  past: "bg-[#F0F2F5] text-[#697386] border border-[#E0E3E8]",
};

/**
 * MySQL hands these back as "YYYY-MM-DD HH:MM:SS" strings (the events
 * table uses drizzle's `timestamp({ mode: 'string' })`). That shape is
 * NOT a valid ISO date-time: Chrome parses it as local time, Safari
 * returns Invalid Date. Normalise the separator so every browser reads
 * the same instant, and pin bare dates to local midnight rather than
 * letting them be read as UTC (which shifts the day either side of the
 * date line and mislabelled events by one day).
 */
const toDate = (value: string | Date | null | undefined): Date | null => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const raw = String(value).trim();
  if (!raw) return null;
  // "2026-08-15 09:00:00" → "2026-08-15T09:00:00"
  const withT = raw.includes(" ") ? raw.replace(" ", "T") : raw;
  // "2026-08-15" → "2026-08-15T00:00:00" (local, not UTC)
  const normalised = /^\d{4}-\d{2}-\d{2}$/.test(withT) ? `${withT}T00:00:00` : withT;
  const d = new Date(normalised);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** "31 Aug 2026" — one line, fixed shape, so the column stays aligned. */
const formatDay = (date: Date | null): string | null => {
  if (!date) return null;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

/** Inclusive duration in whole days: 31 Aug → 3 Sep is 4 days. */
const durationDays = (start: Date | null, end: Date | null): number | null => {
  if (!start) return null;
  if (!end) return 1;
  const a = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const b = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  const diff = Math.round((b - a) / 86_400_000);
  return diff >= 0 ? diff + 1 : 1;
};

/** Local midnight has no time component — our marker for an all-day date. */
const isAllDayValue = (d: Date): boolean =>
  d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0 && d.getMilliseconds() === 0;

/**
 * The instant an event is actually over: the end date, or the start
 * date when there's no end — mirroring the server's
 * COALESCE(end_date, start_date) used by timeframe=upcoming/past, so a
 * row can never be labelled Live while sitting in the Past bucket.
 *
 * Only all-day values (stored at 00:00:00, i.e. no time of day) are
 * stretched to the end of that day. A value carrying a real time means
 * exactly that time — stretching those to midnight is what kept
 * finished events showing as Live for the rest of the day.
 */
const eventEndsAt = (start: Date, end: Date | null): number => {
  const last = end ?? start;
  if (!isAllDayValue(last)) return last.getTime();
  return new Date(
    last.getFullYear(),
    last.getMonth(),
    last.getDate(),
    23,
    59,
    59,
    999,
  ).getTime();
};

/**
 * Where the event sits relative to now. Derived purely from the dates —
 * deliberately separate from the editorial (draft/published) workflow
 * status, which answers a different question.
 *
 * Live counts as not-yet-finished, so it belongs in the Upcoming
 * timeframe (the server agrees: `COALESCE(end,start) >= NOW()`).
 */
const getPhase = (start: Date | null, end: Date | null): Phase | null => {
  if (!start) return null;
  const now = Date.now();
  if (now < start.getTime()) return "upcoming";
  return now <= eventEndsAt(start, end) ? "live" : "past";
};

export default function EventsList() {
  const [, navigate] = useLocation();
  const searchParams = useSearch();

  // Parse URL params
  const urlParams = new URLSearchParams(searchParams);
  const initialPage = parseInt(urlParams.get("page") || "1", 10);
  const initialSearch = urlParams.get("search") || "";
  const initialType = urlParams.get("type") || "all";
  const initialFormat = urlParams.get("format") || "all";
  const initialSector = urlParams.get("sector") || "all";
  const initialCity = urlParams.get("city") || "";
  const initialTickets = (urlParams.get("tickets") || "any") as TicketsFilter;
  // Editors nearly always want what's coming up, so that's the default.
  const initialTimeframe = (urlParams.get("timeframe") || "upcoming") as Timeframe;
  const initialSortBy = (urlParams.get("sortBy") || "startDate") as "startDate" | "name" | "registrations" | "status";
  const initialSortOrder = (urlParams.get("sortOrder") || "desc") as "asc" | "desc";
  const initialPageSize = parseInt(localStorage.getItem(PAGE_SIZE_KEY) || "25", 10);

  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const utils = trpc.useUtils();

  // ---- Saudi 2026 event seeding (dataset ships with the image) ----
  const [seedOpen, setSeedOpen] = useState(false);
  // Queried on mount (not just when the dialog opens) so the button can
  // disappear for good once there's nothing left to seed.
  const seedPreview = trpc.adminEventSeed.preview.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  // Creates a People profile for every speaker that lacks one, so every
  // speaker name on a public event page is a working profile link.
  const linkSpeakers = trpc.adminEventSeed.backfillSpeakerPeople.useMutation({
    onSuccess: (r: any) => {
      if (r.linked > 0) {
        toast.success(
          `Linked ${r.linked} speaker${r.linked === 1 ? "" : "s"}` +
            (r.created ? ` — ${r.created} new profile${r.created === 1 ? "" : "s"} created` : ""),
        );
      } else {
        toast.info("Every speaker already has a profile");
      }
      if (r.failures?.length) {
        toast.warning(`${r.failures.length} could not be linked — see logs`);
      }
      utils.events.adminList.invalidate();
    },
    onError: (err: any) => toast.error(err.message || "Linking failed"),
  });

  // Fetches free-licensed photography for events with no image, 25 at a
  // time. Never overwrites an editor's image.
  const sourceImages = trpc.adminEventSeed.sourceEventImages.useMutation({
    onSuccess: (r: any) => {
      if (r.updated > 0) {
        toast.success(`Added photos to ${r.updated} event${r.updated === 1 ? "" : "s"}`);
      } else {
        toast.warning(
          r.failures?.[0]?.reason
            ? `No photos added — ${r.failures[0].reason}`
            : "No photos added",
        );
      }
      utils.events.adminList.invalidate();
      refetch();
    },
    onError: (err: any) => toast.error(err.message || "Photo sourcing failed"),
  });

  const seedRun = trpc.adminEventSeed.run.useMutation({
    onSuccess: (r: any) => {
      toast.success(
        `Seed complete — ${r.insertedCount} added, ${r.enrichedCount} enriched, ${r.skippedCount} unchanged` +
          (r.errorCount ? `, ${r.errorCount} failed` : ""),
      );
      setSeedOpen(false);
      utils.events.adminList.invalidate();
      // Re-check the dataset so the button hides once we're done.
      utils.adminEventSeed.preview.invalidate();
      refetch();
    },
    onError: (err: any) => toast.error(err.message || "Seeding failed"),
  });

  const seedData = seedPreview.data as
    | { datasetCount: number; existingEventCount: number; wouldInsert: number; wouldEnrich: number }
    | undefined;
  // Don't render at all while loading — a button that appears then
  // vanishes is worse than one that shows up 200ms late.
  const showSeedButton = !!seedData && (seedData.wouldInsert > 0 || seedData.wouldEnrich > 0);

  const [selectedEvents, setSelectedEvents] = useState<number[]>([]);
  const [typeFilter, setTypeFilter] = useState(initialType);
  const [formatFilter, setFormatFilter] = useState(initialFormat);
  const [sectorFilter, setSectorFilter] = useState(initialSector);
  const [timeframe, setTimeframe] = useState<Timeframe>(initialTimeframe);
  const [ticketsFilter, setTicketsFilter] = useState<TicketsFilter>(initialTickets);
  const [city, setCity] = useState(initialCity);
  const [debouncedCity, setDebouncedCity] = useState(initialCity);
  const [sortBy, setSortBy] = useState<"startDate" | "name" | "registrations" | "status">(initialSortBy);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(initialSortOrder);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [isExporting, setIsExporting] = useState(false);

  // Sectors for the filter dropdown
  const sectorsQuery = trpc.events.listSectors.useQuery(undefined, {
    staleTime: 10 * 60 * 1000,
  });
  const sectorOptions = (sectorsQuery.data as Array<{ id: number; name: string; slug: string }> | undefined) || [];

  // Debounce the free-text inputs. The `mounted` refs keep the very first
  // run from resetting a page number restored from the URL.
  const searchMounted = useRef(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      if (searchMounted.current) setPage(1);
      searchMounted.current = true;
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const cityMounted = useRef(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCity(city);
      if (cityMounted.current) setPage(1);
      cityMounted.current = true;
    }, 300);
    return () => clearTimeout(timer);
  }, [city]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", page.toString());
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (formatFilter !== "all") params.set("format", formatFilter);
    if (sectorFilter !== "all") params.set("sector", sectorFilter);
    if (timeframe !== "upcoming") params.set("timeframe", timeframe);
    if (ticketsFilter !== "any") params.set("tickets", ticketsFilter);
    if (debouncedCity) params.set("city", debouncedCity);
    if (sortBy !== "startDate") params.set("sortBy", sortBy);
    if (sortOrder !== "desc") params.set("sortOrder", sortOrder);

    const newUrl = params.toString() ? `/admin/events?${params.toString()}` : "/admin/events";
    window.history.replaceState({}, "", newUrl);
  }, [page, debouncedSearch, typeFilter, formatFilter, sectorFilter, timeframe, ticketsFilter, debouncedCity, sortBy, sortOrder]);

  // Handle column sort click
  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
    setPage(1);
  };

  // Persist page size
  useEffect(() => {
    localStorage.setItem(PAGE_SIZE_KEY, pageSize.toString());
  }, [pageSize]);

  // Any filter change goes back to page 1 — page 4 of the old result set
  // is meaningless against the new one.
  const applyFilter = (fn: () => void) => {
    fn();
    setPage(1);
    setSelectedEvents([]);
  };

  const activeFilterCount =
    (debouncedSearch ? 1 : 0) +
    (typeFilter !== "all" ? 1 : 0) +
    (formatFilter !== "all" ? 1 : 0) +
    (sectorFilter !== "all" ? 1 : 0) +
    (timeframe !== "upcoming" ? 1 : 0) +
    (ticketsFilter !== "any" ? 1 : 0) +
    (debouncedCity ? 1 : 0);

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setTypeFilter("all");
    setFormatFilter("all");
    setSectorFilter("all");
    setTimeframe("upcoming");
    setTicketsFilter("any");
    setCity("");
    setDebouncedCity("");
    setPage(1);
    setSelectedEvents([]);
  };

  // Fetch events from API with server-side search + filtering
  const { data, isLoading, error, refetch } = trpc.events.adminList.useQuery({
    page,
    limit: pageSize,
    search: debouncedSearch || undefined,
    type: typeFilter !== "all" ? (typeFilter as any) : undefined,
    format: formatFilter !== "all" ? (formatFilter as any) : undefined,
    sectorId: sectorFilter !== "all" ? Number(sectorFilter) : undefined,
    city: debouncedCity || undefined,
    timeframe,
    hasTickets: ticketsFilter === "any" ? undefined : ticketsFilter === "yes",
    sortBy,
    sortOrder,
  });

  // Delete mutation
  const deleteMutation = trpc.events.delete.useMutation({
    onSuccess: () => {
      toast.success("Event deleted successfully");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete event");
    },
  });

  const events = data?.items || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const toggleEvent = (id: number) => {
    setSelectedEvents((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  // Bulk operations
  const bulkStatusMutation = trpc.events.bulkUpdateStatus.useMutation({
    onSuccess: () => { utils.events.adminList.invalidate(); setSelectedEvents([]); },
  });
  const bulkDeleteMutation = trpc.events.bulkDelete.useMutation({
    onSuccess: () => { utils.events.adminList.invalidate(); setSelectedEvents([]); },
  });

  const toggleAll = () => {
    if (selectedEvents.length === events.length) {
      setSelectedEvents([]);
    } else {
      setSelectedEvents(events.map((e: any) => e.id));
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this event?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setSelectedEvents([]);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
    setSelectedEvents([]);
  };

  // Export query
  const exportQuery = trpc.events.exportList.useQuery(
    {
      search: debouncedSearch || undefined,
      type: typeFilter !== "all" ? (typeFilter as any) : undefined,
      format: formatFilter !== "all" ? (formatFilter as any) : undefined,
      sectorId: sectorFilter !== "all" ? Number(sectorFilter) : undefined,
      city: debouncedCity || undefined,
    },
    { enabled: false }
  );

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportQuery.refetch();
      if (result.data?.items) {
        exportToCSV(result.data.items as any, eventExportColumns as any, `events_export_${new Date().toISOString().split("T")[0]}`);
        toast.success(`Exported ${result.data.items.length} events`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to export events");
    } finally {
      setIsExporting(false);
    }
  };

  // Calculate stats
  const { upcomingCount, totalRegistrations, totalViews } = useMemo(() => {
    let upcoming = 0;
    let registrations = 0;
    let views = 0;
    for (const e of (data?.items || []) as any[]) {
      const phase = getPhase(toDate(e.startDate), toDate(e.endDate));
      if (phase === "upcoming" || phase === "live") upcoming += 1;
      registrations += e.registrationCount || 0;
      views += e.viewCount || 0;
    }
    return { upcomingCount: upcoming, totalRegistrations: registrations, totalViews: views };
  }, [data]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[#1A1F36]">Events</h1>
            <p className="text-[#697386] mt-0.5 text-[13px]">
              Manage conferences, meetups, webinars, and workshops
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export CSV
            </Button>
            {/* Only offered while the dataset still has something to add
                or enrich — once seeding is done the button is gone. */}
            <Button
              variant="outline"
              disabled={linkSpeakers.isPending}
              onClick={() => linkSpeakers.mutate({ apply: true })}
              title="Create and link a People profile for every event speaker that has none"
            >
              {linkSpeakers.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Users className="h-4 w-4 mr-2" />
              )}
              Link speakers
            </Button>
            <Button
              variant="outline"
              disabled={sourceImages.isPending}
              onClick={() => sourceImages.mutate({ limit: 25, onlyMissing: true })}
              title="Find a free-licensed photo for events that have none (25 at a time)"
            >
              {sourceImages.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ImageIcon className="h-4 w-4 mr-2" />
              )}
              Source photos
            </Button>
            {showSeedButton && (
              <Button variant="outline" onClick={() => setSeedOpen(true)}>
                <Sparkles className="h-4 w-4 mr-2" />
                Seed Saudi 2026
              </Button>
            )}
            <Link href="/admin/events/new">
              <Button className="bg-[#0066FF] hover:bg-[#0052CC]">
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-blue-100">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-[#697386]">Total Events</p>
                  <p className="text-xl font-semibold text-[#1A1F36]">{total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-green-100">
                  <Clock className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-[#697386]">Upcoming</p>
                  <p className="text-xl font-semibold text-[#1A1F36]">{upcomingCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-purple-100">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-[#697386]">Registrations</p>
                  <p className="text-xl font-semibold text-[#1A1F36]">{totalRegistrations.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-orange-100">
                  <Eye className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-[#697386]">Total Views</p>
                  <p className="text-xl font-semibold text-[#1A1F36]">{totalViews.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and table */}
        <Card>
          <CardHeader>
            {/*
              One row on md+ — the whole toolbar reads left to right:
              search (grows) → Timeframe → Sector → Type → Format → City
              → Tickets → Clear. `flex-nowrap` keeps it on one line and
              `overflow-x-auto` lets a narrow desktop window scroll the
              toolbar instead of wrapping it onto a second row. Below md
              it wraps, which is the right behaviour on a phone.
            */}
            <div className="flex flex-wrap md:flex-nowrap md:overflow-x-auto items-center gap-2 pb-0.5">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9BA3B0]" />
                <Input
                  placeholder="Search events, city, venue, organiser…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 pl-9 pr-8"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[#F0F2F5] text-[#9BA3B0]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <Select
                value={timeframe}
                onValueChange={(v) => applyFilter(() => setTimeframe(v as Timeframe))}
              >
                <SelectTrigger
                  aria-label="Timeframe"
                  title="Upcoming includes events happening right now"
                  className="h-9 w-[130px] shrink-0"
                >
                  <SelectValue placeholder="Timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="past">Past</SelectItem>
                  <SelectItem value="all">All dates</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={sectorFilter}
                onValueChange={(v) => applyFilter(() => setSectorFilter(v))}
              >
                <SelectTrigger aria-label="Sector" className="h-9 w-[140px] shrink-0">
                  <SelectValue placeholder="Sector" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sectors</SelectItem>
                  {sectorOptions.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={typeFilter}
                onValueChange={(v) => applyFilter(() => setTypeFilter(v))}
              >
                <SelectTrigger aria-label="Type" className="h-9 w-[130px] shrink-0">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="conference">Conference</SelectItem>
                  <SelectItem value="summit">Summit</SelectItem>
                  <SelectItem value="meetup">Meetup</SelectItem>
                  <SelectItem value="webinar">Webinar</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="hackathon">Hackathon</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={formatFilter}
                onValueChange={(v) => applyFilter(() => setFormatFilter(v))}
              >
                <SelectTrigger aria-label="Format" className="h-9 w-[130px] shrink-0">
                  <SelectValue placeholder="Format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Formats</SelectItem>
                  <SelectItem value="in_person">In-Person</SelectItem>
                  <SelectItem value="virtual">Virtual</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative w-[130px] shrink-0">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9BA3B0]" />
                <Input
                  placeholder="City"
                  aria-label="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-9 pl-9"
                />
              </div>

              <Select
                value={ticketsFilter}
                onValueChange={(v) => applyFilter(() => setTicketsFilter(v as TicketsFilter))}
              >
                <SelectTrigger aria-label="Tickets" className="h-9 w-[130px] shrink-0">
                  <SelectValue placeholder="Tickets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any tickets</SelectItem>
                  <SelectItem value="yes">Has tickets</SelectItem>
                  <SelectItem value="no">No tickets</SelectItem>
                </SelectContent>
              </Select>

              {/* The count rides on the Clear button so the toolbar stays
                  one row; disabled (not hidden) when nothing is set, so
                  the row never reflows as filters come and go. */}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                disabled={activeFilterCount === 0}
                title={
                  activeFilterCount > 0
                    ? `${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} active — clear them`
                    : "Showing upcoming events by default"
                }
                className="h-9 shrink-0 px-2 text-[#697386]"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
                {activeFilterCount > 0 && (
                  <Badge className="ml-1.5 h-5 min-w-5 justify-center bg-blue-100 px-1.5 text-blue-600">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {selectedEvents.length > 0 && (
              <div className="flex items-center gap-4 mb-4 p-3 bg-[#F7F8FA] rounded-md">
                <span className="text-sm font-medium text-[#1A1F36]">
                  {selectedEvents.length} selected
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={bulkStatusMutation.isPending}
                    onClick={() =>
                      bulkStatusMutation.mutate({ ids: selectedEvents, statusSlug: "published" })
                    }
                  >
                    Publish
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={bulkStatusMutation.isPending}
                    onClick={() =>
                      bulkStatusMutation.mutate({ ids: selectedEvents, statusSlug: "draft" })
                    }
                  >
                    Move to Draft
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600"
                    disabled={bulkDeleteMutation.isPending}
                    onClick={() => {
                      if (confirm(`Delete ${selectedEvents.length} event(s)? This cannot be undone.`)) {
                        bulkDeleteMutation.mutate({ ids: selectedEvents });
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#0066FF]" />
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12 text-red-600">
                Error loading events: {error.message}
              </div>
            ) : events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-[#697386]">
                <Calendar className="h-12 w-12 mb-4 text-[#C8CDD6]" />
                <p className="text-lg font-medium">No events found</p>
                <p className="text-sm">
                  {activeFilterCount > 0
                    ? "Try adjusting your search or filters"
                    : "Add your first event to get started"}
                </p>
                {activeFilterCount > 0 ? (
                  <Button variant="outline" className="mt-4" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Clear filters
                  </Button>
                ) : (
                  <Link href="/admin/events/new">
                    <Button className="mt-4 bg-[#0066FF] hover:bg-[#0052CC]">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Event
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <>
                {/*
                  Full-bleed scroll strip: the negative margin cancels
                  CardContent's px-5 so the scrollable area runs edge to
                  edge, and the table below carries a per-breakpoint
                  min-width so there is genuinely something to scroll to
                  instead of the columns being crushed to fit. Height is
                  auto, so the page keeps scrolling vertically as normal
                  and nothing here traps the wheel.
                */}
                <div className="-mx-5 overflow-x-auto">
                <Table className={`w-full table-fixed ${TABLE_MIN_W}`}>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={COL.select}>
                        <Checkbox
                          checked={selectedEvents.length === events.length && events.length > 0}
                          onCheckedChange={toggleAll}
                        />
                      </TableHead>
                      <TableHead className={COL.event}>
                        <button onClick={() => handleSort("name")} className="flex items-center gap-1 hover:text-[#0066FF] transition-colors">
                          Event
                          {sortBy === "name" ? (sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 text-[#9BA3B0]" />}
                        </button>
                      </TableHead>
                      <TableHead className={COL.when}>When</TableHead>
                      <TableHead className={COL.from}>
                        <button onClick={() => handleSort("startDate")} className="flex items-center gap-1 hover:text-[#0066FF] transition-colors">
                          From
                          {sortBy === "startDate" ? (sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 text-[#9BA3B0]" />}
                        </button>
                      </TableHead>
                      <TableHead className={COL.to}>To</TableHead>
                      <TableHead className={COL.days}>Days</TableHead>
                      <TableHead className={COL.type}>Type</TableHead>
                      <TableHead className={COL.city}>City</TableHead>
                      <TableHead className={COL.sector}>Sector</TableHead>
                      <TableHead className={COL.tickets}>Tickets</TableHead>
                      <TableHead className={COL.sideEvents}>Side events</TableHead>
                      <TableHead className={COL.registrations}>
                        <button onClick={() => handleSort("registrations")} className="flex items-center gap-1 hover:text-[#0066FF] transition-colors">
                          Regs
                          {sortBy === "registrations" ? (sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 text-[#9BA3B0]" />}
                        </button>
                      </TableHead>
                      <TableHead className={COL.status}>
                        <button onClick={() => handleSort("status")} className="flex items-center gap-1 hover:text-[#0066FF] transition-colors">
                          Status
                          {sortBy === "status" ? (sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 text-[#9BA3B0]" />}
                        </button>
                      </TableHead>
                      <TableHead className={COL.actions}></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event: any) => {
                      const eventType = event.type || event.eventType;
                      const typeInfo = typeLabels[eventType] || { label: eventType || "Event", color: "bg-[#F0F2F5] text-[#697386]" };
                      const formatInfo = formatLabels[event.format] || { label: event.format || "TBD", icon: MapPin };
                      const FormatIcon = formatInfo.icon;
                      const organizer = event.organizerName || event.organizer;
                      const start = toDate(event.startDate);
                      const end = toDate(event.endDate);
                      const phase = getPhase(start, end);
                      const days = durationDays(start, end);
                      const eventSectors: Array<{ id: number; name: string; slug?: string }> =
                        Array.isArray(event.sectors) ? event.sectors : [];

                      return (
                        <TableRow key={event.id} className="group">
                          <TableCell className={COL.select}>
                            <Checkbox
                              checked={selectedEvents.includes(event.id)}
                              onCheckedChange={() => toggleEvent(event.id)}
                            />
                          </TableCell>
                          <TableCell className={COL.event}>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <Link href={`/admin/events/${event.id}`}>
                                  <span className="font-medium hover:text-[#0066FF] cursor-pointer truncate block">{event.title}</span>
                                </Link>
                                {!!event.isFeatured && (
                                  <Badge className="text-xs bg-amber-100 text-amber-800 shrink-0">Featured</Badge>
                                )}
                              </div>
                              {/* No organiser => no second line at all (no stray dash) */}
                              {organizer ? (
                                <p className="text-xs text-[#9BA3B0] truncate">{organizer}</p>
                              ) : null}
                            </div>
                          </TableCell>
                          {/* Time position — derived from the dates, not the
                              editorial workflow status next to it. */}
                          <TableCell className={COL.when}>
                            {phase ? (
                              <span
                                title={
                                  phase === "live"
                                    ? "Happening now — started but not finished"
                                    : undefined
                                }
                                className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] ${
                                  phase === "live" ? "font-semibold" : "font-medium capitalize"
                                } ${phaseStyles[phase]}`}
                              >
                                {phase === "live" && (
                                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                                  </span>
                                )}
                                {phase}
                              </span>
                            ) : (
                              <span className="text-sm text-[#9BA3B0]">—</span>
                            )}
                          </TableCell>
                          <TableCell className={COL.from}>
                            <span className="text-sm font-medium text-[#1A1F36] whitespace-nowrap">
                              {formatDay(start) ?? "—"}
                            </span>
                          </TableCell>
                          <TableCell className={COL.to}>
                            <span className="text-sm text-[#697386] whitespace-nowrap">
                              {formatDay(end) ?? "—"}
                            </span>
                          </TableCell>
                          <TableCell className={COL.days}>
                            <span className="text-sm tabular-nums text-[#697386]">
                              {days ? `${days}d` : "—"}
                            </span>
                          </TableCell>
                          {/* Type + a format glyph. The old Location column
                              carried the format icon; it duplicated City,
                              so the glyph moved here rather than being lost. */}
                          <TableCell className={COL.type}>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Badge className={`${typeInfo.color} truncate`}>
                                {typeInfo.label}
                              </Badge>
                              <span
                                className="shrink-0 text-[#9BA3B0]"
                                title={formatInfo.label}
                                aria-label={formatInfo.label}
                              >
                                <FormatIcon className="h-3 w-3" />
                              </span>
                            </div>
                          </TableCell>
                          {/* City — sourced from events.city on adminList */}
                          <TableCell className={COL.city}>
                            {event.city ? (
                              <div className="flex items-center gap-1 text-[#697386] min-w-0">
                                <MapPin className="h-3 w-3 shrink-0" />
                                <span className="text-sm truncate">{event.city}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-[#9BA3B0]">—</span>
                            )}
                          </TableCell>
                          {/* Sectors — first two on one line, then a +N chip.
                              No wrapping: chips that wrap make every row in
                              the table a different height. The full list is
                              on the title of both the chips and the +N. */}
                          <TableCell className={COL.sector}>
                            {eventSectors.length > 0 ? (
                              <div
                                className="flex items-center gap-1 min-w-0 flex-nowrap"
                                title={eventSectors.map((s) => s.name).join(", ")}
                              >
                                {eventSectors.slice(0, 2).map((s) => (
                                  <Badge
                                    key={s.id}
                                    className="bg-[#F0F2F5] text-[#697386] text-[11px] font-normal max-w-[88px] block truncate"
                                  >
                                    {s.name}
                                  </Badge>
                                ))}
                                {eventSectors.length > 2 && (
                                  <span
                                    className="shrink-0 rounded-full bg-[#F0F2F5] px-1.5 py-0.5 text-[11px] text-[#697386]"
                                    title={eventSectors.slice(2).map((s) => s.name).join(", ")}
                                  >
                                    +{eventSectors.length - 2}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-[#9BA3B0]">—</span>
                            )}
                          </TableCell>
                          {/* Tickets — any tier row or an external ticket/registration URL */}
                          <TableCell className={COL.tickets}>
                            <Badge
                              className={
                                event.hasTickets
                                  ? "bg-green-100 text-green-600"
                                  : "bg-[#F0F2F5] text-[#697386]"
                              }
                            >
                              {event.hasTickets ? "Yes" : "No"}
                            </Badge>
                          </TableCell>
                          {/* Side events — approved count only */}
                          <TableCell className={COL.sideEvents}>
                            {event.sideEventCount > 0 ? (
                              <span className="text-sm font-medium text-[#1A1F36]">{event.sideEventCount}</span>
                            ) : (
                              <span className="text-sm text-[#9BA3B0]">—</span>
                            )}
                          </TableCell>
                          <TableCell className={COL.registrations}>
                            <div className="text-sm">
                              <span className="font-medium text-[#1A1F36]">{event.registrationCount || 0}</span>
                              {event.capacity && (
                                <span className="text-[#697386]"> / {event.capacity}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className={COL.status}>
                            <Badge className={statusColors[event.status] || statusColors.draft}>
                              {event.statusName || event.status || "draft"}
                            </Badge>
                          </TableCell>
                          <TableCell className={COL.actions}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="md:opacity-0 md:group-hover:opacity-100">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => window.open(`/events/${event.slug}`, "_blank")}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Preview
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate(`/admin/events/${event.id}`)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                                {event.status !== "published" && (
                                  <DropdownMenuItem
                                    onClick={() => bulkStatusMutation.mutate({ ids: [event.id], statusSlug: "published" })}
                                    className="text-green-600"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Publish
                                  </DropdownMenuItem>
                                )}
                                {event.status !== "draft" && (
                                  <DropdownMenuItem
                                    onClick={() => bulkStatusMutation.mutate({ ids: [event.id], statusSlug: "draft" })}
                                  >
                                    <FileX className="h-4 w-4 mr-2" />
                                    Move to Draft
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => handleDelete(event.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>

                {/* Advanced Pagination */}
                <div className="px-4 border-t border-[#E0E3E8]">
                  <AdvancedPagination
                    currentPage={page}
                    totalPages={totalPages}
                    totalItems={total}
                    pageSize={pageSize}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Seed dialog — preview first, then apply. Never overwrites
          existing editorial content; only fills empty fields. */}
      <Dialog open={seedOpen} onOpenChange={setSeedOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Seed Saudi Arabia 2026 events</DialogTitle>
            <DialogDescription>
              Adds researched 2026 events (LEAP, DeepFest, Money20/20 ME, FII10, Biban and
              more) and fills in blank fields on events you already have. Existing
              descriptions, images and dates are never overwritten.
            </DialogDescription>
          </DialogHeader>

          {seedPreview.isLoading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-[#697386]">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking dataset…
            </div>
          ) : seedPreview.data ? (
            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="rounded-lg border p-3">
                <div className="text-2xl font-semibold text-[#1A1F36]">
                  {(seedPreview.data as any).wouldInsert}
                </div>
                <div className="text-[12px] text-[#697386]">new events to add</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-2xl font-semibold text-[#1A1F36]">
                  {(seedPreview.data as any).wouldEnrich}
                </div>
                <div className="text-[12px] text-[#697386]">existing events to enrich</div>
              </div>
            </div>
          ) : (
            <p className="py-4 text-sm text-red-600">
              Could not read the dataset. Is the latest build deployed?
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSeedOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#0066FF] hover:bg-[#0052CC]"
              disabled={seedRun.isPending || !seedPreview.data}
              onClick={() => seedRun.mutate({ apply: true, publish: true })}
            >
              {seedRun.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Seeding…
                </>
              ) : (
                "Run seed"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
