import { useDialogComposition } from "@/components/ui/dialog";
import { useComposition } from "@/hooks/useComposition";
import { cn } from "@/lib/utils";
import * as React from "react";

function Textarea({
  className,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  ...props
}: React.ComponentProps<"textarea">) {
  // Get dialog composition context if available (will be no-op if not inside Dialog)
  const dialogComposition = useDialogComposition();

  // Add composition event handlers to support input method editor (IME) for CJK languages.
  const {
    onCompositionStart: handleCompositionStart,
    onCompositionEnd: handleCompositionEnd,
    onKeyDown: handleKeyDown,
  } = useComposition<HTMLTextAreaElement>({
    onKeyDown: (e) => {
      // Check if this is an Enter key that should be blocked
      const isComposing = (e.nativeEvent as any).isComposing || dialogComposition.justEndedComposing();

      // If Enter key is pressed while composing or just after composition ended,
      // don't call the user's onKeyDown (this blocks the business logic)
      // Note: For textarea, Shift+Enter should still work for newlines
      if (e.key === "Enter" && !e.shiftKey && isComposing) {
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
    <textarea
      data-slot="textarea"
      className={cn(
        // Carbon text area: same filled ground and bottom rule as the text
        // input, but padded top and bottom instead of height-locked.
        "flex field-sizing-content min-h-16 w-full rounded-none px-4 py-3",
        "bg-[var(--cds-field-01)] text-[var(--cds-text-primary)]",
        "border-0 border-b border-[var(--cds-border-strong-01)]",
        "text-sm leading-[1.42857] tracking-[0.16px]",
        "transition-[background-color,border-color] duration-[70ms] ease-[cubic-bezier(0.2,0,0.38,0.9)]",
        "outline-none shadow-none",
        "placeholder:text-[var(--cds-text-placeholder)]",
        "disabled:cursor-not-allowed disabled:text-[var(--cds-text-disabled)] disabled:border-b-transparent",
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

export { Textarea };
