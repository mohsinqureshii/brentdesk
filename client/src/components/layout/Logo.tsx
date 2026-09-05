/**
 * The BrentDesk mark.
 *
 * A lockup, not a word: `Brent` in the heaviest weight the display face
 * has, `Desk` in the lightest, a gradient rule the exact width of `Brent`
 * beneath them, a hairline, and the descriptor stacked in three lines of
 * letterspaced caps. Drawn in type and CSS rather than shipped as an SVG
 * so it stays sharp at any size, inherits the colour of whatever it sits
 * on, and can be set in Arabic without a second asset.
 *
 * Two variants:
 *   full  — the whole lockup. The masthead, the footer, the drawer.
 *   mark  — wordmark and rule only, for widths that cannot hold the
 *           descriptor legibly (a phone masthead, a favicon-sized slot).
 *
 * Everything is sized in `em`, so the caller sets one font-size on the
 * component and the rule, the hairline and the descriptor all scale with
 * it as a single object.
 */

import { useLocale } from "@/components/LocaleProvider";

/**
 * The mark, per language.
 *
 * `heavy` and `light` are the two halves of the word; the gradient rule
 * runs under `heavy` alone, which is what gives the lockup its weight on
 * the left. `descriptor` is the stack — three lines, read downward.
 *
 * Arabic is not merely a translation here. Arabic has no capitals, so
 * "small caps" is meaningless, and letterspacing an Arabic word breaks
 * the joins between its letters — so the Arabic descriptor is set at its
 * natural spacing and slightly larger to hold the same optical weight.
 */
interface MarkParts {
  heavy: string;
  light: string;
  descriptor: [string, string, string];
  /** Latin marks take tracking; Arabic must not. */
  tracked: boolean;
  /**
   * What sits between the two halves. English runs them together —
   * BrentDesk is one word, and the weight change is the join. Arabic
   * has no camel case, and برنتديسك set solid is not a word anybody can
   * read, so the Arabic mark keeps its space.
   */
  join: string;
}

const MARKS: Record<string, MarkParts> = {
  en: {
    heavy: "Brent",
    light: "Desk",
    descriptor: ["Global", "Industry", "Intelligence"],
    tracked: true,
    join: "",
  },
  ar: {
    heavy: "برنت",
    light: "ديسك",
    // Read down the stack this is معلومات صناعية عالمية — global
    // industrial intelligence, the same phrase the English stacks.
    descriptor: ["معلومات", "صناعية", "عالمية"],
    tracked: false,
    join: "\u00a0",
  },
};

/** The rule under `heavy`. Red into orange into yellow, left to right —
 *  and it mirrors with the page, so in Arabic it runs the other way and
 *  still starts at the beginning of the word. */
const RULE_LTR = "linear-gradient(90deg, #e11d48 0%, #f97316 55%, #facc15 100%)";
const RULE_RTL = "linear-gradient(270deg, #e11d48 0%, #f97316 55%, #facc15 100%)";

export interface LogoProps {
  /** `full` includes the hairline and the descriptor stack. */
  variant?: "full" | "mark";
  /** Font size and colour come from here — everything else scales off it. */
  className?: string;
}

export function Logo({ variant = "full", className = "" }: LogoProps) {
  const locale = useLocale();
  const mark = MARKS[locale] ?? MARKS.en;
  const isRtl = locale === "ar";
  const full = variant === "full";

  return (
    <span
      className={`inline-flex items-center select-none leading-none ${className}`}
      // The whole lockup is one accessible name; the descriptor is not
      // three separate words to a screen reader.
      role="img"
      aria-label={`${mark.heavy}${mark.join}${mark.light} — ${mark.descriptor.join(" ")}`}
    >
      <span className="inline-flex flex-col">
        <span
          className="leading-none whitespace-nowrap"
          // Named only for the Latin mark: the display face carries no
          // Arabic, and naming it would drop the Arabic to whatever the
          // browser falls back to. Arabic inherits the page's own face.
          style={mark.tracked ? { fontFamily: "var(--font-display)" } : undefined}
        >
          {/* The rule belongs to `heavy`, so it is drawn inside it. An
              absolutely positioned bar across its own box is exactly the
              width of the word at every size and in every face — no
              measuring, no magic numbers. */}
          <span className={`relative inline-block font-extrabold ${mark.tracked ? "tracking-[-0.015em]" : ""}`}>
            {mark.heavy}
            <span
              aria-hidden
              className="absolute start-0 end-0 bottom-[-0.2em] h-[0.085em]"
              style={{ background: isRtl ? RULE_RTL : RULE_LTR }}
            />
          </span>
          <span className={`font-light ${mark.tracked ? "tracking-[-0.01em]" : ""}`}>
            {mark.join}{mark.light}
          </span>
        </span>
        {/* Room under the baseline for the rule, which is drawn outside
            the text box and would otherwise be clipped by a parent. */}
        <span aria-hidden className="block h-[0.3em]" />
      </span>

      {full && (
        <>
          <span
            aria-hidden
            className="mx-[0.6em] w-px self-stretch bg-current opacity-25 min-h-[1.15em]"
          />
          <span
            className={`inline-flex flex-col justify-center font-bold opacity-70 ${
              mark.tracked ? "uppercase tracking-[0.22em]" : ""
            }`}
            style={{ fontSize: mark.tracked ? "0.26em" : "0.3em", lineHeight: 1.5 }}
            aria-hidden
          >
            {mark.descriptor.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </span>
        </>
      )}
    </span>
  );
}

export default Logo;
