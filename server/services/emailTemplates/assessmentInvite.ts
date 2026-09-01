/**
 * Email Template — Assessment Invite
 * ----------------------------------------------------------------------
 * Sent to a candidate when a recruiter invites them to take a skills
 * assessment. The CTA links straight into the take-the-assessment URL
 * (caller mints the token + URL).
 *
 * We surface the duration prominently — both as a structured row and as
 * an explicit warning paragraph — so candidates don't start a 60-minute
 * timed test on a 5-minute break.
 */

import {
  TemplateOutput,
  escapeHtml,
  formatDateTime,
  renderLayout,
  renderTextFooter,
} from "./_layout";

export interface AssessmentInviteInput {
  tenantName: string;
  candidateName: string;
  templateName: string;
  durationMinutes: number;
  expiresAt: Date | null;
  inviteUrl: string;
}

export function build(input: AssessmentInviteInput): TemplateOutput {
  const subject = `Assessment invite: ${input.templateName}`;
  const expiresLabel = input.expiresAt ? formatDateTime(input.expiresAt) : null;

  const rows: string[] = [
    `<tr><td style="padding:6px 0;color:#71717a;width:140px;">Assessment</td><td style="padding:6px 0;"><strong>${escapeHtml(input.templateName)}</strong></td></tr>`,
    `<tr><td style="padding:6px 0;color:#71717a;">Duration</td><td style="padding:6px 0;">${escapeHtml(input.durationMinutes)} minutes</td></tr>`,
  ];
  if (expiresLabel) {
    rows.push(`<tr><td style="padding:6px 0;color:#71717a;">Invite expires</td><td style="padding:6px 0;">${escapeHtml(expiresLabel)}</td></tr>`);
  }

  const bodyHtml = `
    <p style="margin:0 0 12px 0;">Hi ${escapeHtml(input.candidateName)},</p>
    <p style="margin:0 0 16px 0;">${escapeHtml(input.tenantName)} has invited you to complete a short skills assessment.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;width:100%;border-collapse:collapse;margin:0 0 16px 0;">
      ${rows.join("\n      ")}
    </table>
    <p style="margin:0 0 12px 0;padding:12px;border:1px solid #fde68a;background:#fffbeb;color:#92400e;border-radius:6px;font-size:13px;">
      <strong>Heads up:</strong> Once you start, the timer runs continuously for ${escapeHtml(input.durationMinutes)} minutes. Please make sure you're in a quiet spot with a stable connection before clicking the button below.
    </p>
  `;

  const html = renderLayout({
    tenantName: input.tenantName,
    bodyHtml,
    cta: { label: "Start assessment", href: input.inviteUrl },
  });

  const textLines: string[] = [
    `Hi ${input.candidateName},`,
    "",
    `${input.tenantName} has invited you to complete a short skills assessment.`,
    "",
    `Assessment: ${input.templateName}`,
    `Duration: ${input.durationMinutes} minutes`,
  ];
  if (expiresLabel) textLines.push(`Invite expires: ${expiresLabel}`);
  textLines.push(
    "",
    `Heads up: Once you start, the timer runs continuously for ${input.durationMinutes} minutes. Please be in a quiet spot with a stable connection before starting.`,
    "",
    `Start assessment: ${input.inviteUrl}`,
  );
  textLines.push(renderTextFooter(input.tenantName));

  return { subject, html, text: textLines.join("\n") };
}
