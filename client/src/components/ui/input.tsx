import { useDialogComposition } from "@/components/ui/dialog";
import { useComposition } from "@/hooks/useComposition";
import { cn } from "@/lib/utils";
import * as React from "react";

function Input({
  className,
  type,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  ...props
}: React.ComponentProps<"input">) {
  // Get dialog composition context if available (will be no-op if not inside Dialog)
  const dialogComposition = useDialogComposition();

  // Add composition event handlers to support input method editor (IME) for CJK languages.
  const {
    onCompositionStart: handleCompositionStart,
    onCompositionEnd: handleCompositionEnd,
    onKeyDown: handleKeyDown,
  } = useComposition<HTMLInputElement>({
    onKeyDown: (e) => {
      // Check if this is an Enter key that should be blocked
      const isComposing = (e.nativeEvent as any).isComposing || dialogComposition.justEndedComposing();

      // If Enter key is pressed while composing or just after composition ended,
      // don't call the user's onKeyDown (this blocks the business logic)
      if (e.key === "Enter" && isComposing) {
        return;
      }

      // Otherwise, call the user's onKeyDown
      onKeyDown?.(e);
    },
    onCompositionStart: e => {
      dialogComposition.setComposing(true);
      onCompositionStart?.(e);
    },
    onCompositionEnd: e => {
      // Mark that composition just ended - this helps handle the Enter key that confirms input
      dialogComposition.markCompositionEnd();
      // Delay setting composing to false to handle Safari's event order
      // In Safari, compositionEnd fires before the ESC keydown event
      setTimeout(() => {
        dialogComposition.setComposing(false);
      }, 100);
      onCompositionEnd?.(e);
    },
  });

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Carbon text input, md: 40px tall, 16px inline padding, filled
        // ground with a bottom rule only, square, no shadow. The focus ring
        // is inset and comes from the global rule in index.css, so there is
        // deliberately no ring-* utility here.
        "w-full min-w-0 h-10 rounded-none px-4",
        "bg-[var(--cds-field-01)] text-[var(--cds-text-primary)]",
        "border-0 border-b border-[var(--cds-border-strong-01)]",
        "text-sm leading-[1.28572] tracking-[0.16px]",
        "transition-[background-color,border-color] duration-[70ms] ease-[cubic-bezier(0.2,0,0.38,0.9)]",
        "outline-none shadow-none",
        "placeholder:text-[var(--cds-text-placeholder)] selection:bg-primary selection:text-primary-foreground",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:text-foreground",
        "disabled:cursor-not-allowed disabled:text-[var(--cds-text-disabled)] disabled:border-b-transparent",
        // Carbon marks an invalid field with a full red border, not a halo.
        "aria-invalid:border aria-invalid:border-[var(--cds-support-error)]",
        className
      )}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      onKeyDown={handleKeyDown}
      {...props}
    />
  );
}

export { Input };
