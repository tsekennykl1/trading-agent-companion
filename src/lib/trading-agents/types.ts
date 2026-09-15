export type AgentStatus = "pending" | "in_progress" | "completed" | "error";

export type Stance = "bullish" | "bearish" | "neutral";

export type Action = "Buy" | "Overweight" | "Hold" | "Underweight" | "Sell" | "Review";

export interface AgentProgress {
  team: string;
  agent: string;
  status: AgentStatus;
  time?: string;
  note?: string;
}

export interface PricePoint {
  date: string;
  close: number;
  ema10?: number;
  sma20?: number;
  sma50?: number;
}

export interface StancePoint {
  agent: string;
  stance: Stance;
  /** -100 (max bearish) .. +100 (max bullish) */
  score: number;
}

export interface RunStats {
  llmCalls: number;
  toolCalls: number;
  tokensIn: number;
  tokensOut: number;
  reportsDone: number;
  reportsTotal: number;
  runtimeSeconds: number;
  stageTimings?: StageTiming[];
}

export interface StageTiming {
  stage: string;
  status: "pending" | "in_progress" | "completed" | "error";
  startedAt?: string;
  endedAt?: string;
  durationMs?: number;
  attempts?: number;
}

/** Actionable price levels the engine may attach to a decision or chart. */
export interface TradeLevels {
  entry?: number;
  stopLoss?: number;
  takeProfit?: number;
  support: number[];
  resistance: number[];
}

/** A dated, explainable event drawn on the price chart. */
export interface ChartMarker {
  date: string;
  kind: "buy" | "sell" | "cross_up" | "cross_down" | "overbought" | "oversold";
  label: string;
  price?: number;
}

/** Qualitative 0-100 scores some engines publish alongside the decision. */
export interface DecisionScores {
  bullishness?: number;
  conviction?: number;
  risk?: number;
}

export interface Decision {
  action: Action;
  rating: string;
  confidence: number;
  consensus: "High" | "Medium" | "Low";
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  riskLevel?: string;
  horizon?: string;
  rationale?: string;
  levels?: TradeLevels;
  scores?: DecisionScores;
  positionSizing?: string;
  executiveSummary: string;
  bullPoints: string[];
  bearPoints: string[];
}


export interface RunConfig {
  ticker: string;
  analysisDate: string;
  provider: string;
  quickModel: string;
  deepModel: string;
  researchDepth: "Shallow" | "Medium" | "Deep";
  analysts: string[];
  /** Ids of the research/decision stages the engine should run. */
  stages?: string[];
  language: string;
}

export interface RunProgress {
  stage: string;
  message: string;
  percent: number;
  step: number;
  totalSteps: number;
}

/** Incremental data the engine publishes before the AI analysis finishes. */
export interface RunPartial {
  configReady?: boolean;
  marketDataReady?: boolean;
  chartsReady?: boolean;
  decisionReady?: boolean;
  /** Names of the detail reports the engine has finished. */
  reportsReady?: string[];
  /** Monotonic backend revision used to avoid redundant heavy fetches. */
  version?: number;
  artifactsReady?: Record<string, boolean>;
  stockName?: string;
  latestPrice?: number;
  latestRsi14?: number;
  latestEma20?: number;
  latestEma50?: number;
  changePct?: number;
  pricePoints?: number;
  /** Absolute URLs to the engine's chart artifacts. */
  chartHtmlUrl?: string;
  chartPngUrl?: string;
  /** Structured chart payload (price-chart.json). */
  chartJsonUrl?: string;
  /** Full market-data JSON artifact. */
  marketDataUrl?: string;
  /** Rich result page. */
  resultHtmlUrl?: string;
  /** Pre-rename artifacts, kept for migration. */
  chartPngLegacyUrl?: string;
  chartHtmlLegacyUrl?: string;
  warnings: string[];
}

