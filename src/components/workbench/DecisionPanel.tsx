import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { Decision } from "@/lib/trading-agents/types";
import { cn } from "@/lib/utils";

type Tone = { cls: string; Icon: typeof Minus };

const FALLBACK_TONE: Tone = { cls: "bg-muted text-muted-foreground border-rule", Icon: Minus };

const TONE: Record<string, Tone> = {
  Buy: { cls: "bg-bull/12 text-bull border-bull/30", Icon: ArrowUpRight },
  Overweight: { cls: "bg-bull/12 text-bull border-bull/30", Icon: ArrowUpRight },
  Hold: { cls: "bg-neutral/12 text-neutral border-neutral/30", Icon: Minus },
  Review: { cls: "bg-muted text-muted-foreground border-rule", Icon: Minus },
  Underweight: { cls: "bg-bear/12 text-bear border-bear/30", Icon: ArrowDownRight },
  Sell: { cls: "bg-bear/12 text-bear border-bear/30", Icon: ArrowDownRight },
};

export function DecisionPanel({ decision, ticker }: { decision: Decision; ticker: string }) {
  const tone = TONE[decision.action] ?? FALLBACK_TONE;
  const { Icon } = tone;

  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-center gap-4 border-b border-rule bg-surface px-5 py-4">
        <span
          className={cn(
            "flex items-center gap-2 rounded-md border px-3 py-1.5 font-display text-xl font-semibold",
            tone.cls,
          )}
        >
          <Icon className="size-5" />
          {decision.action}
        </span>
        <div className="text-sm">
          <p className="font-medium">{ticker} — portfolio management decision</p>
          <p className="text-muted-foreground">
            Confidence {decision.confidence}% · {decision.consensus} consensus across agents
          </p>
        </div>
        <div className="ml-auto flex gap-5 text-sm">
          {[
            ["Entry", decision.entryPrice],
            ["Stop loss", decision.stopLoss],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <p className="label-caps">{label}</p>
              <p className="font-mono text-base">{value === undefined ? "—" : value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 py-5">
        <p className="label-caps">Executive summary</p>
        <p className="mt-2 leading-relaxed">{decision.executiveSummary}</p>

        {decision.positionSizing && (
          <div className="mt-4 rounded-md border border-rule bg-muted/50 p-3 text-sm">
            <p className="label-caps">Position sizing</p>
            <p className="mt-1 leading-relaxed">{decision.positionSizing}</p>
          </div>
        )}

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <p className="label-caps text-bull">Key bullish signals</p>
            <ul className="mt-2 space-y-2 text-sm">
              {decision.bullPoints.map((p, i) => (
                <li key={i} className="border-l-2 border-bull/40 pl-3 leading-relaxed">
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="label-caps text-bear">Key bearish risks</p>
            <ul className="mt-2 space-y-2 text-sm">
              {decision.bearPoints.map((p, i) => (
                <li key={i} className="border-l-2 border-bear/40 pl-3 leading-relaxed">
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
