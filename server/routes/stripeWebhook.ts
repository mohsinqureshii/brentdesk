/**
 * Stripe Webhook Handler
 * ----------------------------------------------------------------------
 * Mounted at /api/webhooks/stripe BEFORE express.json() so the raw
 * request body is available — Stripe signature verification depends
 * on byte-exact payloads.
 *
 * Events handled:
 *   checkout.session.completed → mark order paid, bump counters,
 *                                bump promo usage, fire confirmation email
 *   checkout.session.expired   → mark order cancelled
 *   charge.refunded            → full refund: mark refunded, reverse counters
 *
 * Idempotency: each handler is keyed by stripeSessionId or order
 * status, so re-delivery from Stripe (which can happen on retry)
 * does not double-bump counters.
 */

import express, { type Request, type Response, type Router } from "express";
import { eq, and, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  events,
  eventTickets,
  eventOrders,
  eventOrderItems,
  eventPromoCodes,
} from "../../drizzle/schema";
import * as stripePaymentService from "../services/stripePayment.service";

const router: Router = express.Router();

/**
 * Note on body parsing: this route is mounted with express.raw() at
 * the application level (see server/_core/index.ts) so req.body here
 * is a Buffer, not a parsed object.
 */
router.post("/api/webhooks/stripe", async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string | undefined;
  if (!sig) {
    return res.status(400).send("Missing stripe-signature header");
  }

  const payload: Buffer | string =
    Buffer.isBuffer(req.body) ? req.body : (req.body as any);

  let evt;
  try {
    evt = await stripePaymentService.verifyWebhook(payload, sig);
  } catch (err: any) {
    console.error("[StripeWebhook] signature verification failed:", err?.message || err);
    return res.status(400).send(`Webhook Error: ${err?.message || "invalid signature"}`);
  }

  try {
    switch (evt.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(evt.data?.object);
        break;
      case "checkout.session.expired":
        await handleCheckoutExpired(evt.data?.object);
        break;
      case "charge.refunded":
        await handleChargeRefunded(evt.data?.object);
        break;
      default:
        // Acknowledge unknown event types so Stripe stops retrying.
        // Logged at debug level only — noisy otherwise.
        // console.log(`[StripeWebhook] ignoring ${evt.type}`);
        break;
    }
    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error(`[StripeWebhook] handler error for ${evt.type}:`, err?.message || err);
    // 500 → Stripe will retry. Returning 200 here would silently lose
    // the event, which is much worse than a duplicate delivery.
    return res.status(500).send("Webhook handler error");
  }
});

// ------------------------------------------------------------
// Handlers
// ------------------------------------------------------------

async function handleCheckoutCompleted(session: any): Promise<void> {
  if (!session?.id) return;
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Look up our pending order by stripeSessionId
  const [order] = await db.select().from(eventOrders)
    .where(eq(eventOrders.stripeSessionId, session.id))
    .limit(1);
  if (!order) {
    console.warn(`[StripeWebhook] no order for session ${session.id}`);
    return;
  }

  // Idempotency: already paid → bail without re-bumping counters
  if (order.status === 'paid') {
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id || null;

  const nowIso = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await db.update(eventOrders)
    .set({
      status: 'paid',
      paidAt: nowIso,
      paymentRef: paymentIntentId,
    } as any)
    .where(eq(eventOrders.id, order.id));

  // Bump per-tier soldCount + denormalized event counters
  const items = await db.select().from(eventOrderItems)
    .where(eq(eventOrderItems.orderId, order.id));
  let totalQty = 0;
  for (const it of items as any[]) {
    totalQty += it.quantity || 0;
    await db.update(eventTickets)
      .set({ soldCount: sql`${eventTickets.soldCount} + ${it.quantity}` } as any)
      .where(eq(eventTickets.id, it.ticketId));
  }
  await db.update(events)
    .set({
      ticketsSoldCount: sql`${events.ticketsSoldCount} + ${totalQty}`,
      ticketsRevenueCents: sql`${events.ticketsRevenueCents} + ${order.totalCents || 0}`,
    } as any)
    .where(eq(events.id, order.eventId));

  // Bump promo code usedCount if one was applied
  if (order.promoCodeId) {
    await db.update(eventPromoCodes)
      .set({ usedCount: sql`${eventPromoCodes.usedCount} + 1` } as any)
      .where(eq(eventPromoCodes.id, order.promoCodeId));
  }

  // TODO(wave-2-followup): Fire-and-forget order confirmation email
  // via emailService once the events email template lands. Should
  // include each item's qrCode for venue check-in.
}

async function handleCheckoutExpired(session: any): Promise<void> {
  if (!session?.id) return;
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [order] = await db.select().from(eventOrders)
    .where(eq(eventOrders.stripeSessionId, session.id))
    .limit(1);
  if (!order) return;
  if (order.status !== 'pending') return; // idempotent

  await db.update(eventOrders)
    .set({ status: 'cancelled' } as any)
    .where(eq(eventOrders.id, order.id));
}

async function handleChargeRefunded(charge: any): Promise<void> {
  if (!charge) return;
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // We stored paymentRef as the payment_intent id (preferred). Stripe
  // gives both on the charge object — try PI first, then charge.id.
  const paymentIntentId =
    typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id || null;

  let order: any = null;
  if (paymentIntentId) {
    const [o] = await db.select().from(eventOrders)
      .where(eq(eventOrders.paymentRef, paymentIntentId)).limit(1);
    order = o;
  }
  if (!order && charge.id) {
    const [o] = await db.select().from(eventOrders)
      .where(eq(eventOrders.paymentRef, charge.id)).limit(1);
    order = o;
  }
  if (!order) {
    console.warn(`[StripeWebhook] no order matched refund for charge ${charge.id}`);
    return;
  }

  // Only act on FULL refunds — partial refunds are surfaced via the
  // admin "amountCents" path instead and don't decrement counters.
  const amountRefunded = charge.amount_refunded || 0;
  const amountTotal = charge.amount || 0;
  const isFullRefund = amountRefunded > 0 && amountRefunded >= amountTotal;
  if (!isFullRefund) return;

  if (order.status === 'refunded') return; // idempotent

  const nowIso = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await db.update(eventOrders)
    .set({ status: 'refunded', refundedAt: nowIso } as any)
    .where(eq(eventOrders.id, order.id));

  // Decrement per-tier soldCount + denormalized event counters
  const items = await db.select().from(eventOrderItems)
    .where(eq(eventOrderItems.orderId, order.id));
  let totalQty = 0;
  for (const it of items as any[]) {
    totalQty += it.quantity || 0;
    await db.update(eventTickets)
      .set({ soldCount: sql`GREATEST(0, ${eventTickets.soldCount} - ${it.quantity})` } as any)
      .where(eq(eventTickets.id, it.ticketId));
  }
  await db.update(events)
    .set({
      ticketsSoldCount: sql`GREATEST(0, ${events.ticketsSoldCount} - ${totalQty})`,
      ticketsRevenueCents: sql`GREATEST(0, ${events.ticketsRevenueCents} - ${order.totalCents || 0})`,
    } as any)
    .where(eq(events.id, order.eventId));
}

export default router;
