/**
 * EventFollowBand — the closing two-column band.
 *
 *   ┌──────────────────────────┬───────────────────────────────┐
 *   │ Follow {event}           │ OUR COVERAGE                  │
 *   │ RSVP + newsletter opt-in │ up to three linked articles   │
 *   └──────────────────────────┴───────────────────────────────┘
 *
 * LEFT is the shared RSVP control (see EventRsvp.tsx — the hero renders
 * the same one, off the same query) plus the existing newsletter
 * subscribe (`newsletters.subscribe`). No new endpoint.
 *
 * RIGHT lists `event.relatedArticles` (article_events links, published
 * only). The kicker is the article's own primary category — never a
 * label we made up — and the half is omitted when nothing is linked.
 */

import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Users } from "lucide-react";
import { toast } from "sonner";

import { publication } from "@shared/publication";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EventFallbackTile, isUsableImage } from "./EventVisual";
import { formatDate } from "./eventFormat";
import { type EventRow } from "./eventMeta";
import { EventRsvpButtons } from "./EventRsvp";

function FollowCard({ event, wide }: { event: EventRow; wide: boolean }) {
  // ---------------------------------------------------- newsletter
  const [email, setEmail] = useState("");
  const listQ = trpc.newsletters.listActive.useQuery(undefined, {
    staleTime: 10 * 60_000,
  });
  const newsletters = ((listQ.data as any) || []) as Array<{ slug: string }>;
  const newsletterSlug = newsletters[0]?.slug;

  const subscribe = trpc.newsletters.subscribe.useMutation({
    onSuccess: (r: any) => {
      if (r?.success === false) {
        toast.error(r.error || "Could not subscribe");
        return;
      }
      toast.success("Subscribed — check your inbox to confirm.");
      setEmail("");
    },
    onError: (e: any) => toast.error(e.message || "Could not subscribe"),
  });

  const goingCount = Number(event.goingCount ?? 0);

  return (
    <div
      className={`rounded-2xl border border-emerald-600/25 bg-emerald-50/60 p-7 dark:bg-emerald-500/[0.07] lg:p-9 ${
        wide
          ? "grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-center lg:gap-14"
          : ""
      }`}
    >
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
            Stay in the loop
          </h2>
          {goingCount > 0 && !wide && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {goingCount.toLocaleString()} going
            </span>
          )}
        </div>

        <p className="mt-4 text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
          Follow {event.title}
        </p>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          Speaker announcements, agenda changes and our reporting from the floor —
          we&rsquo;ll email you when something happens.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <EventRsvpButtons eventId={event.id} slug={event.slug} variant="band" />

          {goingCount > 0 && wide && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {goingCount.toLocaleString()} going
            </span>
          )}
        </div>
      </div>

      {/* Newsletter opt-in — the same subscribe mutation the site-wide
          band uses; replaced by a link when no newsletter is active, so
          the form is never a control that silently does nothing. In the
          wide layout it becomes the right-hand half instead of a stacked
          footer, so the band never ends in dead space. */}
      <div
        className={
          wide
            ? "min-w-0 border-t border-emerald-600/20 pt-6 lg:border-l lg:border-t-0 lg:pl-14 lg:pt-0"
            : "mt-7 border-t border-emerald-600/20 pt-6"
        }
      >
        {wide && (
          <p className="mb-3 text-sm font-semibold text-foreground">
            Get it by email
          </p>
        )}
        {newsletterSlug ? (
          <form
            className="flex w-full max-w-sm items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!email.trim()) return;
              subscribe.mutate({
                email: email.trim(),
                newsletterSlugs: [newsletterSlug],
                source: `event:${event.title}`,
              });
            }}
          >
            <Input
              type="email"
              required
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEmail(e.target.value)
              }
              placeholder="Enter your email"
              aria-label="Email address"
              className="h-11 bg-background"
            />
            <Button
              type="submit"
              disabled={subscribe.isPending}
              className="h-11 shrink-0 bg-emerald-600 px-5 text-white hover:bg-emerald-700"
            >
              {subscribe.isPending ? "…" : "Subscribe"}
            </Button>
          </form>
        ) : (
          <Link href="/newsletter">
            <Button variant="outline" className="h-11">
              Browse newsletters
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

function CoverageColumn({ event }: { event: EventRow }) {
  const articles: any[] = event.relatedArticles || [];
  if (articles.length === 0) return null;

  const shown = articles.slice(0, 3);

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
          {publication.name} coverage
        </h2>
        {articles.length > shown.length && (
          <Link
            href={`/search?q=${encodeURIComponent(event.title)}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-emerald-700 dark:hover:text-emerald-400"
          >
            View all coverage
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>

      <ul className="mt-6 divide-y divide-[var(--border)] border-t border-[var(--border)]">
        {shown.map((a) => (
          <li key={a.id}>
            <Link
              href={`/news/${a.slug}`}
              className="group flex items-start gap-4 py-4"
            >
              <span className="h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-[var(--border)]">
                {isUsableImage(a.featuredImage) ? (
                  <img
                    src={a.featuredImage}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                ) : (
                  <EventFallbackTile
                    title={a.title}
                    slug={`article-${a.slug}`}
                    type={event.type}
                    variant="thumb"
                    interactive={false}
                  />
                )}
              </span>
              <span className="min-w-0 flex-1">
                {a.categoryName && (
                  <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">
                    {a.categoryName}
                  </span>
                )}
                <span className="mt-1 block font-semibold leading-snug text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                  {a.title}
                </span>
                {a.publishedAt && (
                  <span className="mt-1.5 block text-xs text-muted-foreground">
                    {formatDate(a.publishedAt)}
                  </span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function EventFollowBand({ event }: { event: EventRow }) {
  const hasCoverage = (event.relatedArticles || []).length > 0;

  // With coverage this is a genuine two-column band. Without it the card
  // goes full width and lays itself out horizontally, rather than sitting
  // in the left half of a grid with nothing opposite it.
  if (!hasCoverage) return <FollowCard event={event} wide />;

  return (
    <section className="grid gap-10 lg:grid-cols-2 lg:gap-16">
      <FollowCard event={event} wide={false} />
      <CoverageColumn event={event} />
    </section>
  );
}
