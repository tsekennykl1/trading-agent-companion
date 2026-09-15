// Readers for the chart and market-data artifacts. The engine may send any of
// several shapes; these turn all of them into one tidy ChartRow list.
import type { ChartMarker, DecisionScores, PricePoint, TradeLevels } from "./types";
import { norm, num, numberList, pointDate, titleCase } from "./parse";

export interface ChartRow {
  date: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  volumeMa?: number;
  ema20?: number;
  ema50?: number;
  ema12?: number;
  ema26?: number;
  sma20?: number;
  sma50?: number;
  sma200?: number;
  rsi14?: number;
  macd?: number;
  macdSignal?: number;
  macdHist?: number;
  bbUpper?: number;
  bbMiddle?: number;
  bbLower?: number;
  atr14?: number;
  stochK?: number;
  stochD?: number;
  obv?: number;
  vwap?: number;
}

export interface PriceChartData {
  ticker: string;
  analysisDate?: string;
  meta?: {
    stockName?: string;
    stockCode?: string;
    rows?: number;
    range?: string;
    visibleStart?: string;
    visibleEnd?: string;
    /** e.g. "rolling_vwap_20" — used to label the VWAP series precisely. */
    vwapMode?: string;
  };
  rows: ChartRow[];
  /** Optional trade levels published with the chart payload. */
  levels?: TradeLevels;
  /** Optional dated events published with the chart payload. */
  markers?: ChartMarker[];
}

/** Reads entry/stop/target/support/resistance from any snake- or camelCase shape. */
export function readTradeLevels(raw: unknown): TradeLevels | undefined {
  if (typeof raw === "string") {
    const labelled = (labels: string[]) => {
      const expression = new RegExp(`(?:${labels.join("|")})\\s*(?:price|level|zone)?\\s*[:=：-]?\\s*(?:HK\\$|USD\\$|\\$)?\\s*([0-9][0-9,]*(?:\\.[0-9]+)?)`, "i");
      const match = raw.match(expression);
      return match?.[1] ? num(match[1]) : undefined;
    };
    const entry = labelled(["entry", "entry price", "buy price", "進場價", "入場價"]);
    const stopLoss = labelled(["stop loss", "stop-loss", "stop", "停損價", "止蝕價"]);
    const takeProfit = labelled(["take profit", "take-profit", "target price", "target", "目標價", "止賺價"]);
    if (entry === undefined && stopLoss === undefined && takeProfit === undefined) return undefined;
    return {
      ...(entry !== undefined ? { entry } : {}),
      ...(stopLoss !== undefined ? { stopLoss } : {}),
      ...(takeProfit !== undefined ? { takeProfit } : {}),
      support: [],
      resistance: [],
    };
  }
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const nestedKeys = ["levels", "trade_levels", "tradeLevels", "price_levels", "priceLevels", "targets", "recommendation"];
  const nested = nestedKeys
    .map((key) => o[key])
    .find((value): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value)));
  const src = nested ? { ...o, ...nested } : o;
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = num(src[k]);
      if (v !== undefined) return v;
    }
    return undefined;
  };
  const entry = pick("entry", "entry_price", "entryPrice", "entry_zone", "entryZone", "entry_limit", "entryLimit", "buy_price", "buyPrice");
  const stopLoss = pick("stop_loss", "stopLoss", "stop_loss_price", "stopLossPrice", "stop", "sl", "risk_price", "riskPrice");
  const takeProfit = pick("take_profit", "takeProfit", "take_profit_price", "takeProfitPrice", "target_price", "targetPrice", "target", "tp", "price_target", "priceTarget");
  const support = numberList(src["support"] ?? src["support_levels"] ?? src["supports"]);
  const resistance = numberList(src["resistance"] ?? src["resistance_levels"] ?? src["resistances"]);
  if (entry === undefined && stopLoss === undefined && takeProfit === undefined && !support.length && !resistance.length) {
    return undefined;
  }
  return {
    ...(entry !== undefined ? { entry } : {}),
    ...(stopLoss !== undefined ? { stopLoss } : {}),
    ...(takeProfit !== undefined ? { takeProfit } : {}),
    support,
    resistance,
  };
}

