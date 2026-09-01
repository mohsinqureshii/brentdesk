/**
 * Email Template — Interview Rescheduled
 * ----------------------------------------------------------------------
 * Sent to the candidate when an interview time is changed.
 * Subject is prefixed with "Rescheduled: " so the candidate's inbox
 * surfaces the change.
 */

import {
  TemplateOutput,
  escapeHtml,
  formatDateTime,
  renderLayout,
  renderTextFooter,
} from "./_layout";

export interface InterviewRescheduledInput {
  tenantName: string;
  candidateName: string;
  jobTitle: string;
  scheduledAt: Date;
  oldScheduledAt: Date;
  durationMinutes: number | null;
  meetingUrl: string | null;
  location: string | null;
}

function calendarUrl(input: InterviewRescheduledInput): string {
  const start = input.scheduledAt;
  const end = new Date(
    start.getTime() + ((input.durationMinutes ?? 60) * 60_000),
  );
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const text = `Interview — ${input.jobTitle}`;
  const detailsParts: string[] = [
    `Rescheduled interview for ${input.jobTitle}.`,
  ];
  if (input.meetingUrl) detailsParts.push(`Join: ${input.meetingUrl}`);
  if (input.location) detailsParts.push(`Location: ${input.location}`);
  const params = new URLSearchParams({
    text,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: detailsParts.join("\n"),
  });
  if (input.location) params.set("location", input.location);
  return `https://calendar.google.com/calendar/r/eventedit?${params.toString()}`;
}

export function build(input: InterviewRescheduledInput): TemplateOutput {
  const when = formatDateTime(input.scheduledAt);
  const oldWhen = formatDateTime(input.oldScheduledAt);
  const duration = input.durationMinutes ? `${input.durationMinutes} minutes` : null;

  const subject = `Rescheduled: Interview — ${input.jobTitle}`;

  const rows: string[] = [
    `<tr><td style="padding:6px 0;color:#71717a;width:140px;">New time</td><td style="padding:6px 0;"><strong>${escapeHtml(when)}</strong></td></tr>`,
    `<tr><td style="padding:6px 0;color:#71717a;">Previous time</td><td style="padding:6px 0;color:#71717a;text-decoration:line-through;">${escapeHtml(oldWhen)}</td></tr>`,
  ];
  if (duration) {
    rows.push(`<tr><td style="padding:6px 0;color:#71717a;">Duration</td><td style="padding:6px 0;">${escapeHtml(duration)}</td></tr>`);
  }
  if (input.meetingUrl) {
    rows.push(`<tr><td style="padding:6px 0;color:#71717a;">Meeting link</td><td style="padding:6px 0;"><a href="${escapeHtml(input.meetingUrl)}" style="color:#2563eb;text-decoration:underline;">${escapeHtml(input.meetingUrl)}</a></td></tr>`);
  }
  if (input.location) {
    rows.push(`<tr><td style="padding:6px 0;color:#71717a;">Location</td><td style="padding:6px 0;">${escapeHtml(input.location)}</td></tr>`);
  }

  const bodyHtml = `
    <p style="margin:0 0 12px 0;">Hi ${escapeHtml(input.candidateName)},</p>
    <p style="margin:0 0 16px 0;">Your interview for <strong>${escapeHtml(input.jobTitle)}</strong> at ${escapeHtml(input.tenantName)} has been rescheduled.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;width:100%;border-collapse:collapse;">
      ${rows.join("\n      ")}
    </table>
    <p style="margin:16px 0 0 0;color:#52525b;">Please update your calendar with the new time.</p>
  `;

  const html = renderLayout({
    tenantName: input.tenantName,
    bodyHtml,
    cta: { label: "Add to calendar", href: calendarUrl(input) },
  });

  const textLines: string[] = [
    `Hi ${input.candidateName},`,
    "",
    `Your interview for ${input.jobTitle} at ${input.tenantName} has been rescheduled.`,
    "",
    `New time: ${when}`,
    `Previous time: ${oldWhen}`,
  ];
  if (duration) textLines.push(`Duration: ${duration}`);
  if (input.meetingUrl) textLines.push(`Meeting link: ${input.meetingUrl}`);
  if (input.location) textLines.push(`Location: ${input.location}`);
  textLines.push("", `Add to calendar: ${calendarUrl(input)}`);
  textLines.push(renderTextFooter(input.tenantName));

  return { subject, html, text: textLines.join("\n") };
}
