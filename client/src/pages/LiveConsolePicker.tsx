/**
 * LiveConsolePicker — routed at /live-console.
 *
 * The landing screen reporters open from their phone home screen.
 * Shows events that are live right now (events.listLiveNow) plus
 * upcoming published events (events.list upcoming), each with an
 * "Open console" button into /live-console/:id. Actual posting
 * permission is checked inside LiveConsole via canPostLiveCheck,
 * so this list can stay a simple public-events listing.
 */

import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Calendar, ChevronRight, MapPin, Radio } from "lucide-react";

function fmtDateRange(start?: string | Date | null, end?: string | Date | null): string {
  if (!start) return "";
  try {
    const s = new Date(start);
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    const startStr = s.toLocaleDateString(undefined, opts);
    if (!end) return startStr;
    const e = new Date(end);
    if (s.toDateString() === e.toDateString()) return startStr;
    return `${startStr} – ${e.toLocaleDateString(undefined, opts)}`;
  } catch {
    return String(start);
  }
}

export default function LiveConsolePicker() {
  const { loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/signin");
    }
  }, [loading, isAuthenticated, setLocation]);

  const liveNowQuery = trpc.events.listLiveNow.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 60_000,
  });
  const upcomingQuery = trpc.events.list.useQuery(
    { page: 1, limit: 20, upcoming: true, sortBy: "startDate", sortOrder: "asc" },
    { enabled: isAuthenticated },
  );

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner />
      </div>
    );
  }

  const liveNow: any[] = (liveNowQuery.data as any[]) || [];
  const liveIds = new Set(liveNow.map((e) => e.id));
  // Don't repeat live events in the upcoming list.
  const upcoming: any[] = ((upcomingQuery.data as any)?.items || []).filter(
    (e: any) => !liveIds.has(e.id),
  );
  const isLoading = liveNowQuery.isLoading || upcomingQuery.isLoading;

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <header className="sticky top-0 z-30 bg-white border-b">
        <div className="max-w-lg mx-auto px-3 py-3 flex items-center gap-2">
          <Radio className="h-5 w-5 text-red-600" />
          <h1 className="text-base font-semibold">Reporter live console</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-3 py-4 space-y-5">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : (
          <>
            {/* Live now */}
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground px-1">
                Live now
              </h2>
              {liveNow.length === 0 ? (
                <Card>
                  <CardContent className="p-5 text-center text-sm text-muted-foreground">
                    No events are live right now.
                  </CardContent>
                </Card>
              ) : (
                liveNow.map((e) => <EventRow key={e.id} event={e} live />)
              )}
            </section>

            {/* Upcoming */}
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground px-1">
                Upcoming events
              </h2>
              {upcoming.length === 0 ? (
                <Card>
                  <CardContent className="p-5 text-center text-sm text-muted-foreground">
                    No upcoming events found.
                  </CardContent>
                </Card>
              ) : (
                upcoming.map((e) => <EventRow key={e.id} event={e} />)
              )}
            </section>

            <p className="text-xs text-muted-foreground text-center px-4">
              You can only post to events you're assigned to. Opening a console
              for an event you're not assigned to shows an access notice.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function EventRow({ event, live }: { event: any; live?: boolean }) {
  const location = [event.venue, event.city].filter(Boolean).join(", ");
  return (
    <Card className={live ? "border-red-300" : ""}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold truncate">{event.title}</p>
            {live && (
              <Badge className="bg-red-600 text-white animate-pulse shrink-0">
                <Radio className="h-3 w-3 mr-1" /> LIVE
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {fmtDateRange(event.startDate, event.endDate)}
            </span>
            {location && (
              <span className="inline-flex items-center gap-1 truncate">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{location}</span>
              </span>
            )}
          </div>
        </div>
        <Button asChild size="sm" className="shrink-0" variant={live ? "default" : "outline"}>
          <Link href={`/live-console/${event.id}`}>
            Open console <ChevronRight className="h-4 w-4 ml-0.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
