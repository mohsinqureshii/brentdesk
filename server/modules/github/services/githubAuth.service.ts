/**
 * GitHub Auth Service
 * ----------------------------------------------------------------------
 * OAuth (candidate-grant) + GitHub App (installation token) helpers.
 * Credentials come from `integration_configs` with
 * integrationId='github-app' — same pattern Stripe/Resend use. Admin
 * pastes them in the Integration Hub UI and `getEffectiveConfig` reads
 * them back, decrypted.
 *
 * REQUIRED INTEGRATION HUB FIELDS (integration_configs row,
 * integrationId='github-app'):
 *   publicConfig: { appId, clientId, redirectUri? }
 *   secrets:      { clientSecret, privateKey, webhookSecret }
 *
 * Tokens stored on `github_profiles` are encrypted at rest using
 * AES-256-GCM with the GITHUB_TOKEN_ENC_KEY env var (64 hex chars).
 * If the key is missing we fall back to base64 with a loud
 * WARN_PHASE4_ENCRYPTION_TODO log — useful for dev, NEVER for prod.
 */

import crypto from "node:crypto";
import { getEffectiveConfig } from "../../../services/integrationConfig.service";
import { GithubAuthError, GithubConfigError, OauthTokenExchange } from "../types";
import type { GithubAppConfig } from "../types";

const ENC_ALGO = "aes-256-gcm";
const ENC_PREFIX_AES = "v1:aes:";
const ENC_PREFIX_B64 = "v0:b64:"; // dev-only fallback, see warning below

function getEncKey(): Buffer | null {
  const hex = process.env.GITHUB_TOKEN_ENC_KEY;
  if (!hex || hex.length !== 64 || !/^[0-9a-fA-F]+$/.test(hex)) return null;
  return Buffer.from(hex, "hex");
}

/** Encrypt an OAuth token for storage. */
export function encrypt(secret: string): string {
  const key = getEncKey();
  if (!key) {
    console.warn(
      "[GitHub] WARN_PHASE4_ENCRYPTION_TODO: GITHUB_TOKEN_ENC_KEY env var missing — falling back to base64. DO NOT SHIP TO PROD.",
    );
    return ENC_PREFIX_B64 + Buffer.from(secret, "utf8").toString("base64");
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ENC_ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ENC_PREFIX_AES + Buffer.concat([iv, tag, enc]).toString("base64");
}

/** Decrypt a token. Returns null if the blob is malformed. */
export function decrypt(blob: string): string | null {
  if (blob.startsWith(ENC_PREFIX_B64)) {
    console.warn(
      "[GitHub] WARN_PHASE4_ENCRYPTION_TODO: decrypting a base64 token — set GITHUB_TOKEN_ENC_KEY and re-encrypt.",
    );
    return Buffer.from(blob.slice(ENC_PREFIX_B64.length), "base64").toString("utf8");
  }
  if (!blob.startsWith(ENC_PREFIX_AES)) return null;
  const key = getEncKey();
  if (!key) return null;
  try {
    const buf = Buffer.from(blob.slice(ENC_PREFIX_AES.length), "base64");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const decipher = crypto.createDecipheriv(ENC_ALGO, key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(enc), decipher.final()]);
    return plain.toString("utf8");
  } catch (err) {
    console.error("[GitHub] decrypt failed:", err);
    return null;
  }
}

/** Read App credentials from integration_configs. Throws if missing. */
export async function getAppConfig(): Promise<GithubAppConfig> {
  const cfg = await getEffectiveConfig("github-app", {
    publicConfig: {
      appId: process.env.GITHUB_APP_ID || "",
      clientId: process.env.GITHUB_APP_CLIENT_ID || "",
    },
    secrets: {
      clientSecret: process.env.GITHUB_APP_CLIENT_SECRET || "",
      privateKey: process.env.GITHUB_APP_PRIVATE_KEY || "",
      webhookSecret: process.env.GITHUB_APP_WEBHOOK_SECRET || "",
    },
  });
  if (!cfg) {
    throw new GithubConfigError(
      "integration 'github-app' not configured. Add credentials in the Integration Hub.",
    );
  }
  const { appId, clientId } = cfg.publicConfig as {
    appId?: string;
    clientId?: string;
  };
  const { clientSecret, privateKey, webhookSecret } = cfg.secrets as {
    clientSecret?: string;
    privateKey?: string;
    webhookSecret?: string;
  };
  if (!clientId || !clientSecret) {
    throw new GithubConfigError(
      "'github-app' missing clientId/clientSecret. Set them in Integration Hub.",
    );
  }
  return {
    appId: appId || "",
    clientId,
    clientSecret,
    privateKey: privateKey || "",
    webhookSecret: webhookSecret || "",
  };
}

/** Build the OAuth authorize URL a candidate visits to start the flow. */
export async function buildAuthorizeUrl(state: string): Promise<string> {
  const cfg = await getAppConfig();
  const redirectUri =
    process.env.GITHUB_OAUTH_REDIRECT_URI ||
    `${process.env.PUBLIC_APP_URL || ""}/api/auth/github/callback`;
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: redirectUri,
    state,
    scope: "read:user user:email public_repo",
    allow_signup: "true",
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

/** Exchange the OAuth callback `code` for an access token. */
export async function exchangeCode(code: string): Promise<OauthTokenExchange> {
  const cfg = await getAppConfig();
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      code,
    }),
  });
  if (!res.ok) {
    throw new GithubAuthError(`token exchange HTTP ${res.status}`);
  }
  const body = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    scope?: string;
    error?: string;
    error_description?: string;
  };
  if (body.error || !body.access_token) {
    throw new GithubAuthError(body.error_description || body.error || "no access_token returned");
  }
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token ?? null,
    scopes: body.scope ? body.scope.split(",").map((s) => s.trim()).filter(Boolean) : [],
  };
}

/**
 * Mint an installation token for a GitHub App installation. Requires the
 * App private key (PEM). Uses pure-Node crypto to sign the App JWT — no
 * extra dependency. Lazy-loads @octokit/auth-app if available for
 * conveniences; otherwise calls the REST endpoint directly.
 */
export async function getInstallationToken(installationId: number): Promise<string> {
  const cfg = await getAppConfig();
  if (!cfg.appId || !cfg.privateKey) {
    throw new GithubConfigError("App installation flow requires appId + privateKey");
  }

  // 1. Build the App JWT (RS256), expires 10 minutes max per GitHub.
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = { iat: now - 30, exp: now + 9 * 60, iss: cfg.appId };
  const b64url = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  const signingInput = `${b64url(header)}.${b64url(payload)}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  let signature: string;
  try {
    signature = signer.sign(cfg.privateKey).toString("base64url");
  } catch (err: any) {
    throw new GithubAuthError(`JWT sign failed: ${err.message || err}`);
  }
  const jwt = `${signingInput}.${signature}`;

  // 2. Exchange JWT for installation access token.
  const res = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${jwt}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new GithubAuthError(`installation token HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const body = (await res.json()) as { token?: string };
  if (!body.token) throw new GithubAuthError("installation token missing in response");
  return body.token;
}

/** Verify a webhook payload signature. Used by /api/webhooks/github. */
export async function verifyWebhookSignature(rawBody: string, signature: string): Promise<boolean> {
  const cfg = await getAppConfig();
  if (!cfg.webhookSecret) return false;
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", cfg.webhookSecret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export const githubAuthService = {
  getAppConfig,
  buildAuthorizeUrl,
  exchangeCode,
  getInstallationToken,
  verifyWebhookSignature,
  encrypt,
  decrypt,
};
