/**
 * Entity Enrichment Service
 * ----------------------------------------------------------------------
 * Generates a factual long-form description for thin profile pages
 * (people, companies, investors, events, accelerators) using only the
 * structured fields the entity already has on file PLUS any news
 * coverage already linked via the article-entity junction tables.
 * Used to bulk up descriptions on profiles that would otherwise land
 * in GSC's "Crawled — currently not indexed" bucket.
 *
 * Source material the prompt can draw on:
 *   - Structured fields on the entity row (name, role, sectors, etc.)
 *   - Excerpts from articles linked via articlePeople / articleCompanies
 *     / articleInvestors / articleEvents / articleAccelerators (added
 *     by enrichOne / enrichBatch when it loads the entity)
 *   - Optional `extraContext` free-text passed by the operator (e.g.
 *     a paragraph from LinkedIn, an About page, a press release)
 *
 * Hard rules baked into every prompt:
 *   - Strict word count target (varies by entity, 100–200)
 *   - Third person, factual, no marketing fluff
 *   - Never invent facts not present in the input
 *   - MENA-aware editorial voice (matches TechScoop's house style)
 *
 * Returns plain text, ready to be saved to the entity's `description`
 * column. Caller is responsible for the actual UPDATE statement.
 *
 * Cost: roughly one 600-token completion per entity (≈ $0.001 with
 * the current model pricing).
 */

import { invokeLLM } from "../_core/llm";

export type EnrichableType = "person" | "company" | "investor" | "event" | "accelerator" | "article";

export interface EnrichmentResult {
  /** The long-form description/bio. For profile entities this maps
   *  directly to the entity's description column. For articles it
   *  holds the generated meta description (≤160 chars). */
  description: string;
  /** Articles only — generated excerpt (≤300 chars). The router
   *  writes this to articles.excerpt when present. */
  excerpt?: string;
  /** Echo of the entity name/title so callers can log/preview without
   *  a second DB read. */
  name: string;
}

/**
 * Source material the prompt builders can draw on, beyond the entity
 * row's own columns. All optional — the prompt degrades gracefully
 * when nothing is provided.
 */
export interface EnrichmentContext {
  /** Article excerpts (≤ 4) of news coverage that mentions this entity.
   *  Pulled from articleX junction tables by the router. */
  articleExcerpts?: Array<{ title: string; excerpt?: string | null }>;
  /** Free-form text the operator pastes — LinkedIn bio, About page,
   *  press-release paragraph. Trimmed to 2000 chars before being
   *  included in the prompt to keep token usage predictable. */
  extraContext?: string;
}

const SYSTEM_PROMPT_BASE =
  "You are an editorial writer for TechScoop, a MENA tech publication. " +
  "Generate a factual third-person profile description from the structured " +
  "data provided. Rules:\n" +
  "- Use ONLY facts present in the input. Do NOT invent details.\n" +
  "- Active voice, plain language, no marketing fluff or superlatives.\n" +
  "- No bullet points, no Markdown, just clean paragraphs.\n" +
  "- Acknowledge unknowns by omission, not by hedging (\"may\", \"likely\").\n" +
  "- MENA context where relevant (Saudi Arabia, UAE, Egypt, regional currencies).\n" +
  "- Output ONLY the description text, nothing else (no preamble, no headings).";

/* ───────────────────── Person ───────────────────── */

interface PersonInput {
  name: string;
  title?: string | null;
  company?: string | null;
  shortBio?: string | null;
  linkedIn?: string | null;
  twitter?: string | null;
  website?: string | null;
  sectors?: Array<{ name: string }>;
  regions?: Array<{ name: string }>;
}

function buildPersonPrompt(p: PersonInput): string {
  const lines: string[] = [];
  lines.push(`Name: ${p.name}`);
  if (p.title) lines.push(`Role: ${p.title}`);
  if (p.company) lines.push(`Organization: ${p.company}`);
  if (p.sectors?.length) lines.push(`Sectors: ${p.sectors.map(s => s.name).join(", ")}`);
  if (p.regions?.length) lines.push(`Regions: ${p.regions.map(r => r.name).join(", ")}`);
  if (p.linkedIn) lines.push(`LinkedIn: ${p.linkedIn}`);
  if (p.twitter)  lines.push(`Twitter: ${p.twitter}`);
  if (p.website)  lines.push(`Website: ${p.website}`);
  if (p.shortBio) lines.push(`\nShort bio (existing): ${p.shortBio}`);
  return (
    `Write a 100–150 word professional bio in third person. Open with the person's name and current role. ` +
    `Mention their organization, sector focus, and notable details from the input. End with one sentence on their broader contribution to the MENA tech ecosystem if the input supports it.\n\n` +
    `Input:\n${lines.join("\n")}`
  );
}

