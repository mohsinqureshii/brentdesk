/**
 * Translation checks — pure, and deliberately free of any import that reaches
 * the database or the environment.
 *
 * The same rules apply to a translation a model just produced and to one
 * shipped as a file in the repository, so both the runtime path and the QA
 * script call in here. Keeping it dependency-free is what lets the QA script
 * run without a JWT_SECRET or a database.
 */

const HREF_RE = /href\s*=\s*"([^"]*)"/gi;
const NUMBER_RE = /\d[\d,.]*/g;

function hrefs(html: string): string[] {
  return [...html.matchAll(HREF_RE)].map(m => m[1]).sort();
}

/**
 * Digits that are part of a token rather than a quantity.
 *
 * "Q2 2026" is a quarter, and written Arabic spells it «الربع الثاني» — the
 * 2 is an ordinal word there, not a numeral, so requiring the digit forces a
 * translator to write «الربع الثاني (Q2)» to get past the gate. Same for
 * halves, and same for a chemical formula: the 2 in CO2 is not a figure that
 * can go missing. Everything else — every price, tonnage, percentage and
 * year — is still compared exactly.
 */
const TOKEN_DIGITS = /\b(?:Q[1-4]|H[12]|[CNS]O2)\b/gi;

function digits(html: string): string[] {
  // Figures in the PROSE are facts. Digits inside markup are not: a slug like
  // /construction/big-5-opens carries a 5 that no translation should be
  // expected to reproduce, and counting it would flag every correctly
  // translated paragraph that contains a link.
  const prose = html.replace(/<[^>]*>/g, " ").replace(TOKEN_DIGITS, " ");
  // Compare the digit sequences themselves, ignoring the separators, which
  // legitimately differ between scripts.
  return (prose.match(NUMBER_RE) ?? []).map(n => n.replace(/[,.]/g, "")).sort();
}

export interface FieldProblem { field: string; problem: string }

/** Everything wrong with a candidate translation. Empty means it is safe to
 *  store. */
export function validateTranslation(
  source: Record<string, string>, candidate: Record<string, string>,
): FieldProblem[] {
  const problems: FieldProblem[] = [];
  for (const [field, src] of Object.entries(source)) {
    const out = candidate[field];
    if (!out || !out.trim()) {
      problems.push({ field, problem: "came back empty" });
      continue;
    }

    const srcHrefs = hrefs(src), outHrefs = hrefs(out);
    if (srcHrefs.join("|") !== outHrefs.join("|")) {
      problems.push({
        field,
        problem: `links changed (${srcHrefs.length} in, ${outHrefs.length} out)`,
      });
    }

    const srcTags = (src.match(/<\/?[a-z][^>]*>/gi) ?? []).length;
    const outTags = (out.match(/<\/?[a-z][^>]*>/gi) ?? []).length;
    if (srcTags !== outTags) {
      problems.push({ field, problem: `HTML tag count changed (${srcTags} → ${outTags})` });
    }

    const srcNums = digits(src), outNums = digits(out);
    // A figure that appears in the English and not the translation means a
    // fact went missing. The reverse means one was invented.
    const missing = srcNums.filter(n => !outNums.includes(n));
    if (missing.length) {
      problems.push({ field, problem: `figures missing from the translation: ${missing.slice(0, 5).join(", ")}` });
    }
  }
  return problems;
}
