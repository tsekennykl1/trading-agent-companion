import { Suspense, lazy, useMemo } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import type { PriceChartData } from "@/lib/trading-agents/client";
import { deriveMarkers } from "@/lib/trading-agents/signals";
import type { ChartMarker, TradeLevels } from "@/lib/trading-agents/types";

const Plot = lazy(() => import("./plotly-lazy"));

function Fallback({ label }: { label: string }) {
  return (
    <div className="flex h-[26rem] w-full items-center justify-center gap-2 rounded-md border border-rule bg-surface text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
      {label}
    </div>
  );
}

const MARKER_STYLE: Record<ChartMarker["kind"], { symbol: string; color: string; offset: number }> = {
  buy: { symbol: "triangle-up", color: "#16a34a", offset: -0.025 },
  sell: { symbol: "triangle-down", color: "#dc2626", offset: 0.025 },
  cross_up: { symbol: "circle", color: "#2563eb", offset: -0.02 },
  cross_down: { symbol: "circle", color: "#b45309", offset: 0.02 },
  overbought: { symbol: "star", color: "#dc2626", offset: 0.03 },
  oversold: { symbol: "star", color: "#16a34a", offset: -0.03 },
};

/**
 * Renders price / volume / RSI panels client-side from the engine's
 * price-chart JSON, plus optional trade levels and signal markers.
 */
