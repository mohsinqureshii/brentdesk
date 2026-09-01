/**
 * Stripe Payment Service
 * ----------------------------------------------------------------------
 * Thin wrapper around Stripe Checkout for the Events Hub internal
 * ticketing flow. Other ticket providers (Eventbrite, Luma) don't
 * touch this file — they run as affiliate links + click tracking
 * via event_external_clicks.
 *
 * Configuration source: integration_configs table, integration_id
 * 'stripe-payments'. Two secrets: secretKey (server-side only) and
 * webhookSecret (for /api/webhooks/stripe). Public publishableKey
 * lives in publicConfig because the client needs it.
 *
 * Surface:
 *   isConfigured()                — does the org have Stripe set up
 *   createCheckoutSession(opts)   — internal ticketing checkout flow
 *   verifyWebhook(payload, sig)   — verify a webhook came from Stripe
 *   retrieveSession(sessionId)    — used by webhook + the
 *                                   /events/:slug/tickets/success page
 *   refundCharge(chargeId, amount?)
 *
 * Designed so the rest of the app calls a small, stable surface and
 * the Stripe SDK details stay isolated. Lazy-loaded so the dependency
 * doesn't add startup cost when no event uses internal ticketing.
 */

import { publication } from "../../shared/publication";
import { getEffectiveConfig } from "./integrationConfig.service";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export interface StripeLineItem {
  ticketId: number;
  name: string;
  description?: string;
  unitAmountCents: number;
  currency: string;
  quantity: number;
}

export interface CreateCheckoutOpts {
  eventId: number;
  eventSlug: string;
  eventTitle: string;
  customerEmail: string;
  lineItems: StripeLineItem[];
  promoCodeId?: number;
  discountCents?: number;
  /** URL the user lands on after a successful payment. Stripe will
   *  append ?session_id={CHECKOUT_SESSION_ID} for our webhook + the
   *  client-side success page to look up the order. */
  successUrl: string;
  /** URL the user lands on if they cancel mid-checkout. */
  cancelUrl: string;
  /** Internal order id we created BEFORE the Checkout Session.
   *  Stored as Stripe metadata so the webhook can find the row. */
  internalOrderId: number;
  /** Optional metadata the caller wants on the Stripe object. */
  extraMetadata?: Record<string, string>;
}

export interface CheckoutSessionResult {
  /** The Stripe-hosted checkout URL. Redirect the user here. */
  url: string;
  /** Session id to persist on event_orders.stripeSessionId so we can
   *  reconcile via webhook later. */
  sessionId: string;
}

// ------------------------------------------------------------
// Lazy SDK loader
// ------------------------------------------------------------
//
// `stripe` is a heavy dep (lazy-loaded) so dev env / preview
// builds don't pay the cost when no event uses internal ticketing.

let _stripe: any = null;
async function getStripeClient(secretKey: string): Promise<any> {
  if (_stripe && _stripe.__usedKey === secretKey) return _stripe;
  // Dynamic import — adds the dep at runtime only
  const StripeMod = await import("stripe").catch(() => null);
  if (!StripeMod) {
    throw new Error(
      "stripe package not installed. Run `npm install stripe` to enable internal ticketing.",
    );
  }
  const Stripe = (StripeMod as any).default || StripeMod;
  _stripe = new Stripe(secretKey, {
    apiVersion: "2024-09-30.acacia",
    typescript: true,
    maxNetworkRetries: 2,
  });
  _stripe.__usedKey = secretKey;
  return _stripe;
}

// ------------------------------------------------------------
// Configuration helpers
// ------------------------------------------------------------

interface ResolvedStripeConfig {
  secretKey: string;
  publishableKey: string | null;
  webhookSecret: string | null;
}

async function resolveConfig(): Promise<ResolvedStripeConfig | null> {
  const cfg = await getEffectiveConfig("stripe-payments");
  if (!cfg) return null;
  const secretKey =
    (cfg.secrets as any)?.secretKey ||
    process.env.STRIPE_SECRET_KEY ||
    "";
  if (!secretKey) return null;
  return {
    secretKey,
    publishableKey:
      (cfg.publicConfig as any)?.publishableKey ||
      process.env.STRIPE_PUBLISHABLE_KEY ||
      null,
    webhookSecret:
      (cfg.secrets as any)?.webhookSecret ||
      process.env.STRIPE_WEBHOOK_SECRET ||
      null,
  };
}

export async function isConfigured(): Promise<boolean> {
  const cfg = await resolveConfig();
  return !!cfg;
}

export async function getPublishableKey(): Promise<string | null> {
  const cfg = await resolveConfig();
  return cfg?.publishableKey || null;
}

// ------------------------------------------------------------
// Checkout
// ------------------------------------------------------------

