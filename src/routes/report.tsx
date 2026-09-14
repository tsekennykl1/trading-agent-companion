import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/workbench/AppShell";
import { DetailedReport } from "@/components/workbench/DetailedReport";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

const TITLE = "Detailed analysis report — My Trading Agents";
const DESCRIPTION =
  "Read the full engine-generated analysis report for a single TradingAgents run on its own page.";

export const Route = createFileRoute("/report")({
  validateSearch: (search: Record<string, unknown>) => ({
    url: typeof search.url === "string" ? search.url : "",
    ticker: typeof search.ticker === "string" ? search.ticker : "",
  }),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportPage,
});

function ReportPage() {
  const { url, ticker } = Route.useSearch();
  const t = useT();

  return (
    <AppShell>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Button asChild size="sm" variant="outline" className="min-h-9 gap-2">
          <Link to="/">
            <ArrowLeft className="size-4" /> {t("report.back")}
          </Link>
        </Button>
        <h1 className="font-display text-xl font-semibold sm:text-2xl">
          {t("report.title")}
          {ticker ? ` — ${ticker}` : ""}
        </h1>
      </div>

      {url ? (
        <DetailedReport url={url} ticker={ticker || "run"} expanded />
      ) : (
        <p className="panel px-4 py-6 text-sm text-muted-foreground sm:px-5">{t("report.missing")}</p>
      )}
    </AppShell>
  );
}
