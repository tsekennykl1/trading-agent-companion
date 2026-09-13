import { useState } from "react";
import { AlertTriangle, ExternalLink, ImageIcon, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RunRecord } from "@/lib/trading-agents/types";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-rule bg-surface px-3 py-2">
      <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

const fmt = (v: number | undefined, digits = 2) =>
  typeof v === "number" ? v.toFixed(digits) : "—";

/**
 * Renders whatever the engine has already produced — market snapshot, warnings
 * and the interactive chart — while the slow AI analysis is still running.
 */
export function LiveSnapshot({ run }: { run: RunRecord }) {
  const [view, setView] = useState<"interactive" | "image">("interactive");
  const p = run.partial;
  if (!p) return null;

  const hasMarket =
    p.marketDataReady ||
    p.latestPrice !== undefined ||
    p.latestRsi14 !== undefined ||
    p.latestEma20 !== undefined;

  if (!hasMarket && !p.chartsReady && p.warnings.length === 0) return null;

  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-rule bg-surface px-4 py-4 sm:px-5">
        <h3 className="text-base font-semibold">
          Market snapshot
          {p.stockName ? ` — ${p.stockName}` : ""}
        </h3>
        <span className="text-xs text-muted-foreground">
          {run.config.ticker}
          {run.config.analysisDate ? ` · ${run.config.analysisDate}` : ""}
          {p.pricePoints ? ` · ${p.pricePoints} sessions` : ""}
        </span>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {hasMarket && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
            <Stat label="Last close" value={fmt(p.latestPrice)} />
            <Stat
              label="Change"
              value={typeof p.changePct === "number" ? `${p.changePct > 0 ? "+" : ""}${p.changePct.toFixed(2)}%` : "—"}
            />
            <Stat label="EMA 20" value={fmt(p.latestEma20)} />
            <Stat label="EMA 50" value={fmt(p.latestEma50)} />
            <Stat label="RSI 14" value={fmt(p.latestRsi14, 1)} />
          </div>
        )}

        {p.warnings.length > 0 && (
          <ul className="space-y-1 rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-xs">
            {p.warnings.map((w) => (
              <li key={w} className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-accent-foreground" />
                <span className="break-words">{w}</span>
              </li>
            ))}
          </ul>
        )}

        {p.chartsReady && p.chartHtmlUrl && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={view === "interactive" ? "default" : "outline"}
                className="min-h-9"
                onClick={() => setView("interactive")}
              >
                <LineChart className="size-4" /> Interactive
              </Button>
              <Button
                size="sm"
                variant={view === "image" ? "default" : "outline"}
                className="min-h-9"
                onClick={() => setView("image")}
              >
                <ImageIcon className="size-4" /> Image
              </Button>
              <a
                href={p.chartHtmlUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-auto inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Open chart <ExternalLink className="size-3.5" />
              </a>
            </div>

            {view === "interactive" ? (
              <iframe
                key={p.chartHtmlUrl}
                src={p.chartHtmlUrl}
                title={`${run.config.ticker} price and moving averages`}
                className="h-[22rem] w-full rounded-md border border-rule bg-surface sm:h-[26rem]"
                loading="lazy"
              />
            ) : (
              <img
                src={p.chartPngUrl}
                alt={`${run.config.ticker} price trend with moving averages`}
                className="w-full rounded-md border border-rule bg-surface"
                loading="lazy"
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
}