/* ───────────────────── Company ───────────────────── */

interface CompanyInput {
  name: string;
  tagline?: string | null;
  industry?: string | null;
  shortDescription?: string | null;
  location?: string | null;
  foundedYear?: number | null;
  stage?: string | null;
  employeeCount?: string | null;
  totalFunding?: string | null;
  website?: string | null;
  sectors?: Array<{ name: string }>;
  regions?: Array<{ name: string }>;
}

function buildCompanyPrompt(c: CompanyInput): string {
  const lines: string[] = [];
  lines.push(`Name: ${c.name}`);
  if (c.tagline) lines.push(`Tagline: ${c.tagline}`);
  if (c.industry) lines.push(`Industry: ${c.industry}`);
  if (c.location) lines.push(`Headquarters: ${c.location}`);
  if (c.foundedYear) lines.push(`Founded: ${c.foundedYear}`);
  if (c.stage) lines.push(`Stage: ${c.stage.replace(/_/g, " ")}`);
  if (c.employeeCount) lines.push(`Employees: ${c.employeeCount}`);
  if (c.totalFunding) lines.push(`Total funding: ${c.totalFunding}`);
  if (c.sectors?.length) lines.push(`Sectors: ${c.sectors.map(s => s.name).join(", ")}`);
  if (c.regions?.length) lines.push(`Regions of operation: ${c.regions.map(r => r.name).join(", ")}`);
  if (c.website) lines.push(`Website: ${c.website}`);
  if (c.shortDescription) lines.push(`\nShort description (existing): ${c.shortDescription}`);
  return (
    `Write a 150–200 word company description in third person. Open with what the company does (one sentence). ` +
    `Cover its market focus, headquarters, scale (stage/employees/funding if known), and the sector it operates in. ` +
    `Avoid vague claims like "innovative" or "leading"; only state what the input supports.\n\n` +
    `Input:\n${lines.join("\n")}`
  );
}

/* ───────────────────── Investor ───────────────────── */

interface InvestorInput {
  name: string;
  type: string;
  shortDescription?: string | null;
  headquarters?: string | null;
  foundedYear?: number | null;
  teamSize?: string | null;
  aum?: string | null;
  checkSizeMin?: string | null;
  checkSizeMax?: string | null;
  checkSizeCurrency?: string | null;
  investmentStages?: unknown;
  portfolioCount?: number | null;
  website?: string | null;
  sectors?: Array<{ name: string }>;
  regions?: Array<{ name: string }>;
}

function buildInvestorPrompt(i: InvestorInput): string {
  const lines: string[] = [];
  lines.push(`Name: ${i.name}`);
  lines.push(`Type: ${i.type.replace(/_/g, " ")}`);
  if (i.headquarters) lines.push(`Headquarters: ${i.headquarters}`);
  if (i.foundedYear) lines.push(`Founded: ${i.foundedYear}`);
  if (i.teamSize) lines.push(`Team size: ${i.teamSize}`);
  if (i.aum) lines.push(`AUM: ${i.aum}`);
  const stages = Array.isArray(i.investmentStages)
    ? (i.investmentStages as unknown[]).map(String).join(", ")
    : null;
  if (stages) lines.push(`Investment stages: ${stages}`);
  if (i.checkSizeMin && i.checkSizeMax) {
    lines.push(`Check size: ${i.checkSizeCurrency || "USD"} ${i.checkSizeMin}–${i.checkSizeMax}`);
  }
  if (i.portfolioCount) lines.push(`Portfolio companies: ${i.portfolioCount}`);
  if (i.sectors?.length) lines.push(`Sectors: ${i.sectors.map(s => s.name).join(", ")}`);
  if (i.regions?.length) lines.push(`Regions: ${i.regions.map(r => r.name).join(", ")}`);
  if (i.website) lines.push(`Website: ${i.website}`);
  if (i.shortDescription) lines.push(`\nShort description (existing): ${i.shortDescription}`);
  return (
    `Write a 150-word investor profile in third person. State the firm name, type, headquarters, and what they invest in (stage + sectors). ` +
    `Mention check-size range and AUM only if provided. Close with one factual line on their MENA focus if the input supports it.\n\n` +
    `Input:\n${lines.join("\n")}`
  );
}

/* ───────────────────── Event ───────────────────── */

