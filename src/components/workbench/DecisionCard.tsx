import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DecisionBadge } from "@/components/workbench/DecisionBadge";
import { PriceLevels } from "@/components/workbench/PriceLevels";
import { useT } from "@/lib/i18n";
import type { Decision } from "@/lib/trading-agents/types";
import { cn } from "@/lib/utils";

function Gauge({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="label-caps">{label}</span>
        <span className="text-xs font-semibold tabular-nums">{value}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-500 motion-reduce:transition-none", tone)}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Compact decision summary shown beside the chart: signal badge, confidence,
 * trade levels, risk and horizon — so the call is readable without scrolling.
 */
export function DecisionCard({ decision, ticker }: { decision: Decision; ticker: string }) {
  const t = useT();
  const [open, setOpen] = useState(true);
  const scores = decision.scores;

  return (
    <section className="panel space-y-4 p-4">
      <div className="flex items-center gap-3">
        <DecisionBadge action={decision.action} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{ticker}</p>
          <p className="text-xs text-muted-foreground">{decision.consensus} consensus</p>
        </div>
        <Button type="button" size="sm" variant="ghost" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
          {open ? t("reports.hide") : t("reports.show")}
        </Button>
      </div>

      {open && (
        <>
          <Gauge label="Confidence" value={decision.confidence} tone="bg-primary" />
          {scores?.bullishness !== undefined && (
            <Gauge label="Bullishness" value={scores.bullishness} tone="bg-bull" />
          )}
          {scores?.conviction !== undefined && <Gauge label="Conviction" value={scores.conviction} tone="bg-primary" />}
          {scores?.risk !== undefined && <Gauge label="Risk score" value={scores.risk} tone="bg-bear" />}

          <PriceLevels decision={decision} boxed />

          {(decision.riskLevel || decision.horizon || decision.positionSizing) && (
            <div className="flex flex-wrap gap-1.5 text-xs">
              {decision.riskLevel && (
                <span className="rounded-full border border-rule bg-muted px-2 py-0.5">Risk: {decision.riskLevel}</span>
              )}
              {decision.horizon && (
                <span className="rounded-full border border-rule bg-muted px-2 py-0.5">Horizon: {decision.horizon}</span>
              )}
              {decision.positionSizing && (
                <span className="rounded-full border border-rule bg-muted px-2 py-0.5">Size: {decision.positionSizing}</span>
              )}
            </div>
          )}

          {(decision.rationale || decision.executiveSummary) && (
            <p className="line-clamp-4 text-xs leading-5 text-muted-foreground">
              {decision.rationale ?? decision.executiveSummary}
            </p>
          )}
        </>
      )}
    </section>
  );
}
