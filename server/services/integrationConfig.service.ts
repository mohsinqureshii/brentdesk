/**
 * Integration Config Service
 * ----------------------------------------------------------------------
 * Single source of truth for every external integration's credentials.
 * Replaces env-var-only configuration so admins can paste keys in the
 * Integration Hub UI.
 *
 * STORAGE
 * Each integration has zero or one row in `integration_configs`. The
 * `public_config` column is plain JSON for non-sensitive fields
 * (account IDs, sender email addresses) and `secrets` is AES-256-GCM
 * encrypted JSON for API keys / private keys / OAuth tokens.
 *
 * KEY MATERIAL
 * INTEGRATION_SECRETS_KEY env var — 64 hex chars (32 bytes). If
 * missing, the service refuses to write secrets and logs a clear
 * error. Reads of unconfigured integrations still succeed (returns
 * null) so the rest of the app stays online during initial setup.
 *
 * BACKWARDS COMPAT
 * For each known integration, getEffective(integrationId) returns a
 * merged view: DB row first, env-var fallback. That way nothing
 * breaks during the migration window — old env-var-driven flows keep
 * working, and once an admin saves config in the UI it takes over.
 */

import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { integrationConfigs } from "../../drizzle/schema";
import { toDbDate } from "../_core/dbValues";

const ALGO = "aes-256-gcm";

function getKey(): Buffer | null {
  const hex = process.env.INTEGRATION_SECRETS_KEY;
  if (!hex || hex.length !== 64 || !/^[0-9a-fA-F]+$/.test(hex)) return null;
  return Buffer.from(hex, "hex");
}

function encrypt(plain: string): string | null {
  const key = getKey();
  if (!key) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

function decrypt(blob: string): string | null {
  const key = getKey();
  if (!key) return null;
  try {
    const buf = Buffer.from(blob, "base64");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(enc), decipher.final()]);
    return plain.toString("utf8");
  } catch (err) {
    console.error("[IntegrationConfig] decrypt failed:", err);
    return null;
  }
}

// ============================================================
// FIELD SCHEMAS — what each integration accepts in `public_config`
// vs `secrets`. This drives the generic config dialog on the client.
// ============================================================

export interface IntegrationField {
  key: string;
  label: string;
  helpText?: string;
  type: "text" | "password" | "textarea" | "email" | "url" | "boolean";
  required?: boolean;
  placeholder?: string;
}

export interface IntegrationFieldSchema {
  /** Plain fields (stored in public_config). */
  publicFields: IntegrationField[];
  /** Encrypted fields (stored in secrets). */
  secretFields: IntegrationField[];
  /** Short doc URL for "Where do I get this?" hint. */
  docsUrl?: string;
}

