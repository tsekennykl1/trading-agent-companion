import { Bot, Copy, ArrowRight, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { getBridgeUrl } from "@/lib/trading-agents/client";

function mcpUrl() {
  return `${getBridgeUrl().replace(/\/$/, "")}/mcp`;
}

export function McpConnectionNote({ context }: { context: "dashboard" | "history" | "setup" }) {
  const t = useT();
  const endpoint = mcpUrl();
  const body = context === "history" ? t("mcp.historyBody") : context === "setup" ? t("mcp.setupBody") : t("mcp.dashboardBody");

  return (
    <section className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-3 sm:px-4" aria-label={t("mcp.title")}>
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Bot className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{t("mcp.title")}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{body}</p>
          <a href="/mcp-architecture" target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary underline underline-offset-2">Analysis architecture <ExternalLink className="size-3.5" aria-hidden="true" /></a>
          {context !== "setup" && (
            <Link to="/mcp-guide" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary underline underline-offset-2">
              {t("mcp.learn")} <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          )}
          {context === "setup" && (
            <>
              <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
                <code className="min-w-0 flex-1 overflow-x-auto rounded-md border border-rule bg-surface px-3 py-2 font-mono text-xs">
                  {endpoint}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    void navigator.clipboard.writeText(endpoint);
                    toast.success(t("mcp.copied"));
                  }}
                >
                  <Copy className="size-3.5" aria-hidden="true" />
                  {t("mcp.copy")}
                </Button>
              </div>
              <p className="mt-2 text-sm font-medium text-bear">{t("mcp.publicWarning")}</p>
              <p className="mt-2 text-xs text-muted-foreground">{t("mcp.tools")}</p>
              <Link
                to="/mcp-guide"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary underline underline-offset-2"
              >
                {t("mcp.learn")} <ArrowRight className="size-3" aria-hidden="true" />
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}