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
}

export interface Decision {
  action: Action;
  rating: string;
  confidence: number;
  consensus: "High" | "Medium" | "Low";
  entryPrice?: number;
  stopLoss?: number;
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
  language: string;
}

export interface RunRecord {
  id: string;
  status: "queued" | "running" | "completed" | "error";
  config: RunConfig;
  startedAt: string;
  agents: AgentProgress[];
  prices: PricePoint[];
  stances: StancePoint[];
  reports: Record<string, string>;
  decision?: Decision;
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
