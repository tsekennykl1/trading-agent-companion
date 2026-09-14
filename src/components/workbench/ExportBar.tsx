import { Link } from "@tanstack/react-router";
import { FileCode2, FileText, Printer, ScrollText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { buildHtmlReport, buildMarkdownReport, downloadFile } from "@/lib/trading-agents/report";
import { useT } from "@/lib/i18n";
import type { RunRecord } from "@/lib/trading-agents/types";

export function ExportBar({ run, reportUrl }: { run: RunRecord; reportUrl?: string }) {
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
    <section className="panel px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1">
          <p className="label-caps">{t("export.title")}</p>
          <p className="text-sm text-muted-foreground">{t("export.body")}</p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
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
      </div>

      {reportUrl && (
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-rule pt-3">
          <p className="mr-auto text-sm text-muted-foreground">{t("export.openHint")}</p>
          <Button asChild size="sm" variant="secondary" className="min-h-10 gap-2 sm:min-h-8">
            <Link to="/report" search={{ url: reportUrl, ticker: run.config.ticker }}>
              <ScrollText className="size-4" /> {t("export.open")}
            </Link>
          </Button>
        </div>
      )}
    </section>
  );
}
