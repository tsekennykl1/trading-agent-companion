import { Suspense, lazy, useMemo } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import type { ChartRow, PriceChartData } from "@/lib/trading-agents/client";
import { deriveMarkers } from "@/lib/trading-agents/signals";
import { INDICATORS, type IndicatorKey, type PanelKey } from "@/lib/trading-agents/indicators";
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

const OVERLAY_LINES: { key: IndicatorKey; field: keyof ChartRow; name: string; color: string; dash?: string }[] = [
  { key: "ema20", field: "ema20", name: "EMA 20", color: "#2563eb" },
  { key: "ema50", field: "ema50", name: "EMA 50", color: "#d97706" },
  { key: "ema12", field: "ema12", name: "EMA 12", color: "#0ea5e9" },
  { key: "ema26", field: "ema26", name: "EMA 26", color: "#9333ea" },
  { key: "sma20", field: "sma20", name: "SMA 20", color: "#0891b2", dash: "dot" },
  { key: "sma50", field: "sma50", name: "SMA 50", color: "#ca8a04", dash: "dot" },
  { key: "sma200", field: "sma200", name: "SMA 200", color: "#475569" },
  { key: "vwap", field: "vwap", name: "VWAP (20d rolling)", color: "#be185d", dash: "dashdot" },
];

const PANEL_ORDER: PanelKey[] = ["volume", "rsi", "macd", "stoch", "atr", "obv"];
const PANEL_TITLE: Record<PanelKey, string> = {
  price: "Price",
  volume: "Volume",
  rsi: "RSI",
  macd: "MACD",
  stoch: "Stoch",
  atr: "ATR",
  obv: "OBV",
};

/**
 * Renders price plus any technical panels the user has enabled, from the
 * engine's chart JSON, with optional trade levels and signal markers.
 */
