/**
 * Event Reminders Service
 * ----------------------------------------------------------------------
 * Hourly cron: scans for events whose startDate is exactly 7 days,
 * 1 day, or 4 hours away (within the hour window) and sends a reminder
 * email to every "going" + "interested" attendee.
 *
 * Re-send safety: each attendee row has `lastReminderSentAt`. After a
 * dispatch we stamp it with the current time. The window check below
 * is "startDate is between now+offset and now+offset+1h" — so each
 * window naturally fires once per attendee. We also guard with an
 * AND lastReminderSentAt < now - 3h so that two adjacent windows
 * (e.g. operator restart) never double-send within the same hour.
 *
 * Graceful degradation: individual email failures are logged and the
 * loop continues — one bad recipient must not abort the batch.
 */

import { publication, getBaseUrl } from "../../shared/publication";
import { getDb } from "../db";
import {
  events,
  eventAttendees,
  users,
} from "../../drizzle/schema";
import { and, eq, gte, lte, inArray, or, isNull, sql } from "drizzle-orm";
import { sendEmail } from "./email.service";

type ReminderWindow = {
  /** Human label that ends up in the subject line. */
  label: '7 days' | 'tomorrow' | '4 hours';
  /** Offset in ms from "now" — start of the hour-wide bucket. */
  offsetMs: number;
};

const ONE_HOUR = 60 * 60 * 1000;
const REMINDER_WINDOWS: ReminderWindow[] = [
  { label: '7 days',   offsetMs: 7 * 24 * ONE_HOUR },
  { label: 'tomorrow', offsetMs: 24 * ONE_HOUR },
  { label: '4 hours',  offsetMs: 4 * ONE_HOUR },
];

interface ReminderResult {
  processed: number;
  sent: number;
  failed: number;
}

/**
 * Build the plain-text body of the reminder. HTML version is the
 * same content wrapped in a tiny container — we keep it inline to
 * avoid pulling in a templating engine for one email.
 */
