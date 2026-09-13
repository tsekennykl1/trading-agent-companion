import type { Action, RunConfig, RunRecord } from "./types";

const STORAGE_KEY = "ta-workbench-bridge-url";
export const DEFAULT_BRIDGE_URL = "http://127.0.0.1:8787";

export function getBridgeUrl(): string {
  if (typeof window === "undefined") return DEFAULT_BRIDGE_URL;
  return window.localStorage.getItem(STORAGE_KEY) ?? DEFAULT_BRIDGE_URL;
}

export function setBridgeUrl(url: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, url.replace(/\/$/, ""));
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getBridgeUrl().replace(/\/$/, "");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Engine responded ${res.status}${text ? `: ${formatErrorDetail(text)}` : ""}`);
  }
  return (await res.json()) as T;
}

/** Turn a FastAPI/Pydantic error body into a readable one-liner. */
function formatErrorDetail(text: string): string {
  try {
    const parsed = JSON.parse(text) as { detail?: unknown };
    if (Array.isArray(parsed.detail)) {
      return parsed.detail
        .map((d) => {
          const item = d as { loc?: unknown[]; msg?: string };
          const field = Array.isArray(item.loc) ? item.loc.filter((p) => p !== "body").join(".") : "";
          return field ? `${field}: ${item.msg ?? "invalid"}` : (item.msg ?? "invalid");
        })
        .join("; ")
        .slice(0, 300);
    }
    if (typeof parsed.detail === "string") return parsed.detail.slice(0, 300);
  } catch {
    /* not JSON — fall through */
  }
  return text.slice(0, 300);
}

/**
 * Payload sent to POST /runs. Matches the engine's { model, ticker, end_date,
 * params } schema and also carries camelCase/snake_case aliases so bridges
 * with either convention validate (extra keys are ignored).
 */
export function runConfigPayload(config: RunConfig): Record<string, unknown> {
  const maxDebateRounds =
    config.researchDepth === "Deep" ? 3 : config.researchDepth === "Medium" ? 2 : 1;
  return {
    // Engine's expected schema (ticker comes from ...config below)
    model: config.deepModel,
    end_date: config.analysisDate,
    params: {
      llm_provider: config.provider,
      deep_think_llm: config.deepModel,
      quick_think_llm: config.quickModel,
      max_debate_rounds: maxDebateRounds,
      temperature: 0.0,
    },
    // Aliases for other bridge implementations
    ...config,
    analysis_date: config.analysisDate,
    research_depth: config.researchDepth,
    quick_model: config.quickModel,
    deep_model: config.deepModel,
  };
}

export interface HealthResponse {
  status: string;
  engine_version?: string;
  providers?: string[];
}

// ---------------------------------------------------------------------------
// Adapter: convert an engine run ({ run_id, request, result, logs, error })
// into the dashboard's RunRecord shape. Runs already in RunRecord shape
// pass through untouched.
// ---------------------------------------------------------------------------

type EngineRequest = {
  model?: string;
  ticker?: string;
  end_date?: string;
  params?: {
    llm_provider?: string;
    deep_think_llm?: string;
    quick_think_llm?: string;
    max_debate_rounds?: number;
  };
};

type EngineProgress = {
  stage?: string;
  message?: string;
  percent?: number;
  step?: number;
  total_steps?: number;
};

type EngineRun = {
  run_id: string;
  status: string;
  created_at?: string;
  updated_at?: string;
  started_at?: string;
  completed_at?: string;
  request?: EngineRequest;
  /** Some bridges call the same object "payload". */
  payload?: EngineRequest;
  result?: {
    ticker?: string;
    analysis_date?: string;
    /** Flat fields emitted by newer engines. */
    action?: string;
    summary?: string;
    confidence?: number | null;
    final_trade_decision?: string;
    reports?: Record<string, unknown>;
    raw_decision?: unknown;
    /** Either an action word ("Hold") or a structured decision object. */
    decision?:
      | string
      | {
          action?: string;
          confidence?: number | null;
          risk_level?: string;
          position_size?: string;
          summary?: string;
        };
    state?: Record<string, unknown>;
  } | null;
  /** Incremental fields written while the run executes. */
  partial_result?: Record<string, unknown> | null;
  progress?: EngineProgress;
  poll_after_ms?: number;
  timings?: {
    stage_durations_ms?: Record<string, number>;
    counters?: Record<string, number>;
  };
  error?: { type?: string; message?: string; traceback?: string; code?: string } | null;
  logs?: unknown[];
};

/** Map the many status spellings engines use onto the dashboard's four states. */
export function canonicalStatus(raw: string | undefined): RunRecord["status"] {
  const s = (raw ?? "").toLowerCase();
  if (["completed", "complete", "success", "succeeded", "finished", "done", "ok"].includes(s)) {
    return "completed";
  }
  if (["failed", "error", "cancelled", "canceled", "aborted", "timeout"].includes(s)) return "error";
  if (["queued", "pending", "created", "accepted"].includes(s)) return "queued";
  return "running";
}

function isEngineRun(raw: unknown): raw is EngineRun {
  return typeof raw === "object" && raw !== null && "run_id" in raw && !("config" in raw);
}

function titleCase(value: string): string {
  return value.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const STANCE_FROM_TEXT: [RegExp, number][] = [
  [/bullish|positive|strong|high/i, 60],
  [/bearish|negative|weak/i, -60],
  [/mixed|neutral|moderate|medium|elevated/i, 10],
];

function stanceScore(text: string): { stance: "bullish" | "bearish" | "neutral"; score: number } {
  for (const [re, score] of STANCE_FROM_TEXT) {
    if (re.test(text)) {
      return { stance: score > 30 ? "bullish" : score < -30 ? "bearish" : "neutral", score };
    }
  }
  return { stance: "neutral", score: 0 };
}

/** Make an engine-relative artifact path absolute against the bridge URL. */
export function bridgeAssetUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${getBridgeUrl().replace(/\/$/, "")}${path.startsWith("/") ? "" : "/"}${path}`;
}

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/** Read the engine's partial_result (plus nested summary_cards / chart_urls). */
function readPartial(
  partial: Record<string, unknown>,
  runId: string,
): import("./types").RunPartial | undefined {
  if (!partial || Object.keys(partial).length === 0) return undefined;
  const cards = (partial["summary_cards"] ?? {}) as Record<string, unknown>;
  const get = (...keys: string[]): unknown => {
    for (const k of keys) {
      if (partial[k] !== undefined && partial[k] !== null) return partial[k];
      if (cards[k] !== undefined && cards[k] !== null) return cards[k];
    }
    return undefined;
  };
  const urls = (partial["chart_urls"] ?? {}) as Record<string, unknown>;
  const chartsReady = partial["charts_ready"] === true;
  const html = typeof urls["plotly"] === "string" ? urls["plotly"] : typeof urls["html"] === "string" ? urls["html"] : undefined;
  const png = typeof urls["png"] === "string" ? urls["png"] : undefined;
  const warnings = Array.isArray(partial["warnings"])
    ? (partial["warnings"] as unknown[]).map((w) =>
        typeof w === "string" ? w : String((w as Record<string, unknown>)?.["message"] ?? w),
      )
    : [];

  return {
    configReady: partial["config_ready"] === true,
    marketDataReady: partial["market_data_ready"] === true,
    chartsReady,
    decisionReady: partial["decision_ready"] === true,
    ...(typeof get("stock_name", "name") === "string" ? { stockName: get("stock_name", "name") as string } : {}),
    ...(num(get("latest_price", "latest_close")) !== undefined
      ? { latestPrice: num(get("latest_price", "latest_close"))! }
      : {}),
    ...(num(get("latest_rsi14", "rsi14")) !== undefined ? { latestRsi14: num(get("latest_rsi14", "rsi14"))! } : {}),
    ...(num(get("latest_ema20", "ema20")) !== undefined ? { latestEma20: num(get("latest_ema20", "ema20"))! } : {}),
    ...(num(get("latest_ema50", "ema50")) !== undefined ? { latestEma50: num(get("latest_ema50", "ema50"))! } : {}),
    ...(num(get("change_pct", "price_change_pct")) !== undefined
      ? { changePct: num(get("change_pct", "price_change_pct"))! }
      : {}),
    ...(num(get("price_data_points", "rows")) !== undefined
      ? { pricePoints: num(get("price_data_points", "rows"))! }
      : {}),
    ...(chartsReady
      ? {
          chartHtmlUrl: bridgeAssetUrl(html ?? `/runs/${runId}/price-chart.html`),
          chartPngUrl: bridgeAssetUrl(png ?? `/runs/${runId}/price-chart.png`),
        }
      : {}),
    warnings,
  };
}

