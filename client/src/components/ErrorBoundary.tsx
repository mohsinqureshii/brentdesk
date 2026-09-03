import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * The fallback is its own function component so the words can come from
 * `useT()` — a class component cannot call hooks, and an English-only crash
 * screen under an Arabic page is exactly the seam this work removes.
 */
function ErrorFallback({ stack }: { stack?: string }) {
  const t = useT();
  return (
    <div className="flex items-center justify-center min-h-screen p-8 bg-background">
      <div className="flex flex-col items-center w-full max-w-2xl p-8">
        <AlertTriangle
          size={48}
          className="text-destructive mb-6 flex-shrink-0"
        />

        <h2 className="text-xl mb-4">{t("state.unexpectedError")}</h2>

        <div className="p-4 w-full rounded bg-muted overflow-auto mb-6">
          <pre className="text-sm text-muted-foreground whitespace-break-spaces">
            {stack}
          </pre>
        </div>

        <button
          onClick={() => window.location.reload()}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg",
            "bg-primary text-primary-foreground",
            "hover:opacity-90 cursor-pointer"
          )}
        >
          <RotateCcw size={16} />
          {t("state.reloadPage")}
        </button>
      </div>
    </div>
  );
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback stack={this.state.error?.stack} />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
