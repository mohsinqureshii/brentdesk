/**
 * The legal documents.
 *
 * These live in the codebase as structured data rather than as UI string
 * keys or as prose inside a component, for three reasons.
 *
 *   They are documents, not interface labels. A privacy notice has
 *   sections, tables and a revision date; flattening it into a hundred
 *   `privacy.para17` keys makes it impossible to read in the source and
 *   impossible to review as a whole.
 *
 *   Both languages sit side by side. An Arabic reader is entitled to the
 *   same document, not a summary of it, and keeping the two versions in
 *   one file is the only way a change to one is visibly a change the
 *   other needs too.
 *
 *   They are versioned with the code. `updated` is the date on the page;
 *   changing the text without moving that date is a mistake the review
 *   should catch, and git records who changed what.
 *
 * Nothing here is legal advice, and nothing here asserts a fact about
 * the company that is not already in shared/publication.ts — no
 * registration numbers, no registered address beyond the city, no named
 * officers. Those belong to counsel and to the register, not to a
 * generated page.
 */

/** A paragraph. `{site}` and `{legalName}` are interpolated at render. */
export interface ParagraphBlock {
  kind: "p";
  text: string;
}

/** A bulleted list. Each entry may lead with a bolded term, `Term — rest`. */
export interface ListBlock {
  kind: "list";
  items: string[];
}

/** A table. Used for the cookie inventory and the retention schedule,
 *  which are unreadable as prose. */
export interface TableBlock {
  kind: "table";
  head: string[];
  rows: string[][];
}

/** A callout — the one-line summary that opens a heavy section. */
export interface NoteBlock {
  kind: "note";
  text: string;
}

export type LegalBlock = ParagraphBlock | ListBlock | TableBlock | NoteBlock;

export interface LegalSection {
  /** Anchor, stable across translations so /privacy#rights works in both. */
  id: string;
  title: string;
  blocks: LegalBlock[];
}

export interface LegalDocument {
  title: string;
  /** One sentence under the title: what this document is for. */
  standfirst: string;
  /** ISO date. Shown as "last updated" and used for the effective date. */
  updated: string;
  sections: LegalSection[];
}

export type LegalLocale = "en" | "ar";
export type LocalizedDocument = Record<LegalLocale, LegalDocument>;

/** Shorthands, so the documents below read as documents. */
export const p = (text: string): ParagraphBlock => ({ kind: "p", text });
export const list = (...items: string[]): ListBlock => ({ kind: "list", items });
export const note = (text: string): NoteBlock => ({ kind: "note", text });
export const table = (head: string[], rows: string[][]): TableBlock => ({
  kind: "table",
  head,
  rows,
});
export const section = (id: string, title: string, ...blocks: LegalBlock[]): LegalSection => ({
  id,
  title,
  blocks,
});
