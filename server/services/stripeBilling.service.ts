/**
 * Stripe Billing Service
 * ----------------------------------------------------------------------
 * Recurring subscriptions for SaaS tenants — extension of
 * stripePayment.service.ts (which handles one-shot Checkout for the
 * Events Hub). Both share the same Stripe SDK client and config
 * (`integration_configs` with integrationId='stripe-payments').
 *
 * Surface:
 *   isConfigured()                       — same Stripe credentials
 *   createBillingPortalSession({tenant}) — manage subscription
 *   createSubscriptionCheckout({tenant, priceId})
 *   handleSubscriptionWebhook(evt)       — update tenant_billing_subscriptions
 *   getSubscription(tenantId)
 *
 * The plan→stripe-price-id mapping is configured per-deployment in
 * `integration_configs.publicConfig.subscriptionPriceIds`:
 *   { starter: "price_xxx", growth: "price_yyy", enterprise: "price_zzz" }
 */

import { getEffectiveConfig } from "./integrationConfig.service";
import { getDb } from "../db";
import { tenantBillingSubscriptions, tenants } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// Lazy SDK loader is shared with stripePayment.service.ts. We re-use
// the same singleton by going through that module's resolver, which
// is internal — duplicate the loader here so this service stands
// alone and we don't create a hidden dependency cycle.

let _stripe: any = null;
let _key: string | null = null;

async function getStripeClient(secretKey: string): Promise<any> {
  if (_stripe && _key === secretKey) return _stripe;
  const StripeMod: any = await import("stripe").catch(() => null);
  if (!StripeMod) {
    throw new Error("stripe package not installed. Run `npm install stripe` to enable billing.");
  }
  const Stripe = StripeMod.default || StripeMod;
  _stripe = new Stripe(secretKey, {
    apiVersion: "2024-09-30.acacia",
    typescript: true,
    maxNetworkRetries: 2,
  });
  _key = secretKey;
  return _stripe;
}

interface StripeBillingConfig {
  secretKey: string;
  webhookSecret: string | null;
  subscriptionPriceIds: Record<string, string>;
}

async function resolveConfig(): Promise<StripeBillingConfig | null> {
  const cfg = await getEffectiveConfig("stripe-payments");
  if (!cfg) return null;
  const secretKey = (cfg.secrets as any)?.secretKey || process.env.STRIPE_SECRET_KEY || "";
  if (!secretKey) return null;
  return {
    secretKey,
    webhookSecret: (cfg.secrets as any)?.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET || null,
    subscriptionPriceIds: (cfg.publicConfig as any)?.subscriptionPriceIds || {},
  };
}

export async function isConfigured(): Promise<boolean> {
  const cfg = await resolveConfig();
  return !!cfg;
}

// ----------------------------------------------------------------
// Tenant ↔ Stripe Customer linkage
// ----------------------------------------------------------------

async function getOrCreateCustomer(stripe: any, tenantId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select({ stripeCustomerId: tenantBillingSubscriptions.stripeCustomerId })
    .from(tenantBillingSubscriptions)
    .where(eq(tenantBillingSubscriptions.tenantId, tenantId))
    .limit(1);

  if (existing[0]?.stripeCustomerId) return existing[0].stripeCustomerId;

  const tenantRow = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!tenantRow[0]) throw new Error(`Tenant ${tenantId} not found`);

  const customer = await stripe.customers.create({
    name: tenantRow[0].name,
    metadata: { tenantId: String(tenantId), tenantSlug: tenantRow[0].slug },
  });

  // Upsert subscription row with the customer id; everything else
  // stays default until a checkout completes.
  if (existing[0]) {
    await db
      .update(tenantBillingSubscriptions)
      .set({ stripeCustomerId: customer.id } as any)
      .where(eq(tenantBillingSubscriptions.tenantId, tenantId));
  } else {
    await db.insert(tenantBillingSubscriptions).values({
      tenantId,
      stripeCustomerId: customer.id,
      plan: "free",
      status: "trialing",
    } as any);
  }

  return customer.id;
}

