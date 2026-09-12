import { useState } from "react";
import { markdownToHtml } from "@/lib/trading-agents/report";
import { REPORT_SECTIONS, type RunRecord } from "@/lib/trading-agents/types";
import { cn } from "@/lib/utils";

export function ReportsSection({ run }: { run: RunRecord }) {
  const available = REPORT_SECTIONS.filter((s) => run.reports[s.key]?.trim());
  const [active, setActive] = useState(available[0]?.key ?? "");

  if (available.length === 0) {
    return (
      <section className="panel p-5">
        <h3 className="text-base font-semibold">Agent reasoning traces</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Reports appear here as each agent finishes.
        </p>
      </section>
    );
  }

  const current = available.find((s) => s.key === active) ?? available[0]!;

  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-rule bg-surface px-5 py-4">
        <h3 className="text-base font-semibold">Agent reasoning traces</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Full role-specific output, exactly as produced by the engine.
        </p>
      </div>

      <div className="grid md:grid-cols-[13rem_1fr]">
        <nav className="border-b border-rule bg-surface/60 p-2 md:border-r md:border-b-0">
          <ul className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
            {available.map((s) => (
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
          className="prose-report max-h-[32rem] overflow-y-auto px-5 py-5 text-sm"
          // Content is generated locally by the user's own engine and rendered
          // through a restricted markdown subset (headings, lists, tables, emphasis).
          dangerouslySetInnerHTML={{ __html: markdownToHtml(run.reports[current.key] ?? "") }}
        />
      </div>
    </section>
  );
}
