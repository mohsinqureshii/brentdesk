/**
 * Generates the neutral category fallback images.
 *
 * An article without a licensed photograph still needs something in its card
 * and its Open Graph tag. The alternative — a generic refinery stock photo
 * attached to an unrelated story — misinforms the reader, so these are
 * deliberately typographic: the BrentDesk wordmark, the category name and a
 * category-keyed accent on the brand ground. They read as house furniture
 * rather than as a picture of the thing being reported.
 *
 * Run: pnpm tsx scripts/generate-category-images.ts
 */

import { writeFileSync, mkdirSync } from "fs";
import path from "path";

const OUT = path.resolve(import.meta.dirname, "..", "client", "public", "assets", "categories");

/** Category label + accent. Accents are spaced around the wheel so adjacent
 *  cards in a mixed feed stay visually distinct. */
const CATEGORIES: Array<[slug: string, label: string, accent: string]> = [
  ["construction", "Construction", "#C2410C"],
  ["infrastructure", "Infrastructure", "#0F766E"],
  ["energy", "Energy", "#B45309"],
  ["oil-gas", "Oil & Gas", "#7C2D12"],
  ["power", "Power", "#A16207"],
  ["renewables", "Renewables", "#15803D"],
  ["utilities", "Utilities", "#0E7490"],
  ["water", "Water", "#0369A1"],
  ["manufacturing", "Manufacturing", "#1D4ED8"],
  ["machinery", "Machinery", "#4338CA"],
  ["heavy-equipment", "Heavy Equipment", "#3730A3"],
  ["mining", "Mining", "#78350F"],
  ["metals", "Metals", "#57534E"],
  ["chemicals", "Chemicals", "#6D28D9"],
  ["logistics", "Logistics", "#BE123C"],
  ["ports", "Ports", "#155E75"],
  ["supply-chain", "Supply Chain", "#9F1239"],
  ["warehousing", "Warehousing", "#86198F"],
  ["transportation", "Transportation", "#1E40AF"],
  ["rail", "Rail", "#334155"],
  ["aviation", "Aviation", "#0284C7"],
  ["roads", "Roads", "#475569"],
  ["real-estate", "Real Estate", "#A21CAF"],
  ["engineering", "Engineering", "#065F46"],
  ["epc", "EPC", "#064E3B"],
  ["industrial-technology", "Industrial Technology", "#4F46E5"],
  ["industrial-ai", "Industrial AI", "#5B21B6"],
  ["automation", "Automation", "#6366F1"],
  ["robotics", "Robotics", "#7E22CE"],
  ["data-centers", "Data Centres", "#1E3A8A"],
  ["telecom-infrastructure", "Telecom Infrastructure", "#0891B2"],
  ["facilities-management", "Facilities Management", "#3F6212"],
  ["general", "BrentDesk", "#111827"],
];

const W = 1200, H = 630;

/** Mix a hex colour toward white. The darker accents (mining, metals, EPC)
 *  are legible as a rule but not as 30px text on a near-black ground, so the
 *  label uses a lightened tint of the same hue. */
function lighten(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const r = mix((n >> 16) & 255), g = mix((n >> 8) & 255), b = mix(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0").toUpperCase()}`;
}

function svg(label: string, accent: string): string {
  // Escape for XML — a category label is trusted, but the generator should
  // not be the reason a stray & breaks every card on the site.
  const safe = label.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="BrentDesk — ${safe}">
  <rect width="${W}" height="${H}" fill="#0B0F14"/>
  <rect x="0" y="0" width="${W}" height="6" fill="${accent}"/>
  <g opacity="0.10" fill="none" stroke="${accent}" stroke-width="1.5">
    ${Array.from({ length: 13 }, (_, i) => `<line x1="${i * 100}" y1="0" x2="${i * 100}" y2="${H}"/>`).join("\n    ")}
    ${Array.from({ length: 7 }, (_, i) => `<line x1="0" y1="${i * 105}" x2="${W}" y2="${i * 105}"/>`).join("\n    ")}
  </g>
  <text x="72" y="300" font-family="Georgia, 'Times New Roman', serif" font-size="76" font-weight="700" fill="#FFFFFF">brentdesk<tspan fill="${accent}">.</tspan></text>
  <text x="72" y="366" font-family="Helvetica, Arial, sans-serif" font-size="30" font-weight="600" letter-spacing="3" fill="${lighten(accent, 0.45)}">${safe.toUpperCase()}</text>
  <text x="72" y="558" font-family="Helvetica, Arial, sans-serif" font-size="21" fill="#94A3B8">The Business of Industry</text>
</svg>
`;
}

mkdirSync(OUT, { recursive: true });
for (const [slug, label, accent] of CATEGORIES) {
  writeFileSync(path.join(OUT, `${slug}.svg`), svg(label, accent));
}
console.log(`[images] wrote ${CATEGORIES.length} category fallbacks to client/public/assets/categories/`);
