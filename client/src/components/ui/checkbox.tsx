import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        // Carbon checkbox: 16px, square, a 1px icon-primary box when
        // unchecked that fills solid icon-primary when checked — not the
        // brand blue. Carbon reserves blue for the focus ring here, so a
        // blue checkbox would read as permanently focused.
        "peer size-4 shrink-0 rounded-none bg-transparent shadow-none transition-none outline-none",
        "border border-[var(--cds-icon-primary)]",
        "data-[state=checked]:bg-[var(--cds-icon-primary)] data-[state=checked]:border-[var(--cds-icon-primary)] data-[state=checked]:text-[var(--cds-background)]",
        "data-[state=indeterminate]:bg-[var(--cds-icon-primary)] data-[state=indeterminate]:border-[var(--cds-icon-primary)] data-[state=indeterminate]:text-[var(--cds-background)]",
        "disabled:cursor-not-allowed disabled:border-[var(--cds-text-disabled)] disabled:data-[state=checked]:bg-[var(--cds-text-disabled)]",
        "aria-invalid:border-[var(--cds-support-error)]",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current transition-none"
      >
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
