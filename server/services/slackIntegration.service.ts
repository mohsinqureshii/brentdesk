/**
 * Slack Integration Service
 * ----------------------------------------------------------------------
 * Tenant-scoped Slack notifications for recruiter events: new
 * application, candidate moved to interview, offer accepted, etc.
 *
 * Configuration:
 *   Per-tenant Slack webhook URL stored in `integration_configs` with
 *   integrationId='slack-tenant-<tenantId>' OR a single platform-wide
 *   webhook under integrationId='slack-platform'. Tenant-specific wins
 *   when both are configured.
 *
 * Auth:
 *   Slack incoming webhooks need no auth — the URL is the secret.
 *   Store under `secrets.webhookUrl`.
 *
 * Scope:
 *   Phase 7 ships the dispatch surface + a handful of event templates.
 *   Channel routing per event-type is configurable via
 *   `publicConfig.eventRouting: { newApplication: "#hiring", ... }`.
 *   The actual subscription wiring (which services call which event)
 *   is left to the consumer modules — services call `notify*` here
 *   when they want to fan out.
 */

import { getEffectiveConfig } from "./integrationConfig.service";

interface SlackConfig {
  webhookUrl: string;
  eventRouting?: Record<string, string>;
}

async function resolveConfig(tenantId: number | null): Promise<SlackConfig | null> {
  // Tenant-specific config wins; fall back to platform-wide.
  if (tenantId) {
    const cfg = await getEffectiveConfig(`slack-tenant-${tenantId}`);
    if (cfg) {
      const url = (cfg.secrets as any)?.webhookUrl;
      if (url) return { webhookUrl: url, eventRouting: (cfg.publicConfig as any)?.eventRouting };
    }
  }
  const platform = await getEffectiveConfig("slack-platform");
  if (!platform) return null;
  const url = (platform.secrets as any)?.webhookUrl || process.env.SLACK_WEBHOOK_URL;
  if (!url) return null;
  return {
    webhookUrl: url,
    eventRouting: (platform.publicConfig as any)?.eventRouting,
  };
}

export async function isConfigured(tenantId: number | null): Promise<boolean> {
  const cfg = await resolveConfig(tenantId);
  return !!cfg;
}

// ----------------------------------------------------------------
// Low-level send
// ----------------------------------------------------------------

async function postWebhook(webhookUrl: string, payload: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error("[Slack] webhook returned", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Slack] webhook send failed:", err);
    return false;
  }
}

// ----------------------------------------------------------------
// Event helpers — fire and forget. Don't block the caller on failure.
// ----------------------------------------------------------------

export async function notifyNewApplication(
  tenantId: number | null,
  data: {
    jobTitle: string;
    jobUrl: string;
    applicantName: string;
    applicantEmail: string;
  },
): Promise<void> {
  const cfg = await resolveConfig(tenantId);
  if (!cfg) return;

  const channel = cfg.eventRouting?.newApplication;
  const payload: Record<string, unknown> = {
    text: `New application: *${data.applicantName}* for <${data.jobUrl}|${data.jobTitle}>`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `:wave: *${data.applicantName}* (<mailto:${data.applicantEmail}|${data.applicantEmail}>) applied to <${data.jobUrl}|${data.jobTitle}>`,
        },
      },
    ],
  };
  if (channel) payload.channel = channel;

  await postWebhook(cfg.webhookUrl, payload);
}

export async function notifyStageChange(
  tenantId: number | null,
  data: {
    candidateName: string;
    candidateUrl: string;
    jobTitle: string;
    fromStage: string;
    toStage: string;
    movedBy: string;
  },
): Promise<void> {
  const cfg = await resolveConfig(tenantId);
  if (!cfg) return;

  const channel = cfg.eventRouting?.stageChange;
  const payload: Record<string, unknown> = {
    text: `${data.candidateName} moved to *${data.toStage}*`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            `:arrow_right: <${data.candidateUrl}|${data.candidateName}> moved ` +
            `from *${data.fromStage}* to *${data.toStage}* for ${data.jobTitle} ` +
            `(by ${data.movedBy})`,
        },
      },
    ],
  };
  if (channel) payload.channel = channel;

  await postWebhook(cfg.webhookUrl, payload);
}

export async function notifyOfferAccepted(
  tenantId: number | null,
  data: {
    candidateName: string;
    jobTitle: string;
    startDate: string | null;
  },
): Promise<void> {
  const cfg = await resolveConfig(tenantId);
  if (!cfg) return;

  const channel = cfg.eventRouting?.offerAccepted;
  const payload: Record<string, unknown> = {
    text: `:tada: *${data.candidateName}* accepted the offer for ${data.jobTitle}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            `:tada: *${data.candidateName}* accepted the offer for ${data.jobTitle}` +
            (data.startDate ? ` (start: ${data.startDate})` : ""),
        },
      },
    ],
  };
  if (channel) payload.channel = channel;

  await postWebhook(cfg.webhookUrl, payload);
}

export async function notifyCustom(
  tenantId: number | null,
  text: string,
  blocks?: unknown[],
  channelOverride?: string,
): Promise<boolean> {
  const cfg = await resolveConfig(tenantId);
  if (!cfg) return false;
  const payload: Record<string, unknown> = { text };
  if (blocks) payload.blocks = blocks;
  if (channelOverride) payload.channel = channelOverride;
  return postWebhook(cfg.webhookUrl, payload);
}
