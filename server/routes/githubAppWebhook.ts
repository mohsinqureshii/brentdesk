/**
 * GitHub App Webhook Route
 * ----------------------------------------------------------------------
 * Mounted at POST /api/webhooks/github. GitHub signs every delivery
 * with the App's webhook secret using HMAC-SHA256, surfaced in the
 * `X-Hub-Signature-256` header. We verify that signature over the raw
 * body BEFORE parsing JSON — any byte change invalidates the HMAC.
 *
 * Body parsing: this route uses express.raw() locally so req.body is a
 * Buffer. The coordinator MUST NOT also apply express.json() to this
 * path; mount this handler before any global JSON parser.
 *
 * Events handled:
 *   ping                         → 200 OK, no-op
 *   installation.created         → log, no DB action yet
 *   installation.deleted         → log, no DB action yet
 *   push                         → refresh connected profiles for the
 *                                  installation (currently a TODO — see
 *                                  follow-up below)
 *   pull_request.opened/closed   → enqueue incremental fetch (currently
 *                                  a TODO — see follow-up below)
 *
 * Unhandled event types are acked with 200 so GitHub doesn't keep
 * redelivering them. We only return non-2xx for signature/parse
 * failures or genuinely unexpected handler errors.
 *
 * Follow-ups for the github module:
 *   - Expose a `findProfilesByInstallationId(installationId)` lookup
 *     on githubProfileService (or githubFetcherService) so we can find
 *     all candidates connected to a given App installation. The
 *     installationId column already exists on github_profiles, but
 *     there's no public read by it.
 *   - Expose an `enqueueIncremental(profileId)` (and an installation-
 *     scoped refresh that doesn't require a TenantScope) on
 *     githubFetcherService. The existing `refreshProfile(scope,
 *     candidateId)` requires a tenant scope + candidateId, which a
 *     webhook delivery doesn't carry.
 * Until those land, this handler logs the event and acks 200 — the
 * scheduler tick still picks up profiles on its normal cadence.
 */

import crypto from "node:crypto";
import express, { type Express, type Request, type Response } from "express";
import { githubAuthService } from "../modules/github";

const SIG_HEADER = "x-hub-signature-256";
const EVENT_HEADER = "x-github-event";
const DELIVERY_HEADER = "x-github-delivery";

/**
 * Constant-time compare of the received signature against the HMAC we
 * compute locally. Both inputs are normalized to `sha256=<hex>` form.
 */
function verifySignature(rawBody: Buffer, signature: string, secret: string): boolean {
  if (!secret || !signature) return false;
  const expected =
    "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function mountGithubAppWebhook(app: Express) {
  app.post(
    "/api/webhooks/github",
    express.raw({ type: "*/*", limit: "10mb" }),
    async (req: Request, res: Response) => {
      const eventType = String(req.headers[EVENT_HEADER] ?? "");
      const deliveryId = String(req.headers[DELIVERY_HEADER] ?? "");
      const signature = String(req.headers[SIG_HEADER] ?? "");

      console.log("[GitHubWebhook] received", eventType, deliveryId);

      const rawBody: Buffer = Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(typeof req.body === "string" ? req.body : "");

      // ----- 1. Signature verification ---------------------------------
      let webhookSecret = "";
      try {
        const cfg = await githubAuthService.getAppConfig();
        webhookSecret = cfg.webhookSecret;
      } catch (err: any) {
        console.error(
          "[GitHubWebhook] config lookup failed:",
          err?.message || err,
        );
        return res.status(401).send("Unauthorized");
      }

      if (!verifySignature(rawBody, signature, webhookSecret)) {
        console.warn(
          "[GitHubWebhook] signature mismatch for delivery",
          deliveryId,
        );
        return res.status(401).send("Invalid signature");
      }

      // ----- 2. Parse payload ------------------------------------------
      let payload: any;
      try {
        payload = JSON.parse(rawBody.toString("utf8"));
      } catch (err: any) {
        console.error("[GitHubWebhook] body parse failed:", err?.message || err);
        // Bad JSON from a verified sender is weird; ack so GitHub doesn't
        // keep retrying an unparseable delivery.
        return res.status(200).json({ received: true, parsed: false });
      }

      // ----- 3. Dispatch -----------------------------------------------
      try {
        switch (eventType) {
          case "ping":
            // Setup probe — GitHub sends this on App install/webhook test.
            break;

          case "installation": {
            const action = String(payload?.action ?? "");
            const installationId = Number(payload?.installation?.id ?? 0) || null;
            if (action === "created") {
              console.log(
                "[GitHubWebhook] installation.created",
                installationId,
              );
            } else if (action === "deleted") {
              console.log(
                "[GitHubWebhook] installation.deleted",
                installationId,
              );
            }
            // No DB action yet — see follow-up at top of file.
            break;
          }

          case "push": {
            const installationId = Number(payload?.installation?.id ?? 0) || null;
            // TODO(github-module): once findProfilesByInstallationId +
            // an installation-scoped refresh exist on the github module
            // boundary, fan out a refresh per connected profile here.
            console.log(
              "[GitHubWebhook] push (no-op, awaiting installation lookup)",
              installationId,
              payload?.repository?.full_name,
            );
            break;
          }

          case "pull_request": {
            const action = String(payload?.action ?? "");
            const installationId = Number(payload?.installation?.id ?? 0) || null;
            if (action === "opened" || action === "closed") {
              // TODO(github-module): once enqueueIncremental(profileId)
              // exists on githubFetcherService and we can look up
              // profiles by installationId, enqueue an incremental
              // fetch per connected profile.
              console.log(
                "[GitHubWebhook] pull_request." + action,
                "(no-op, awaiting enqueueIncremental)",
                installationId,
                payload?.repository?.full_name,
              );
            }
            break;
          }

          default:
            // Unhandled event type — ack so GitHub stops retrying.
            break;
        }
        return res.status(200).json({ received: true });
      } catch (err: any) {
        console.error(
          `[GitHubWebhook] handler error for ${eventType}:`,
          err?.message || err,
        );
        // Ack with 200 to avoid GitHub retry storms — we already logged
        // the failure for investigation. Truly transient errors will be
        // picked up by the next scheduler tick.
        return res.status(200).json({ received: true, handled: false });
      }
    },
  );
}