const MARKER_KINDS: ChartMarker["kind"][] = ["buy", "sell", "cross_up", "cross_down", "overbought", "oversold"];

/** Reads dated signal events (buy/sell/crossover/RSI) when the engine sends them. */
export function readChartMarkers(raw: unknown): ChartMarker[] {
  const list =
    (raw && typeof raw === "object" && (((raw as Record<string, unknown>)["markers"] ??
      (raw as Record<string, unknown>)["events"] ??
      (raw as Record<string, unknown>)["signals"]) as unknown)) ||
    undefined;
  if (!Array.isArray(list)) return [];
  const out: ChartMarker[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const date = String(o["date"] ?? o["t"] ?? o["time"] ?? o["timestamp"] ?? "").slice(0, 10);
    if (!date) continue;
    const rawKind = String(o["kind"] ?? o["type"] ?? o["signal"] ?? "").toLowerCase().replace(/[\s-]/g, "_");
    const direction = String(o["direction"] ?? "").toLowerCase();
    const bullish = rawKind.includes("bullish") || rawKind.includes("golden") || rawKind.includes("breakout") || direction === "bullish";
    const bearish = rawKind.includes("bearish") || rawKind.includes("death") || rawKind.includes("breakdown") || direction === "bearish";
    const kind =
      MARKER_KINDS.find((k) => rawKind === k) ??
      (rawKind.includes("overbought")
        ? "overbought"
        : rawKind.includes("oversold")
          ? "oversold"
          : rawKind.includes("buy")
            ? "buy"
            : rawKind.includes("sell")
              ? "sell"
              : rawKind.includes("cross") || rawKind.includes("breakout") || rawKind.includes("breakdown")
                ? bullish
                  ? "cross_up"
                  : bearish
                    ? "cross_down"
                    : undefined
                : bullish
                  ? "buy"
                  : bearish
                    ? "sell"
                    : undefined);
    if (!kind) continue;

    const price = num(o["price"] ?? o["close"] ?? o["value"]);
    out.push({
      date,
      kind,
      label: typeof o["label"] === "string" ? o["label"] : titleCase(kind),
      ...(price !== undefined ? { price } : {}),
    });
  }
  return out;
}

/** Reads bullishness / conviction / risk scores, normalising 0-1 to 0-100. */
export function readScores(raw: unknown): DecisionScores | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const nested = (o["scores"] ?? o["sentiment"]) as Record<string, unknown> | undefined;
  const src = nested && typeof nested === "object" ? { ...o, ...nested } : o;
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = num(src[k]);
      if (v === undefined) continue;
      const scaled = v > 0 && v <= 1 ? v * 100 : v;
      return Math.min(100, Math.max(0, Math.round(scaled)));
    }
    return undefined;
  };
  const bullishness = pick("bullishness", "bullishness_score", "sentiment_score", "bullish_score");
  const conviction = pick("conviction", "conviction_score");
  const risk = pick("risk_score", "riskScore");
  if (bullishness === undefined && conviction === undefined && risk === undefined) return undefined;
  return {
    ...(bullishness !== undefined ? { bullishness } : {}),
    ...(conviction !== undefined ? { conviction } : {}),
    ...(risk !== undefined ? { risk } : {}),
  };
}


/** Maps a flat indicator field name (any casing/spelling) onto a ChartRow key. */
function rowFieldFor(name: string): keyof ChartRow | undefined {
  const n = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!n) return undefined;
  // Volume moving average variants: volume_sma20, volume_ma_20, vol_ma...
  if (/^(volume|vol)(sma|ma|avg)/.test(n) || /^(vma)/.test(n)) return "volumeMa";
  if (n === "volume" || n === "vol") return "volume";
  if (n.includes("vwap")) return "vwap";
  if (n.includes("obv")) return "obv";
  if (n.includes("atr")) return "atr14";
  if (n.includes("rsi")) return "rsi14";
  if (n.startsWith("sma") || n.startsWith("ma")) {
    const w = n.match(/(\d+)/)?.[1];
    if (w === "200") return "sma200";
    if (w === "50") return "sma50";
    if (w === "20") return "sma20";
    return undefined;
  }
  if (n.startsWith("ema")) {
    const w = n.match(/(\d+)/)?.[1];
    if (w === "12") return "ema12";
    if (w === "26") return "ema26";
    if (w === "50") return "ema50";
    if (w === "20") return "ema20";
    return undefined;
  }
  return undefined;
}