export const INTEGRATION_FIELD_SCHEMAS: Record<string, IntegrationFieldSchema> = {
  "email-resend": {
    docsUrl: "https://resend.com/docs/dashboard/api-keys/introduction",
    publicFields: [
      { key: "fromAddress",  label: "From address",  type: "email", required: true, placeholder: "Publication <hello@examscoop.io>", helpText: "Display name + verified sender email" },
      { key: "replyTo",      label: "Reply-to",      type: "email", placeholder: "hello@example.com" },
    ],
    secretFields: [
      { key: "apiKey", label: "Resend API key", type: "password", required: true, placeholder: "re_xxxxxxxxxxxxxxxxxxxxxxxx" },
    ],
  },
  "sms-twilio": {
    docsUrl: "https://www.twilio.com/docs/iam/api-keys",
    publicFields: [
      { key: "accountSid", label: "Account SID",    type: "text",  required: true, placeholder: "ACxxxxxxxxxxxxxxxx" },
      { key: "fromNumber", label: "From number",    type: "text",  required: true, placeholder: "+12025550100", helpText: "E.164 format" },
    ],
    secretFields: [
      { key: "authToken", label: "Auth token", type: "password", required: true, placeholder: "32-char auth token" },
    ],
  },
  "whatsapp": {
    docsUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api/get-started",
    publicFields: [
      { key: "phoneNumberId",   label: "Phone number ID",    type: "text", required: true, placeholder: "1234567890" },
      { key: "businessAccountId", label: "Business account ID", type: "text", placeholder: "0987654321" },
    ],
    secretFields: [
      { key: "accessToken", label: "System user access token", type: "password", required: true },
    ],
  },
  "ai-claude": {
    docsUrl: "https://docs.anthropic.com/claude/docs",
    publicFields: [
      { key: "defaultModel", label: "Default model", type: "text", placeholder: "claude-sonnet-4-5", helpText: "Used when a feature doesn't specify a model" },
    ],
    secretFields: [
      { key: "anthropicApiKey", label: "Anthropic API key", type: "password", placeholder: "sk-ant-…" },
      { key: "openaiApiKey",    label: "OpenAI API key",    type: "password", placeholder: "sk-…" },
      { key: "googleApiKey",    label: "Google AI key",     type: "password", placeholder: "AIza…" },
    ],
  },
  "webhooks": {
    publicFields: [
      { key: "signingScheme", label: "Signing scheme", type: "text", placeholder: "hmac-sha256", helpText: "Outbound webhook signature algorithm" },
    ],
    secretFields: [
      { key: "signingSecret", label: "Signing secret", type: "password", helpText: "Used to sign outbound webhook payloads" },
    ],
  },
  "api-access": {
    publicFields: [],
    secretFields: [],
  },
  "qdrant": {
    docsUrl: "https://qdrant.tech/documentation/",
    publicFields: [
      { key: "baseUrl", label: "Qdrant URL", type: "url", required: true, placeholder: "https://xxx.qdrant.io" },
    ],
    secretFields: [
      { key: "apiKey", label: "Qdrant API key", type: "password", placeholder: "Optional for self-hosted" },
    ],
  },
  "google-analytics": {
    docsUrl: "https://developers.google.com/analytics/devguides/reporting/data/v1",
    publicFields: [
      { key: "measurementId",  label: "Measurement ID", type: "text", required: true, placeholder: "G-XXXXXXXXXX" },
      { key: "propertyId",     label: "Property ID",    type: "text", required: true, placeholder: "123456789", helpText: "Numeric GA4 property ID" },
    ],
    secretFields: [
      { key: "serviceAccountJson", label: "Service account JSON", type: "textarea", required: true, helpText: "Paste the full service-account JSON. Required scope: analytics.readonly" },
    ],
  },
  "search-console": {
    docsUrl: "https://developers.google.com/webmaster-tools/v1/quickstart/quickstart-nodejs",
    publicFields: [
      { key: "siteUrl", label: "Site URL", type: "url", required: true, placeholder: "https://www.example.com/" },
    ],
    secretFields: [
      { key: "serviceAccountJson", label: "Service account JSON", type: "textarea", required: true, helpText: "Reuses the Indexing API service account if scopes include webmasters.readonly" },
    ],
  },
  "adsense-api": {
    docsUrl: "https://developers.google.com/adsense/management/v2",
    publicFields: [
      { key: "publisherId", label: "AdSense publisher ID", type: "text", required: true, placeholder: "pub-2487563355490273" },
    ],
    secretFields: [
      { key: "serviceAccountJson", label: "Service account JSON", type: "textarea", required: true, helpText: "Required scope: adsense.readonly" },
    ],
  },
  // Internal Stripe Checkout for events with ticketProvider='internal'.
  // Powers TicketCheckoutDialog + /api/webhooks/stripe. External
  // providers (Eventbrite/Luma) don't touch this — they're affiliate
  // links + click tracking via event_external_clicks.
  // Also powers tenant subscription billing for the Talent Platform —
  // publicConfig.subscriptionPriceIds.{starter,growth,enterprise}.
  "stripe-payments": {
    docsUrl: "https://dashboard.stripe.com/apikeys",
    publicFields: [
      { key: "publishableKey", label: "Publishable key", type: "text", required: true, placeholder: "pk_live_…", helpText: "Safe to expose on the client. Used by Stripe.js if/when we ever embed Elements." },
      { key: "starterPriceId",    label: "Starter plan price ID",    type: "text", placeholder: "price_…", helpText: "Stripe price ID for the Starter tenant subscription." },
      { key: "growthPriceId",     label: "Growth plan price ID",     type: "text", placeholder: "price_…", helpText: "Stripe price ID for the Growth tenant subscription." },
      { key: "enterprisePriceId", label: "Enterprise plan price ID", type: "text", placeholder: "price_…", helpText: "Stripe price ID for the Enterprise tenant subscription." },
    ],
    secretFields: [
      { key: "secretKey", label: "Secret key", type: "password", required: true, placeholder: "sk_live_…", helpText: "Server-side only. Used to create Checkout Sessions + Refunds." },
      { key: "webhookSecret", label: "Webhook signing secret", type: "password", required: true, placeholder: "whsec_…", helpText: "From Stripe Dashboard → Developers → Webhooks. Endpoint URL: <your base URL>/api/webhooks/stripe. Listen to checkout.session.completed, checkout.session.expired, charge.refunded." },
    ],
  },
  "github-app": {
    docsUrl: "https://docs.github.com/en/apps/creating-github-apps",
    publicFields: [
      { key: "appId",       label: "App ID",      type: "text", required: true, placeholder: "123456" },
      { key: "clientId",    label: "Client ID",   type: "text", required: true, placeholder: "Iv1.xxxxxxxxxxxx" },
      { key: "callbackUrl", label: "Callback URL (read-only)", type: "text", helpText: "Configure this in your GitHub App settings. Defaults to <your base URL>/api/github/callback", placeholder: "https://www.example.com/api/github/callback" },
    ],
    secretFields: [
      { key: "clientSecret",  label: "Client secret",          type: "password", required: true, placeholder: "GitHub App client secret" },
      { key: "privateKey",    label: "Private key (PEM)",      type: "textarea", required: true, placeholder: "-----BEGIN RSA PRIVATE KEY-----\n…\n-----END RSA PRIVATE KEY-----", helpText: "Paste the entire PEM file from the GitHub App settings page." },
      { key: "webhookSecret", label: "Webhook signing secret", type: "password", required: true, placeholder: "Used to verify inbound webhook payloads" },
    ],
  },
  "judge0": {
    docsUrl: "https://judge0.com/",
    publicFields: [
      { key: "baseUrl", label: "Judge0 base URL", type: "url", required: true, placeholder: "https://judge0-ce.p.rapidapi.com" },
    ],
    secretFields: [
      { key: "apiKey", label: "Judge0 / RapidAPI key", type: "password", required: true, placeholder: "API key for code execution" },
    ],
  },
  "slack-platform": {
    docsUrl: "https://api.slack.com/messaging/webhooks",
    publicFields: [
      { key: "newApplicationChannel", label: "New application channel",   type: "text", placeholder: "#talent-new-apps",   helpText: "Channel to notify on a new candidate application." },
      { key: "stageChangeChannel",    label: "Stage change channel",      type: "text", placeholder: "#talent-pipeline",   helpText: "Channel to notify when a candidate moves stage." },
      { key: "offerAcceptedChannel",  label: "Offer accepted channel",    type: "text", placeholder: "#talent-offers",     helpText: "Channel to notify when a candidate accepts an offer." },
    ],
    secretFields: [
      { key: "webhookUrl", label: "Incoming webhook URL", type: "password", required: true, placeholder: "https://hooks.slack.com/services/…", helpText: "Create an Incoming Webhook in your Slack workspace." },
    ],
  },
  "greenhouse": {
    docsUrl: "https://developers.greenhouse.io/harvest.html",
    publicFields: [
      { key: "syncDirection", label: "Sync direction", type: "text", placeholder: "import_only", helpText: "Currently only 'import_only' is supported — pull candidates from Greenhouse into the platform." },
    ],
    secretFields: [
      { key: "apiKey", label: "Harvest API key", type: "password", required: true, placeholder: "Greenhouse Harvest API key", helpText: "Create one under Configure → Dev Center → API Credential Management." },
    ],
  },
};

