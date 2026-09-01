/**
 * Event Calendar Route (.ics)
 *
 * GET /events/:slug/calendar.ics
 *
 * Returns an iCalendar (RFC 5545) file for a single event so users can
 * "Add to Calendar" from the event detail page. The Pre/Post hero on
 * EventDetail.tsx points its calendar button at this URL (instead of
 * the older client-side data: URI helper) so:
 *   - the link can be shared and pre-rendered on the server
 *   - Outlook / Google / Apple Calendar all get a real .ics download
 *     with a stable filename
 *
 * The iCal payload is hand-rolled (no external dep) — see RFC 5545 §3.1
 * for the line-folding rule and the escape characters below.
 */

import { Router } from "express";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { events } from "../../drizzle/schema";

const router = Router();

const SITE_ORIGIN = "https://techscoop.io";

/**
 * Escape commas, semicolons, backslashes and newlines per RFC 5545 §3.3.11.
 * Newlines collapse to the literal sequence "\n" which calendar clients
 * unescape back into line breaks in the description.
 */
function icsEscape(value: string | null | undefined): string {
  if (!value) return "";
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/**
 * Format a Date / ISO string as YYYYMMDDTHHmmssZ (UTC, no separators).
 * This is the form mandated by DTSTAMP/DTSTART/DTEND when no TZID is set.
 */
function icsUtcStamp(input: Date | string | null | undefined): string {
  const d = input ? new Date(input) : new Date();
  if (isNaN(d.getTime())) return "";
  return d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/**
 * Fold a single long iCal line per RFC 5545 §3.1 (75-octet limit).
 * Continuation lines start with a single SP.
 */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const out: string[] = [];
  let i = 0;
  out.push(line.slice(i, i + 75));
  i += 75;
  while (i < line.length) {
    out.push(" " + line.slice(i, i + 74));
    i += 74;
  }
  return out.join("\r\n");
}

router.get("/events/:slug/calendar.ics", async (req, res) => {
  const slug = String(req.params.slug || "").trim();
  if (!slug) {
    return res.status(400).type("text/plain").send("Missing slug");
  }

  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).type("text/plain").send("Database unavailable");
    }

    const rows = await db
      .select()
      .from(events)
      .where(eq(events.slug, slug))
      .limit(1);
    const event = rows[0];

    if (!event) {
      return res.status(404).type("text/plain").send("Event not found");
    }

    // Fall back to startDate + 2h when no end date is set so the calendar
    // entry has a sensible block instead of a zero-length event.
    const startIso = event.startDate;
    const endIso =
      event.endDate ||
      new Date(new Date(startIso).getTime() + 2 * 60 * 60 * 1000).toISOString();

    const summary = icsEscape(event.title);
    const description = icsEscape(
      event.shortDescription || event.description || ""
    );
    const location = icsEscape(
      [event.venueName || event.venue, event.city, event.country]
        .filter(Boolean)
        .join(", ")
    );
    const url = `${SITE_ORIGIN}/events/${event.slug}`;

    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//TechScoop//Events//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:techscoop-event-${event.id}@techscoop.io`,
      `DTSTAMP:${icsUtcStamp(new Date())}`,
      `DTSTART:${icsUtcStamp(startIso)}`,
      `DTEND:${icsUtcStamp(endIso)}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      location ? `LOCATION:${location}` : "",
      `URL:${url}`,
      `STATUS:CONFIRMED`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].filter(Boolean);

    const body = lines.map(foldLine).join("\r\n") + "\r\n";

    res.set("Content-Type", "text/calendar; charset=utf-8");
    res.set(
      "Content-Disposition",
      `attachment; filename="${event.slug}.ics"`
    );
    // 5-minute cache — short enough that edits propagate quickly but
    // saves repeat hits when the same user re-clicks the button.
    res.set("Cache-Control", "public, max-age=300");
    res.send(body);
  } catch (err) {
    console.error("[eventCalendar] failed:", err);
    res.status(500).type("text/plain").send("Failed to generate calendar");
  }
});

export default router;