function renderTemplate(opts: {
  recipientName: string | null;
  event: { title: string; slug: string; startDate: string | null; timezone: string | null; venueName?: string | null; venue?: string | null; city?: string | null; country?: string | null; };
  windowLabel: ReminderWindow['label'];
}): { subject: string; text: string; html: string } {
  const { recipientName, event, windowLabel } = opts;
  const friendly = windowLabel === 'tomorrow' ? 'tomorrow' : `in ${windowLabel}`;
  const subject = `${event.title} starts ${friendly}`;

  const venueLine = [event.venueName || event.venue, event.city, event.country]
    .filter(Boolean)
    .join(', ');
  const startStr = event.startDate || 'TBA';
  const tz = event.timezone || 'UTC';
  const eventUrl = `${getBaseUrl()}/events/${event.slug}`;
  const icsUrl = `${getBaseUrl()}/events/${event.slug}.ics`;

  const text = [
    `Hey ${recipientName || 'there'},`,
    ``,
    `You marked yourself as Going to ${event.title}.`,
    ``,
    `When: ${startStr} ${tz}`,
    venueLine ? `Where: ${venueLine}` : null,
    ``,
    `Add to calendar: ${icsUrl}`,
    `Event details: ${eventUrl}`,
    ``,
    `— ${publication.name}`,
  ].filter(Boolean).join('\n');

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#18181b;">
      <p style="font-size:13px;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px;">${publication.wordmark} · reminder</p>
      <h1 style="font-size:20px;margin:0 0 12px;">${event.title} starts ${friendly}</h1>
      <p style="font-size:14px;line-height:1.6;color:#52525b;margin:0 0 16px;">
        Hey ${recipientName || 'there'}, you marked yourself as Going to <strong>${event.title}</strong>.
      </p>
      <table style="font-size:14px;width:100%;border-collapse:collapse;margin-bottom:16px;">
        <tr><td style="padding:4px 0;color:#52525b;width:80px;">When</td><td>${startStr} ${tz}</td></tr>
        ${venueLine ? `<tr><td style="padding:4px 0;color:#52525b;">Where</td><td>${venueLine}</td></tr>` : ''}
      </table>
      <p style="margin:0 0 8px;">
        <a href="${icsUrl}" style="display:inline-block;padding:8px 14px;background:#18181b;color:#fff;border-radius:6px;text-decoration:none;font-size:13px;">Add to calendar</a>
        &nbsp;
        <a href="${eventUrl}" style="display:inline-block;padding:8px 14px;border:1px solid #e4e4e7;color:#18181b;border-radius:6px;text-decoration:none;font-size:13px;">Event details</a>
      </p>
      <p style="font-size:12px;color:#a1a1aa;margin-top:24px;">— ${publication.name}</p>
    </div>
  `;

  return { subject, text, html };
}

/**
 * Main entry — called once per hour by the scheduler.
 */
export async function processEventReminders(): Promise<ReminderResult> {
  const result: ReminderResult = { processed: 0, sent: 0, failed: 0 };

  const db = await getDb();
  if (!db) {
    console.warn('[EventReminders] DB not available, skipping run');
    return result;
  }

  const now = new Date();
  // Anti-double-send guard: never re-fire a reminder to the same
  // attendee within 3 hours of the last one. Three hours covers the
  // longest reminder window (4h) minus the cron tick (1h) with margin.
  const reSendCutoffIso = new Date(now.getTime() - 3 * ONE_HOUR)
    .toISOString().slice(0, 19).replace('T', ' ');

  for (const win of REMINDER_WINDOWS) {
    const windowStart = new Date(now.getTime() + win.offsetMs);
    const windowEnd = new Date(now.getTime() + win.offsetMs + ONE_HOUR);

    // Find candidate events whose startDate falls in this window.
    const candidateEvents = await db.select({
      id: events.id,
      title: events.title,
      slug: events.slug,
      startDate: events.startDate,
      timezone: events.timezone,
      venue: events.venue,
      venueName: events.venueName,
      city: events.city,
      country: events.country,
    })
      .from(events)
      .where(and(
        gte(events.startDate, windowStart.toISOString().slice(0, 19).replace('T', ' ')),
        lte(events.startDate, windowEnd.toISOString().slice(0, 19).replace('T', ' ')),
      ));

    if (candidateEvents.length === 0) continue;
    const eventIds = candidateEvents.map(e => e.id);
    const eventById = new Map(candidateEvents.map(e => [e.id, e]));

    // Fetch all attendees for those events who are going/interested
    // AND haven't already been reminded recently.
    const attendees = await db.select({
      id: eventAttendees.id,
      eventId: eventAttendees.eventId,
      userId: eventAttendees.userId,
      status: eventAttendees.status,
      lastReminderSentAt: eventAttendees.lastReminderSentAt,
      userName: users.name,
      userEmail: users.email,
    })
      .from(eventAttendees)
      .leftJoin(users, eq(users.id, eventAttendees.userId))
      .where(and(
        inArray(eventAttendees.eventId, eventIds),
        inArray(eventAttendees.status, ['going', 'interested'] as any),
        or(
          isNull(eventAttendees.lastReminderSentAt),
          lte(eventAttendees.lastReminderSentAt, reSendCutoffIso),
        ),
      ));

    for (const a of attendees) {
      result.processed++;
      if (!a.userEmail) continue;
      const ev = eventById.get(a.eventId);
      if (!ev) continue;

      try {
        const tmpl = renderTemplate({
          recipientName: a.userName,
          event: ev as any,
          windowLabel: win.label,
        });

        const sendResult = await sendEmail({
          to: a.userEmail,
          subject: tmpl.subject,
          text: tmpl.text,
          html: tmpl.html,
          type: 'event_reminder',
          entityType: 'event',
          entityId: a.eventId,
        });

        if (sendResult.ok) {
          result.sent++;
          // Stamp the row so we don't re-send. Even queue-only
          // (no Resend key) counts as "sent" from our POV — the
          // queue row is the durable record.
          await db.update(eventAttendees)
            .set({
              lastReminderSentAt: sql`CURRENT_TIMESTAMP` as any,
            } as any)
            .where(eq(eventAttendees.id, a.id));
        } else {
          result.failed++;
          console.warn(`[EventReminders] send failed for attendee ${a.id} (${a.userEmail}): ${sendResult.error}`);
        }
        // TODO: when the Integration Hub email-template editor lands,
        // route renderTemplate() through it so admins can customize
        // copy per event / per window.
      } catch (err) {
        result.failed++;
        console.error(`[EventReminders] dispatch error for attendee ${a.id}:`, err);
      }
    }
  }

  if (result.processed > 0) {
    console.log(`[EventReminders] processed=${result.processed} sent=${result.sent} failed=${result.failed}`);
  }
  return result;
}

export const eventRemindersService = {
  processEventReminders,
};