interface EventInput {
  title: string;
  type: string;
  format?: string | null;
  shortDescription?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  city?: string | null;
  country?: string | null;
  venue?: string | null;
  organizerName?: string | null;
  isFree?: boolean | number | null;
  ticketPrice?: string | null;
  ticketCurrency?: string | null;
}

function buildEventPrompt(e: EventInput): string {
  const lines: string[] = [];
  lines.push(`Title: ${e.title}`);
  lines.push(`Type: ${e.type.replace(/_/g, " ")}`);
  if (e.format) lines.push(`Format: ${e.format.replace(/_/g, " ")}`);
  if (e.startDate) {
    const start = new Date(e.startDate).toDateString();
    const end = e.endDate ? new Date(e.endDate).toDateString() : null;
    lines.push(`Dates: ${end && end !== start ? `${start} – ${end}` : start}`);
  }
  if (e.city || e.country) lines.push(`Location: ${[e.city, e.country].filter(Boolean).join(", ")}`);
  if (e.venue) lines.push(`Venue: ${e.venue}`);
  if (e.organizerName) lines.push(`Organizer: ${e.organizerName}`);
  if (e.isFree) {
    lines.push(`Cost: Free`);
  } else if (e.ticketPrice) {
    lines.push(`Cost: ${e.ticketCurrency || "USD"} ${e.ticketPrice}`);
  }
  if (e.shortDescription) lines.push(`\nShort description (existing): ${e.shortDescription}`);
  return (
    `Write a 130–170 word event description in third person. Open with the event title and what kind of event it is. ` +
    `Cover dates, location, format, organizer, and cost if known. Close with one sentence on what attendees can expect, drawing only from the input.\n\n` +
    `Input:\n${lines.join("\n")}`
  );
}

/* ───────────────────── Accelerator ───────────────────── */

interface AcceleratorInput {
  name: string;
  shortDescription?: string | null;
  location?: string | null;
  programLength?: string | null;
  equity?: string | null;
  funding?: string | null;
  cohortSize?: string | null;
  investmentRange?: string | null;
  successStories?: unknown;
  notableAlumni?: unknown;
  totalFunded?: number | null;
  website?: string | null;
}

function buildAcceleratorPrompt(a: AcceleratorInput): string {
  const lines: string[] = [];
  lines.push(`Name: ${a.name}`);
  if (a.location) lines.push(`Location: ${a.location}`);
  if (a.programLength) lines.push(`Program length: ${a.programLength}`);
  if (a.cohortSize) lines.push(`Cohort size: ${a.cohortSize}`);
  if (a.investmentRange) lines.push(`Investment per startup: ${a.investmentRange}`);
  if (a.funding) lines.push(`Funding offered: ${a.funding}`);
  if (a.equity) lines.push(`Equity taken: ${a.equity}`);
  if (a.totalFunded) lines.push(`Total startups funded to date: ${a.totalFunded}`);
  const alumniRaw = Array.isArray(a.notableAlumni) ? a.notableAlumni : [];
  if (alumniRaw.length > 0) {
    const sample = alumniRaw.slice(0, 5).map((x: any) => x?.name || x).filter(Boolean).join(", ");
    if (sample) lines.push(`Notable alumni: ${sample}`);
  }
  if (a.website) lines.push(`Website: ${a.website}`);
  if (a.shortDescription) lines.push(`\nShort description (existing): ${a.shortDescription}`);
  return (
    `Write a 150–200 word accelerator description in third person. Open with what the program is and where it's based. ` +
    `Cover program length, cohort size, investment terms (funding/equity), and notable alumni if any. ` +
    `Close with one factual sentence on their position in the MENA startup ecosystem if the input supports it.\n\n` +
    `Input:\n${lines.join("\n")}`
  );
}

/* ───────────────────── Article ─────────────────────
 *
 * Articles use a different shape than profile entities. The
 * "description" we want for an article isn't a long bio — it's a
 * 140–160 char meta description for SEO, plus an excerpt (≤300 chars)
 * that surfaces on listing pages and as the og:description fallback.
 * One LLM call returns both as JSON; the service parses it and the
 * router writes both columns at once.
 */

interface ArticleInput {
  title: string;
  excerpt?: string | null;
  content?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  primaryCategoryName?: string | null;
}

