/**
 * Google Service Account auth — shared JWT helper.
 *
 * Used by every Google API client we talk to (Indexing API, GA4 Reporting,
 * AdSense Reporting, Search Console). Replaces the inline JWT impl that
 * previously lived inside indexingNotification.service.ts.
 *
 * Implements the OAuth2 service-account JWT flow (RFC 7523):
 *   1. Build header + claim set
 *   2. Sign with the service account's private key
 *   3. Exchange the signed JWT for a short-lived OAuth2 access token
 *   4. Cache by (clientEmail, scope) for token lifetime - 60s
 *
 * Tokens are cached in-process. A multi-instance deploy will mint
 * tokens per-instance — that's fine, Google's quota is generous.
 */

import crypto from "node:crypto";

export interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

const CACHE = new Map<string, CachedToken>();

/**
 * Get an access token for the given scope. Caches per (email, scope).
 *
 * Pass ONE scope (string) or multiple (joined with space) — Google accepts
 * space-separated scopes.
 */
export async function getGoogleAccessToken(
  serviceAccount: ServiceAccount | string,
  scope: string,
): Promise<string> {
  const creds: ServiceAccount = typeof serviceAccount === "string"
    ? JSON.parse(serviceAccount)
    : serviceAccount;
  if (!creds.client_email || !creds.private_key) {
    throw new Error("Invalid service account: missing client_email or private_key");
  }

  const cacheKey = `${creds.client_email}::${scope}`;
  const cached = CACHE.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }

  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      iss: creds.client_email,
      scope,
      aud: creds.token_uri || "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  ).toString("base64url");

  const signInput = `${header}.${payload}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signInput);
  const signature = signer.sign(creds.private_key, "base64url");
  const jwt = `${signInput}.${signature}`;

  const tokenRes = await fetch(creds.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    signal: AbortSignal.timeout(10_000),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text().catch(() => "");
    throw new Error(`Google token exchange ${tokenRes.status}: ${body.slice(0, 200)}`);
  }

  const data = (await tokenRes.json()) as unknown as { access_token: string; expires_in: number };
  const token = data.access_token;
  CACHE.set(cacheKey, { token, expiresAt: Date.now() + (data.expires_in * 1000) });
  return token;
}

/** Clear all cached tokens — useful when service-account credentials are rotated via Integration Hub. */
export function clearGoogleAccessTokenCache(): void {
  CACHE.clear();
}

export const GOOGLE_SCOPES = {
  indexing:        "https://www.googleapis.com/auth/indexing",
  analyticsRead:   "https://www.googleapis.com/auth/analytics.readonly",
  searchConsole:   "https://www.googleapis.com/auth/webmasters.readonly",
  adsenseRead:     "https://www.googleapis.com/auth/adsense.readonly",
} as const;
