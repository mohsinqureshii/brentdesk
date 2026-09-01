import { describe, it, expect } from "vitest";

describe("Google Indexing API Service Account", () => {
  it("should have GOOGLE_INDEXING_SERVICE_ACCOUNT env var set", () => {
    const json = process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT;
    expect(json).toBeDefined();
    expect(json).not.toBe("");
  });

  it("should parse as valid JSON with required fields", () => {
    const json = process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT;
    expect(json).toBeDefined();

    const parsed = JSON.parse(json!);
    expect(parsed.type).toBe("service_account");
    expect(parsed.client_email).toBeDefined();
    expect(parsed.client_email).toContain("@");
    expect(parsed.private_key).toBeDefined();
    expect(parsed.private_key).toContain("BEGIN PRIVATE KEY");
    expect(parsed.token_uri).toBeDefined();
    expect(parsed.project_id).toBeDefined();
  });

  it("should be able to generate a JWT and get an access token from Google", async () => {
    const json = process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT;
    expect(json).toBeDefined();

    const creds = JSON.parse(json!);
    const crypto = await import("crypto");

    // Create JWT
    const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
    const now = Math.floor(Date.now() / 1000);
    const payload = Buffer.from(
      JSON.stringify({
        iss: creds.client_email,
        scope: "https://www.googleapis.com/auth/indexing",
        aud: creds.token_uri || "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      })
    ).toString("base64url");

    const signInput = `${header}.${payload}`;
    const sign = crypto.createSign("RSA-SHA256");
    sign.update(signInput);
    const signature = sign.sign(creds.private_key, "base64url");
    const jwt = `${signInput}.${signature}`;

    // Exchange JWT for access token
    const tokenRes = await fetch(creds.token_uri || "https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
      signal: AbortSignal.timeout(15000),
    });

    expect(tokenRes.ok).toBe(true);
    const tokenData = (await tokenRes.json()) as unknown as { access_token: string };
    expect(tokenData.access_token).toBeDefined();
    expect(tokenData.access_token.length).toBeGreaterThan(10);
  }, 20000);
});
