/**
 * Email Template — Offer Sent
 * ----------------------------------------------------------------------
 * Sent to the candidate when a recruiter transitions an offer from
 * `drafted` to `sent`. Includes the formatted letter body (preserving
 * line breaks) and the offer's headline numbers.
 *
 * The CTA `Review offer` currently points at a placeholder route — we'll
 * wire the candidate offer portal URL here once it ships.
 */

import {
  TemplateOutput,
  escapeHtml,
  formatDate,
  formatDateTime,
  renderLayout,
  renderTextFooter,
} from "./_layout";

export interface OfferSentInput {
  tenantName: string;
  candidateName: string;
  jobTitle: string;
  baseSalary: number | string | null;
  currency: string | null;
  startDate: Date | null;
  expiresAt: Date | null;
  letterBody: string | null;
}

const OFFER_PORTAL_PLACEHOLDER = "{{offer_review_url}}";

function formatSalary(amount: number | string | null, currency: string | null): string | null {
  if (amount === null || amount === undefined || amount === "") return null;
  const numeric = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(numeric)) return `${amount} ${currency ?? ""}`.trim();
  // Group thousands; no fractional digits — salaries don't need cents.
  const formatted = numeric.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return `${formatted} ${currency ?? "USD"}`.trim();
}

export function build(input: OfferSentInput): TemplateOutput {
  const subject = `Your offer from ${input.tenantName} — ${input.jobTitle}`;

  const salaryLabel = formatSalary(input.baseSalary, input.currency);
  const startLabel = input.startDate ? formatDate(input.startDate) : null;
  const expiresLabel = input.expiresAt ? formatDateTime(input.expiresAt) : null;

  const rows: string[] = [];
  if (salaryLabel) {
    rows.push(`<tr><td style="padding:6px 0;color:#71717a;width:140px;">Base salary</td><td style="padding:6px 0;"><strong>${escapeHtml(salaryLabel)}</strong></td></tr>`);
  }
  if (startLabel) {
    rows.push(`<tr><td style="padding:6px 0;color:#71717a;">Start date</td><td style="padding:6px 0;">${escapeHtml(startLabel)}</td></tr>`);
  }
  if (expiresLabel) {
    rows.push(`<tr><td style="padding:6px 0;color:#71717a;">Offer expires</td><td style="padding:6px 0;">${escapeHtml(expiresLabel)}</td></tr>`);
  }

  const rowsHtml = rows.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;width:100%;border-collapse:collapse;margin:0 0 16px 0;">
         ${rows.join("\n         ")}
       </table>`
    : "";

  const letterHtml = input.letterBody
    ? `<pre style="white-space:pre-wrap;word-wrap:break-word;font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:1.6;color:#27272a;background:#fafafa;padding:16px;border:1px solid #e4e4e7;border-radius:6px;margin:0 0 8px 0;">${escapeHtml(input.letterBody)}</pre>`
    : "";

  const bodyHtml = `
    <p style="margin:0 0 12px 0;">Hi ${escapeHtml(input.candidateName)},</p>
    <p style="margin:0 0 16px 0;">${escapeHtml(input.tenantName)} is delighted to extend an offer for the <strong>${escapeHtml(input.jobTitle)}</strong> role.</p>
    ${rowsHtml}
    ${letterHtml}
  `;

  const html = renderLayout({
    tenantName: input.tenantName,
    bodyHtml,
    cta: { label: "Review offer", href: OFFER_PORTAL_PLACEHOLDER },
  });

  const textLines: string[] = [
    `Hi ${input.candidateName},`,
    "",
    `${input.tenantName} is delighted to extend an offer for the ${input.jobTitle} role.`,
  ];
  if (salaryLabel) textLines.push("", `Base salary: ${salaryLabel}`);
  if (startLabel) textLines.push(`Start date: ${startLabel}`);
  if (expiresLabel) textLines.push(`Offer expires: ${expiresLabel}`);
  if (input.letterBody) {
    textLines.push("", "---", input.letterBody, "---");
  }
  textLines.push("", `Review offer: ${OFFER_PORTAL_PLACEHOLDER}`);
  textLines.push(renderTextFooter(input.tenantName));

  return { subject, html, text: textLines.join("\n") };
}
