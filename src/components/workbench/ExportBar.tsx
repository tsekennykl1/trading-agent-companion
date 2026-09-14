import { Link } from "@tanstack/react-router";
import { FileCode2, FileText, Loader2, Printer, ScrollText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { buildHtmlReport, buildMarkdownReport, downloadFile } from "@/lib/trading-agents/report";
import { useT } from "@/lib/i18n";
import type { RunRecord } from "@/lib/trading-agents/types";

export function ExportBar({
  run,
  reportUrl,
  ready = true,
  loading = false,
}: {
  run: RunRecord;
  reportUrl?: string | undefined;
  /** Exports stay dimmed until the engine has produced report content. */
  ready?: boolean;
  /** Shows a spinner while the report is still being written. */
  loading?: boolean;
}) {
  const t = useT();
  const slug = `${run.config.ticker.replace(/[^a-z0-9.]/gi, "_")}-${run.config.analysisDate}`;

  const exportMarkdown = () => {
    downloadFile(`tradingagents-memo-${slug}.md`, buildMarkdownReport(run), "text/markdown");
    toast.success("Markdown memo downloaded");
  };

  const exportHtml = () => {
    downloadFile(`tradingagents-memo-${slug}.html`, buildHtmlReport(run), "text/html");
    toast.success("HTML memo downloaded");
  };

  const printPdf = () => {
    const win = window.open("", "_blank");
    if (!win) {
      toast.error("Allow pop-ups to print the memo as PDF");
      return;
    }
    win.document.write(buildHtmlReport(run));
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  return (
    <section className="panel px-4 py-3 sm:px-5" aria-busy={loading} aria-live="polite">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1 basis-48">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold sm:text-2xl">
            {t("export.title")}
          </h2>
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {ready ? t("export.body") : t("export.preparing")}
          </p>
        </div>
        {!ready ? (
          <div className="flex w-full items-center justify-center sm:w-auto" role="status">
            <Loader2 className="size-6 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
            <span className="sr-only">{t("export.preparing")}</span>
          </div>
        ) : (
          <div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto">
            {reportUrl && (
            <Button asChild size="sm" variant="secondary" className="min-h-10 flex-1 gap-2 sm:min-h-8 sm:flex-none">
              <Link to="/report" search={{ url: reportUrl, ticker: run.config.ticker }}>
                <ScrollText className="size-4" /> {t("export.open")}
              </Link>
            </Button>
            )}
            <Button variant="outline" size="sm" onClick={exportMarkdown} className="min-h-10 flex-1 gap-2 sm:min-h-8 sm:flex-none">
              <FileText className="size-4" /> {t("export.markdown")}
            </Button>
            <Button variant="outline" size="sm" onClick={exportHtml} className="min-h-10 flex-1 gap-2 sm:min-h-8 sm:flex-none">
              <FileCode2 className="size-4" /> {t("export.html")}
            </Button>
            <Button size="sm" onClick={printPdf} className="min-h-10 flex-1 gap-2 sm:min-h-8 sm:flex-none">
              <Printer className="size-4" /> {t("export.print")}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
