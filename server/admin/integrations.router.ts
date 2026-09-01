/**
 * Admin Integrations Router
 * ----------------------------------------------------------------------
 * tRPC procedures for the Integration Hub UI:
 *   list      — every saved config + status (no secrets returned)
 *   get       — one config by id (no secrets returned, just hasSecrets bool)
 *   schema    — field schema for a given integration (drives the dialog form)
 *   save      — admin saves config; secrets get encrypted at rest
 *   test      — calls the third-party API to verify the credentials work
 *   disable   — set enabled=0 without deleting the row
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  getIntegrationConfig,
  listIntegrationConfigs,
  saveIntegrationConfig,
  recordTestResult,
  getEffectiveConfig,
  INTEGRATION_FIELD_SCHEMAS,
} from "../services/integrationConfig.service";

function requireAdmin(role?: string) {
  if (!role || !["admin", "senior_editor"].includes(role)) {
    throw new Error("Unauthorized — admin or senior editor only");
  }
}

export const integrationsRouter = router({
  /** All known integrations (whether configured or not) merged with their
   *  saved status. The Hub UI uses this for the cards grid. */
  list: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx.user?.role);
    const saved = await listIntegrationConfigs();
    const byId = new Map(saved.map((s) => [s.integrationId, s]));
    return Object.keys(INTEGRATION_FIELD_SCHEMAS).map((id) => {
      const s = byId.get(id);
      return {
        integrationId: id,
        enabled: s?.enabled ?? false,
        status: s?.status ?? "unconfigured",
        hasSecrets: s?.hasSecrets ?? false,
        publicConfig: s?.publicConfig ?? null,
        lastTestedAt: s?.lastTestedAt ?? null,
        lastTestResult: s?.lastTestResult ?? null,
      };
    });
  }),

  get: protectedProcedure
    .input(z.object({ integrationId: z.string().max(64) }))
    .query(async ({ input, ctx }) => {
      requireAdmin(ctx.user?.role);
      return await getIntegrationConfig(input.integrationId);
    }),

  schema: protectedProcedure
    .input(z.object({ integrationId: z.string().max(64) }))
    .query(({ input, ctx }) => {
      requireAdmin(ctx.user?.role);
      const s = INTEGRATION_FIELD_SCHEMAS[input.integrationId];
      if (!s) throw new Error(`Unknown integration: ${input.integrationId}`);
      return s;
    }),

  save: protectedProcedure
    .input(z.object({
      integrationId: z.string().max(64),
      enabled: z.boolean().optional(),
      publicConfig: z.record(z.string(), z.unknown()).optional(),
      // `null` here means "no change to existing secrets"; an empty object
      // means "clear all secrets"; otherwise it's the new secret payload.
      secrets: z.record(z.string(), z.unknown()).nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx.user?.role);
      const result = await saveIntegrationConfig({
        integrationId: input.integrationId,
        enabled: input.enabled,
        publicConfig: input.publicConfig,
        secrets: input.secrets === null ? undefined : input.secrets,
        userId: ctx.user?.id,
      });
      if (!result.ok) throw new Error(result.error || "save failed");
      return { ok: true };
    }),

  /** Call the third-party API to verify credentials. Per-integration
   *  test logic — non-implementing integrations report a soft "not yet
   *  testable" status without raising an error. */
  test: protectedProcedure
    .input(z.object({ integrationId: z.string().max(64) }))
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx.user?.role);
      const cfg = await getEffectiveConfig(input.integrationId);
      if (!cfg) {
        await recordTestResult(input.integrationId, false, "Not configured");
        return { ok: false, message: "Not configured yet — save credentials first." };
      }

      try {
        const { ok, message } = await testIntegration(input.integrationId, cfg);
        await recordTestResult(input.integrationId, ok, message);
        return { ok, message };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await recordTestResult(input.integrationId, false, msg);
        return { ok: false, message: msg };
      }
    }),

  disable: protectedProcedure
    .input(z.object({ integrationId: z.string().max(64) }))
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx.user?.role);
      await saveIntegrationConfig({ integrationId: input.integrationId, enabled: false, userId: ctx.user?.id });
      return { ok: true };
    }),
});

