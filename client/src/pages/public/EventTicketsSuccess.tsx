/**
 * Event Tickets Success Page
 * ----------------------------------------------------------------------
 * Route: /events/:slug/tickets/success?session_id=cs_xxx
 *
 * Loaded after a successful Stripe Checkout redirect. Looks up the
 * order via events.getOrderBySession. If the webhook hasn't processed
 * yet (order.status === 'pending'), polls every 3s for up to 30s
 * before falling back to a "we'll email you" message.
 */

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar,
  CheckCircle2,
  Loader2,
  Ticket,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";

function formatMoney(cents: number | null | undefined, currency: string | null | undefined): string {
  const value = (cents || 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      currencyDisplay: "narrowSymbol",
    }).format(value);
  } catch {
    return `${(currency || "USD")} ${value.toFixed(2)}`;
  }
}

export default function EventTicketsSuccess() {
  const { slug } = useParams<{ slug: string }>();

  const sessionId = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("session_id") || "";
  }, []);

  // Poll up to 30s while status is pending (webhook may be in flight)
  const [attempt, setAttempt] = useState(0);
  const order = trpc.events.getOrderBySession.useQuery(
    { sessionId },
    {
      enabled: !!sessionId,
      refetchInterval: (q: any) => {
        const data = q?.state?.data;
        if (!data) return attempt < 10 ? 3000 : false;
        return data.status === "pending" && attempt < 10 ? 3000 : false;
      },
    },
  );

  useEffect(() => {
    if (order.data?.status === "pending") {
      const t = setTimeout(() => setAttempt((a) => a + 1), 3000);
      return () => clearTimeout(t);
    }
  }, [order.data?.status, attempt]);

  if (!sessionId) {
    return (
      <Shell>
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
            <h1 className="text-xl font-semibold">Missing session id</h1>
            <p className="text-sm text-muted-foreground">
              We couldn't find a checkout session reference. If you just paid,
              please check your email for a confirmation.
            </p>
            <Link href={`/events/${slug}`}>
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to event
              </Button>
            </Link>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (order.isLoading) {
    return (
      <Shell>
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (!order.data) {
    return (
      <Shell>
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
            <h1 className="text-xl font-semibold">Order not found</h1>
            <p className="text-sm text-muted-foreground">
              We couldn't find this order yet. Please refresh in a moment, or
              check your email — we'll send a confirmation as soon as the
              payment clears.
            </p>
            <Link href={`/events/${slug}`}>
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to event
              </Button>
            </Link>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  const o = order.data;
  const attendeeCount = (o.items || []).reduce((s, i) => s + (i.quantity || 0), 0);

  if (o.status === "pending") {
    return (
      <Shell>
        <SEO title={`Processing your order — ${o.eventTitle || ""}`} noindex />
        <Card>
          <CardContent className="p-10 text-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <h1 className="text-xl font-semibold">Processing your order…</h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Stripe is confirming your payment. This usually takes a few
              seconds. You'll receive an email receipt as soon as it clears.
            </p>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (o.status === "cancelled" || o.status === "failed") {
    return (
      <Shell>
        <SEO title={`Order ${o.status} — ${o.eventTitle || ""}`} noindex />
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
            <h1 className="text-xl font-semibold">
              {o.status === "cancelled" ? "Checkout cancelled" : "Payment failed"}
            </h1>
            <p className="text-sm text-muted-foreground">
              No charge was made. You can try again from the event page.
            </p>
            <Link href={`/events/${o.eventSlug || slug}`}>
              <Button className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to event
              </Button>
            </Link>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  // Paid / refunded — show confirmation
  const calendarHref = `/events/${o.eventSlug || slug}`;

  return (
    <Shell>
      <SEO title={`Order confirmed — ${o.eventTitle || ""}`} noindex />
      <Card>
        <CardContent className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <h1 className="text-2xl font-bold">
              {o.status === "refunded" ? "Order refunded" : "You're going!"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Order #{o.id} · {attendeeCount} ticket{attendeeCount === 1 ? "" : "s"} ·{" "}
              {formatMoney(o.totalCents, o.currency)} paid
            </p>
            <p className="text-sm text-muted-foreground">
              Confirmation sent to <strong>{o.customerEmail}</strong>
            </p>
          </div>

          <div className="border-t pt-5 space-y-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
              Tickets
            </div>
            <ul className="space-y-2">
              {(o.items || []).map((it) => (
                <li
                  key={it.id}
                  className="flex items-center justify-between text-sm border-b last:border-0 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Ticket className="h-4 w-4 text-muted-foreground" />
                    <span>{it.ticketName}</span>
                    <span className="text-muted-foreground">× {it.quantity}</span>
                  </div>
                  <span className="tabular-nums">
                    {formatMoney(it.lineTotalCents, o.currency)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t pt-5 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">
                {formatMoney(o.subtotalCents, o.currency)}
              </span>
            </div>
            {(o.discountCents || 0) > 0 && (
              <div className="flex justify-between text-green-600 dark:text-green-400">
                <span>Discount</span>
                <span className="tabular-nums">
                  -{formatMoney(o.discountCents, o.currency)}
                </span>
              </div>
            )}
            <div className="flex justify-between font-semibold border-t pt-2 mt-2">
              <span>Total</span>
              <span className="tabular-nums">
                {formatMoney(o.totalCents, o.currency)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Link href={calendarHref}>
              <Button variant="outline" className="gap-2">
                <Calendar className="h-4 w-4" />
                Add to calendar
              </Button>
            </Link>
            <Link href={`/events/${o.eventSlug || slug}`}>
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to event
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-2xl px-4 py-10">{children}</main>
      <Footer />
    </div>
  );
}
