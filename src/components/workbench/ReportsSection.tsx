import { useState } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markdownToHtml } from "@/lib/trading-agents/report";
import { REPORT_SECTIONS, type RunRecord } from "@/lib/trading-agents/types";

export function ReportsSection({
  run,
  extraReports,
}: {
  run: RunRecord;
  /** Reports fetched individually from the split report endpoints. */
  extraReports?: Record<string, string>;
}) {
  const reports: Record<string, string> = { ...(extraReports ?? {}), ...run.reports };
  for (const [key, value] of Object.entries(extraReports ?? {})) {
    if (!reports[key]?.trim() && value?.trim()) reports[key] = value;
  }
  const available = REPORT_SECTIONS.filter((s) => reports[s.key]?.trim());
  const extra = Object.keys(reports).filter(
    (k) => reports[k]?.trim() && !REPORT_SECTIONS.some((s) => s.key === k),
  );
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const running = run.status === "running" || run.status === "queued";
  const sectionRows = REPORT_SECTIONS.map((section) => ({
    ...section,
    content: reports[section.key]?.trim() ?? "",
  }));
  sectionRows.push(
    ...extra.map((key) => ({
      key,
      label: key.replace(/[_-]/g, " ").replace(/\b\w/g, (character) => character.toUpperCase()),
      team: "Engine",
      content: reports[key]?.trim() ?? "",
    })),
  );
  const readyKeys = sectionRows.filter((section) => Boolean(section.content)).map((section) => section.key);
  const allReadyOpen = readyKeys.length > 0 && readyKeys.every((key) => openSections[key]);

  const toggleAll = () => {
    setOpenSections(
      allReadyOpen
        ? {}
        : Object.fromEntries(readyKeys.map((key) => [key, true])),
    );
  };

  return (
    <section className="panel overflow-hidden">
      <header className="flex items-center gap-3 border-b border-rule bg-secondary px-4 py-3 sm:px-5">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold">Agent reports</h2>
          <p className="mt-0.5 text-xs text-secondary-foreground/75">
            {available.length > 0
              ? `${available.length} report${available.length === 1 ? "" : "s"} available${running ? " so far" : ""}`
              : running
                ? "Reports are still being written by the agents."
                : "No reports were produced for this run."}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={readyKeys.length === 0}
          aria-expanded={allReadyOpen}
          onClick={toggleAll}
        >
          {allReadyOpen ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
          {allReadyOpen ? "Hide All" : "Show All"}
        </Button>
      </header>

      <div className="divide-y divide-rule">
        {sectionRows.map((section) => {
          const ready = Boolean(section.content);
          const open = Boolean(openSections[section.key]);
          return (
            <section key={section.key}>
              <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold">{section.label}</h3>
                  <p
                    className={`mt-0.5 flex items-center gap-2 text-xs font-medium ${
                      ready ? "text-bull" : running ? "text-primary" : "text-bear"
                    }`}
                  >
                    {!ready && running && (
                      <Loader2 className="size-3 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
                    )}
                    {ready ? `Available · ${section.team}` : running ? `In progress · ${section.team}` : `Not available · ${section.team}`}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={!ready}
                  aria-expanded={open}
                  onClick={() => setOpenSections((current) => ({ ...current, [section.key]: !open }))}
                >
                  {open ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
                  {open ? "Hide" : "Show"}
                </Button>
              </div>
              {ready && open && (
                <article
                  className="prose-report report-columns max-h-[36rem] min-w-0 overflow-x-auto overflow-y-auto border-t border-rule px-4 py-5 text-sm break-words sm:px-6 sm:py-6"
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(section.content) }}
                />
              )}
            </section>
          );
        })}
        {sectionRows.length === 0 && (
          <p className="px-4 py-4 text-sm text-muted-foreground sm:px-5">No report sections are available.</p>
        )}
      </div>
    </section>
  );
}
