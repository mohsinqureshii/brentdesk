/**
 * Stripe Billing Webhook Handler
 * ----------------------------------------------------------------------
 * Mounted at POST /api/webhooks/stripe-billing. Handles subscription
 * lifecycle events (checkout.session.completed for subscription mode,
 * customer.subscription.created / updated / deleted) for the tenant
 * billing flow.
 *
 * Body parsing: this route installs its own express.raw() middleware so
 * the byte-exact Stripe payload is preserved for signature verification —
 * the rest of the app uses express.json() globally, which would otherwise
 * mutate req.body before we get to verify it.
 *
 * Idempotency: handleSubscriptionWebhook is safe to call multiple times
 * for the same event id, so Stripe retries (which can happen on transient
 * failures) will not corrupt subscription state.
 *
 * Timing: must respond to Stripe within 30s or they retry. The handler
 * is expected to be quick (single-row upserts); no long-running work
 * should be added inline here.
 */

import express, { type Express, type Request, type Response } from "express";
import { handleSubscriptionWebhook } from "../services/stripeBilling.service";
import { verifyWebhook } from "../services/stripePayment.service";

export function mountStripeBillingWebhook(app: Express) {
  app.post(
    "/api/webhooks/stripe-billing",
    express.raw({ type: "application/json", limit: "1mb" }),
    async (req: Request, res: Response) => {
      const sig = req.headers["stripe-signature"] as string | undefined;
      if (!sig) {
        return res.status(400).send("Missing stripe-signature header");
      }

      const payload: Buffer | string =
        Buffer.isBuffer(req.body) ? req.body : (req.body as any);

      let event;
      try {
        event = await verifyWebhook(payload, sig);
      } catch (err: any) {
        console.error(
          "[StripeBilling] signature verification failed:",
          err?.message || err,
        );
        return res
          .status(400)
          .send(`Webhook Error: ${err?.message || "invalid signature"}`);
      }

      console.log("[StripeBilling] received", event.type, event.rawId);

      try {
        // verifyWebhook returns { type, data, rawId } but the service
        // expects { type, data, id } — same underlying Stripe event id,
        // just renamed for consistency with Stripe's own field name.
        await handleSubscriptionWebhook({
          type: event.type,
          data: event.data,
          id: event.rawId,
        });
        return res.status(200).json({ received: true });
      } catch (err: any) {
        console.error(
          `[StripeBilling] handler error for ${event.type} (${event.rawId}):`,
          err?.message || err,
        );
        // 500 → Stripe will retry. Returning 200 here would silently lose
        // the event, which is much worse than a duplicate delivery (the
        // handler is idempotent).
        return res.status(500).send("Webhook handler error");
      }
    },
  );
}
