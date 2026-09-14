import { useState } from "react";
import { AlertTriangle, ExternalLink, ImageIcon, LineChart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RunArtifacts } from "@/lib/trading-agents/useRunArtifacts";
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
 * Market data and chart artifacts are loaded independently of the run poll, so
 * either one appears the moment it exists.
 */
export function LiveSnapshot({ run, artifacts }: { run: RunRecord; artifacts?: RunArtifacts }) {
  const [view, setView] = useState<"interactive" | "image">("interactive");
  const p = run.partial;
  const market = artifacts?.marketData ?? null;
  const running = run.status === "running" || run.status === "queued";

  const latestPrice = p?.latestPrice ?? market?.latestPrice;
  const latestRsi14 = p?.latestRsi14 ?? market?.latestRsi14;
  const latestEma20 = p?.latestEma20 ?? market?.latestEma20;
  const latestEma50 = p?.latestEma50 ?? market?.latestEma50;
  const changePct = p?.changePct ?? market?.changePct;
  const pricePoints = p?.pricePoints ?? (market?.prices.length || undefined);
  const stockName = p?.stockName ?? market?.stockName;
  const warnings = p?.warnings ?? [];

  const chartHtmlUrl = artifacts?.chartHtmlUrl ?? p?.chartHtmlUrl;
  const chartPngUrl = artifacts?.chartPngUrl ?? p?.chartPngUrl;

  const hasMarket =
    p?.marketDataReady ||
    latestPrice !== undefined ||
    latestRsi14 !== undefined ||
    latestEma20 !== undefined;

  if (!hasMarket && !chartHtmlUrl && warnings.length === 0 && !running) return null;

  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-rule bg-surface px-4 py-4 sm:px-5">
        <h3 className="text-base font-semibold">
          Market snapshot
          {stockName ? ` — ${stockName}` : ""}
        </h3>
        <span className="text-xs text-muted-foreground">
          {run.config.ticker}
          {run.config.analysisDate ? ` · ${run.config.analysisDate}` : ""}
          {pricePoints ? ` · ${pricePoints} sessions` : ""}
        </span>
      </div>

      <div className="space-y-5 p-4 sm:p-6">
        {hasMarket ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
            <Stat label="Last close" value={fmt(latestPrice)} />
            <Stat
              label="Change"
              value={typeof changePct === "number" ? `${changePct > 0 ? "+" : ""}${changePct.toFixed(2)}%` : "—"}
            />
            <Stat label="EMA 20" value={fmt(latestEma20)} />
            <Stat label="EMA 50" value={fmt(latestEma50)} />
            <Stat label="RSI 14" value={fmt(latestRsi14, 1)} />
          </div>
        ) : (
          running && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
              Waiting for market data from the engine…
            </p>
          )
        )}

        {warnings.length > 0 && (
          <ul className="space-y-1 rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-xs">
            {warnings.map((w) => (
              <li key={w} className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-accent-foreground" />
                <span className="break-words">{w}</span>
              </li>
            ))}
          </ul>
        )}

        {chartData || chartPngUrl ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={view === "interactive" ? "default" : "outline"}
                className="min-h-9"
                disabled={!chartData}
                onClick={() => setView("interactive")}
              >
                <LineChart className="size-4" /> Interactive
              </Button>
              <Button
                size="sm"
                variant={view === "image" ? "default" : "outline"}
                className="min-h-9"
                disabled={!chartPngUrl}
                onClick={() => setView("image")}
              >
                <ImageIcon className="size-4" /> Image
              </Button>
              {chartPngUrl && (
                <a
                  href={chartPngUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Open image <ExternalLink className="size-3.5" />
                </a>
              )}
            </div>

            {view === "interactive" && chartData ? (
              <PlotlyPriceChart chart={chartData} height={isMobile ? 400 : 560} />
            ) : (
              <img
                src={chartPngUrl}
                alt={`${run.config.ticker} price, volume and RSI`}
                className="min-h-[22rem] w-full rounded-md border border-rule bg-surface object-contain min-[480px]:min-h-[26rem] sm:min-h-[30rem] xl:min-h-[36rem]"
                loading="lazy"
              />
            )}
          </div>
        ) : (
          running && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
              The price chart appears here as soon as the engine has published its data.
            </p>
          )
        )}
      </div>
    </section>
  );
}
