import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "@/lib/utils";

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        // Carbon label-01: 12px, positive tracking, secondary text, 400
        // weight. Carbon never bolds a field label — the emphasis belongs
        // to the value, not the caption.
        "flex items-center gap-2 text-xs leading-[1.33333] tracking-[0.32px] font-normal text-[var(--cds-text-secondary)] select-none",
        "group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Label };