export async function createCheckoutSession(
  opts: CreateCheckoutOpts,
): Promise<CheckoutSessionResult> {
  const cfg = await resolveConfig();
  if (!cfg) {
    throw new Error(
      "Stripe is not configured. Connect Stripe in Integration Hub before selling tickets internally.",
    );
  }
  const stripe = await getStripeClient(cfg.secretKey);

  const lineItemsForStripe = opts.lineItems.map((li) => ({
    quantity: li.quantity,
    price_data: {
      currency: li.currency.toLowerCase(),
      unit_amount: li.unitAmountCents,
      product_data: {
        name: li.name,
        description: li.description || undefined,
        // Tying back to our DB row via metadata — used by the webhook
        // when it needs to grant ticket entitlements per-line.
        metadata: { ticketId: String(li.ticketId) },
      },
    },
  }));

  const discounts =
    opts.discountCents && opts.discountCents > 0
      ? [
          {
            coupon: await getOrCreateCoupon(stripe, opts.discountCents, opts.lineItems[0]?.currency || "USD"),
          },
        ]
      : undefined;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: opts.customerEmail,
    line_items: lineItemsForStripe,
    discounts,
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    payment_intent_data: {
      metadata: {
        eventId: String(opts.eventId),
        internalOrderId: String(opts.internalOrderId),
        ...(opts.promoCodeId ? { promoCodeId: String(opts.promoCodeId) } : {}),
        ...opts.extraMetadata,
      },
      description: `Tickets — ${opts.eventTitle}`,
    },
    metadata: {
      eventId: String(opts.eventId),
      eventSlug: opts.eventSlug,
      internalOrderId: String(opts.internalOrderId),
      ...opts.extraMetadata,
    },
  });

  if (!session.url || !session.id) {
    throw new Error("Stripe returned no session URL");
  }
  return { url: session.url, sessionId: session.id };
}

/**
 * Coupons get reused when the same discount amount + currency is
 * requested again. Cheap optimization — we don't have to keep
 * minting unique coupons for every fixed discount.
 */
async function getOrCreateCoupon(
  stripe: any,
  amountOffCents: number,
  currency: string,
): Promise<string> {
  const id = `tsoff-${currency.toLowerCase()}-${amountOffCents}`;
  try {
    const existing = await stripe.coupons.retrieve(id);
    if (existing && !existing.deleted) return id;
  } catch {
    // 404 / not found — fall through to create
  }
  await stripe.coupons.create({
    id,
    amount_off: amountOffCents,
    currency: currency.toLowerCase(),
    duration: "once",
    name: `${publication.name} ${currency.toUpperCase()} ${(amountOffCents / 100).toFixed(2)} off`,
  });
  return id;
}

// ------------------------------------------------------------
// Webhooks
// ------------------------------------------------------------

export interface WebhookEvent {
  type: string;
  data: any;
  rawId: string;
}

/**
 * Verify a webhook signature and return the typed event. Caller
 * passes the RAW request body (Buffer or string) — Express must
 * NOT have parsed it as JSON yet, otherwise the signature check
 * fails. We hook this in via a raw-body middleware on /api/webhooks/stripe.
 */
export async function verifyWebhook(
  payload: string | Buffer,
  signature: string,
): Promise<WebhookEvent> {
  const cfg = await resolveConfig();
  if (!cfg) throw new Error("Stripe not configured");
  if (!cfg.webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET missing — webhook can't be verified");
  }
  const stripe = await getStripeClient(cfg.secretKey);
  const evt = stripe.webhooks.constructEvent(payload, signature, cfg.webhookSecret);
  return { type: evt.type, data: evt.data, rawId: evt.id };
}

export async function retrieveSession(sessionId: string): Promise<any> {
  const cfg = await resolveConfig();
  if (!cfg) throw new Error("Stripe not configured");
  const stripe = await getStripeClient(cfg.secretKey);
  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent", "line_items"],
  });
}

// ------------------------------------------------------------
// Refunds
// ------------------------------------------------------------

export async function refundCharge(
  chargeOrPaymentIntentId: string,
  amountCents?: number,
): Promise<{ id: string; status: string }> {
  const cfg = await resolveConfig();
  if (!cfg) throw new Error("Stripe not configured");
  const stripe = await getStripeClient(cfg.secretKey);
  const params: any = {};
  if (chargeOrPaymentIntentId.startsWith("pi_")) {
    params.payment_intent = chargeOrPaymentIntentId;
  } else {
    params.charge = chargeOrPaymentIntentId;
  }
  if (amountCents !== undefined) params.amount = amountCents;
  const refund = await stripe.refunds.create(params);
  return { id: refund.id, status: refund.status || "pending" };
}
