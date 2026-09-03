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
 * halves. Same for a decade: "the 1970s" is «سبعينيات القرن الماضي», which
 * carries the fact and no digit, and demanding the 1970 produced «عقد 1970»
 * — grammatical, and not how a Gulf desk writes. Same for a chemical
 * formula: the 2 in CO2 cannot go missing.
 *
 * Everything else — every price, tonnage, percentage and year standing on
 * its own — is still compared exactly. The exemption is narrow by
 * construction: a bare year like "2026" does not match, only one written as
 * a decade.
 */
const TOKEN_DIGITS = /\b(?:Q[1-4]|H[12]|(?:1[89]|20)\d0s|[CNS]O2)\b/gi;

/**
 * Every reading of every figure in the prose.
 *
 * Separators are genuinely ambiguous across scripts: "1.000" is a thousand in
 * much of the world and one in English, and "3.0" and "3" are the same
 * quantity written two ways. So each token yields both readings — with the
 * dot kept as a decimal point, and with it removed as a separator — and a
 * source figure counts as present if either reading appears. That accepts
 * «3 مليارات» for "$3.0 billion" and «1.000» for "1,000" while still
 * catching a figure that is simply gone.
 */
function numberForms(token: string): string[] {
  const noCommas = token.replace(/,/g, "").replace(/[.,]$/, "");
  const asDecimal = Number(noCommas);
  const asSeparated = Number(noCommas.replace(/\./g, ""));
  const out = new Set<string>();
  out.add(Number.isFinite(asDecimal) ? String(asDecimal) : noCommas);
  out.add(Number.isFinite(asSeparated) ? String(asSeparated) : noCommas);
  return [...out];
}

function figures(html: string): string[][] {
  // Figures in the PROSE are facts. Digits inside markup are not: a slug like
  // /construction/big-5-opens carries a 5 that no translation should be
  // expected to reproduce, and counting it would flag every correctly
  // translated paragraph that contains a link.
  //
  // Entities go the same way. `&#8377;` is a rupee sign, and its code point is
  // not a figure in the prose — leaving it in made the 8377 a fact the
  // translation had to reproduce, which is only satisfiable by keeping the
  // raw entity.
  const prose = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&#?[a-z0-9]{1,8};/gi, " ")
    .replace(TOKEN_DIGITS, " ");
  return (prose.match(NUMBER_RE) ?? []).map(numberForms);
}

/**
 * Numerals that an Arabic ordinal word states without writing a digit.
 *
 * English writes the tenth licensing round as "Round 10". Arabic writes it
 * "الجولة العاشرة" — an ordinal word, because "الجولة 10" is not how the
 * language sets an ordinal. The figure is present in the translation; it is
 * simply not spelled with a digit, and flagging it would push translators to
 * write unidiomatic Arabic to satisfy a checker.
 *
 * Only ordinals are treated this way, and only when the word is actually in
 * the text. A quantity — a contract value, a capacity, a count — still has to
 * appear as a numeral, which is how quantities are written in Arabic prose
 * too. So this narrows the check by exactly one construction rather than
 * loosening it.
 *
 * No `\\b` anchors: JavaScript defines a word boundary over [A-Za-z0-9_],
 * so every Arabic letter counts as a non-word character and `\\bالعاشرة\\b`
 * never matches anything. Substring matching is what works here, and these
 * words are distinctive enough that it does not over-match.
 */
const ARABIC_ORDINALS: [RegExp, string][] = [
  [/الأول[ىة]?/, "1"],  [/الثاني[ةه]?/, "2"],
  [/الثالث[ةه]?/, "3"], [/الرابع[ةه]?/, "4"],
  [/الخامس[ةه]?/, "5"], [/السادس[ةه]?/, "6"],
  [/السابع[ةه]?/, "7"], [/الثامن[ةه]?/, "8"],
  [/التاسع[ةه]?/, "9"], [/العاشر[ةه]?/, "10"],
];

function ordinalFigures(text: string): string[] {
  return ARABIC_ORDINALS.filter(([re]) => re.test(text)).map(([, n]) => n);
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

    // A figure that appears in the English and not the translation means a
    // fact went missing.
    const present = new Set([...figures(out).flat(), ...ordinalFigures(out)]);
    const missing = figures(src)
      .filter(forms => !forms.some(f => present.has(f)))
      .map(forms => forms[0]);
    if (missing.length) {
      problems.push({ field, problem: `figures missing from the translation: ${missing.slice(0, 5).join(", ")}` });
    }
  }
  return problems;
}