/** Multi-valued families keyed by point sub-fields. */
const MULTI_SERIES: { match: (n: string) => boolean; fields: Record<string, keyof ChartRow> }[] = [
  {
    match: (n) => n.includes("macd"),
    fields: {
      macd: "macd",
      line: "macd",
      signal: "macdSignal",
      macdsignal: "macdSignal",
      hist: "macdHist",
      histogram: "macdHist",
      macdhist: "macdHist",
    },
  },
  {
    match: (n) => n.includes("bollinger") || n.startsWith("bb") || n.includes("boll"),
    fields: { upper: "bbUpper", middle: "bbMiddle", lower: "bbLower", mid: "bbMiddle" },
  },
  {
    match: (n) => n.includes("stoch"),
    fields: { k: "stochK", d: "stochD", percentk: "stochK", percentd: "stochD", slowk: "stochK", slowd: "stochD" },
  },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const pointDate = (o: Record<string, unknown>) =>
  String(o["t"] ?? o["date"] ?? o["Date"] ?? o["time"] ?? o["timestamp"] ?? o["x"] ?? "").slice(0, 10);

/**
 * Resolves which ChartRow column an array of dated points belongs to, given the
 * path it was found at. Handles both grouped families whose members are their
 * own arrays (macd.signal, bollinger.upper, stochastic_14_3.k) and plain
 * named series (overlays.sma20, subcharts.volume_sma20).
 */
function fieldForPath(path: string[]): keyof ChartRow | undefined {
  const leaf = path.at(-1) ?? "";
  const parent = path.at(-2) ?? "";
  const family = MULTI_SERIES.find((m) => m.match(norm(parent)));
  if (family) {
    const sub = family.fields[norm(leaf)];
    if (sub) return sub;
  }
  return rowFieldFor(leaf) ?? rowFieldFor(`${parent}_${leaf}`) ?? rowFieldFor(parent);
}

/**
 * Merges the engine's grouped indicator payload (indicators / overlays /
 * subcharts, in any nesting) into the dated chart rows.
 */
function mergeIndicatorSeries(source: unknown, byDate: Map<string, ChartRow>, path: string[] = []): void {
  if (!source || typeof source !== "object") return;
  if (Array.isArray(source)) {
    const leafField = fieldForPath(path);
    const multi = MULTI_SERIES.find((m) => m.match(norm(path.join("_"))));
    if (!multi && !leafField) return;
    for (const item of source) {
      if (!item || typeof item !== "object") continue;
      const p = item as Record<string, unknown>;
      const date = pointDate(p);
      const row = byDate.get(date);
      if (!row) continue;
      // Plain { time, value } points always win when the column is known.
      const v = num(p["value"] ?? p["v"] ?? p["y"] ?? p["close"] ?? p["level"]);
      if (leafField && v !== undefined) {
        (row[leafField] as number | undefined) = v;
        continue;
      }
      if (multi) {
        for (const [key, value] of Object.entries(p)) {
          const target = multi.fields[norm(key)];
          const n = num(value);
          if (target && n !== undefined) (row[target] as number | undefined) = n;
        }
      }
    }
    return;
  }
  for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
    mergeIndicatorSeries(value, byDate, [...path, key]);
  }
}


