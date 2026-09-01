/**
 * Email Template — Interview Scheduled
 * ----------------------------------------------------------------------
 * Sent to the candidate when an interview is first scheduled.
 * CTA: "Add to calendar" — links to a Google Calendar template URL we
 * synthesize from the interview details.
 */

import {
  TemplateOutput,
  escapeHtml,
  formatDateTime,
  renderLayout,
  renderTextFooter,
} from "./_layout";

export interface InterviewScheduledInput {
  tenantName: string;
  candidateName: string;
  jobTitle: string;
  scheduledAt: Date;
  durationMinutes: number | null;
  meetingUrl: string | null;
  location: string | null;
}

/** Build a Google Calendar "create event" template URL. */
function calendarUrl(input: InterviewScheduledInput): string {
  const start = input.scheduledAt;
  const end = new Date(
    start.getTime() + ((input.durationMinutes ?? 60) * 60_000),
  );
  // Google's dates= format wants YYYYMMDDTHHmmssZ ranges.
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const text = `Interview — ${input.jobTitle}`;
  const detailsParts: string[] = [
    `Interview for ${input.jobTitle}.`,
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

export function build(input: InterviewScheduledInput): TemplateOutput {
  const when = formatDateTime(input.scheduledAt);
  const duration = input.durationMinutes ? `${input.durationMinutes} minutes` : null;

  const subject = `Interview scheduled — ${input.jobTitle}`;

  const rows: string[] = [
    `<tr><td style="padding:6px 0;color:#71717a;width:120px;">When</td><td style="padding:6px 0;">${escapeHtml(when)}</td></tr>`,
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
    <p style="margin:0 0 16px 0;">Your interview for <strong>${escapeHtml(input.jobTitle)}</strong> at ${escapeHtml(input.tenantName)} has been scheduled.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;width:100%;border-collapse:collapse;">
      ${rows.join("\n      ")}
    </table>
    <p style="margin:16px 0 0 0;color:#52525b;">Tap the button below to add this to your calendar.</p>
  `;

  const html = renderLayout({
    tenantName: input.tenantName,
    bodyHtml,
    cta: { label: "Add to calendar", href: calendarUrl(input) },
  });

  const textLines: string[] = [
    `Hi ${input.candidateName},`,
    "",
    `Your interview for ${input.jobTitle} at ${input.tenantName} has been scheduled.`,
    "",
    `When: ${when}`,
  ];
  if (duration) textLines.push(`Duration: ${duration}`);
  if (input.meetingUrl) textLines.push(`Meeting link: ${input.meetingUrl}`);
  if (input.location) textLines.push(`Location: ${input.location}`);
  textLines.push("", `Add to calendar: ${calendarUrl(input)}`);
  textLines.push(renderTextFooter(input.tenantName));

  return { subject, html, text: textLines.join("\n") };
}
