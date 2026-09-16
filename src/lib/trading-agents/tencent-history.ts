// Turns the packed 0700.HK price history into full chart rows with every
// technical study the chart can draw. Everything is computed in the browser,
// so the sample works with no engine and no network.
import type { ChartRow } from "./chart-data";
import { TENCENT_OHLCV } from "./tencent-history-data";

interface Bar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function parseBars(): Bar[] {
  return TENCENT_OHLCV.trim()
    .split("\n")
    .map((line) => {
      const [date, o, h, l, c, v] = line.split("|");
      return {
        date: date ?? "",
        open: Number(o ?? 0),
        high: Number(h ?? 0),
        low: Number(l ?? 0),
        close: Number(c ?? 0),
        volume: Number(v ?? 0),
      };
    })
    .filter((bar) => bar.date.length === 10);
}

const round = (value: number, digits = 2) => Number(value.toFixed(digits));

function sma(values: number[], period: number): (number | undefined)[] {
  const out: (number | undefined)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i += 1) {
    sum += values[i] ?? 0;
    if (i >= period) sum -= values[i - period] ?? 0;
    out.push(i >= period - 1 ? sum / period : undefined);
  }
  return out;
}

function ema(values: number[], period: number): (number | undefined)[] {
  const out: (number | undefined)[] = [];
  const k = 2 / (period + 1);
  let prev: number | undefined;
  let seed = 0;
  for (let i = 0; i < values.length; i += 1) {
    const value = values[i] ?? 0;
    if (i < period - 1) {
      seed += value;
      out.push(undefined);
      continue;
    }
    if (prev === undefined) {
      seed += value;
      prev = seed / period;
    } else {
      prev = value * k + prev * (1 - k);
    }
    out.push(prev);
  }
  return out;
}

function rsi(closes: number[], period = 14): (number | undefined)[] {
  const out: (number | undefined)[] = [];
  let gain = 0;
  let loss = 0;
  for (let i = 0; i < closes.length; i += 1) {
    if (i === 0) {
      out.push(undefined);
      continue;
    }
    const change = (closes[i] ?? 0) - (closes[i - 1] ?? 0);
    const up = Math.max(change, 0);
    const down = Math.max(-change, 0);
    if (i <= period) {
      gain += up;
      loss += down;
      if (i === period) {
        gain /= period;
        loss /= period;
        out.push(loss === 0 ? 100 : 100 - 100 / (1 + gain / loss));
      } else {
        out.push(undefined);
      }
      continue;
    }
    gain = (gain * (period - 1) + up) / period;
    loss = (loss * (period - 1) + down) / period;
    out.push(loss === 0 ? 100 : 100 - 100 / (1 + gain / loss));
  }
  return out;
}

function stdev(values: number[], period: number, means: (number | undefined)[]): (number | undefined)[] {
  return values.map((_, i) => {
    const mean = means[i];
    if (mean === undefined) return undefined;
    let total = 0;
    for (let j = i - period + 1; j <= i; j += 1) total += ((values[j] ?? 0) - mean) ** 2;
    return Math.sqrt(total / period);
  });
}