// ============================================================
// DB OPERATIONS
// ============================================================

export interface IntegrationConfigRow {
  integrationId: string;
  enabled: boolean;
  publicConfig: Record<string, unknown> | null;
  /** Returned ONLY for status checks; never includes the actual secret values. */
  hasSecrets: boolean;
  status: "unconfigured" | "configured" | "error";
  lastTestedAt: string | null;
  lastTestResult: string | null;
}

/** Sanitised view for the admin UI — never returns decrypted secrets. */
export async function getIntegrationConfig(integrationId: string): Promise<IntegrationConfigRow | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(integrationConfigs).where(eq(integrationConfigs.integrationId, integrationId));
  if (!row) return null;
  return {
    integrationId: row.integrationId,
    enabled: !!row.enabled,
    publicConfig: (row.publicConfig as any) || null,
    hasSecrets: !!row.secrets,
    status: row.status as any,
    lastTestedAt: row.lastTestedAt,
    lastTestResult: row.lastTestResult,
  };
}

/** All configs for the Integration Hub overview. */
export async function listIntegrationConfigs(): Promise<IntegrationConfigRow[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(integrationConfigs);
  return rows.map((row: any) => ({
    integrationId: row.integrationId,
    enabled: !!row.enabled,
    publicConfig: (row.publicConfig as any) || null,
    hasSecrets: !!row.secrets,
    status: row.status as any,
    lastTestedAt: row.lastTestedAt,
    lastTestResult: row.lastTestResult,
  }));
}

/**
 * Save an integration's config. publicConfig is plain JSON; secrets is
 * encrypted on the way in. Pass undefined for secrets to leave existing
 * encrypted blob untouched (so admins can edit a non-sensitive field
 * without re-typing the API key).
 */
