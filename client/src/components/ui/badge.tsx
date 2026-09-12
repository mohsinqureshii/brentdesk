import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Carbon Design System v11 tag.
 *
 * The one place Carbon is deliberately round: tags are pills, 24px tall with
 * a 15px radius, while every other component is square. They also do not use
 * the solid brand fill a shadcn badge does — a Carbon tag is a tinted ground
 * (the colour's 20 step) with dark text (the 70 step), so it reads as a
 * label rather than as a button.
 */
const badgeVariants = cva(
  [
    "inline-flex items-center justify-center gap-1 w-fit shrink-0 overflow-hidden whitespace-nowrap",
    "h-6 rounded-full px-2 text-xs leading-[1.125rem] font-normal",
    "border border-transparent",
    "transition-colors duration-[70ms] ease-[cubic-bezier(0.2,0,0.38,0.9)]",
    "[&>svg]:size-3 [&>svg]:pointer-events-none",
  ],
  {
    variants: {
      variant: {
        // Carbon blue tag.
        default:
          "bg-[var(--cds-tag-blue-bg)] text-[var(--cds-tag-blue-text)] [a&]:hover:bg-[var(--cds-tag-blue-hover)]",
        // Carbon gray tag — the workhorse, and what most of this app wants.
        secondary:
          "bg-[var(--cds-tag-gray-bg)] text-[var(--cds-tag-gray-text)] [a&]:hover:bg-[var(--cds-tag-gray-hover)]",
        // Carbon red tag.
        destructive:
          "bg-[var(--cds-tag-red-bg)] text-[var(--cds-tag-red-text)] [a&]:hover:bg-[var(--cds-tag-red-hover)]",
        // Carbon outline tag: no ground, a 1px rule in the text colour.
        outline:
          "bg-transparent border-[var(--cds-border-strong-01)] text-[var(--cds-text-primary)] [a&]:hover:bg-[var(--cds-layer-hover-01)]",
        // Carbon green and yellow tags, for status where red/blue would
        // mislead. Not in the shadcn set, but this app needs them.
        success:
          "bg-[var(--cds-tag-green-bg)] text-[var(--cds-tag-green-text)] [a&]:hover:bg-[var(--cds-tag-green-hover)]",
        warning:
          "bg-[var(--cds-tag-yellow-bg)] text-[var(--cds-tag-yellow-text)] [a&]:hover:bg-[var(--cds-tag-yellow-hover)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
