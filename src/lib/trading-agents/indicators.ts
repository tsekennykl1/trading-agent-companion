import type { ChartRow } from "./client";

/** Every technical study the chart can draw. */
export type IndicatorKey =
  | "ema20"
  | "ema50"
  | "ema12"
  | "ema26"
  | "sma20"
  | "sma50"
  | "sma200"
  | "bollinger"
  | "vwap"
  | "levels"
  | "markers"
  | "volume"
  | "volumeMa"
  | "rsi"
  | "macd"
  | "stoch"
  | "atr"
  | "obv";

/** Which chart panel a study belongs to ("price" = overlay on the candles). */
export type PanelKey = "price" | "volume" | "rsi" | "macd" | "stoch" | "atr" | "obv";

export interface IndicatorSpec {
  key: IndicatorKey;
  label: string;
  panel: PanelKey;
  group: "Overlays" | "Panels" | "Annotations";
  /** Default on when the data supports it. */
  on: boolean;
  /** True when the chart rows carry the fields this study needs. */
  has: (rows: ChartRow[]) => boolean;
}

const field = (name: keyof ChartRow) => (rows: ChartRow[]) => rows.some((r) => r[name] !== undefined);

export const INDICATORS: IndicatorSpec[] = [
  { key: "ema20", label: "EMA 20", panel: "price", group: "Overlays", on: true, has: field("ema20") },
  { key: "ema50", label: "EMA 50", panel: "price", group: "Overlays", on: true, has: field("ema50") },
  { key: "ema12", label: "EMA 12", panel: "price", group: "Overlays", on: false, has: field("ema12") },
  { key: "ema26", label: "EMA 26", panel: "price", group: "Overlays", on: false, has: field("ema26") },
  { key: "sma20", label: "SMA 20", panel: "price", group: "Overlays", on: false, has: field("sma20") },
  { key: "sma50", label: "SMA 50", panel: "price", group: "Overlays", on: true, has: field("sma50") },
  { key: "sma200", label: "SMA 200", panel: "price", group: "Overlays", on: true, has: field("sma200") },
  {
    key: "bollinger",
    label: "Bollinger Bands",
    panel: "price",
    group: "Overlays",
    on: true,
    has: (rows) => rows.some((r) => r.bbUpper !== undefined && r.bbLower !== undefined),
  },
  { key: "vwap", label: "VWAP (20-day rolling)", panel: "price", group: "Overlays", on: false, has: field("vwap") },
  { key: "levels", label: "Entry / stop / target & S-R", panel: "price", group: "Annotations", on: true, has: () => true },
  { key: "markers", label: "Signal markers", panel: "price", group: "Annotations", on: true, has: () => true },
  { key: "volume", label: "Volume", panel: "volume", group: "Panels", on: true, has: field("volume") },
  { key: "volumeMa", label: "Volume MA", panel: "volume", group: "Panels", on: true, has: field("volumeMa") },
  { key: "rsi", label: "RSI 14", panel: "rsi", group: "Panels", on: true, has: field("rsi14") },
  {
    key: "macd",
    label: "MACD",
    panel: "macd",
    group: "Panels",
    on: true,
    has: (rows) => rows.some((r) => r.macd !== undefined || r.macdHist !== undefined),
  },
  {
    key: "stoch",
    label: "Stochastic %K / %D",
    panel: "stoch",
    group: "Panels",
    on: false,
    has: (rows) => rows.some((r) => r.stochK !== undefined || r.stochD !== undefined),
  },
  { key: "atr", label: "ATR 14", panel: "atr", group: "Panels", on: false, has: field("atr14") },
  { key: "obv", label: "OBV", panel: "obv", group: "Panels", on: false, has: field("obv") },
];

export function availableIndicators(rows: ChartRow[], hasLevels: boolean): IndicatorSpec[] {
  return INDICATORS.filter((spec) => (spec.key === "levels" ? hasLevels : spec.has(rows)));
}

export function defaultVisible(rows: ChartRow[], hasLevels: boolean): IndicatorKey[] {
  return availableIndicators(rows, hasLevels)
    .filter((s) => s.on)
    .map((s) => s.key);
}