export function PlotlyPriceChart({
  chart,
  height = 520,
  levels,
  showMarkers = true,
}: {
  chart: PriceChartData;
  height?: number;
  /** Entry / stop / target / support / resistance drawn over the price panel. */
  levels?: TradeLevels | undefined;
  showMarkers?: boolean;
}) {

  const { data, layout } = useMemo(() => {
    const rows = chart.rows;
    const x = rows.map((r) => r.date);
    const hasOhlc = rows.some((r) => r.open !== undefined && r.high !== undefined && r.low !== undefined);
    const volumeColors = rows.map((r, i) => {
      const prev = rows[i - 1];
      const up = r.close !== undefined && prev?.close !== undefined ? r.close >= prev.close : true;
      return up ? "var(--bull)" : "var(--bear)";
    });

    const traces: Record<string, unknown>[] = [];
    if (hasOhlc) {
      traces.push({
        type: "candlestick",
        name: chart.meta?.stockName ?? chart.ticker,
        x,
        open: rows.map((r) => r.open ?? null),
        high: rows.map((r) => r.high ?? null),
        low: rows.map((r) => r.low ?? null),
        close: rows.map((r) => r.close ?? null),
        increasing: { line: { color: "#16a34a" } },
        decreasing: { line: { color: "#dc2626" } },
        xaxis: "x",
        yaxis: "y",
      });
    } else {
      traces.push({
        type: "scatter",
        mode: "lines",
        name: "Close",
        x,
        y: rows.map((r) => r.close ?? null),
        line: { color: "#1f2a5a", width: 2 },
        xaxis: "x",
        yaxis: "y",
      });
    }
    if (rows.some((r) => r.ema20 !== undefined)) {
      traces.push({
        type: "scatter",
        mode: "lines",
        name: "EMA 20",
        x,
        y: rows.map((r) => r.ema20 ?? null),
        line: { color: "#2563eb", width: 1.4 },
        xaxis: "x",
        yaxis: "y",
      });
    }
    if (rows.some((r) => r.ema50 !== undefined)) {
      traces.push({
        type: "scatter",
        mode: "lines",
        name: "EMA 50",
        x,
        y: rows.map((r) => r.ema50 ?? null),
        line: { color: "#d97706", width: 1.4 },
        xaxis: "x",
        yaxis: "y",
      });
    }
    if (rows.some((r) => r.volume !== undefined)) {
      traces.push({
        type: "bar",
        name: "Volume",
        x,
        y: rows.map((r) => r.volume ?? null),
        marker: { color: volumeColors.map((c) => (c === "var(--bull)" ? "#16a34a" : "#dc2626")), opacity: 0.55 },
        xaxis: "x",
        yaxis: "y2",
        showlegend: false,
      });
    }
    if (rows.some((r) => r.rsi14 !== undefined)) {
      traces.push({
        type: "scatter",
        mode: "lines",
        name: "RSI 14",
        x,
        y: rows.map((r) => r.rsi14 ?? null),
        line: { color: "#7c3aed", width: 1.4 },
        xaxis: "x",
        yaxis: "y3",
        showlegend: false,
      });
    }

    // --- Signal markers (engine-supplied, otherwise derived from the rows) ---
    const closeByDate = new Map(rows.map((r) => [r.date, r.close]));
    const markers = showMarkers ? (chart.markers?.length ? chart.markers : deriveMarkers(rows)) : [];
    const byKind = new Map<ChartMarker["kind"], ChartMarker[]>();
    for (const m of markers) byKind.set(m.kind, [...(byKind.get(m.kind) ?? []), m]);
    for (const [kind, list] of byKind) {
      const style = MARKER_STYLE[kind];
      traces.push({
        type: "scatter",
        mode: "markers",
        name: kind.replace(/_/g, " "),
        x: list.map((m) => m.date),
        y: list.map((m) => {
          const base = m.price ?? closeByDate.get(m.date) ?? null;
          return base === null ? null : base * (1 + style.offset);
        }),
        text: list.map((m) => m.label),
        hovertemplate: "%{text}<extra></extra>",
        marker: { symbol: style.symbol, size: 11, color: style.color, line: { color: "#ffffff", width: 1 } },
        xaxis: "x",
        yaxis: "y",
        showlegend: false,
      });
    }

    // --- Trade levels and risk / reward zones ---
    const shapes: Record<string, unknown>[] = [];
    const annotations: Record<string, unknown>[] = [];
    const hLine = (value: number, color: string, label: string, dash: string) => {
      shapes.push({
        type: "line",
        xref: "paper",
        x0: 0,
        x1: 1,
        yref: "y",
        y0: value,
        y1: value,
        line: { color, width: 1.4, dash },
      });
      annotations.push({
        xref: "paper",
        x: 1,
        xanchor: "right",
        yref: "y",
        y: value,
        yanchor: "bottom",
        text: `${label} ${value}`,
        showarrow: false,
        font: { size: 10, color },
        bgcolor: "rgba(255,255,255,0.75)",
      });
    };
    const band = (y0: number, y1: number, color: string) => {
      shapes.push({
        type: "rect",
        xref: "paper",
        x0: 0,
        x1: 1,
        yref: "y",
        y0: Math.min(y0, y1),
        y1: Math.max(y0, y1),
        fillcolor: color,
        line: { width: 0 },
        layer: "below",
      });
    };
    if (levels) {
      if (levels.entry !== undefined && levels.takeProfit !== undefined) {
        band(levels.entry, levels.takeProfit, "rgba(22,163,74,0.10)");
      }
      if (levels.entry !== undefined && levels.stopLoss !== undefined) {
        band(levels.entry, levels.stopLoss, "rgba(220,38,38,0.10)");
      }
      if (levels.entry !== undefined) hLine(levels.entry, "#1f2a5a", "Entry", "solid");
      if (levels.takeProfit !== undefined) hLine(levels.takeProfit, "#16a34a", "Take profit", "dash");
      if (levels.stopLoss !== undefined) hLine(levels.stopLoss, "#dc2626", "Stop loss", "dash");
      for (const s of levels.support) hLine(s, "#0f766e", "Support", "dot");
      for (const r of levels.resistance) hLine(r, "#b45309", "Resistance", "dot");
    }
    if (rows.some((r) => r.rsi14 !== undefined)) {
      for (const level of [70, 30]) {
        shapes.push({
          type: "line",
          xref: "paper",
          x0: 0,
          x1: 1,
          yref: "y3",
          y0: level,
          y1: level,
          line: { color: level === 70 ? "#dc2626" : "#16a34a", width: 1, dash: "dot" },
        });
      }
    }

    const title = `${chart.meta?.stockName ?? chart.ticker}${chart.analysisDate ? ` · ${chart.analysisDate}` : ""}`;

    return {
      data: traces,
      layout: {
        title: { text: title, font: { size: 14 } },
        margin: { l: 52, r: 18, t: 38, b: 34 },
        showlegend: true,
        legend: { orientation: "h", y: 1.03, x: 0 },
        dragmode: "zoom",
        hovermode: "x unified",
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        xaxis: { rangeslider: { visible: false }, domain: [0, 1], anchor: "y3", showgrid: false },
        yaxis: { domain: [0.46, 1], title: { text: "Price" }, gridcolor: "rgba(120,120,120,0.18)" },
        yaxis2: { domain: [0.24, 0.42], title: { text: "Volume" }, gridcolor: "rgba(120,120,120,0.18)" },
        yaxis3: {
          domain: [0, 0.2],
          title: { text: "RSI" },
          range: [0, 100],
          gridcolor: "rgba(120,120,120,0.18)",
        },
        shapes,
        annotations,
      },
    };
  }, [chart, levels, showMarkers]);


  return (
    <ClientOnly fallback={<Fallback label="Preparing chart…" />}>
      <Suspense fallback={<Fallback label="Loading chart…" />}>
        <Plot
          data={data as never}
          layout={layout as never}
          config={{ responsive: true, displaylogo: false }}
          style={{ width: "100%", height: `${height}px` }}
          useResizeHandler
          className="rounded-md border border-rule bg-surface"
        />
      </Suspense>
    </ClientOnly>
  );
}