function buildArticlePrompt(a: ArticleInput): string {
  // Strip HTML and clamp the body so the prompt stays bounded.
  const body = (a.content || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 6000);
  const lines: string[] = [];
  lines.push(`Title: ${a.title}`);
  if (a.primaryCategoryName) lines.push(`Category: ${a.primaryCategoryName}`);
  if (a.excerpt) lines.push(`Existing excerpt (may be empty/short): ${a.excerpt}`);
  if (a.seoDescription) lines.push(`Existing meta description (may be empty): ${a.seoDescription}`);
  lines.push(`\nArticle body:\n${body}`);
  return (
    "Read the article and produce two short summaries. Return ONLY JSON " +
    "with these exact keys (no commentary, no Markdown fences):\n" +
    "{\n" +
    '  "metaDescription": "140–160 chars. Lead with the focus / news value. Active voice. No clickbait.",\n' +
    '  "excerpt":         "2–3 sentences, ≤300 chars. Punchy summary suitable for an article card on a listing page."\n' +
    "}\n" +
    "Both fields must be derived from the article body — do NOT invent facts the body doesn't support. " +
    "MENA tech context where relevant.\n\n" +
    `Input:\n${lines.join("\n")}`
  );
}

/**
 * Render the optional context block appended to every prompt. Pulls in
 * up to 4 news excerpts (truncated) and the operator's free-form
 * extraContext (truncated to 2000 chars). Returns "" when nothing is
 * available so the base prompt is unchanged.
 */
function renderContextBlock(ctx?: EnrichmentContext): string {
  if (!ctx) return "";
  const parts: string[] = [];

  const excerpts = (ctx.articleExcerpts || []).slice(0, 4);
  if (excerpts.length > 0) {
    parts.push(
      "\nRecent news coverage of this entity (use as factual context — these are real published articles):",
    );
    for (const a of excerpts) {
      const ex = (a.excerpt || "").replace(/\s+/g, " ").trim().slice(0, 280);
      parts.push(`- "${a.title}"${ex ? ` — ${ex}` : ""}`);
    }
  }

  const extra = (ctx.extraContext || "").trim().slice(0, 2000);
  if (extra) {
    parts.push("\nAdditional context provided by the editor (treat as factual):");
    parts.push(extra);
  }

  return parts.length > 0 ? "\n" + parts.join("\n") : "";
}

export async function generateDescription(
  type: EnrichableType,
  entity: any,
  context?: EnrichmentContext,
): Promise<EnrichmentResult> {
  let userPrompt: string;
  let name: string;

  switch (type) {
    case "person":
      name = entity.name;
      userPrompt = buildPersonPrompt(entity);
      break;
    case "company":
      name = entity.name;
      userPrompt = buildCompanyPrompt(entity);
      break;
    case "investor":
      name = entity.name;
      userPrompt = buildInvestorPrompt(entity);
      break;
    case "event":
      name = entity.title;
      userPrompt = buildEventPrompt(entity);
      break;
    case "accelerator":
      name = entity.name;
      userPrompt = buildAcceleratorPrompt(entity);
      break;
    case "article":
      name = entity.title;
      userPrompt = buildArticlePrompt(entity);
      break;
    default: {
      const _exhaustive: never = type;
      throw new Error(`Unknown entity type: ${_exhaustive}`);
    }
  }

  // Append the context block (news excerpts + operator-provided text)
  // so the LLM has more raw material to draw from, not just the
  // structured fields. This is what turns sparse profiles into rich
  // ones — names + sectors alone aren't enough for the AI to write
  // anything substantive.
  userPrompt += renderContextBlock(context);

  const resp = await invokeLLM({
    messages: [
      { role: "system", content: SYSTEM_PROMPT_BASE },
      { role: "user", content: userPrompt },
    ],
  });

  const raw = resp.choices?.[0]?.message?.content;
  if (typeof raw !== "string") {
    throw new Error("AI returned no description");
  }

  // Strip any leading/trailing whitespace and accidental code fences
  const cleaned = raw
    .trim()
    .replace(/^```(?:json|markdown|md|text)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  // Articles return a JSON object with two fields. Parse leniently —
  // if the model wrapped extra prose around the JSON, extract the
  // first {...} block.
  if (type === "article") {
    let parsed: any = null;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) {
        try { parsed = JSON.parse(m[0]); } catch {}
      }
    }
    if (!parsed) {
      throw new Error("AI returned invalid JSON for article: " + cleaned.slice(0, 200));
    }
    const metaDescription = String(parsed.metaDescription || "").trim().slice(0, 300);
    const excerpt = String(parsed.excerpt || "").trim().slice(0, 500);
    if (metaDescription.length < 50 || excerpt.length < 50) {
      throw new Error(`AI article output too short (meta=${metaDescription.length}, excerpt=${excerpt.length})`);
    }
    return { description: metaDescription, excerpt, name };
  }

  if (cleaned.length < 60) {
    throw new Error(`AI description too short (${cleaned.length} chars): ${cleaned}`);
  }

  return { description: cleaned, name };
}