function buildRows(): ChartRow[] {
  const bars = parseBars();
  const closes = bars.map((b) => b.close);
  const volumes = bars.map((b) => b.volume);

  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, 200);
  const rsi14 = rsi(closes, 14);
  const volumeMa = sma(volumes, 20);
  const bbDev = stdev(closes, 20, sma20);

  const macdLine = closes.map((_, i) => {
    const fast = ema12[i];
    const slow = ema26[i];
    return fast !== undefined && slow !== undefined ? fast - slow : undefined;
  });
  const macdDefined = macdLine.map((v) => v ?? 0);
  const signalRaw = ema(macdDefined, 9);
  const firstMacd = macdLine.findIndex((v) => v !== undefined);

  // ATR (Wilder), Stochastic 14/3, OBV and a 20-day rolling VWAP.
  const atr: (number | undefined)[] = [];
  let atrPrev: number | undefined;
  let trSum = 0;
  const stochK: (number | undefined)[] = [];
  const obv: number[] = [];
  const vwap: (number | undefined)[] = [];
  let obvRunning = 0;

  bars.forEach((bar, i) => {
    const prevClose = i > 0 ? bars[i - 1]?.close ?? bar.close : bar.close;
    const tr = Math.max(bar.high - bar.low, Math.abs(bar.high - prevClose), Math.abs(bar.low - prevClose));
    if (i < 14) {
      trSum += tr;
      atr.push(i === 13 ? trSum / 14 : undefined);
      if (i === 13) atrPrev = trSum / 14;
    } else {
      atrPrev = ((atrPrev ?? tr) * 13 + tr) / 14;
      atr.push(atrPrev);
    }

    if (i >= 13) {
      let hh = -Infinity;
      let ll = Infinity;
      for (let j = i - 13; j <= i; j += 1) {
        hh = Math.max(hh, bars[j]?.high ?? 0);
        ll = Math.min(ll, bars[j]?.low ?? 0);
      }
      stochK.push(hh === ll ? 50 : ((bar.close - ll) / (hh - ll)) * 100);
    } else {
      stochK.push(undefined);
    }

    obvRunning += bar.close > prevClose ? bar.volume : bar.close < prevClose ? -bar.volume : 0;
    obv.push(obvRunning);

    if (i >= 19) {
      let pv = 0;
      let vol = 0;
      for (let j = i - 19; j <= i; j += 1) {
        const b = bars[j];
        if (!b) continue;
        const typical = (b.high + b.low + b.close) / 3;
        pv += typical * b.volume;
        vol += b.volume;
      }
      vwap.push(vol > 0 ? pv / vol : undefined);
    } else {
      vwap.push(undefined);
    }
  });

  const stochD = stochK.map((_, i) => {
    if (i < 15) return undefined;
    const window = [stochK[i], stochK[i - 1], stochK[i - 2]];
    if (window.some((v) => v === undefined)) return undefined;
    return (window as number[]).reduce((a, b) => a + b, 0) / 3;
  });

  /** Only set a study when it has a value (the chart types forbid explicit undefined). */
  const put = (row: ChartRow, key: keyof ChartRow, value: number | undefined, digits = 2) => {
    if (value === undefined || Number.isNaN(value)) return;
    (row as Record<string, number>)[key] = round(value, digits);
  };

  return bars.map((bar, i) => {
    const macd = macdLine[i];
    const signal = i >= firstMacd + 8 && firstMacd >= 0 ? signalRaw[i] : undefined;
    const mean = sma20[i];
    const dev = bbDev[i];
    const row: ChartRow = {
      date: bar.date,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume,
    };
    put(row, "volumeMa", volumeMa[i], 0);
    put(row, "ema12", ema12[i]);
    put(row, "ema26", ema26[i]);
    put(row, "ema20", ema20[i]);
    put(row, "ema50", ema50[i]);
    put(row, "sma20", sma20[i]);
    put(row, "sma50", sma50[i]);
    put(row, "sma200", sma200[i]);
    put(row, "rsi14", rsi14[i]);
    put(row, "macd", macd, 3);
    put(row, "macdSignal", signal, 3);
    if (macd !== undefined && signal !== undefined) put(row, "macdHist", macd - signal, 3);
    if (mean !== undefined && dev !== undefined) {
      put(row, "bbUpper", mean + 2 * dev);
      put(row, "bbMiddle", mean);
      put(row, "bbLower", mean - 2 * dev);
    }
    put(row, "atr14", atr[i]);
    put(row, "stochK", stochK[i], 1);
    put(row, "stochD", stochD[i], 1);
    put(row, "obv", obv[i], 0);
    put(row, "vwap", vwap[i]);
    return row;
  });

}

let cached: ChartRow[] | null = null;

/** Full three-year history with indicators (computed once, then reused). */
export function tencentHistoryRows(): ChartRow[] {
  if (!cached) cached = buildRows();
  return cached;
}

export const TENCENT_HISTORY_RANGE = { start: "2023-09-04", end: "2026-08-28" };
