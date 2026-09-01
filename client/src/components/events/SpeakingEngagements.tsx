/**
 * "Speaking at" — every published event this person has a speaker slot
 * on (`events.getSpeakingEngagements`, newest first).
 *
 * Lives on the public person profile. Renders nothing at all when the
 * person has no engagements, so profiles without a speaking history
 * don't grow an empty card.
 */

import { Link } from "wouter";
import { Calendar, MapPin, Mic2, Star, ChevronRight } from "lucide-react";

import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateRange } from "./eventFormat";

type Engagement = {
  eventId: number;
  eventTitle: string;
  eventSlug: string;
  eventStartDate: string | null;
  eventEndDate: string | null;
  city: string | null;
  country: string | null;
  speakerTitle: string | null;
  isFeatured: boolean;
};

export default function SpeakingEngagements({
  personId,
  className = "",
}: {
  personId: number;
  className?: string;
}) {
  const { data = [], isLoading } =
    trpc.events.getSpeakingEngagements.useQuery(
      { personId },
      { enabled: !!personId },
    );

  if (isLoading) {
    return (
      <Card className={`bg-white dark:bg-card ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Speaking At</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const engagements = data as unknown as Engagement[];
  if (engagements.length === 0) return null;

  return (
    <Card className={`bg-white dark:bg-card ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Mic2 className="h-4 w-4 text-primary" />
          Speaking At
          <Badge variant="secondary" className="text-xs">
            {engagements.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          {engagements.map((e, i) => {
            const place = [e.city, e.country].filter(Boolean).join(", ");
            return (
              <Link
                // A person can hold more than one slot at the same event,
                // so the index disambiguates repeated eventIds.
                key={`${e.eventId}-${i}`}
                href={`/events/${e.eventSlug}`}
                className="flex items-center gap-4 border-b py-3 transition-colors last:border-0 hover:bg-muted/40"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="truncate text-sm font-semibold">
                      {e.eventTitle}
                    </h4>
                    {e.isFeatured && (
                      <Badge className="gap-1 border-transparent bg-amber-100 text-[10px] text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                        <Star className="h-2.5 w-2.5" /> Featured
                      </Badge>
                    )}
                  </div>
                  {e.speakerTitle && (
                    <p className="truncate text-xs text-muted-foreground">
                      {e.speakerTitle}
                    </p>
                  )}
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>
                      {formatDateRange(e.eventStartDate, e.eventEndDate)}
                    </span>
                    {place && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {place}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
