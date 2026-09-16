import { DecisionCard } from "@/components/workbench/DecisionCard";
import { SignalReasons } from "@/components/workbench/SignalReasons";
import type { RunRecord } from "@/lib/trading-agents/types";

/** Results below the chart stay stacked so each panel always uses the chart's full width. */
export function SnapshotResults({ run, reports }: { run: RunRecord; reports: Record<string, string> }) {
  const hasReports = Object.keys(reports).length > 0;
  if (!run.decision && !hasReports) return null;

  return (
    <div className="grid min-w-0 gap-4">
      {run.decision && <DecisionCard decision={run.decision} ticker={run.config.ticker} />}
      {hasReports && <SignalReasons reports={reports} />}
    </div>
  );
}