/**
 * Carbon Design System regression guard.
 *
 * The restyle to Carbon v11 is spread across two places that can drift apart:
 * a token layer in client/src/index.css, and the component primitives in
 * client/src/components/ui that consume it. Both are easy to undo by accident,
 * because the things that make a UI read as Carbon are the things a
 * copy-pasted shadcn component brings back by default — a rounded corner, a
 * drop shadow, a 3px outer focus ring, a 500 weight.
 *
 * These are checks on the design language, not on pixels. They exist so that
 * adding a component or regenerating one from shadcn fails loudly instead of
 * quietly reintroducing Material defaults into a Carbon app.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

const css = read("client/src/index.css");

describe("Carbon tokens", () => {
  it("defines the Carbon palette steps both themes draw from", () => {
    // Blue 60 is the interactive colour, Gray 100 the primary text, and
    // Red 60 the error. Get these three wrong and nothing else matters.
    expect(css).toContain("--cds-blue-60: #0f62fe");
    expect(css).toContain("--cds-gray-100: #161616");
    expect(css).toContain("--cds-red-60: #da1e28");
  });

  it("ships both Carbon themes: White on :root and Gray 100 under .dark", () => {
    expect(css).toContain("--cds-background: #ffffff");
    expect(css).toContain("--cds-background: #161616");
  });

  it("keeps the radius at zero — the single strongest Carbon tell", () => {
    expect(css).toMatch(/--radius:\s*0rem/);
  });

  it("gives buttons their own colour ramp rather than reusing interactive", () => {
    // button-primary-hover is neither a gray step nor blue-70; if someone
    // maps it onto --cds-interactive the hover state goes subtly wrong.
    expect(css).toContain("--cds-button-primary-hover: #0050e6");
    expect(css).toContain("--cds-button-danger-hover: #b81921");
  });

  it("keeps Carbon's asymmetric button padding, not a symmetric guess", () => {
    expect(css).toContain("--cds-button-padding-inline-start: calc(1rem - 1px)");
    expect(css).toContain("--cds-button-padding-inline-end: calc(4rem - 1px)");
  });

  it("exposes the interactive height scale at Carbon's real steps", () => {
    // 32 / 40 / 48px. A button or field on any other height is off-scale.
    expect(css).toContain("--cds-size-sm: 2rem");
    expect(css).toContain("--cds-size-md: 2.5rem");
    expect(css).toContain("--cds-size-lg: 3rem");
  });

  it("tracks the small productive sizes positively, as Carbon does", () => {
    // Positive tracking at 12 and 14px is what keeps dense product UI
    // legible; copying a web type scale loses it.
    expect(css).toContain("--cds-label-01-ls: 0.32px");
    expect(css).toContain("--cds-body-compact-01-ls: 0.16px");
  });

  it("uses Carbon's 70ms workhorse duration and standard easing", () => {
    expect(css).toContain("--cds-duration-fast-01: 70ms");
    expect(css).toContain("--cds-ease-standard: cubic-bezier(0.2, 0, 0.38, 0.9)");
  });
});

describe("Carbon behaviours", () => {
  it("puts the focus ring inside the element, never as an outer halo", () => {
    expect(css).toContain("outline: 2px solid var(--cds-focus)");
    expect(css).toContain("outline-offset: -2px");
  });

  it("keeps rounded-full working for avatars and status dots", () => {
    // Squaring everything including rounded-full would turn every avatar
    // into a box, which Carbon does not do.
    expect(css).toContain(".rounded-full { border-radius: 9999px; }");
  });

  it("lets a full-width button escape Carbon's 20rem cap", () => {
    expect(css).toContain('[data-slot="button"].w-full');
  });

  it("styles native fields as a filled ground with a bottom rule only", () => {
    expect(css).toContain("border-block-end: 1px solid var(--cds-border-strong-01)");
    // A bare <input> defaults to type=text but matches no attribute
    // selector, so it has to be named explicitly or it keeps the old look.
    expect(css).toContain("input:not([type])");
  });
});

describe("Carbon primitives", () => {
  it("gives the button square corners, a 400 weight and Carbon geometry", () => {
    const button = read("client/src/components/ui/button.tsx");
    expect(button).toContain("rounded-none");
    expect(button).toContain("font-normal");
    expect(button).not.toContain("font-medium");
    // The asymmetric padding and space-between are the geometry; without
    // them the colours are Carbon's but the shape is not.
    expect(button).toContain("--cds-button-padding-inline-start");
    expect(button).toContain("--cds-button-padding-inline-end");
    expect(button).toContain("justify-between");
    // Heights must be Carbon steps: 32 / 40 / 48px.
    expect(button).toMatch(/sm:\s*"h-8/);
    expect(button).toMatch(/default:\s*"h-10"/);
    expect(button).toMatch(/lg:\s*"h-12"/);
  });

  it("pads sm buttons symmetrically for dense contexts", () => {
    // The asymmetric padding is for the standalone button. ~250 sm buttons
    // sit in table rows and toolbars where 63px of trailing padding would
    // push them out of their cells, so sm uses the ghost padding instead.
    const button = read("client/src/components/ui/button.tsx");
    const sm = button.slice(button.indexOf('size: ["sm"]'));
    expect(sm).toContain("--cds-button-padding-inline-ghost");
    expect(sm.slice(0, 200)).not.toContain("--cds-button-padding-inline-end");
  });

  it("keeps no outer ring or shadow on the button", () => {
    const button = read("client/src/components/ui/button.tsx");
    expect(button).not.toMatch(/ring-\[3px\]/);
    expect(button).not.toMatch(/shadow-(xs|sm|md)/);
  });

  it("makes the text input a 40px Carbon field", () => {
    const input = read("client/src/components/ui/input.tsx");
    expect(input).toContain("h-10");
    expect(input).toContain("rounded-none");
    expect(input).toContain("border-b border-[var(--cds-border-strong-01)]");
    expect(input).toContain("bg-[var(--cds-field-01)]");
    expect(input).not.toMatch(/ring-\[3px\]/);
  });

  it("treats the Radix select trigger as a field, not a button", () => {
    // A Radix trigger renders a <button>, so the native-field CSS in
    // index.css never reaches it and it has to restate the treatment.
    const select = read("client/src/components/ui/select.tsx");
    expect(select).toContain("data-[size=default]:h-10");
    expect(select).toContain("border-b border-[var(--cds-border-strong-01)]");
    expect(select).toContain("bg-[var(--cds-field-01)]");
  });

  it("keeps the tag round — the one component Carbon does not square", () => {
    const badge = read("client/src/components/ui/badge.tsx");
    expect(badge).toContain("rounded-full");
    expect(badge).toContain("h-6");
    // A Carbon tag is a tinted ground with dark text, never a solid brand
    // fill, or it reads as a button.
    expect(badge).toContain("--cds-tag-gray-bg");
    expect(badge).not.toContain("bg-primary");
  });

  it("makes the card a Carbon tile: square, ruled, unlifted", () => {
    const card = read("client/src/components/ui/card.tsx");
    expect(card).toContain("rounded-none");
    expect(card).toContain("shadow-none");
    expect(card).toContain("border border-[var(--cds-border-subtle-00)]");
  });

  it("does not upper-case data-table column headers", () => {
    // Carbon separates the header with a darker ground, not with caps.
    const table = read("client/src/components/ui/table.tsx");
    expect(table).toContain("normal-case");
    expect(table).not.toContain("uppercase");
    expect(table).toContain("--cds-layer-accent-01");
  });

  it("uses icon-primary for the checkbox, keeping blue for focus", () => {
    const checkbox = read("client/src/components/ui/checkbox.tsx");
    expect(checkbox).toContain("rounded-none");
    expect(checkbox).toContain("border-[var(--cds-icon-primary)]");
    // A blue checkbox reads as permanently focused in a Carbon UI.
    expect(checkbox).not.toContain("bg-primary");
  });

  it("keeps the field label at Carbon's 12px caption weight", () => {
    const label = read("client/src/components/ui/label.tsx");
    expect(label).toContain("text-xs");
    expect(label).toContain("font-normal");
    // Carbon puts the emphasis on the value, never on the caption.
    expect(label).not.toContain("font-medium");
  });
});

describe("IBM Plex", () => {
  it("loads only the weights Carbon uses", () => {
    const html = read("client/index.html");
    expect(html).toContain("IBM+Plex+Sans:wght@300;400;600");
    // Carbon's scale has no 500 and no 700; shipping them invites their use.
    expect(html).not.toMatch(/IBM\+Plex\+Sans[^"']*500/);
    expect(html).not.toMatch(/IBM\+Plex\+Sans[^"']*700/);
  });

  it("leads both font stacks with IBM Plex Sans", () => {
    expect(css).toContain("--font-sans: 'IBM Plex Sans'");
    expect(css).toContain("--font-display: 'IBM Plex Sans'");
  });
});
