import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, FileCode2, FileText, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/workbench/AppShell";
import { DetailedReport } from "@/components/workbench/DetailedReport";
import { Button } from "@/components/ui/button";
import { downloadFile, markdownToHtml } from "@/lib/trading-agents/report";
import { SAMPLE_DETAIL_REPORT } from "@/lib/trading-agents/sample-run";
import { useT } from "@/lib/i18n";
import { useStockNames } from "@/hooks/useStockNames";

const TITLE = "Detailed analysis report — My Trading Agents";
const DESCRIPTION =
  "Read the full engine-generated analysis report for a single TradingAgents run on its own page.";

export const Route = createFileRoute("/report")({
  validateSearch: (search: Record<string, unknown>) => ({
    url: typeof search["url"] === "string" ? search["url"] : "",
    ticker:
      typeof search["ticker"] === "string" ? search["ticker"].replace(/[^\w.\-: ]/g, "").slice(0, 40) : "",
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

/** Never interpolate raw text into HTML: a crafted ticker could carry markup. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function standaloneHtml(title: string, markdown: string): string {
  const safeTitle = escapeHtml(title);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${safeTitle}</title>
<style>
  body { font-family: "IBM Plex Sans", system-ui, sans-serif; color: #16202c; margin: 0 auto; max-width: 52rem; padding: 2.5rem 1.5rem; line-height: 1.65; }
  h1, h2, h3, h4 { font-family: "IBM Plex Serif", Georgia, serif; line-height: 1.25; margin: 1.8em 0 0.5em; }
  h1 { font-size: 1.7rem; } h2 { font-size: 1.3rem; } h3 { font-size: 1.1rem; }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 0.92rem; }
  th, td { border: 1px solid #d9dee5; padding: 0.4rem 0.6rem; text-align: left; vertical-align: top; }
  th { background: #f3f5f8; }
  ul, ol { padding-left: 1.2rem; }
  @media print { body { padding: 0; } }
</style></head>
<body><h1>${safeTitle}</h1>${markdownToHtml(markdown, false)}</body></html>`;
}

function ReportPage() {
  const search = Route.useSearch();
  const url = search.url;
  const ticker = search.ticker;
  const names = useStockNames(ticker);
  const t = useT();
  const isSample = url === "sample";
  const [markdown, setMarkdown] = useState(isSample ? SAMPLE_DETAIL_REPORT : "");
  const [loading, setLoading] = useState(!isSample);

  const ready = markdown.trim().length > 0;
  const title = `${t("report.title")}${ticker ? ` — ${ticker}` : ""}${names.en ? ` · ${names.en}` : ""}${names.zh ? ` · ${names.zh}` : ""}`;
  const slug = (ticker || "run").replace(/[^a-z0-9.]/gi, "_");

  const saveMarkdown = () => {
    downloadFile(`tradingagents-report-${slug}.md`, `# ${title}\n\n${markdown}`, "text/markdown");
    toast.success(t("export.markdown"));
  };

  const saveHtml = () => {
    downloadFile(`tradingagents-report-${slug}.html`, standaloneHtml(title, markdown), "text/html");
    toast.success(t("export.html"));
  };

  const printPdf = () => {
    const win = window.open("", "_blank");
    if (!win) {
      toast.error("Allow pop-ups to print the report as PDF");
      return;
    }
    win.document.write(standaloneHtml(title, markdown));
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  const actions = (
    <div className="flex flex-wrap items-center gap-1.5 lg:flex-nowrap" aria-busy={!ready} aria-live="polite">
      {!ready ? (
        <span className="flex items-center gap-2 text-xs font-medium text-primary" role="status">
          <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          {t("report.loading")}
        </span>
      ) : (
        <>
          <Button size="sm" variant="outline" className="min-h-9 gap-1.5 sm:min-h-8" onClick={saveMarkdown}>
            <FileText className="size-3.5" /> {t("export.markdown")}
          </Button>
          <Button size="sm" variant="outline" className="min-h-9 gap-1.5 sm:min-h-8" onClick={saveHtml}>
            <FileCode2 className="size-3.5" /> {t("export.html")}
          </Button>
          <Button size="sm" className="min-h-9 gap-1.5 sm:min-h-8" onClick={printPdf}>
            <Printer className="size-3.5" /> {t("export.print")}
          </Button>
        </>
      )}
    </div>
  );

  return (
    <AppShell actions={url ? actions : undefined}>
      <div className="mb-5 space-y-2.5">
        <div>
          <Button asChild size="sm" variant="outline" className="min-h-9 gap-2">
            <Link to="/">
              <ArrowLeft className="size-4" /> {t("report.back")}
            </Link>
          </Button>
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      </div>

      {isSample ? (
        <article
          className="panel prose-report min-w-0 overflow-x-auto px-4 py-5 text-sm break-words sm:px-6 sm:py-6"
          dangerouslySetInnerHTML={{ __html: markdownToHtml(SAMPLE_DETAIL_REPORT) }}
        />
      ) : url ? (
        <DetailedReport url={url} ticker={ticker || "run"} expanded onContent={setMarkdown} onLoadingChange={setLoading} />
      ) : (
        <p className="panel px-4 py-6 text-sm text-muted-foreground sm:px-5">{t("report.missing")}</p>
      )}
    </AppShell>
  );
}