export interface RunRecord {
  id: string;
  status: "queued" | "running" | "completed" | "error";
  config: RunConfig;
  startedAt: string;
  /** Live progress reported by the engine, when available. */
  progress?: RunProgress;
  /** Engine-suggested polling interval in milliseconds. */
  pollAfterMs?: number;
  agents: AgentProgress[];
  prices: PricePoint[];
  stances: StancePoint[];
  reports: Record<string, string>;
  decision?: Decision;
  /** Whatever the engine has produced so far (market data, charts, warnings). */
  partial?: RunPartial;
  /** Raw engine log lines, newest last. */
  logs?: string[];
  stats: RunStats;
  source: "engine" | "sample";
  error?: string;
}

export const ANALYST_OPTIONS = [
  "Market Analyst",
  "Sentiment Analyst",
  "News Analyst",
  "Fundamentals Analyst",
] as const;

/**
 * Every stage the engine can run. Analyst stages mirror ANALYST_OPTIONS; the
 * rest are the research, trading, risk and portfolio stages. Each stage owns the
 * report keys it produces, so the reports list can mark skipped stages.
 */
export interface StageOption {
  id: string;
  /** Analyst name when this stage is one of the four analysts. */
  analyst?: string;
  /** Role labels composed into the checkbox label (translated at render time). */
  roles: string[];
  reportKeys: string[];
}

export const STAGE_OPTIONS: StageOption[] = [
  { id: "market", analyst: "Market Analyst", roles: ["Market Analyst"], reportKeys: ["market_report"] },
  { id: "social", analyst: "Sentiment Analyst", roles: ["Sentiment Analyst"], reportKeys: ["sentiment_report"] },
  { id: "news", analyst: "News Analyst", roles: ["News Analyst"], reportKeys: ["news_report"] },
  {
    id: "fundamentals",
    analyst: "Fundamentals Analyst",
    roles: ["Fundamentals Analyst"],
    reportKeys: ["fundamentals_report"],
  },
  {
    id: "research_debate",
    roles: ["Bull Researcher", "Bear Researcher"],
    reportKeys: ["bull_report", "bear_report"],
  },
  { id: "research_manager", roles: ["Research Manager"], reportKeys: ["investment_plan"] },
  { id: "trader", roles: ["Trader"], reportKeys: ["trader_plan"] },
  {
    id: "risk_debate",
    roles: ["Aggressive Analyst", "Conservative Analyst", "Neutral Analyst"],
    reportKeys: ["risk_aggressive", "risk_conservative", "risk_neutral"],
  },
  {
    id: "portfolio_manager",
    roles: ["Portfolio Manager"],
    reportKeys: ["final_decision", "final_trade_decision"],
  },
];

export const DEFAULT_STAGES = [
  "market",
  "research_debate",
  "research_manager",
  "trader",
  "risk_debate",
  "portfolio_manager",
];

export const PROVIDER_OPTIONS = [
  "DeepSeek",
  "OpenAI",
  "Anthropic",
  "Google",
  "Qwen",
] as const;

export const REPORT_SECTIONS: { key: string; label: string; team: string }[] = [
  { key: "market_report", label: "Market Analyst", team: "Analyst Team" },
  { key: "sentiment_report", label: "Sentiment Analyst", team: "Analyst Team" },
  { key: "news_report", label: "News Analyst", team: "Analyst Team" },
  { key: "fundamentals_report", label: "Fundamentals Analyst", team: "Analyst Team" },
  { key: "bull_report", label: "Bull Researcher", team: "Research Team" },
  { key: "bear_report", label: "Bear Researcher", team: "Research Team" },
  { key: "investment_plan", label: "Research Manager", team: "Research Team" },
  { key: "trader_plan", label: "Trader", team: "Trading Team" },
  { key: "risk_aggressive", label: "Aggressive Analyst", team: "Risk Team" },
  { key: "risk_conservative", label: "Conservative Analyst", team: "Risk Team" },
  { key: "risk_neutral", label: "Neutral Analyst", team: "Risk Team" },
  { key: "final_decision", label: "Portfolio Manager", team: "Portfolio Management" },
];