// ============================================================
// PER-INTEGRATION TEST LOGIC
// ============================================================

async function testIntegration(
  integrationId: string,
  cfg: { publicConfig: Record<string, any>; secrets: Record<string, any> },
): Promise<{ ok: boolean; message: string }> {
  switch (integrationId) {
    case "email-resend": {
      // Resend's "list domains" endpoint is the cheapest auth check.
      const apiKey = cfg.secrets.apiKey;
      if (!apiKey) return { ok: false, message: "apiKey missing" };
      const res = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const count = Array.isArray((data as any)?.data) ? (data as any).data.length : 0;
        return { ok: true, message: `Resend OK — ${count} verified domain(s)` };
      }
      const body = await res.text().catch(() => "");
      return { ok: false, message: `Resend ${res.status}: ${body.slice(0, 200)}` };
    }

    case "sms-twilio": {
      const sid = cfg.publicConfig.accountSid;
      const token = cfg.secrets.authToken;
      if (!sid || !token) return { ok: false, message: "accountSid / authToken missing" };
      const auth = Buffer.from(`${sid}:${token}`).toString("base64");
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
        headers: { Authorization: `Basic ${auth}` },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as any;
        return { ok: true, message: `Twilio OK — account "${data.friendly_name || sid}" status ${data.status || "?"}` };
      }
      return { ok: false, message: `Twilio ${res.status}` };
    }

    case "whatsapp": {
      const phoneId = cfg.publicConfig.phoneNumberId;
      const token = cfg.secrets.accessToken;
      if (!phoneId || !token) return { ok: false, message: "phoneNumberId / accessToken missing" };
      const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}?fields=display_phone_number,verified_name`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as any;
        return { ok: true, message: `WhatsApp OK — ${data.verified_name || data.display_phone_number || phoneId}` };
      }
      return { ok: false, message: `WhatsApp ${res.status}` };
    }

    case "ai-claude": {
      const key = cfg.secrets.anthropicApiKey || cfg.secrets.openaiApiKey || cfg.secrets.googleApiKey;
      if (!key) return { ok: false, message: "No LLM API key set" };
      // Anthropic ping — cheapest is a 1-token claude-haiku call.
      if (cfg.secrets.anthropicApiKey) {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": cfg.secrets.anthropicApiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 4,
            messages: [{ role: "user", content: "ping" }],
          }),
          signal: AbortSignal.timeout(15000),
        });
        if (res.ok) return { ok: true, message: "Anthropic Claude OK" };
        const body = await res.text().catch(() => "");
        return { ok: false, message: `Anthropic ${res.status}: ${body.slice(0, 150)}` };
      }
      return { ok: true, message: "Key saved (no live test for this provider yet)" };
    }

    case "google-analytics":
    case "search-console":
    case "adsense-api": {
      const json = cfg.secrets.serviceAccountJson;
      if (!json) return { ok: false, message: "serviceAccountJson missing" };
      try {
        const parsed = typeof json === "string" ? JSON.parse(json) : json;
        if (!parsed.client_email || !parsed.private_key) {
          return { ok: false, message: "Invalid service account JSON (missing client_email / private_key)" };
        }
        return { ok: true, message: `Service account validated — ${parsed.client_email}. Live API test arrives in Phase 2C.` };
      } catch (err) {
        return { ok: false, message: "Invalid JSON: " + (err instanceof Error ? err.message : String(err)) };
      }
    }

    case "webhooks":
    case "api-access":
      return { ok: true, message: "Saved. No external API to test." };

    default:
      return { ok: false, message: `No test logic registered for ${integrationId}` };
  }
}
