/**
 * Email Service
 * ----------------------------------------------------------------------
 * Single sender abstraction over Resend (https://resend.com/docs).
 * Resend chosen because: simplest auth (one API key), best deliverability
 * for transactional in 2025, no per-domain SMTP setup. SendGrid / SES
 * adapters can be added behind the same `sendEmail()` signature later
 * — callers don't need to change.
 *
 * GRACEFUL DEGRADATION: if RESEND_API_KEY is not set, this service
 * logs the email to console + queues it in `email_notifications` and
 * returns success. That way:
 *   - dev environments don't blow up without a key
 *   - form submissions still get recorded
 *   - admins can see the queue in the database and replay later
 *
 * Hook this into the Integration Hub admin page later to surface key
 * status + delivery logs in the UI.
 */

import { getDb } from "../db";
import { emailNotifications } from "../../drizzle/schema";
import { getEffectiveConfig } from "./integrationConfig.service";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * Resolve effective Resend config — DB-stored config wins, env vars are a
 * fallback for the migration window. Returns null when neither is set
 * (signal to fall through to queue-only).
 */
async function resolveResendConfig(): Promise<{ apiKey?: string; fromAddress: string; replyTo: string } | null> {
  const cfg = await getEffectiveConfig("email-resend", {
    publicConfig: {
      fromAddress: process.env.EMAIL_FROM,
      replyTo: process.env.EMAIL_REPLY_TO,
    },
    secrets: {
      apiKey: process.env.RESEND_API_KEY,
    },
  });
  if (!cfg) return null;
  const apiKey = cfg.secrets.apiKey;
  if (!apiKey) return null;
  return {
    apiKey,
    fromAddress: cfg.publicConfig.fromAddress || "TechScoop <hello@techscoop.io>",
    replyTo:     cfg.publicConfig.replyTo     || "hello@techscoop.io",
  };
}

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  // Bookkeeping — written to email_notifications.entityType / entityId
  // so we can reconcile a queued log row with the eventual delivery.
  entityType?: string;
  entityId?: number;
  /** Notification kind for downstream filtering / analytics. */
  type?: string;
}

export interface SendEmailResult {
  ok: boolean;
  provider: "resend" | "queue-only";
  providerId?: string;
  queuedId?: number;
  error?: string;
}

