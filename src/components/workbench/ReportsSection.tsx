import { useState } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { markdownToHtml } from "@/lib/trading-agents/report";
import { REPORT_SECTIONS, type RunRecord } from "@/lib/trading-agents/types";
import { cn } from "@/lib/utils";

export function ReportsSection({ run }: { run: RunRecord }) {
  const available = REPORT_SECTIONS.filter((s) => run.reports[s.key]?.trim());
  const extra = Object.keys(run.reports).filter(
    (k) => run.reports[k]?.trim() && !REPORT_SECTIONS.some((s) => s.key === k),
  );
  const sections = [
    ...available,
    ...extra.map((k) => ({
      key: k,
      label: k.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      team: "Engine",
    })),
  ];

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");

  const running = run.status === "running" || run.status === "queued";
  const ready = sections.length > 0;
  const status = ready
    ? `${sections.length} report${sections.length === 1 ? "" : "s"} available${running ? " so far" : ""}`
    : running
      ? "Reports are still being written by the agents."
      : "No reports were produced for this run.";

  const current = sections.find((s) => s.key === active) ?? sections[0];

  return (
    <section className="panel overflow-hidden">
      <button
        type="button"
        onClick={() => ready && setOpen((v) => !v)}
        disabled={!ready}
        aria-expanded={open && ready}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-4 text-left transition-colors sm:px-5",
          ready ? "hover:bg-muted/50" : "cursor-default",
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold">Agent reasoning traces</span>
          <span className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            {!ready && running && (
              <Loader2 className="size-3.5 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
            )}
            <span className="truncate">{status}</span>
          </span>
        </span>
        {ready &&
          (open ? (
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          ) : (
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          ))}
        {ready && <span className="shrink-0 text-xs font-medium text-primary">{open ? "Hide" : "Show"}</span>}
      </button>

      {ready && open && current && (
        <div className="grid border-t border-rule md:grid-cols-[13rem_1fr]">
          <nav className="border-b border-rule bg-surface/60 p-2 md:border-r md:border-b-0">
            <ul className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
              {sections.map((s) => (
                <li key={s.key} className="shrink-0 md:shrink">
                  <button
                    type="button"
                    onClick={() => setActive(s.key)}
                    className={cn(
                      "w-full rounded-md px-3 py-2 text-left text-sm whitespace-nowrap transition-colors",
                      s.key === current.key
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <span className="block">{s.label}</span>
                    <span
                      className={cn(
                        "block text-[10px]",
                        s.key === current.key ? "text-primary-foreground/70" : "text-muted-foreground/70",
                      )}
                    >
                      {s.team}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <article
            className="prose-report max-h-[32rem] min-w-0 overflow-x-auto overflow-y-auto px-4 py-4 text-sm break-words sm:px-5 sm:py-5"
            // Content is generated locally by the user's own engine and rendered
            // through a restricted markdown subset (headings, lists, tables, emphasis).
            dangerouslySetInnerHTML={{ __html: markdownToHtml(run.reports[current.key] ?? "") }}
          />
        </div>
      )}
    </section>
  );
}
