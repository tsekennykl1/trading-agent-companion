import { Download, FileCode2, FileText, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { buildHtmlReport, buildMarkdownReport, downloadFile } from "@/lib/trading-agents/report";
import type { RunRecord } from "@/lib/trading-agents/types";

export function ExportBar({ run }: { run: RunRecord }) {
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
    <div className="panel flex flex-wrap items-center gap-3 px-5 py-4">
      <div className="mr-auto">
        <p className="label-caps">Manager-facing report</p>
        <p className="text-sm text-muted-foreground">
          Executive summary, bull/bear points, agent contributions and the full audit trail.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={exportMarkdown} className="gap-2">
        <FileText className="size-4" /> Markdown
      </Button>
      <Button variant="outline" size="sm" onClick={exportHtml} className="gap-2">
        <FileCode2 className="size-4" /> HTML
      </Button>
      <Button size="sm" onClick={printPdf} className="gap-2">
        <Printer className="size-4" /> Print / PDF
      </Button>
      <Download className="hidden size-4 text-muted-foreground sm:block" aria-hidden />
    </div>
  );
}
