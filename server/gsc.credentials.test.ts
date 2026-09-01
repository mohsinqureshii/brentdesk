import { describe, it, expect } from 'vitest';
import { createSign } from 'crypto';

describe('Google Search Console credentials', () => {
  it('should parse GOOGLE_INDEXING_SERVICE_ACCOUNT JSON and obtain an access token', async () => {
    const raw = process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT;
    expect(raw, 'GOOGLE_INDEXING_SERVICE_ACCOUNT env var must be set').toBeTruthy();

    let creds: { type: string; client_email: string; private_key: string; token_uri?: string };
    expect(() => { creds = JSON.parse(raw!); }, 'Must be valid JSON').not.toThrow();

    expect(creds!.type).toBe('service_account');
    expect(creds!.client_email).toBeTruthy();
    expect(creds!.private_key).toBeTruthy();

    // Build signed JWT and exchange for access token (same flow as indexingNotification.service.ts)
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      iss: creds!.client_email,
      sub: creds!.client_email,
      scope: 'https://www.googleapis.com/auth/webmasters.readonly',
      aud: creds!.token_uri || 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })).toString('base64url');

    const signingInput = `${header}.${payload}`;
    const signer = createSign('RSA-SHA256');
    signer.update(signingInput);
    const signature = signer.sign(creds!.private_key, 'base64url');
    const jwt = `${signingInput}.${signature}`;

    const tokenRes = await fetch(creds!.token_uri || 'https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    const tokenData = await tokenRes.json() as unknown as { access_token?: string; error?: string };
    expect(tokenData.error, `Token exchange failed: ${tokenData.error}`).toBeUndefined();
    expect(tokenData.access_token, 'Should receive an access token').toBeTruthy();

    console.log('✅ GSC credentials valid — access token obtained successfully');
    console.log(`   Service account: ${creds!.client_email}`);
  }, 30000);
});
