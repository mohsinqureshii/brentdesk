import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Carbon Design System v11 button.
 *
 * Three things make a button read as Carbon, and all three are here:
 *
 *  1. Square corners and a 400 weight. Carbon buttons are never bold and
 *     never rounded.
 *  2. Asymmetric inline padding on the filled variants — text hard left,
 *     icon slot hard right, `space-between` holding them apart, capped at
 *     20rem. Ghost, link and icon buttons are exempt because Carbon itself
 *     pads those symmetrically.
 *  3. An inset 2px focus ring (applied globally in index.css), not an
 *     outer halo.
 *
 * Size mapping deviates from Carbon's default on purpose. Carbon's default
 * button is `lg` (48px); this app is mostly dense admin tables and a
 * publication front-end, so `default` maps to Carbon `md` (40px) and `lg`
 * is available where a 48px button is wanted. Every height on offer —
 * 32/40/48 — is a real Carbon step, so nothing here is off-scale.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center gap-2 whitespace-nowrap rounded-none text-sm font-normal",
    "shrink-0 outline-none",
    "transition-[background-color,border-color,color] duration-[70ms] ease-[cubic-bezier(0.2,0,0.38,0.9)]",
    "disabled:cursor-not-allowed disabled:bg-[var(--cds-button-disabled)] disabled:text-[var(--cds-text-on-color)] disabled:border-transparent",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    "aria-invalid:border-destructive",
  ],
  {
    variants: {
      variant: {
        // Carbon primary.
        default:
          "bg-[var(--cds-button-primary)] text-[var(--cds-text-on-color)] border border-transparent hover:bg-[var(--cds-button-primary-hover)] active:bg-[var(--cds-button-primary-active)]",
        // Carbon danger (primary danger, not the ghost danger).
        destructive:
          "bg-[var(--cds-button-danger)] text-[var(--cds-text-on-color)] border border-transparent hover:bg-[var(--cds-button-danger-hover)] active:bg-[var(--cds-button-danger-active)]",
        // Carbon tertiary: an outline that fills in on hover.
        outline:
          "bg-transparent border border-[var(--cds-button-tertiary)] text-[var(--cds-button-tertiary)] hover:bg-[var(--cds-button-tertiary-hover)] hover:text-[var(--cds-text-on-color)] hover:border-[var(--cds-button-tertiary-hover)] active:bg-[var(--cds-button-tertiary-active)] active:border-[var(--cds-button-tertiary-active)] active:text-[var(--cds-text-on-color)]",
        // Carbon secondary.
        secondary:
          "bg-[var(--cds-button-secondary)] text-[var(--cds-text-on-color)] border border-transparent hover:bg-[var(--cds-button-secondary-hover)] active:bg-[var(--cds-button-secondary-active)]",
        // Carbon ghost: blue label, layer-hover ground, no border.
        ghost:
          "bg-transparent border border-transparent text-[var(--cds-link-primary)] hover:bg-[var(--cds-layer-hover-01)] active:bg-[var(--cds-layer-selected-01)]",
        link: "bg-transparent border-0 text-[var(--cds-link-primary)] underline underline-offset-2 hover:text-[var(--cds-link-primary-hover)]",
      },
      size: {
        // Carbon sm / md / lg field heights.
        sm: "h-8 text-xs",
        default: "h-10",
        lg: "h-12",
        icon: "size-10 justify-center p-0",
        "icon-sm": "size-8 justify-center p-0",
        "icon-lg": "size-12 justify-center p-0",
      },
    },
    compoundVariants: [
      // Carbon's asymmetric geometry, on the filled and outlined variants at
      // the two sizes that carry page-level actions. `space-between` is what
      // pushes a trailing icon to the right edge; with a single text child it
      // simply left-aligns, which is the correct Carbon rendering either way.
      {
        variant: ["default", "destructive", "outline", "secondary"],
        size: ["default", "lg"],
        className: [
          "justify-between text-start",
          "ps-[var(--cds-button-padding-inline-start)]",
          "pe-[var(--cds-button-padding-inline-end)]",
          "max-w-[var(--cds-button-max-inline-size)]",
        ],
      },
      // `sm` pads symmetrically. Carbon specifies the asymmetric padding for
      // the standalone button, and uses symmetric padding for the small
      // buttons that live in dense contexts — a table toolbar, a batch-action
      // bar, a row of inline actions. This app has ~250 of those, and 63px of
      // trailing padding on each would push them out of their cells. Ghost
      // and link pad symmetrically at every size, as they do in Carbon.
      {
        size: ["sm"],
        className: "justify-center px-[var(--cds-button-padding-inline-ghost)]",
      },
      {
        variant: ["ghost", "link"],
        size: ["default", "lg"],
        className: "justify-center px-[var(--cds-button-padding-inline-ghost)]",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