/** Tolerant reader for the price-chart JSON artifact. */
export function readPriceChart(raw: unknown): PriceChartData | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const series = (o["series"] ?? {}) as Record<string, unknown>;
  const rowsRaw =
    (Array.isArray(o["rows"]) && o["rows"]) ||
    (Array.isArray(o["bars"]) && o["bars"]) ||
    (Array.isArray(o["prices"]) && o["prices"]) ||
    (Array.isArray(series["price"]) && series["price"]) ||
    (Array.isArray(o["data"]) && o["data"]) ||
    [];
  const rows = (rowsRaw as unknown[])
    .map((r) => {
      const row = (r ?? {}) as Record<string, unknown>;
      const date = pointDate(row);
      if (!date) return undefined;
      const pick = (...keys: string[]) => {
        for (const k of keys) {
          const v = num(row[k]);
          if (v !== undefined) return v;
        }
        return undefined;
      };
      const entry: ChartRow = { date };
      const simple: [keyof ChartRow, number | undefined][] = [
        ["open", pick("open", "Open", "o")],
        ["high", pick("high", "High", "h")],
        ["low", pick("low", "Low", "l")],
        ["close", pick("close", "Close", "c")],
        ["volume", pick("volume", "Volume", "v")],
        ["volumeMa", pick("volume_ma20", "volume_ma_20", "volumeMa", "volume_ma", "volume_sma20")],
        ["ema20", pick("ema20", "EMA20", "ema_20")],
        ["ema50", pick("ema50", "EMA50", "ema_50")],
        ["ema12", pick("ema12", "EMA12", "ema_12")],
        ["ema26", pick("ema26", "EMA26", "ema_26")],
        ["sma20", pick("sma20", "SMA20", "sma_20")],
        ["sma50", pick("sma50", "SMA50", "sma_50")],
        ["sma200", pick("sma200", "SMA200", "sma_200")],
        ["rsi14", pick("rsi14", "RSI14", "rsi_14", "rsi")],
        ["macd", pick("macd", "MACD", "macd_line")],
        ["macdSignal", pick("macd_signal", "macdSignal", "signal")],
        ["macdHist", pick("macd_hist", "macdHist", "macd_histogram", "histogram")],
        ["bbUpper", pick("bb_upper", "bbUpper", "bollinger_upper", "upper")],
        ["bbMiddle", pick("bb_middle", "bbMiddle", "bollinger_middle", "middle")],
        ["bbLower", pick("bb_lower", "bbLower", "bollinger_lower", "lower")],
        ["atr14", pick("atr14", "atr_14", "atr")],
        ["stochK", pick("stoch_k", "stochK", "k", "percent_k")],
        ["stochD", pick("stoch_d", "stochD", "d", "percent_d")],
        ["obv", pick("obv", "OBV")],
        ["vwap", pick("vwap", "VWAP")],
      ];
      for (const [key, value] of simple) if (value !== undefined) (entry[key] as number | undefined) = value;
      // Legacy payloads only carried SMA columns for the two moving-average lines.
      if (entry.ema20 === undefined && entry.sma20 === undefined) {
        const legacy = pick("SMA20");
        if (legacy !== undefined) entry.sma20 = legacy;
      }
      return entry;
    })
    .filter(Boolean) as ChartRow[];

  if (!rows.length) return null;

  const byDate = new Map(rows.map((r) => [r.date, r]));
  for (const key of ["indicators", "overlays", "subcharts", "volume"]) {
    mergeIndicatorSeries(o[key], byDate, [key]);
    mergeIndicatorSeries(series[key], byDate, [key]);
  }


  const meta = (o["meta"] ?? {}) as Record<string, unknown>;
  const levels = readTradeLevels(o) ?? readTradeLevels(meta);
  const markers = readChartMarkers(o).length ? readChartMarkers(o) : readChartMarkers(meta);
  return {
    ticker: String(o["ticker"] ?? o["symbol"] ?? meta["stock_code"] ?? ""),
    ...(typeof o["analysis_date"] === "string" ? { analysisDate: o["analysis_date"] } : {}),
    meta: {
      ...(typeof meta["stock_name"] === "string" ? { stockName: meta["stock_name"] } : {}),
      ...(typeof meta["name"] === "string" ? { stockName: meta["name"] } : {}),
      ...(typeof meta["stock_code"] === "string" ? { stockCode: meta["stock_code"] } : {}),
      ...(num(meta["rows"]) !== undefined ? { rows: num(meta["rows"])! } : {}),
      ...(typeof meta["range"] === "string" ? { range: meta["range"] } : {}),
      ...(typeof meta["visible_start"] === "string" ? { visibleStart: meta["visible_start"] } : {}),
      ...(typeof meta["visible_end"] === "string" ? { visibleEnd: meta["visible_end"] } : {}),
      ...(typeof meta["vwap_mode"] === "string" ? { vwapMode: meta["vwap_mode"] } : {}),
    },
    rows,
    ...(levels ? { levels } : {}),
    ...(markers.length ? { markers } : {}),
  };
}