export async function saveIntegrationConfig(opts: {
  integrationId: string;
  enabled?: boolean;
  publicConfig?: Record<string, unknown>;
  secrets?: Record<string, unknown> | undefined;  // undefined = leave alone, {} = clear
  userId?: number;
}): Promise<{ ok: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { ok: false, error: "db unavailable" };

  if (!INTEGRATION_FIELD_SCHEMAS[opts.integrationId]) {
    return { ok: false, error: `unknown integration: ${opts.integrationId}` };
  }

  let encryptedSecrets: string | null | undefined = undefined;
  if (opts.secrets !== undefined) {
    if (Object.keys(opts.secrets).length === 0) {
      encryptedSecrets = null;  // explicit clear
    } else {
      const blob = encrypt(JSON.stringify(opts.secrets));
      if (!blob) {
        return { ok: false, error: "INTEGRATION_SECRETS_KEY env var is missing or invalid (must be 64 hex chars)" };
      }
      encryptedSecrets = blob;
    }
  }

  const existing = await db.select().from(integrationConfigs).where(eq(integrationConfigs.integrationId, opts.integrationId)).limit(1);

  if (existing.length === 0) {
    await db.insert(integrationConfigs).values({
      integrationId: opts.integrationId,
      enabled: opts.enabled ? 1 : 0,
      publicConfig: opts.publicConfig ?? null,
      secrets: encryptedSecrets ?? null,
      status: encryptedSecrets || (opts.publicConfig && Object.keys(opts.publicConfig).length > 0) ? "configured" : "unconfigured",
      createdById: opts.userId,
      updatedById: opts.userId,
    } as any);
  } else {
    const updates: any = { updatedById: opts.userId };
    if (opts.enabled !== undefined)      updates.enabled = opts.enabled ? 1 : 0;
    if (opts.publicConfig !== undefined) updates.publicConfig = opts.publicConfig;
    if (encryptedSecrets !== undefined)  updates.secrets = encryptedSecrets;
    if (encryptedSecrets || opts.publicConfig) updates.status = "configured";
    await db.update(integrationConfigs).set(updates as any).where(eq(integrationConfigs.integrationId, opts.integrationId));
  }

  return { ok: true };
}

/**
 * Internal — used by service code that actually CALLS the third-party API.
 * Returns merged config { publicConfig, secrets }. DB-stored values win;
 * env-var defaults supplied in `envFallback` fill any missing keys.
 *
 * Returns null when the integration is disabled OR has no DB config and
 * no env fallback. Callers should treat that as "feature disabled".
 */
export async function getEffectiveConfig(
  integrationId: string,
  envFallback: { publicConfig?: Record<string, unknown>; secrets?: Record<string, unknown> } = {},
): Promise<{ publicConfig: Record<string, any>; secrets: Record<string, any> } | null> {
  const db = await getDb();
  if (!db) return null;

  const [row] = await db.select().from(integrationConfigs).where(eq(integrationConfigs.integrationId, integrationId));

  let dbPublic: Record<string, any> = {};
  let dbSecrets: Record<string, any> = {};
  let enabled = true;

  if (row) {
    enabled = !!row.enabled;
    dbPublic = (row.publicConfig as any) || {};
    if (row.secrets) {
      const decoded = decrypt(row.secrets);
      if (decoded) {
        try { dbSecrets = JSON.parse(decoded); } catch {}
      }
    }
  }

  const publicConfig = { ...(envFallback.publicConfig || {}), ...dbPublic };
  const secrets      = { ...(envFallback.secrets      || {}), ...dbSecrets };

  // If explicitly disabled OR neither DB nor env had anything → null
  if (!enabled) return null;
  if (Object.keys(publicConfig).length === 0 && Object.keys(secrets).length === 0) return null;

  return { publicConfig, secrets };
}

/**
 * Update test-result fields (lastTestedAt + lastTestResult + status).
 * Called after a "Test connection" click in the UI.
 */
export async function recordTestResult(integrationId: string, ok: boolean, message: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(integrationConfigs)
    .set({
      lastTestedAt: toDbDate(new Date()),
      lastTestResult: message.slice(0, 500),
      status: ok ? "configured" : "error",
    } as any)
    .where(eq(integrationConfigs.integrationId, integrationId));
}

export const integrationConfigService = {
  getIntegrationConfig,
  listIntegrationConfigs,
  saveIntegrationConfig,
  getEffectiveConfig,
  recordTestResult,
  INTEGRATION_FIELD_SCHEMAS,
};
