import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  /** Use "full" for full-width sections like heroes, "content" for standard content areas */
  variant?: "content" | "full";
  /** HTML element to render */
  as?: "div" | "section" | "main" | "aside" | "article";
}

/**
 * Shared layout wrapper that encapsulates the standard container width pattern.
 * Use this for all page sections to ensure consistent max-width and padding.
 * 
 * Standard pattern: max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8
 */
export function PageContainer({
  children,
  className,
  variant = "content",
  as: Component = "div",
}: PageContainerProps) {
  return (
    <Component
      className={cn(
        "w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8",
        className
      )}
    >
      {children}
    </Component>
  );
}

/**
 * Full-width section wrapper that breaks out of the container.
 * Use for hero sections, colored backgrounds, etc.
 * Children should use PageContainer for inner content alignment.
 */
export function FullWidthSection({
  children,
  className,
  as: Component = "section",
}: Omit<PageContainerProps, "variant">) {
  return (
    <Component className={cn("w-full", className)}>
      {children}
    </Component>
  );
}
