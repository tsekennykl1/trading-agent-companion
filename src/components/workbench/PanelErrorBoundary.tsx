import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { translate } from "@/lib/i18n";
import { reportLovableError } from "@/lib/lovable-error-reporting";

/**
 * Keeps one render failure local to the panel that caused it.
 *
 * Without this, any throw inside a chart, snapshot or report panel unmounts
 * the whole React tree and the user sees a blank page ("Invariant failed" and
 * friends). Here the rest of the workbench stays usable and the failing panel
 * is replaced with a small recovery card.
 */
interface Props {
  children: ReactNode;
  /** Clears cached run/form data before retrying, when the caller can do it. */
  onReset?: () => void;
}

interface State {
  error: Error | null;
}

export class PanelErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
    reportLovableError(error, { boundary: "panel_error_boundary" });
  }

  private retry = () => {
    this.setState({ error: null });
  };

  private reset = () => {
    try {
      this.props.onReset?.();
    } finally {
      this.setState({ error: null });
    }
  };

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <section className="panel p-4 sm:p-5" role="alert">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
          <div className="min-w-0">
            <h3 className="text-base font-semibold">{translate("crash.panelTitle")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{translate("crash.panelBody")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={this.retry}>
                {translate("crash.retry")}
              </Button>
              {this.props.onReset && (
                <Button size="sm" variant="outline" onClick={this.reset}>
                  {translate("crash.reset")}
                </Button>
              )}
            </div>
            <details className="mt-3 text-xs text-muted-foreground">
              <summary className="cursor-pointer">{translate("crash.details")}</summary>
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px]">
                {error.message}
              </pre>
            </details>
          </div>
        </div>
      </section>
    );
  }
}