export function normalizeRun(raw: unknown): RunRecord {
  if (!isEngineRun(raw)) return raw as RunRecord;

  const req = raw.request ?? raw.payload ?? {};
  const params = req.params ?? {};
  const result = raw.result ?? undefined;
  const partial = (raw.partial_result ?? {}) as Record<string, unknown>;
  // Merge the engine's flat reports dict and its state object into one lookup.
  const state = {
    ...(result?.reports ?? {}),
    ...(result?.state ?? {}),
  } as Record<string, Record<string, unknown> | string>;
  if (typeof result?.final_trade_decision === "string" && !state["final_trade_decision"]) {
    state["final_trade_decision"] = result.final_trade_decision;
  }
  const ticker =
    result?.ticker ?? (typeof partial["ticker"] === "string" ? partial["ticker"] : undefined) ?? req.ticker ?? "—";
  const analysisDate =
    result?.analysis_date ??
    (typeof partial["analysis_date"] === "string" ? partial["analysis_date"] : undefined) ??
    req.end_date ??
    "";
  const logs: string[] = (Array.isArray(raw.logs) ? raw.logs : []).map((l: unknown) => {
    if (typeof l === "string") return l;
    if (l && typeof l === "object") {
      const o = l as Record<string, unknown>;
      const msg = o["message"] ?? o["msg"] ?? o["text"] ?? JSON.stringify(o);
      return String(msg);
    }
    return String(l);
  });
  const rawStatus = canonicalStatus(raw.status);
  // A finished result is proof the run is done, even if the engine's status word is unfamiliar.
  const status: RunRecord["status"] =
    rawStatus !== "error" && (result?.decision || raw.error) ? (raw.error ? "error" : "completed") : rawStatus;
  const running = status === "running" || status === "queued";
  const failed = status === "error";

  const created = raw.created_at ? Date.parse(raw.created_at) : NaN;
  const updated = raw.updated_at ? Date.parse(raw.updated_at) : NaN;
  const runtimeSeconds =
    Number.isFinite(created) && Number.isFinite(updated)
      ? Math.max(0, Math.round((updated - created) / 1000))
      : 0;

  // Agent progress derived from the log stream
  const agents = logs.map((line, i) => ({
    team: "Engine",
    agent: line,
    status: (failed && i === logs.length - 1
      ? "error"
      : running && i === logs.length - 1
        ? "in_progress"
        : "completed") as RunRecord["agents"][number]["status"],
  }));

  // Analyst stances derived from the state sections. TradingAgents stores them
  // as markdown strings (market_report, sentiment_report, ...); other bridges
  // use nested objects (technical_analysis, ...). Handle both.
  const stances: RunRecord["stances"] = [];
  const stanceSources: [string[], string][] = [
    [["market_report", "technical_analysis"], "Market Analyst"],
    [["sentiment_report", "sentiment_analysis"], "Sentiment Analyst"],
    [["news_report"], "News Analyst"],
    [["fundamentals_report", "fundamental_analysis"], "Fundamentals Analyst"],
    [["final_trade_decision", "risk_assessment"], "Risk Assessment"],
  ];
  const sectionText = (section: unknown): string => {
    if (typeof section === "string") return section;
    if (section && typeof section === "object") {
      return Object.values(section as Record<string, unknown>)
        .flatMap((v) => (Array.isArray(v) ? v : [v]))
        .filter((v) => typeof v === "string")
        .join(" ");
    }
    return "";
  };
  for (const [keys, label] of stanceSources) {
    const text = keys.map((k) => sectionText(state[k])).filter(Boolean).join(" ");
    if (text) stances.push({ agent: label, ...stanceScore(text) });
  }

  // Reports: map TradingAgents state keys onto the dashboard's report tabs.
  const reports: Record<string, string> = {};
  const stringReportKeys = [
    "market_report",
    "sentiment_report",
    "news_report",
    "fundamentals_report",
    "investment_plan",
  ];
  for (const key of stringReportKeys) {
    const v: unknown = state[key];
    if (typeof v === "string" && v.trim()) reports[key] = v;
  }
  if (typeof state["trader_investment_plan"] === "string" && state["trader_investment_plan"]) {
    reports["trader_plan"] = state["trader_investment_plan"] as string;
  }
  if (typeof state["final_trade_decision"] === "string" && state["final_trade_decision"]) {
    reports["final_decision"] = state["final_trade_decision"] as string;
  }
  const debate = state["investment_debate_state"] as Record<string, unknown> | undefined;
  if (debate) {
    if (typeof debate["bull_history"] === "string" && debate["bull_history"]) reports["bull_report"] = debate["bull_history"];
    if (typeof debate["bear_history"] === "string" && debate["bear_history"]) reports["bear_report"] = debate["bear_history"];
  }
  const riskDebate = state["risk_debate_state"] as Record<string, unknown> | undefined;
  if (riskDebate) {
    if (typeof riskDebate["aggressive_history"] === "string" && riskDebate["aggressive_history"])
      reports["risk_aggressive"] = riskDebate["aggressive_history"];
    if (typeof riskDebate["conservative_history"] === "string" && riskDebate["conservative_history"])
      reports["risk_conservative"] = riskDebate["conservative_history"];
    if (typeof riskDebate["neutral_history"] === "string" && riskDebate["neutral_history"])
      reports["risk_neutral"] = riskDebate["neutral_history"];
  }
  // Generic fallback: any other object-valued state section becomes a report.
  for (const [key, section] of Object.entries(state)) {
    if (reports[key] || typeof section === "string") continue;
    if (section && typeof section === "object" && !Array.isArray(section) && key !== "investment_debate_state" && key !== "risk_debate_state") {
      reports[key] = Object.entries(section as Record<string, unknown>)
        .map(([k, v]) => `- **${titleCase(k)}:** ${Array.isArray(v) ? v.join(", ") : String(v)}`)
        .join("\n");
    }
  }
  if (logs.length) reports["engine_log"] = logs.map((l) => `- ${l}`).join("\n");

  // Decision: accept either an action word ("Hold") or a structured object.
  const rawDecision = result?.decision;
  const d = typeof rawDecision === "object" && rawDecision !== null ? rawDecision : undefined;
  const decisionWord = typeof rawDecision === "string" ? rawDecision : (d?.action ?? result?.action);
  const finalText = typeof state["final_trade_decision"] === "string" ? state["final_trade_decision"] : "";
  const confidenceValue =
    typeof d?.confidence === "number" ? d.confidence : typeof result?.confidence === "number" ? result.confidence : 0;
  const confidenceRaw = confidenceValue;
  const confidence = confidenceRaw <= 1 ? Math.round(confidenceRaw * 100) : Math.round(confidenceRaw);
  const riskSection = state["risk_assessment"] as Record<string, unknown> | undefined;
  const keyRisks = riskSection && Array.isArray(riskSection["key_risks"])
    ? (riskSection["key_risks"] as string[])
    : [];
  const actionText = titleCase(decisionWord ?? "Review");
  const action: Action = (["Buy", "Overweight", "Hold", "Underweight", "Sell", "Review"] as const).find(
    (a) => a === actionText,
  ) ?? "Review";
  const summaryText = d?.summary ?? result?.summary ?? (finalText || "");

  const counters = raw.timings?.counters ?? {};
  const stageDurations = raw.timings?.stage_durations_ms ?? {};
  const totalMs = stageDurations["total_ms"];
  const progress = raw.progress;

  const record: RunRecord = {
    id: raw.run_id,
    status,
    config: {
      ticker,
      analysisDate,
      provider: titleCase(params.llm_provider ?? ""),
      quickModel: params.quick_think_llm ?? req.model ?? "",
      deepModel: params.deep_think_llm ?? req.model ?? "",
      researchDepth:
        (params.max_debate_rounds ?? 1) >= 3
          ? "Deep"
          : (params.max_debate_rounds ?? 1) === 2
            ? "Medium"
            : "Shallow",
      analysts: [],
      language: "English",
    },
    startedAt: raw.started_at ?? raw.created_at ?? new Date().toISOString(),
    logs,
    ...(readPartial(partial, raw.run_id) ? { partial: readPartial(partial, raw.run_id)! } : {}),
    agents,
    prices: [],
    stances,
    reports,
    ...(progress?.stage || progress?.message
      ? {
          progress: {
            stage: progress.stage ?? "",
            message: progress.message ?? "",
            percent: progress.percent ?? 0,
            step: progress.step ?? 0,
            totalSteps: progress.total_steps ?? 0,
          },
        }
      : {}),
    ...(typeof raw.poll_after_ms === "number" && raw.poll_after_ms > 0
      ? { pollAfterMs: raw.poll_after_ms }
      : {}),
    stats: {
      llmCalls: counters["engine_calls_count"] ?? counters["llm_calls"] ?? 0,
      toolCalls: counters["tool_calls"] ?? 0,
      tokensIn: counters["tokens_in"] ?? 0,
      tokensOut: counters["tokens_out"] ?? 0,
      reportsDone: Object.keys(reports).length,
      reportsTotal: Object.keys(reports).length,
      runtimeSeconds: typeof totalMs === "number" ? Math.max(1, Math.round(totalMs / 1000)) : runtimeSeconds,
    },
    source: "engine",
    ...(raw.error ? { error: `${raw.error.type ?? "Error"}: ${raw.error.message ?? ""}` } : {}),
  };

  // Render a decision whenever the engine gave one — or whenever the run is
  // finished, so a completed run without a structured decision never leaves
  // the dashboard stuck on "Analysis in progress".
  if (rawDecision || status === "completed") {
    record.decision = {
      action,
      rating: actionText,
      confidence,
      consensus: confidence >= 70 ? "High" : confidence >= 40 ? "Medium" : "Low",
      ...(d?.position_size ? { positionSizing: titleCase(d.position_size) } : {}),
      executiveSummary: summaryText,
      bullPoints: summaryText ? [summaryText] : [],
      bearPoints: keyRisks,
    };
  }

  return record;
}

export const api = {
  health: () => request<HealthResponse>("/health"),
  startRun: (config: RunConfig) =>
    request<{ run_id: string }>("/runs", {
      method: "POST",
      body: JSON.stringify(runConfigPayload(config)),
    }),
  getRun: async (id: string) => normalizeRun(await request<unknown>(`/runs/${id}`)),
  listRuns: async () => {
    const raw = await request<unknown>("/runs");
    const items = Array.isArray(raw) ? raw : ((raw as { runs?: unknown[] }).runs ?? []);
    return items.map(normalizeRun);
  },
  cancelRun: (id: string) => request<{ ok: boolean }>(`/runs/${id}/cancel`, { method: "POST" }),
};