async function queueOnly(input: SendEmailInput, reason: string): Promise<SendEmailResult> {
  console.warn(`[Email] Queue-only (${reason}): to=${Array.isArray(input.to) ? input.to.join(",") : input.to} subject="${input.subject}"`);
  try {
    const db = await getDb();
    if (!db) return { ok: false, provider: "queue-only", error: "no db" };
    const recipients = Array.isArray(input.to) ? input.to : [input.to];
    const inserted = await db.insert(emailNotifications).values({
      recipientEmail: recipients[0],
      recipientUserId: null,
      subject: input.subject,
      body: input.html || input.text || "",
      type: input.type || "transactional",
      entityType: input.entityType || null,
      entityId: input.entityId || null,
      status: "pending",
    } as any);
    const queuedId = (inserted as any)[0]?.insertId;
    return { ok: true, provider: "queue-only", queuedId };
  } catch (err) {
    console.error("[Email] Queue insert failed:", err);
    return { ok: false, provider: "queue-only", error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Send an email via Resend. Falls back to queue-only when no API key.
 * Also writes to email_notifications regardless so we have a delivery audit trail.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  // Resolve config: DB-stored (Integration Hub) wins, env-var fallback.
  const resolved = await resolveResendConfig();
  if (!resolved) {
    return queueOnly(input, "Resend not configured (paste API key in Integration Hub or set RESEND_API_KEY)");
  }

  const payload = {
    from: input.from || resolved.fromAddress,
    to: Array.isArray(input.to) ? input.to : [input.to],
    subject: input.subject,
    html: input.html,
    text: input.text,
    reply_to: input.replyTo || resolved.replyTo,
  };

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resolved.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[Email] Resend API ${res.status}:`, text);
      // Still queue for retry visibility
      const queued = await queueOnly(input, `resend ${res.status}`);
      return { ...queued, ok: false, provider: "resend", error: `${res.status} ${text.slice(0, 200)}` };
    }

    const data = (await res.json()) as unknown as { id?: string };
    // Mirror to email_notifications as a "sent" row for audit
    try {
      const db = await getDb();
      if (db) {
        await db.insert(emailNotifications).values({
          recipientEmail: Array.isArray(input.to) ? input.to[0] : input.to,
          recipientUserId: null,
          subject: input.subject,
          body: (input.html || input.text || "").slice(0, 10_000),
          type: input.type || "transactional",
          entityType: input.entityType || null,
          entityId: input.entityId || null,
          status: "sent",
        } as any);
      }
    } catch (logErr) {
      console.error("[Email] Audit insert failed (non-fatal):", logErr);
    }
    return { ok: true, provider: "resend", providerId: data.id };
  } catch (err) {
    console.error("[Email] Resend network error:", err);
    return queueOnly(input, "resend network error");
  }
}

// ============================================================
// PRESET TEMPLATES — small set of well-tested HTML snippets used
// by the public form-submission router. Plain HTML strings keep
// deps zero; richer templates can move to a templating engine later.
// ============================================================

export function newsletterWelcomeEmail(email: string): { subject: string; html: string; text: string } {
  return {
    subject: "Welcome to TechScoop",
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#18181b;">
        <p style="font-size:24px;font-weight:bold;margin:0 0 16px;">techscoop.</p>
        <h1 style="font-size:20px;margin:0 0 12px;">You're in.</h1>
        <p style="font-size:14px;line-height:1.6;color:#52525b;">
          Thanks for subscribing. You'll get the TechScoop newsletter — independent reporting on MENA's tech ecosystem, funding rounds, founders, and jobs.
        </p>
        <p style="font-size:14px;line-height:1.6;color:#52525b;">
          Your email: <strong>${email}</strong>
        </p>
        <p style="font-size:13px;color:#a1a1aa;margin-top:24px;">
          Didn't sign up? Reply to this email and we'll remove you immediately.
        </p>
      </div>
    `,
    text: `You're in.\n\nThanks for subscribing to TechScoop. You'll get our newsletter on MENA tech.\n\nYour email: ${email}\n\nDidn't sign up? Reply and we'll remove you.`,
  };
}

export function adminFormNotificationEmail(opts: {
  formType: string;
  fromName?: string;
  fromEmail?: string;
  subject?: string;
  body: string;
  submissionId: number;
}): { subject: string; html: string; text: string } {
  const subject = `[${opts.formType}] new submission${opts.subject ? `: ${opts.subject}` : ""}`;
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:600px;color:#18181b;">
      <p style="font-size:13px;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px;">techscoop · ${opts.formType}</p>
      <h1 style="font-size:18px;margin:0 0 16px;">New ${opts.formType} submission #${opts.submissionId}</h1>
      <table style="font-size:14px;width:100%;border-collapse:collapse;">
        ${opts.fromName ? `<tr><td style="padding:6px 0;color:#52525b;width:120px;">From</td><td>${opts.fromName}</td></tr>` : ""}
        ${opts.fromEmail ? `<tr><td style="padding:6px 0;color:#52525b;">Email</td><td><a href="mailto:${opts.fromEmail}">${opts.fromEmail}</a></td></tr>` : ""}
      </table>
      <hr style="border:0;border-top:1px solid #e4e4e7;margin:16px 0;" />
      <pre style="font-family:ui-monospace,monospace;white-space:pre-wrap;font-size:13px;background:#fafafa;padding:12px;border-radius:6px;">${opts.body}</pre>
      <p style="font-size:12px;color:#a1a1aa;margin-top:16px;">
        Review + reply in the admin: /admin/integrations/inbox/${opts.submissionId}
      </p>
    </div>
  `;
  return { subject, html, text: `${subject}\n\n${opts.body}\n\nView: /admin/integrations/inbox/${opts.submissionId}` };
}

export const emailService = {
  sendEmail,
  newsletterWelcomeEmail,
  adminFormNotificationEmail,
};