// ----------------------------------------------------------------
// Checkout for subscription signup
// ----------------------------------------------------------------

export interface CreateSubscriptionCheckoutOpts {
  tenantId: number;
  plan: "starter" | "growth" | "enterprise";
  seats: number;
  successUrl: string;
  cancelUrl: string;
}

export async function createSubscriptionCheckout(
  opts: CreateSubscriptionCheckoutOpts,
): Promise<{ url: string; sessionId: string }> {
  const cfg = await resolveConfig();
  if (!cfg) throw new Error("Stripe billing not configured");
  const priceId = cfg.subscriptionPriceIds[opts.plan];
  if (!priceId) throw new Error(`No Stripe price id mapped for plan: ${opts.plan}`);

  const stripe = await getStripeClient(cfg.secretKey);
  const customerId = await getOrCreateCustomer(stripe, opts.tenantId);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: opts.seats }],
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    subscription_data: {
      metadata: {
        tenantId: String(opts.tenantId),
        plan: opts.plan,
      },
    },
    metadata: { tenantId: String(opts.tenantId), plan: opts.plan },
  });

  if (!session.url || !session.id) throw new Error("Stripe returned no session URL");
  return { url: session.url, sessionId: session.id };
}

// ----------------------------------------------------------------
// Billing portal — tenant owners manage their own subscription
// ----------------------------------------------------------------

export async function createBillingPortalSession(
  tenantId: number,
  returnUrl: string,
): Promise<{ url: string }> {
  const cfg = await resolveConfig();
  if (!cfg) throw new Error("Stripe billing not configured");

  const stripe = await getStripeClient(cfg.secretKey);
  const customerId = await getOrCreateCustomer(stripe, tenantId);

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return { url: session.url };
}

// ----------------------------------------------------------------
// Webhook handler — updates tenant_billing_subscriptions
// ----------------------------------------------------------------

export async function handleSubscriptionWebhook(event: {
  type: string;
  data: { object: any };
  id: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const obj = event.data.object;
  const tenantIdRaw = obj?.metadata?.tenantId || obj?.subscription_data?.metadata?.tenantId;
  const tenantId = tenantIdRaw ? Number(tenantIdRaw) : null;
  if (!tenantId) return;

  if (event.type === "checkout.session.completed" && obj.mode === "subscription") {
    await db
      .update(tenantBillingSubscriptions)
      .set({
        stripeSubscriptionId: obj.subscription,
        status: "active",
        lastPayload: event as any,
      } as any)
      .where(eq(tenantBillingSubscriptions.tenantId, tenantId));
    return;
  }

  if (event.type.startsWith("customer.subscription.")) {
    const status = mapStripeStatus(obj.status);
    await db
      .update(tenantBillingSubscriptions)
      .set({
        stripeSubscriptionId: obj.id,
        status: status as any,
        currentPeriodStart: obj.current_period_start
          ? new Date(obj.current_period_start * 1000).toISOString()
          : null,
        currentPeriodEnd: obj.current_period_end
          ? new Date(obj.current_period_end * 1000).toISOString()
          : null,
        cancelAtPeriodEnd: obj.cancel_at_period_end ? 1 : 0,
        plan: (obj.metadata?.plan as any) || undefined,
        seatsPurchased: obj.items?.data?.[0]?.quantity || undefined,
        lastPayload: event as any,
      } as any)
      .where(eq(tenantBillingSubscriptions.tenantId, tenantId));
    return;
  }
}

function mapStripeStatus(s: string): string {
  switch (s) {
    case "trialing": return "trialing";
    case "active": return "active";
    case "past_due": return "past_due";
    case "canceled": return "cancelled";
    case "unpaid": return "unpaid";
    case "incomplete":
    case "incomplete_expired":
      return "incomplete";
    default:
      return "active";
  }
}

export async function getSubscription(tenantId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(tenantBillingSubscriptions)
    .where(eq(tenantBillingSubscriptions.tenantId, tenantId))
    .limit(1);
  return rows[0] ?? null;
}
