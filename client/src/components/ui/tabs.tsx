import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-0", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex w-full items-center justify-start rounded-none bg-transparent p-0",
        "text-[var(--cds-text-secondary)] border-b border-[var(--cds-border-subtle-00)]",
        className
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        // Carbon line tab: 40px tall, 16px inline padding, label left-aligned
        // rather than centred, and a 2px interactive rule under the selected
        // one against a 1px subtle rule under the rest.
        "inline-flex h-10 items-center justify-start gap-1.5 px-4 -mb-px rounded-none bg-transparent",
        "text-sm leading-[1.28572] tracking-[0.16px] font-normal text-start whitespace-nowrap",
        "text-[var(--cds-text-secondary)]",
        "border-b-2 border-transparent",
        "transition-[color,border-color] duration-[70ms] ease-[cubic-bezier(0.2,0,0.38,0.9)]",
        "hover:text-[var(--cds-text-primary)] hover:border-[var(--cds-border-strong-01)]",
        "data-[state=active]:text-[var(--cds-text-primary)] data-[state=active]:border-[var(--cds-border-interactive)] data-[state=active]:font-semibold",
        "disabled:pointer-events-none disabled:text-[var(--cds-text-disabled)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
