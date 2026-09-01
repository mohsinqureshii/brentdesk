/**
 * Email Template — Interview Cancelled
 * ----------------------------------------------------------------------
 * Sent to the candidate when an interview is cancelled. Apologetic tone,
 * no CTA — purely informational. We share the reason if one was given so
 * the candidate isn't left guessing.
 */

import {
  TemplateOutput,
  escapeHtml,
  renderLayout,
  renderTextFooter,
} from "./_layout";

export interface InterviewCancelledInput {
  tenantName: string;
  candidateName: string;
  jobTitle: string;
  reason: string;
}

export function build(input: InterviewCancelledInput): TemplateOutput {
  const subject = `Interview cancelled — ${input.jobTitle}`;

  const reasonHtml = input.reason
    ? `<p style="margin:0 0 12px 0;color:#52525b;"><strong>Reason:</strong> ${escapeHtml(input.reason)}</p>`
    : "";

  const bodyHtml = `
    <p style="margin:0 0 12px 0;">Hi ${escapeHtml(input.candidateName)},</p>
    <p style="margin:0 0 12px 0;">We're sorry — your interview for <strong>${escapeHtml(input.jobTitle)}</strong> at ${escapeHtml(input.tenantName)} has been cancelled.</p>
    ${reasonHtml}
    <p style="margin:0 0 12px 0;">We sincerely apologise for any disruption this may have caused. The hiring team will be in touch shortly about next steps, and we appreciate your patience and understanding.</p>
    <p style="margin:0;">Thank you for your interest in joining ${escapeHtml(input.tenantName)}.</p>
  `;

  const html = renderLayout({
    tenantName: input.tenantName,
    bodyHtml,
    cta: null,
  });

  const textLines: string[] = [
    `Hi ${input.candidateName},`,
    "",
    `We're sorry — your interview for ${input.jobTitle} at ${input.tenantName} has been cancelled.`,
  ];
  if (input.reason) {
    textLines.push("", `Reason: ${input.reason}`);
  }
  textLines.push(
    "",
    "We sincerely apologise for any disruption this may have caused. The hiring team will be in touch shortly about next steps, and we appreciate your patience and understanding.",
    "",
    `Thank you for your interest in joining ${input.tenantName}.`,
  );
  textLines.push(renderTextFooter(input.tenantName));

  return { subject, html, text: textLines.join("\n") };
}
