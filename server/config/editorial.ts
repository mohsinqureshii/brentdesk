/**
 * BrentDesk editorial identity for AI systems.
 *
 * Every AI service that needs to know what the publication is, what it
 * covers, and how it scores relevance must build its prompts from this
 * module instead of hardcoding publication copy. Rewriting the publication's
 * editorial mandate should require touching only this file (and
 * shared/publication.ts for brand identity).
 */

import { publication } from "../../shared/publication";

/** Sectors that define the publication's editorial universe. */
export const EDITORIAL_SECTORS = [
  "Construction",
  "Infrastructure",
  "Energy",
  "Oil & Gas",
  "Utilities",
  "Manufacturing",
  "Industrial Technology",
  "Logistics",
  "Supply Chain",
  "Transportation",
  "Aviation",
  "Ports",
  "Rail",
  "Mining",
  "Metals",
  "Chemicals",
  "Real Estate Development",
  "Facilities Management",
  "Data Centers",
  "Telecom Infrastructure",
  "Smart Cities",
  "Industrial AI",
  "Robotics",
  "Automation",
  "Heavy Equipment",
  "Machinery",
  "Engineering",
  "EPC",
  "Maintenance",
  "Asset Management",
] as const;

/** Story types the publication prioritizes, used in discovery scoring. */
export const STRONG_TOPICS = [
  "project awards and construction contracts",
  "EPC awards",
  "infrastructure programs",
  "industrial facilities and manufacturing investment",
  "logistics infrastructure (ports, airports, rail, roads, warehousing)",
  "energy infrastructure (oil & gas, power, renewables, water)",
  "data centers and telecom infrastructure",
  "major real estate development",
  "industrial technology, automation and robotics",
  "asset management and maintenance technology",
  "heavy equipment and machinery",
  "strategic partnerships and joint ventures",
  "government industrial initiatives and regulation",
  "executive appointments in industrial companies",
  "industrial M&A and corporate investment",
  "project finance and infrastructure investment",
] as const;

/** Geographic priority, highest first. */
export const GEO_PRIORITY = publication.geoPriority;

/**
 * Core identity paragraph shared by system prompts. Keep it factual and
 * short — individual services append their task-specific instructions.
 */
export const EDITORIAL_IDENTITY = `${publication.name} is a professional business publication covering the physical economy: construction, infrastructure, energy, oil & gas, utilities, manufacturing, logistics, supply chain, transportation, mining, metals, chemicals, real estate development, data centers, telecom infrastructure, industrial technology, automation and heavy industry. Geographic priority: Saudi Arabia first, then the wider GCC, then MENA, then global developments materially relevant to those markets. ${publication.name} is NOT a general technology or startup blog — technology is covered only where it intersects with industry, infrastructure, construction, energy, operations or the physical economy.`;

/**
 * Relevance rubric for discovery/scoring engines.
 * Tier scores are 0-100.
 */
export const SCORING_RUBRIC = `Score stories for ${publication.name} on a 0-100 scale:
- 90-100 (Tier 1): Saudi industrial/business news — project awards, EPC contracts, industrial facilities, energy and infrastructure programs, major real estate development, industrial M&A, senior executive appointments at industrial companies.
- 70-89 (Tier 2): GCC infrastructure and industry news of the same character (UAE, Qatar, Kuwait, Bahrain, Oman).
- 50-69 (Tier 3): MENA industrial developments, and global industrial/energy/logistics news with direct, material relevance to Saudi/GCC/MENA markets (suppliers, contractors, investors, commodity flows).
- 30-49: Marginally relevant business news — cover only if a strong local angle exists.
- 0-29: Not relevant — general consumer technology, startup fundraising with no industrial angle, consumer apps, entertainment, generic global business news.
Generic startup fundraising must NOT score highly unless the company operates in ${publication.name}'s industrial sectors or the round funds industrial capacity. Generic consumer-app news scores poorly unless it materially affects the publication's industries.`;

/**
 * House style for AI-assisted composition. Enforced in system prompts.
 */
export const HOUSE_STYLE = `Write factual, publication-quality copy in a professional newsroom register. Lead with who + did what + where + value + timing + why it matters. Never invent investment amounts, project values, dates, quotes, executives, partners, or locations — omit what is not in the source material. Avoid marketing vocabulary ("revolutionizing", "game-changing", "groundbreaking", "cutting-edge", "transformative", "seamless", "unlocking", "reshaping the landscape") unless quoting a source verbatim. Prefer concrete figures, named entities and dates over adjectives.`;

/**
 * Compact one-line descriptor for prompts with tight token budgets.
 */
export const EDITORIAL_SHORT = `${publication.name}, a professional publication covering construction, infrastructure, energy, manufacturing, logistics and the industrial economy of Saudi Arabia, the GCC and MENA`;
