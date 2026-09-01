/**
 * Event Submission AI Moderation Service
 * ----------------------------------------------------------------------
 * A user pastes an event into /events/submit, we drop a row in
 * `event_submissions` with status='pending', then call this service
 * fire-and-forget. The LLM scores the submission as "looks legit"
 * vs "looks like spam/test/junk" and we update the row accordingly.
 *
 * Statuses set here:
 *   - 'ai_approved' : isLegit === true AND confidence >= 70
 *   - 'ai_flagged'  : everything else (low confidence OR isLegit=false)
 *   - 'pending'     : unchanged (we leave it alone on LLM errors so the
 *                     admin still sees it in the queue)
 *
 * Cost: ~500 prompt tokens + ~150 completion tokens per call. With
 * gemini-2.5-flash (the model wired into invokeLLM) that's well under
 * a tenth of a cent per submission.
 *
 * Concurrency: we run one LLM call per insert via the
 * `void moderateSubmission(id)` pattern in events.submit. There's no
 * queue or retry — if it crashes mid-call, the submission stays
 * 'pending' and an admin will see it on the dashboard regardless.
 */

import { EDITORIAL_SHORT } from "../config/editorial";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { eventSubmissions } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";

const SYSTEM_PROMPT =
  `You are a moderation assistant for ${EDITORIAL_SHORT}. ` +
  "Users submit industry events (conferences, expos, forums, webinars) " +
  "to the public Events Hub. Your job is to triage submissions into 'looks " +
  "legitimate' vs 'looks suspicious' so a human moderator only has to spend " +
  "time on the latter.\n\n" +
  "Signals of a LEGITIMATE submission:\n" +
  "- Real, plausible venue or recognized virtual platform\n" +
  "- Website / registration URLs on plausible domains (not bit.ly, not localhost, not test.com)\n" +
  "- Start date in the next ~2 years, not 50 years out, not deep in the past\n" +
  "- Organizer name + email on a corporate / org domain (not @test.com, not @example.com)\n" +
  "- Language quality: coherent sentences, no obvious spam phrasing\n" +
  `- Fits the publication's beat: industry/infrastructure/energy events in Saudi Arabia, the GCC or MENA, OR a virtual industry event from a credible global org\n\n` +
  "Signals of SPAM / SCAM / TEST submissions:\n" +
  "- Lorem ipsum, 'test', 'asdf', single-character fields\n" +
  "- Crypto-airdrop, get-rich, MLM, adult content, fake giveaways\n" +
  "- Dates clearly bogus (year 1900, year 2099)\n" +
  "- Email at obviously throwaway domains, or wildly mismatched to organizer name\n" +
  "- URLs to phishing-style domains or already-known scam patterns\n\n" +
  "Be generous to small / regional MENA events with sparse data — a thin " +
  "but coherent listing from a real Riyadh meetup is legitimate, not " +
  "suspicious. Reserve suspicion for active signs of fakery.\n\n" +
  'Return ONLY a JSON object with these exact keys (no markdown fences, no preamble):\n' +
  '{\n' +
  '  "isLegit": true|false,\n' +
  '  "confidence": 0-100,   // your confidence in the isLegit verdict\n' +
  '  "reasoning": "≤ 300 chars, one sentence, plain English"\n' +
  "}";

interface ModerationVerdict {
  isLegit: boolean;
  confidence: number;
  reasoning: string;
}