export interface MarketData {
  prices: import("./types").PricePoint[];
  latestPrice?: number;
  latestRsi14?: number;
  latestEma20?: number;
  latestEma50?: number;
  changePct?: number;
  stockName?: string;
}

/** Tolerant reader for GET /runs/{id}/market-data in its various shapes. */
export function readMarketData(raw: unknown): MarketData | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const rowsRaw =
    (Array.isArray(o["prices"]) && o["prices"]) ||
    (Array.isArray(o["price_data"]) && o["price_data"]) ||
    (Array.isArray(o["rows"]) && o["rows"]) ||
    (Array.isArray(o["data"]) && o["data"]) ||
    [];
  const prices = (rowsRaw as unknown[])
    .map((r) => {
      const row = (r ?? {}) as Record<string, unknown>;
      const date = String(row["date"] ?? row["Date"] ?? row["timestamp"] ?? "");
      const close = num(row["close"] ?? row["Close"] ?? row["price"]);
      if (!date || close === undefined) return undefined;
      return {
        date: date.slice(0, 10),
        close,
        ...(num(row["ema10"] ?? row["EMA10"]) !== undefined ? { ema10: num(row["ema10"] ?? row["EMA10"])! } : {}),
        ...(num(row["sma20"] ?? row["SMA20"] ?? row["ema20"]) !== undefined
          ? { sma20: num(row["sma20"] ?? row["SMA20"] ?? row["ema20"])! }
          : {}),
        ...(num(row["sma50"] ?? row["SMA50"] ?? row["ema50"]) !== undefined
          ? { sma50: num(row["sma50"] ?? row["SMA50"] ?? row["ema50"])! }
          : {}),
      } as import("./types").PricePoint;
    })
    .filter(Boolean) as import("./types").PricePoint[];

  const cards = (o["summary"] ?? o["summary_cards"] ?? o["indicators"] ?? {}) as Record<string, unknown>;
  const pick = (...keys: string[]): unknown => {
    for (const k of keys) {
      if (o[k] !== undefined && o[k] !== null) return o[k];
      if (cards[k] !== undefined && cards[k] !== null) return cards[k];
    }
    return undefined;
  };
  const last = prices.at(-1);
  const prev = prices.at(-2);
  const latestPrice = num(pick("latest_price", "latest_close")) ?? last?.close;
  const changePct =
    num(pick("change_pct", "price_change_pct")) ??
    (last && prev && prev.close ? ((last.close - prev.close) / prev.close) * 100 : undefined);

  const data: MarketData = {
    prices,
    ...(latestPrice !== undefined ? { latestPrice } : {}),
    ...(num(pick("latest_rsi14", "rsi14", "rsi")) !== undefined
      ? { latestRsi14: num(pick("latest_rsi14", "rsi14", "rsi"))! }
      : {}),
    ...(num(pick("latest_ema20", "ema20")) !== undefined ? { latestEma20: num(pick("latest_ema20", "ema20"))! } : {}),
    ...(num(pick("latest_ema50", "ema50")) !== undefined ? { latestEma50: num(pick("latest_ema50", "ema50"))! } : {}),
    ...(changePct !== undefined ? { changePct } : {}),
    ...(typeof pick("stock_name", "name") === "string" ? { stockName: pick("stock_name", "name") as string } : {}),
  };
  if (!data.prices.length && data.latestPrice === undefined) return null;
  return data;
}
