/**
 * Email Templates — Shared Layout
 * ----------------------------------------------------------------------
 * Helpers for the Talent Platform transactional emails.
 *
 * Conventions:
 *   - Inline CSS only (Gmail strips <style>).
 *   - Single-column table layout, max 600px wide.
 *   - No images: TechScoop wordmark is rendered as plain text so it
 *     survives image-blocking inboxes (which is most of them).
 *   - Footer always names TechScoop + tenant + an unsubscribe placeholder
 *     + a plain-text address, for CAN-SPAM / accessibility.
 *
 * These helpers stay deliberately string-based — no templating engine —
 * to keep the dependency footprint at zero.
 */

/** Minimal HTML escape for values interpolated into markup. */
export function escapeHtml(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return "";
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Format a Date for human-readable display in UTC. */
export function formatDateTime(d: Date): string {
  // e.g. "Tue, 18 Jun 2026 14:30 UTC"
  return d.toUTCString().replace(":00 GMT", " UTC").replace(" GMT", " UTC");
}

/** Format just the date portion (YYYY-MM-DD). */
export function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export interface LayoutOptions {
  tenantName: string;
  /** Body HTML — already inline-styled, dropped into the main cell. */
  bodyHtml: string;
  /** Optional CTA. Renders an inline-styled anchor styled like a button. */
  cta?: { label: string; href: string } | null;
}

const TECHSCOOP_ADDRESS = "TechScoop, 1209 Orange Street, Wilmington, DE 19801, USA";
const UNSUBSCRIBE_PLACEHOLDER = "{{unsubscribe_url}}";

/**
 * Wraps body HTML in the shared TechScoop email layout.
 * Recipients see: wordmark header → tenant chip → body → CTA → footer.
 */
export function renderLayout(opts: LayoutOptions): string {
  const tenant = escapeHtml(opts.tenantName);
  const ctaHtml = opts.cta
    ? `
        <tr>
          <td align="left" style="padding:8px 24px 24px 24px;">
            <a href="${escapeHtml(opts.cta.href)}"
               style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;">
              ${escapeHtml(opts.cta.label)}
            </a>
          </td>
        </tr>`
    : "";

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;border:1px solid #e4e4e7;">
            <tr>
              <td style="padding:24px 24px 8px 24px;">
                <p style="margin:0;font-size:20px;font-weight:700;letter-spacing:-0.01em;color:#18181b;">techscoop<span style="color:#a1a1aa;">.</span></p>
                <p style="margin:4px 0 0 0;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:0.08em;">${tenant}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px 8px 24px;font-size:14px;line-height:1.6;color:#27272a;">
                ${opts.bodyHtml}
              </td>
            </tr>
            ${ctaHtml}
            <tr>
              <td style="padding:16px 24px 24px 24px;border-top:1px solid #e4e4e7;font-size:12px;line-height:1.6;color:#a1a1aa;">
                Sent by TechScoop on behalf of ${tenant}.<br />
                <a href="${UNSUBSCRIBE_PLACEHOLDER}" style="color:#a1a1aa;text-decoration:underline;">Unsubscribe</a><br />
                ${escapeHtml(TECHSCOOP_ADDRESS)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * Plain-text footer mirroring the HTML footer. Templates append this to
 * their `text` output for Outlook / accessibility readers.
 */
export function renderTextFooter(tenantName: string): string {
  return [
    "",
    "—",
    `Sent by TechScoop on behalf of ${tenantName}.`,
    `Unsubscribe: ${UNSUBSCRIBE_PLACEHOLDER}`,
    TECHSCOOP_ADDRESS,
  ].join("\n");
}

/** Default tenant name when scope is null (platform-level / cross-tenant). */
export const DEFAULT_TENANT_NAME = "TechScoop";

export interface TemplateOutput {
  subject: string;
  html: string;
  text: string;
}