function buildUserPrompt(s: {
  title: string;
  tagline?: string | null;
  description?: string | null;
  type?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  city?: string | null;
  country?: string | null;
  venue?: string | null;
  websiteUrl?: string | null;
  registrationUrl?: string | null;
  organizerName?: string | null;
  organizerEmail?: string | null;
}): string {
  const lines: string[] = [];
  lines.push(`Title: ${s.title}`);
  if (s.tagline) lines.push(`Tagline: ${s.tagline}`);
  if (s.type) lines.push(`Type: ${s.type}`);
  if (s.startDate) {
    const start = new Date(s.startDate).toISOString().slice(0, 10);
    const end = s.endDate ? new Date(s.endDate).toISOString().slice(0, 10) : null;
    lines.push(`Date: ${end && end !== start ? `${start} → ${end}` : start}`);
  }
  if (s.venue || s.city || s.country) {
    lines.push(
      `Location: ${[s.venue, s.city, s.country].filter(Boolean).join(", ")}`,
    );
  }
  if (s.websiteUrl) lines.push(`Website: ${s.websiteUrl}`);
  if (s.registrationUrl) lines.push(`Registration: ${s.registrationUrl}`);
  if (s.organizerName) lines.push(`Organizer: ${s.organizerName}`);
  if (s.organizerEmail) lines.push(`Organizer email: ${s.organizerEmail}`);
  if (s.description) {
    // Clamp the description so a malicious 5000-char blob can't blow
    // the prompt budget. 1500 chars is plenty for moderation signal.
    const desc = s.description.replace(/\s+/g, " ").trim().slice(0, 1500);
    lines.push(`\nDescription:\n${desc}`);
  }
  return `Submission to evaluate:\n${lines.join("\n")}`;
}

/**
 * Extract `{...}` from an LLM response that might be wrapped in
 * markdown fences or stray prose. Returns null if no JSON object can
 * be salvaged. Mirrors the parser in entityEnrichment.service.ts so
 * the two services degrade the same way on flaky output.
 */
function parseVerdict(raw: string): ModerationVerdict | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  let parsed: any = null;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        parsed = JSON.parse(m[0]);
      } catch {
        return null;
      }
    }
  }
  if (!parsed || typeof parsed !== "object") return null;
  const isLegit = Boolean(parsed.isLegit);
  const confidence = Math.max(
    0,
    Math.min(100, Math.round(Number(parsed.confidence) || 0)),
  );
  const reasoning = String(parsed.reasoning || "").trim().slice(0, 300);
  return { isLegit, confidence, reasoning };
}

/**
 * Score a submission via the LLM and persist the verdict. Never
 * throws — on any failure path we log and leave the row at its
 * current status (typically 'pending'), so admins still review it.
 */
export async function moderateSubmission(submissionId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn(
      `[eventSubmissionModeration] DB unavailable for submission ${submissionId}`,
    );
    return;
  }

  try {
    const rows = await db
      .select()
      .from(eventSubmissions)
      .where(eq(eventSubmissions.id, submissionId))
      .limit(1);
    const submission = rows[0];
    if (!submission) {
      console.warn(`[eventSubmissionModeration] No submission ${submissionId}`);
      return;
    }

    const userPrompt = buildUserPrompt({
      title: submission.title,
      tagline: submission.tagline,
      description: submission.description,
      type: submission.type,
      startDate: submission.startDate,
      endDate: submission.endDate,
      city: submission.city,
      country: submission.country,
      venue: submission.venue,
      websiteUrl: submission.websiteUrl,
      registrationUrl: submission.registrationUrl,
      organizerName: submission.organizerName,
      organizerEmail: submission.organizerEmail,
    });

    const resp = await invokeLLM({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      responseFormat: { type: "json_object" },
    });

    const raw = resp.choices?.[0]?.message?.content;
    const text = typeof raw === "string" ? raw : "";
    const verdict = parseVerdict(text);

    if (!verdict) {
      console.warn(
        `[eventSubmissionModeration] Unparseable LLM output for submission ${submissionId}: ${text.slice(0, 200)}`,
      );
      // Intentionally leave status='pending' so admins still see it.
      return;
    }

    const nextStatus: "ai_approved" | "ai_flagged" =
      verdict.isLegit && verdict.confidence >= 70 ? "ai_approved" : "ai_flagged";

    await db
      .update(eventSubmissions)
      .set({
        moderationStatus: nextStatus,
        moderationScore: verdict.confidence,
        moderationReasoning: verdict.reasoning,
      })
      .where(eq(eventSubmissions.id, submissionId));
  } catch (err) {
    // Eat the error — moderation is best-effort. Anything that fails
    // here leaves the row at 'pending' so admins still see it.
    console.error(
      `[eventSubmissionModeration] Failed to moderate submission ${submissionId}:`,
      err,
    );
  }
}
