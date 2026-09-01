/**
 * Resume Parser Service
 * ----------------------------------------------------------------------
 * Wraps the shared LLM provider with a deterministic prompt + JSON
 * response format, persists each attempt to `resume_parses` for audit,
 * and updates the candidate row's "current" parsed JSON cache.
 *
 * Quality score (0–100) is a heuristic over field completeness — it's
 * what the recruiter UI uses to flag "needs manual review" parses.
 *
 * Phase 2: the prompt is intentionally simple. Phase 8 will add a
 * structured-output retry loop + PII redaction hooks.
 */

import * as resumeParsesRepo from "../repositories/resumeParses.repository";
import * as candidatesRepo from "../repositories/candidates.repository";
import { invokeLLMProvider } from "../../../services/ai/llmProvider.service";
import { ParsedResume, ResumeParseError } from "../types";

// ------------------------------------------------------------
// Prompt — keep deterministic. Temperature 0 + JSON response.
// ------------------------------------------------------------

const SYSTEM_PROMPT = `You are a resume parser. Given the raw text of a resume, extract the structured fields below.
Respond with ONLY a JSON object. Do not wrap it in markdown fences. Do not add commentary.
Use null for any field that is genuinely missing. Use empty arrays ([]) when no items are found.
Skills should be normalized to lowercase short tokens (e.g. "typescript", "aws", "kubernetes").
Dates should be ISO-like strings ("2023-04", "2023-04-15"), or "Present" for ongoing roles.

Schema:
{
  "name": string | null,
  "email": string | null,
  "phone": string | null,
  "location": string | null,
  "currentTitle": string | null,
  "currentCompany": string | null,
  "yearsExperience": number | null,
  "skills": string[],
  "education": [{"degree": string|null, "institution": string|null, "year": string|null}],
  "experience": [{"company": string|null, "title": string|null, "startDate": string|null, "endDate": string|null, "description": string|null}],
  "summary": string | null
}`;

const EMPTY_PARSE: ParsedResume = {
  name: null,
  email: null,
  phone: null,
  location: null,
  currentTitle: null,
  currentCompany: null,
  yearsExperience: null,
  skills: [],
  education: [],
  experience: [],
  summary: null,
};

// ------------------------------------------------------------
// Public service
// ------------------------------------------------------------

export class ResumeParserService {
  /**
   * Calls the LLM and returns a strongly-typed ParsedResume. Does not
   * persist — callers (typically `parseAndPersist`) own the DB write so
   * they can attach the candidate / media context.
   */
  async parse(rawText: string): Promise<{
    parsed: ParsedResume;
    provider: string;
    model: string;
    latencyMs: number;
  }> {
    if (!rawText || rawText.trim().length < 20) {
      throw new ResumeParseError("Resume text too short to parse");
    }

    const response = await invokeLLMProvider({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: rawText },
      ],
      responseFormat: { type: "json_object" },
      temperature: 0,
      operation: "resume_parse",
    });

    const parsed = this.coerce(response.content);
    return {
      parsed,
      provider: response.provider,
      model: response.model,
      latencyMs: response.latencyMs,
    };
  }

  /**
   * End-to-end: parse the text, write to `resume_parses` (one row per
   * attempt), update the candidate's cached parsed JSON. Returns the
   * parsed shape so callers can return it to the client.
   */
  async parseAndPersist(opts: {
    candidateId: number;
    mediaId: number;
    rawText: string;
  }): Promise<ParsedResume> {
    let parsed: ParsedResume = EMPTY_PARSE;
    let provider: string | null = null;
    let model: string | null = null;
    let latencyMs: number | null = null;
    let errorMessage: string | null = null;

    try {
      const result = await this.parse(opts.rawText);
      parsed = result.parsed;
      provider = result.provider;
      model = result.model;
      latencyMs = result.latencyMs;
    } catch (err: any) {
      errorMessage = err?.message ?? "Unknown parser error";
    }

    const qualityScore = this.qualityScore(parsed);

    await resumeParsesRepo.insert({
      candidateId: opts.candidateId,
      mediaId: opts.mediaId,
      provider,
      model,
      rawText: opts.rawText.slice(0, 65535), // text column cap
      parsedJson: parsed,
      qualityScore,
      error: errorMessage,
      latencyMs,
    });

    if (!errorMessage) {
      await candidatesRepo.setResumeMedia(opts.candidateId, opts.mediaId, parsed);
    }

    if (errorMessage) {
      throw new ResumeParseError(errorMessage);
    }

    return parsed;
  }

  /**
   * Heuristic 0–100 over field completeness. Each populated top-level
   * field is worth a fixed weight; arrays score on length up to a cap.
   * Tuned so a fully-populated parse lands around 100 and a near-empty
   * one near 0.
   */
  qualityScore(parsed: ParsedResume): number {
    let score = 0;
    const point = (cond: unknown, weight: number) => {
      if (cond) score += weight;
    };

    point(parsed.name, 10);
    point(parsed.email, 10);
    point(parsed.phone, 5);
    point(parsed.location, 5);
    point(parsed.currentTitle, 8);
    point(parsed.currentCompany, 7);
    point(parsed.yearsExperience !== null, 5);
    point(parsed.summary, 10);

    const skillsScore = Math.min(parsed.skills?.length ?? 0, 10) * 1.5; // up to 15
    const eduScore = Math.min(parsed.education?.length ?? 0, 3) * 5; // up to 15
    const expScore = Math.min(parsed.experience?.length ?? 0, 5) * 2; // up to 10

    score += skillsScore + eduScore + expScore;
    return Math.min(100, Math.round(score));
  }

  // ----------------------------------------------------------
  // Internals
  // ----------------------------------------------------------

  private coerce(raw: string): ParsedResume {
    let obj: any;
    try {
      // Some providers return fenced JSON despite the prompt — strip it.
      const cleaned = raw
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/```\s*$/i, "");
      obj = JSON.parse(cleaned);
    } catch {
      throw new ResumeParseError("LLM did not return valid JSON");
    }

    return {
      name: stringOrNull(obj?.name),
      email: stringOrNull(obj?.email),
      phone: stringOrNull(obj?.phone),
      location: stringOrNull(obj?.location),
      currentTitle: stringOrNull(obj?.currentTitle),
      currentCompany: stringOrNull(obj?.currentCompany),
      yearsExperience: numberOrNull(obj?.yearsExperience),
      skills: Array.isArray(obj?.skills)
        ? obj.skills.filter((s: unknown) => typeof s === "string").map((s: string) => s.toLowerCase())
        : [],
      education: Array.isArray(obj?.education)
        ? obj.education.map((e: any) => ({
            degree: stringOrNull(e?.degree),
            institution: stringOrNull(e?.institution),
            year: stringOrNull(e?.year),
          }))
        : [],
      experience: Array.isArray(obj?.experience)
        ? obj.experience.map((e: any) => ({
            company: stringOrNull(e?.company),
            title: stringOrNull(e?.title),
            startDate: stringOrNull(e?.startDate),
            endDate: stringOrNull(e?.endDate),
            description: stringOrNull(e?.description),
          }))
        : [],
      summary: stringOrNull(obj?.summary),
    };
  }
}

function stringOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

function numberOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export const resumeParserService = new ResumeParserService();
