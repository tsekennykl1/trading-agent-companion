import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronDown, ChevronRight, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import type { Decision } from "@/lib/trading-agents/types";
import { cn } from "@/lib/utils";

const TONE: Record<string, { cls: string; Icon: typeof Minus }> = {
  Buy: { cls: "bg-bull/12 text-bull border-bull/30", Icon: ArrowUpRight },
  Overweight: { cls: "bg-bull/12 text-bull border-bull/30", Icon: ArrowUpRight },
  Hold: { cls: "bg-neutral/12 text-neutral border-neutral/30", Icon: Minus },
  Review: { cls: "bg-muted text-muted-foreground border-rule", Icon: Minus },
  Underweight: { cls: "bg-bear/12 text-bear border-bear/30", Icon: ArrowDownRight },
  Sell: { cls: "bg-bear/12 text-bear border-bear/30", Icon: ArrowDownRight },
};

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

function Level({ label, value, tone }: { label: string; value: number | undefined; tone?: string }) {
  return (
    <div className="rounded-md border border-rule bg-surface px-2.5 py-1.5">
      <p className="label-caps">{label}</p>
      <p className={cn("mt-0.5 font-mono text-sm", tone)}>{value === undefined ? "—" : value}</p>
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
  const tone = TONE[decision.action] ?? TONE["Review"]!;
  const { Icon } = tone;
  const levels = decision.levels;
  const scores = decision.scores;

  return (
    <section className="panel space-y-4 p-4">
      <div className="flex items-center gap-3">
        <span className={cn("flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-display text-lg font-semibold", tone.cls)}>
          <Icon className="size-4" />
          {decision.action}
        </span>
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

          <div className="grid grid-cols-3 gap-2">
            <Level label="Entry" value={decision.entryPrice ?? levels?.entry} />
            <Level label="Target" value={decision.takeProfit ?? levels?.takeProfit} tone="text-bull" />
            <Level label="Stop" value={decision.stopLoss ?? levels?.stopLoss} tone="text-bear" />
          </div>

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
