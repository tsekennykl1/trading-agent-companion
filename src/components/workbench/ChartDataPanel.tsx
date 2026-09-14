import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PriceChartData } from "@/lib/trading-agents/client";
import { fill, useT } from "@/lib/i18n";

const LABELS: Record<string, string> = {
  date: "Date",
  open: "Open",
  high: "High",
  low: "Low",
  close: "Close",
  volume: "Volume",
  volumeMa: "Volume MA",
  ema12: "EMA 12",
  ema20: "EMA 20",
  ema26: "EMA 26",
  ema50: "EMA 50",
  sma20: "SMA 20",
  sma50: "SMA 50",
  sma200: "SMA 200",
  rsi14: "RSI 14",
  macd: "MACD",
  macdSignal: "MACD signal",
  macdHist: "MACD hist",
  bbUpper: "BB upper",
  bbMiddle: "BB middle",
  bbLower: "BB lower",
  atr14: "ATR 14",
  stochK: "Stoch %K",
  stochD: "Stoch %D",
  obv: "OBV",
  vwap: "VWAP (20d)",
};

const KNOWN = Object.keys(LABELS).filter((k) => k !== "date");

const num = (v: unknown) =>
  typeof v === "number" ? (Math.abs(v) >= 1000 ? v.toLocaleString(undefined, { maximumFractionDigits: 0 }) : v.toFixed(2)) : "—";

/** Shows exactly which series the engine sent and the numbers behind the chart. */
export function ChartDataPanel({ chart }: { chart: PriceChartData }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const rows = chart.rows;

  const present = useMemo(() => {
    const counts = new Map<string, number>();
    for (const key of KNOWN) {
      const n = rows.reduce((acc, r) => acc + ((r as unknown as Record<string, unknown>)[key] !== undefined ? 1 : 0), 0);
      if (n > 0) counts.set(key, n);
    }
    return [...counts.entries()];
  }, [rows]);

  const missing = KNOWN.filter((k) => !present.some(([p]) => p === k));
  const tail = rows.slice(-20).reverse();

  const download = () => {
    const blob = new Blob([JSON.stringify(chart, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${chart.ticker}-chart-data.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-md border border-rule bg-surface">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wide uppercase"
        >
          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          {fill(t("data.title"), { rows: rows.length, series: present.length })}
        </button>
        <Button size="sm" variant="outline" className="ml-auto min-h-8" onClick={download}>
          <Download className="size-3.5" /> JSON
        </Button>
      </div>

      {open && (
        <div className="space-y-3 border-t border-rule px-3 py-3">
          <div>
            <p className="mb-1 text-xs font-semibold">{t("data.received")}</p>
            <div className="flex flex-wrap gap-1.5">
              {present.map(([key, n]) => (
                <span key={key} className="rounded border border-rule px-1.5 py-0.5 text-[11px]">
                  {LABELS[key]} <span className="text-muted-foreground tabular-nums">{n}</span>
                </span>
              ))}
            </div>
          </div>

          {missing.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold">{t("data.missing")}</p>
              <p className="text-[11px] text-muted-foreground">{missing.map((k) => LABELS[k]).join(", ")}</p>
            </div>
          )}

          <div className="max-h-80 overflow-auto rounded border border-rule">
            <table className="w-full text-[11px] tabular-nums">
              <thead className="sticky top-0 bg-surface">
                <tr>
                  <th className="px-2 py-1 text-left font-semibold">{t("data.date")}</th>
                  {present.map(([key]) => (
                    <th key={key} className="px-2 py-1 text-right font-semibold whitespace-nowrap">
                      {LABELS[key]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tail.map((r) => (
                  <tr key={r.date} className="border-t border-rule">
                    <td className="px-2 py-1 whitespace-nowrap">{r.date}</td>
                    {present.map(([key]) => (
                      <td key={key} className="px-2 py-1 text-right">
                        {num((r as unknown as Record<string, unknown>)[key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground">{t("data.tail")}</p>
        </div>
      )}
    </div>
  );
}
