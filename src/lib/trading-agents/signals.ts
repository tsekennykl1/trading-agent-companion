import type { ChartRow } from "./client";
import type { ChartMarker } from "./types";

/**
 * Derives explainable chart events from the price rows when the engine does
 * not publish its own markers: EMA 20/50 crossovers and RSI 14 entering the
 * overbought / oversold zones.
 */
export function deriveMarkers(rows: ChartRow[]): ChartMarker[] {
  const out: ChartMarker[] = [];
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const prev = rows[i - 1];
    if (!row || !prev) continue;

    if (
      row.ema20 !== undefined &&
      row.ema50 !== undefined &&
      prev.ema20 !== undefined &&
      prev.ema50 !== undefined
    ) {
      const now = row.ema20 - row.ema50;
      const before = prev.ema20 - prev.ema50;
      if (before <= 0 && now > 0) {
        out.push({
          date: row.date,
          kind: "cross_up",
          label: "EMA 20 crossed above EMA 50",
          ...(row.close !== undefined ? { price: row.close } : {}),
        });
      } else if (before >= 0 && now < 0) {
        out.push({
          date: row.date,
          kind: "cross_down",
          label: "EMA 20 crossed below EMA 50",
          ...(row.close !== undefined ? { price: row.close } : {}),
        });
      }
    }

    if (row.rsi14 !== undefined && prev.rsi14 !== undefined) {
      if (prev.rsi14 < 70 && row.rsi14 >= 70) {
        out.push({
          date: row.date,
          kind: "overbought",
          label: `RSI entered overbought (${row.rsi14.toFixed(0)})`,
          ...(row.close !== undefined ? { price: row.close } : {}),
        });
      } else if (prev.rsi14 > 30 && row.rsi14 <= 30) {
        out.push({
          date: row.date,
          kind: "oversold",
          label: `RSI entered oversold (${row.rsi14.toFixed(0)})`,
          ...(row.close !== undefined ? { price: row.close } : {}),
        });
      }
    }
  }
  return out;
}

const BULL_HEADING = /(bull|positive|strength|opportunit|catalyst|support)/i;
const BEAR_HEADING = /(bear|negative|risk|concern|weak|headwind|downside)/i;

function cleanBullet(line: string): string {
  return line
    .replace(/^[-*•]\s*/, "")
    .replace(/^\d+[.)]\s*/, "")
    .replace(/\*\*/g, "")
    .replace(/^"|"$/g, "")
    .trim();
}

/**
 * Pulls short bullish / bearish bullet points out of whatever analyst reports
 * have arrived, so the "Why this signal?" panel can show reasons before the
 * full run finishes.
 */
export function extractReasons(
  reports: Record<string, string>,
  limit = 4,
): { bullish: string[]; bearish: string[] } {
  const bullish: string[] = [];
  const bearish: string[] = [];

  for (const text of Object.values(reports)) {
    if (!text?.trim()) continue;
    let bucket: "bull" | "bear" | null = null;
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) continue;
      const heading = line.match(/^#{1,6}\s*(.+)$/) ?? line.match(/^\*\*(.+?)\*\*:?\s*$/);
      if (heading?.[1]) {
        const h = heading[1];
        bucket = BULL_HEADING.test(h) ? "bull" : BEAR_HEADING.test(h) ? "bear" : null;
        continue;
      }
      if (!/^[-*•]\s+|^\d+[.)]\s+/.test(line)) continue;
      const point = cleanBullet(line);
      if (point.length < 12 || point.length > 220) continue;
      const target =
        bucket === "bull"
          ? bullish
          : bucket === "bear"
            ? bearish
            : BULL_HEADING.test(point) && !BEAR_HEADING.test(point)
              ? bullish
              : BEAR_HEADING.test(point)
                ? bearish
                : null;
      if (!target || target.includes(point) || target.length >= limit) continue;
      target.push(point);
    }
  }

  return { bullish: bullish.slice(0, limit), bearish: bearish.slice(0, limit) };
}
