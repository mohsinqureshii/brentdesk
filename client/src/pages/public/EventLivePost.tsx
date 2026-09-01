/**
 * EventLivePost — permalink page for a single live-coverage update.
 *
 * Route: /events/:slug/live/:postId
 *
 * This is the page the LivePostCard share button links to. Renders the
 * post large with event context above it and a prominent "Follow live
 * coverage" CTA back to the full feed.
 */

import { Link, useParams } from "wouter";
import { ArrowRight, Calendar, ChevronRight, Radio } from "lucide-react";

import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import LivePostCard, { type LivePost } from "@/components/events/LivePostCard";

export default function EventLivePost() {
  const { slug, postId } = useParams<{ slug: string; postId: string }>();
  const id = Number(postId);
  const validId = Number.isFinite(id) && id > 0;

  const { data, isLoading, error } = trpc.events.getLivePost.useQuery(
    { id: validId ? id : 0 },
    { enabled: validId },
  );

  if (isLoading && validId) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-10 max-w-2xl space-y-4">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-10 w-48" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!validId || error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <SEO title="Update Not Found" noindex />
        <Header />
        <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
          <Radio className="h-12 w-12 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Update Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            This live update doesn't exist or has been removed.
          </p>
          <Link href={slug ? `/events/${slug}/live` : "/events"}>
            <Button className="gap-2">
              {slug ? "Go to live coverage" : "Back to Events"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const post = data as unknown as LivePost & {
    event: { id: number; title: string; slug: string };
  };
  const eventSlug = post.event?.slug || slug || "";
  const eventTitle = post.event?.title || "Event";
  const permalink = `https://techscoop.io/events/${eventSlug}/live/${post.id}`;

  const plainBody = (post.body || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={post.headline || `Live update from ${eventTitle}`}
        description={plainBody.slice(0, 160) || `Live coverage of ${eventTitle}.`}
        canonical={permalink}
        ogType="article"
        ogImage={post.imageUrl || undefined}
      />
      <Header />

      <main className="container mx-auto px-4 py-8 lg:py-12 max-w-2xl">
        {/* Event context header */}
        <nav className="text-sm text-muted-foreground mb-2 flex items-center gap-1 flex-wrap">
          <Link href="/events" className="hover:text-foreground">
            Events
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link
            href={`/events/${eventSlug}`}
            className="hover:text-foreground truncate max-w-[50vw]"
          >
            {eventTitle}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">Live update</span>
        </nav>
        <div className="flex items-center gap-2 mb-6 text-muted-foreground">
          <Calendar className="h-4 w-4 shrink-0" />
          <h1 className="text-lg font-semibold text-foreground truncate">
            {eventTitle}
          </h1>
        </div>

        {/* The post, rendered large */}
        <LivePostCard post={post} eventSlug={eventSlug} large />

        {/* Follow live CTA */}
        <div className="mt-8 rounded-lg border bg-muted/30 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              This is one update from our live coverage
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Get every breaking story, funding announcement, and key moment as
              it happens.
            </p>
          </div>
          <Link href={`/events/${eventSlug}/live`} className="shrink-0">
            <Button className="gap-2">
              Follow live coverage
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
