/**
 * The legal documents, resolved.
 *
 * Documents are written with `{site}`-style placeholders so the brand
 * lives in one place (shared/publication.ts) and a rename does not mean
 * editing three legal texts by hand. `getLegalDocument` fills them in.
 *
 * An unknown placeholder is left as it was written rather than replaced
 * with "undefined": a legal page with a visible `{foo}` in it is a bug
 * somebody will report, and a legal page asserting "undefined" is a bug
 * nobody will.
 */
import { publication } from "../publication";
import { cookiePolicy } from "./cookies";
import { privacyPolicy } from "./privacy";
import { termsOfUse } from "./terms";
import type { LegalBlock, LegalDocument, LegalLocale, LegalSection } from "./types";

export * from "./types";

export type LegalSlug = "privacy" | "terms" | "cookies";

const DOCUMENTS = {
  privacy: privacyPolicy,
  terms: termsOfUse,
  cookies: cookiePolicy,
} as const;

/** Every value a document may refer to. Facts only — nothing here is
 *  invented for the page; it all comes from the brand config. */
function tokens(): Record<string, string> {
  return {
    site: publication.name,
    legalName: publication.legalName,
    domain: publication.domain,
    city: publication.city,
    privacyEmail: publication.emails.privacy,
    legalEmail: publication.emails.legal,
    helloEmail: publication.emails.hello,
  };
}

function fill(text: string, values: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (whole, key) => values[key] ?? whole);
}

function fillBlock(block: LegalBlock, values: Record<string, string>): LegalBlock {
  switch (block.kind) {
    case "p":
    case "note":
      return { ...block, text: fill(block.text, values) };
    case "list":
      return { ...block, items: block.items.map((i) => fill(i, values)) };
    case "table":
      return {
        ...block,
        head: block.head.map((h) => fill(h, values)),
        rows: block.rows.map((r) => r.map((c) => fill(c, values))),
      };
  }
}

function fillSection(s: LegalSection, values: Record<string, string>): LegalSection {
  return { ...s, title: fill(s.title, values), blocks: s.blocks.map((b) => fillBlock(b, values)) };
}

/**
 * The document for a slug in a language, brand values filled in.
 *
 * A locale we have no translation for falls back to English rather than
 * to nothing: a reader is better served by a policy they can read in a
 * second language than by an empty page, and the alternative would be a
 * site that silently publishes no terms at all in some locale.
 */
export function getLegalDocument(slug: LegalSlug, locale: string): LegalDocument {
  const localized = DOCUMENTS[slug];
  const key: LegalLocale = locale === "ar" ? "ar" : "en";
  const doc = localized[key] ?? localized.en;
  const values = tokens();
  return {
    ...doc,
    title: fill(doc.title, values),
    standfirst: fill(doc.standfirst, values),
    sections: doc.sections.map((s) => fillSection(s, values)),
  };
}

/** The three documents, for footers, sitemaps and the legal index. */
export const LEGAL_SLUGS: LegalSlug[] = ["privacy", "terms", "cookies"];