export function PlotlyPriceChart({
  chart,
  height = 520,
  levels,
  visible,
}: {
  chart: PriceChartData;
  height?: number;
  /** Entry / stop / target / support / resistance drawn over the price panel. */
  levels?: TradeLevels | undefined;
  /** Which technical studies to draw. */
  visible: IndicatorKey[];
}) {
  const shown = useMemo(() => new Set(visible), [visible]);

  const { data, layout } = useMemo(() => {
    const rows = chart.rows;
    const x = rows.map((r) => r.date);
    const has = (field: keyof ChartRow) => rows.some((r) => r[field] !== undefined);
    const on = (key: IndicatorKey) => shown.has(key);
    const col = (field: keyof ChartRow) => rows.map((r) => (r[field] as number | undefined) ?? null);

    // --- Which lower panels are active ---
    const panels = PANEL_ORDER.filter((panel) =>
      INDICATORS.some((spec) => spec.panel === panel && on(spec.key) && spec.has(rows)),
    );
    const axisOf = new Map<PanelKey, string>([["price", "y"]]);
    panels.forEach((panel, i) => axisOf.set(panel, `y${i + 2}`));

    const traces: Record<string, unknown>[] = [];
    const hasOhlc = rows.some((r) => r.open !== undefined && r.high !== undefined && r.low !== undefined);
    if (hasOhlc) {
      traces.push({
        type: "candlestick",
        name: chart.meta?.stockName ?? chart.ticker,
        x,
        open: col("open"),
        high: col("high"),
        low: col("low"),
        close: col("close"),
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
        y: col("close"),
        line: { color: "#1f2a5a", width: 2 },
        xaxis: "x",
        yaxis: "y",
      });
    }

    for (const line of OVERLAY_LINES) {
      if (!on(line.key) || !has(line.field)) continue;
      traces.push({
        type: "scatter",
        mode: "lines",
        name: line.name,
        x,
        y: col(line.field),
        line: { color: line.color, width: 1.4, ...(line.dash ? { dash: line.dash } : {}) },
        xaxis: "x",
        yaxis: "y",
      });
    }

    if (on("bollinger") && has("bbUpper") && has("bbLower")) {
      traces.push({
        type: "scatter",
        mode: "lines",
        name: "BB upper",
        x,
        y: col("bbUpper"),
        line: { color: "rgba(100,116,139,0.7)", width: 1 },
        xaxis: "x",
        yaxis: "y",
      });
      traces.push({
        type: "scatter",
        mode: "lines",
        name: "BB lower",
        x,
        y: col("bbLower"),
        line: { color: "rgba(100,116,139,0.7)", width: 1 },
        fill: "tonexty",
        fillcolor: "rgba(100,116,139,0.10)",
        xaxis: "x",
        yaxis: "y",
      });
      if (has("bbMiddle")) {
        traces.push({
          type: "scatter",
          mode: "lines",
          name: "BB middle",
          x,
          y: col("bbMiddle"),
          line: { color: "rgba(100,116,139,0.9)", width: 1, dash: "dot" },
          xaxis: "x",
          yaxis: "y",
          showlegend: false,
        });
      }
    }

    // --- Lower panels ---
    const volumeAxis = axisOf.get("volume");
    if (volumeAxis && on("volume") && has("volume")) {
      const colors = rows.map((r, i) => {
        const prev = rows[i - 1];
        const up = r.close !== undefined && prev?.close !== undefined ? r.close >= prev.close : true;
        return up ? "#16a34a" : "#dc2626";
      });
      traces.push({
        type: "bar",
        name: "Volume",
        x,
        y: col("volume"),
        marker: { color: colors, opacity: 0.55 },
        xaxis: "x",
        yaxis: volumeAxis,
        showlegend: false,
      });
      if (on("volumeMa") && has("volumeMa")) {
        traces.push({
          type: "scatter",
          mode: "lines",
          name: "Volume MA",
          x,
          y: col("volumeMa"),
          line: { color: "#1f2a5a", width: 1.2 },
          xaxis: "x",
          yaxis: volumeAxis,
          showlegend: false,
        });
      }
    }

    const rsiAxis = axisOf.get("rsi");
    if (rsiAxis && on("rsi") && has("rsi14")) {
      traces.push({
        type: "scatter",
        mode: "lines",
        name: "RSI 14",
        x,
        y: col("rsi14"),
        line: { color: "#7c3aed", width: 1.4 },
        xaxis: "x",
        yaxis: rsiAxis,
        showlegend: false,
      });
    }

    const macdAxis = axisOf.get("macd");
    if (macdAxis && on("macd")) {
      if (has("macdHist")) {
        traces.push({
          type: "bar",
          name: "MACD hist",
          x,
          y: col("macdHist"),
          marker: {
            color: rows.map((r) => ((r.macdHist ?? 0) >= 0 ? "rgba(22,163,74,0.55)" : "rgba(220,38,38,0.55)")),
          },
          xaxis: "x",
          yaxis: macdAxis,
          showlegend: false,
        });
      }
      if (has("macd")) {
        traces.push({
          type: "scatter",
          mode: "lines",
          name: "MACD",
          x,
          y: col("macd"),
          line: { color: "#2563eb", width: 1.3 },
          xaxis: "x",
          yaxis: macdAxis,
          showlegend: false,
        });
      }
      if (has("macdSignal")) {
        traces.push({
          type: "scatter",
          mode: "lines",
          name: "Signal",
          x,
          y: col("macdSignal"),
          line: { color: "#d97706", width: 1.3 },
          xaxis: "x",
          yaxis: macdAxis,
          showlegend: false,
        });
      }
    }

    const stochAxis = axisOf.get("stoch");
    if (stochAxis && on("stoch")) {
      if (has("stochK")) {
        traces.push({
          type: "scatter",
          mode: "lines",
          name: "%K",
          x,
          y: col("stochK"),
          line: { color: "#0891b2", width: 1.3 },
          xaxis: "x",
          yaxis: stochAxis,
          showlegend: false,
        });
      }
      if (has("stochD")) {
        traces.push({
          type: "scatter",
          mode: "lines",
          name: "%D",
          x,
          y: col("stochD"),
          line: { color: "#be185d", width: 1.3 },
          xaxis: "x",
          yaxis: stochAxis,
          showlegend: false,
        });
      }
    }

    const atrAxis = axisOf.get("atr");
    if (atrAxis && on("atr") && has("atr14")) {
      traces.push({
        type: "scatter",
        mode: "lines",
        name: "ATR 14",
        x,
        y: col("atr14"),
        line: { color: "#b45309", width: 1.3 },
        xaxis: "x",
        yaxis: atrAxis,
        showlegend: false,
      });
    }

    const obvAxis = axisOf.get("obv");
    if (obvAxis && on("obv") && has("obv")) {
      traces.push({
        type: "scatter",
        mode: "lines",
        name: "OBV",
        x,
        y: col("obv"),
        line: { color: "#0f766e", width: 1.3 },
        xaxis: "x",
        yaxis: obvAxis,
        showlegend: false,
      });
    }

    // --- Signal markers (engine-supplied, otherwise derived from the rows) ---
    const closeByDate = new Map(rows.map((r) => [r.date, r.close]));
    const markers = on("markers") ? (chart.markers?.length ? chart.markers : deriveMarkers(rows)) : [];
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
    if (levels && on("levels")) {
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
    const guide = (axis: string, value: number, color: string) =>
      shapes.push({
        type: "line",
        xref: "paper",
        x0: 0,
        x1: 1,
        yref: axis,
        y0: value,
        y1: value,
        line: { color, width: 1, dash: "dot" },
      });
    if (rsiAxis && on("rsi") && has("rsi14")) {
      guide(rsiAxis, 70, "#dc2626");
      guide(rsiAxis, 30, "#16a34a");
    }
    if (stochAxis && on("stoch")) {
      guide(stochAxis, 80, "#dc2626");
      guide(stochAxis, 20, "#16a34a");
    }
    if (macdAxis && on("macd")) guide(macdAxis, 0, "rgba(120,120,120,0.6)");

    // --- Panel geometry ---
    const n = panels.length;
    const gap = 0.035;
    const priceFrac = n === 0 ? 1 : Math.max(0.32, 1 - gap * n - 0.17 * n);
    const subFrac = n === 0 ? 0 : (1 - priceFrac - gap * n) / n;
    const axisLayout: Record<string, unknown> = {};
    let cursor = 0;
    for (let i = n - 1; i >= 0; i--) {
      const panel = panels[i]!;
      const axisName = `yaxis${i + 2}`;
      axisLayout[axisName] = {
        domain: [Number(cursor.toFixed(4)), Number((cursor + subFrac).toFixed(4))],
        title: { text: PANEL_TITLE[panel], font: { size: 10 } },
        gridcolor: "rgba(120,120,120,0.18)",
        ...(panel === "rsi" || panel === "stoch" ? { range: [0, 100] } : {}),
      };
      cursor += subFrac + gap;
    }

    const title = `${chart.meta?.stockName ?? chart.ticker}${chart.analysisDate ? ` · ${chart.analysisDate}` : ""}`;

    return {
      data: traces,
      layout: {
        title: { text: title, font: { size: 14 } },
        margin: { l: 56, r: 18, t: 38, b: 34 },
        showlegend: true,
        legend: { orientation: "h", y: 1.03, x: 0 },
        dragmode: "zoom",
        hovermode: "x unified",
        barmode: "overlay",
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        xaxis: {
          rangeslider: { visible: false },
          domain: [0, 1],
          anchor: n ? `y${n + 1}` : "y",
          showgrid: false,
        },
        yaxis: {
          domain: [Number(Math.min(cursor, 0.99).toFixed(4)), 1],
          title: { text: "Price" },
          gridcolor: "rgba(120,120,120,0.18)",
        },
        ...axisLayout,
        shapes,
        annotations,
      },
    };
  }, [chart, levels, shown]);

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
