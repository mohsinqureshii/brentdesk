/**
 * System Health Router
 * ----------------------------------------------------------------------
 * Aggregated configuration + connectivity status for every external
 * integration the Talent Platform depends on. Admins use this from a
 * single dashboard to verify a deploy is healthy without having to
 * SSH into the box and grep logs.
 *
 * Strategy: each integration's own service already exposes an
 * `isConfigured()` check. Where the upstream allows a cheap ping
 * (Qdrant /healthz, Judge0 /system_info), we run it; otherwise we
 * fall back to the configured/missing signal.
 *
 * Authorization: admin only.
 */

import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { isConfigured as isStripeConfigured } from "../services/stripePayment.service";
import { isConfigured as isStripeBillingConfigured } from "../services/stripeBilling.service";
import { isConfigured as isSlackConfigured } from "../services/slackIntegration.service";
import { isConfigured as isGreenhouseConfigured } from "../services/greenhouseIntegration.service";
import { isQdrantConfigured } from "../modules/matching";
import { getSessionStats } from "../middleware/session.middleware";
import { getEffectiveConfig } from "../services/integrationConfig.service";

interface CheckResult {
  name: string;
  configured: boolean;
  reachable: boolean | null;     // null = not pinged (no upstream healthcheck)
  detail: string;
  required: boolean;             // soft-required (platform works without it, but feature-gated)
  envHint?: string;
}

async function pingUrl(url: string, timeoutMs = 3000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

async function checkRedis(): Promise<CheckResult> {
  const stats = await getSessionStats();
  return {
    name: "Redis (sessions)",
    configured: stats.backend === "redis",
    reachable: stats.backend === "redis" ? true : null,
    detail:
      stats.backend === "redis"
        ? `Connected. ~${stats.totalActiveSessions} active sessions tracked.`
        : "In-memory fallback active — sessions die on restart.",
    required: false,
    envHint: "REDIS_URL",
  };
}

async function checkQdrant(): Promise<CheckResult> {
  const configured = await isQdrantConfigured();
  if (!configured) {
    return {
      name: "Qdrant (vector matching)",
      configured: false,
      reachable: null,
      detail: "Not configured. Matching endpoints return PRECONDITION_FAILED.",
      required: false,
      envHint: "QDRANT_URL",
    };
  }
  const cfg = await getEffectiveConfig("qdrant");
  const baseUrl =
    (cfg?.publicConfig as any)?.baseUrl ||
    (cfg?.secrets as any)?.baseUrl ||
    process.env.QDRANT_URL ||
    "";
  const reachable = await pingUrl(`${baseUrl.replace(/\/$/, "")}/healthz`);
  return {
    name: "Qdrant (vector matching)",
    configured: true,
    reachable,
    detail: reachable
      ? "Reachable. Per-tenant collections will be created on first embed."
      : "Configured but /healthz did not respond. Check container + firewall.",
    required: false,
  };
}

async function checkJudge0(): Promise<CheckResult> {
  const cfg = await getEffectiveConfig("judge0");
  const baseUrl =
    (cfg?.publicConfig as any)?.baseUrl ||
    (cfg?.secrets as any)?.baseUrl ||
    process.env.JUDGE0_BASE_URL ||
    "";
  if (!baseUrl) {
    return {
      name: "Judge0 (code execution)",
      configured: false,
      reachable: null,
      detail: "Not configured. Coding-assessment runs degrade gracefully.",
      required: false,
      envHint: "JUDGE0_BASE_URL",
    };
  }
  const reachable = await pingUrl(`${baseUrl.replace(/\/$/, "")}/system_info`);
  return {
    name: "Judge0 (code execution)",
    configured: true,
    reachable,
    detail: reachable
      ? "Reachable. Coding submissions can be evaluated."
      : "Configured but /system_info did not respond.",
    required: false,
  };
}

async function checkOpenAI(): Promise<CheckResult> {
  const cfg = await getEffectiveConfig("ai-claude");
  const key = (cfg?.secrets as any)?.openaiApiKey || process.env.OPENAI_API_KEY || "";
  return {
    name: "OpenAI (embeddings)",
    configured: !!key,
    reachable: null, // not worth pinging — costs a request
    detail: key
      ? "Key present. Resume parsing + embeddings will use it."
      : "No key. Resume parser still runs via the Claude LLM, but embeddings fail.",
    required: false,
    envHint: "OPENAI_API_KEY",
  };
}

async function checkStripe(): Promise<CheckResult> {
  const ok = await isStripeConfigured();
  return {
    name: "Stripe (event tickets)",
    configured: ok,
    reachable: null,
    detail: ok
      ? "Configured. Events Hub internal ticketing flow is live."
      : "Not configured. External-affiliate ticket flow still works.",
    required: false,
    envHint: "STRIPE_SECRET_KEY",
  };
}

async function checkStripeBilling(): Promise<CheckResult> {
  const ok = await isStripeBillingConfigured();
  const cfg = await getEffectiveConfig("stripe-payments");
  const priceIds =
    (cfg?.publicConfig as any)?.subscriptionPriceIds || {};
  const planCount = Object.keys(priceIds).length;
  return {
    name: "Stripe Billing (tenant subscriptions)",
    configured: ok && planCount > 0,
    reachable: null,
    detail: ok
      ? `${planCount} subscription plan ids mapped.`
      : "Shares Stripe key with event tickets. Add subscriptionPriceIds in publicConfig to enable.",
    required: false,
  };
}

async function checkGitHubApp(): Promise<CheckResult> {
  const cfg = await getEffectiveConfig("github-app");
  const appId = (cfg?.publicConfig as any)?.appId;
  const privKey = (cfg?.secrets as any)?.privateKey;
  const configured = !!(appId && privKey);
  return {
    name: "GitHub App (candidate intelligence)",
    configured,
    reachable: null,
    detail: configured
      ? `App id ${appId} registered. Candidate connect flow works.`
      : "Not registered. Candidate GitHub Intelligence section will show 'no profile linked'.",
    required: false,
    envHint: "integration_configs[github-app]",
  };
}

async function checkSlack(): Promise<CheckResult> {
  // null = check platform-wide only; tenant webhooks are per-tenant
  const ok = await isSlackConfigured(null);
  return {
    name: "Slack (recruiter notifications)",
    configured: ok,
    reachable: null,
    detail: ok
      ? "Platform webhook configured. Tenant-specific webhooks override per-tenant."
      : "No platform webhook. Per-tenant webhooks may still be configured.",
    required: false,
  };
}

async function checkGreenhouse(): Promise<CheckResult> {
  const ok = await isGreenhouseConfigured();
  return {
    name: "Greenhouse (ATS sync)",
    configured: ok,
    reachable: null,
    detail: ok
      ? "API key present. Sync available."
      : "Not configured. Tenants can still self-onboard without it.",
    required: false,
  };
}

export const systemHealthRouter = router({
  summary: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    // Run all checks in parallel — none block on each other.
    const checks = await Promise.all([
      checkRedis(),
      checkQdrant(),
      checkJudge0(),
      checkOpenAI(),
      checkStripe(),
      checkStripeBilling(),
      checkGitHubApp(),
      checkSlack(),
      checkGreenhouse(),
    ]);

    const configured = checks.filter((c) => c.configured).length;
    const reachable = checks.filter((c) => c.reachable === true).length;
    const reachableTotal = checks.filter((c) => c.reachable !== null).length;

    return {
      checks,
      summary: {
        total: checks.length,
        configured,
        unconfigured: checks.length - configured,
        reachable,
        reachableTotal,
      },
      generatedAt: new Date().toISOString(),
    };
  }),
});
