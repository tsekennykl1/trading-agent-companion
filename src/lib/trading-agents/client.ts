import type {
  Action,
  ChartMarker,
  DecisionScores,
  RunConfig,
  RunRecord,
  TradeLevels,
} from "./types";


const STORAGE_KEY = "ta-workbench-bridge-url";
export const DEFAULT_BRIDGE_URL = "http://127.0.0.1:8000";

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
  const analystKeys: Record<string, string> = {
    "Market Analyst": "market",
    "Sentiment Analyst": "social",
    "News Analyst": "news",
    "Fundamentals Analyst": "fundamentals",
  };
  const selectedAnalysts = config.analysts.map((analyst) => analystKeys[analyst] ?? analyst);
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
      analysts: config.analysts,
      selected_analysts: selectedAnalysts,
    },
    // Aliases for other bridge implementations
    ...config,
    analysis_date: config.analysisDate,
    research_depth: config.researchDepth,
    quick_model: config.quickModel,
    deep_model: config.deepModel,
    selected_analysts: selectedAnalysts,
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
  analysts?: string[];
  selected_analysts?: string[];
  params?: {
    llm_provider?: string;
    deep_think_llm?: string;
    quick_think_llm?: string;
    max_debate_rounds?: number;
    analysts?: string[];
    selected_analysts?: string[];
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
  const art = (partial["artifacts"] ?? {}) as Record<string, unknown>;
  const str = (...candidates: unknown[]) =>
    candidates.find((v): v is string => typeof v === "string" && v.trim().length > 0);
  const chartsReady = partial["charts_ready"] === true;
  const html = str(urls["plotly"], urls["html"], art["price_chart_html"], urls["html_legacy"], art["chart_html"]);
  const png = str(urls["png"], art["price_chart_png"], urls["png_legacy"], art["chart_png"]);
  const chartJson = str(partial["price_chart_json_url"], art["price_chart_json"]);
  const marketDataUrl = str(partial["market_data_url"], art["market_data"], art["market_data_json"]);
  const resultUrl = str(partial["result_url"], art["result_html"]);
  const legacyPng = str(urls["png_legacy"], art["chart_png"]);
  const legacyHtml = str(urls["html_legacy"], art["chart_html"]);
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
    ...(chartJson ? { chartJsonUrl: bridgeAssetUrl(chartJson) } : {}),
    ...(marketDataUrl ? { marketDataUrl: bridgeAssetUrl(marketDataUrl) } : {}),
    ...(resultUrl ? { resultHtmlUrl: bridgeAssetUrl(resultUrl) } : {}),
    ...(legacyPng ? { chartPngLegacyUrl: bridgeAssetUrl(legacyPng) } : {}),
    ...(legacyHtml ? { chartHtmlLegacyUrl: bridgeAssetUrl(legacyHtml) } : {}),
    warnings,
  };
}

export function normalizeRun(raw: unknown): RunRecord {
  if (!isEngineRun(raw)) return raw as RunRecord;

  const req = raw.request ?? raw.payload ?? {};
  const params = req.params ?? {};
  const requestedAnalysts =
    (Array.isArray(req.analysts) ? req.analysts : undefined) ??
    (Array.isArray(req.selected_analysts) ? req.selected_analysts : undefined) ??
    (Array.isArray(params.analysts) ? params.analysts : undefined) ??
    (Array.isArray(params.selected_analysts) ? params.selected_analysts : undefined) ??
    [];
  const analystLabels: Record<string, string> = {
    market: "Market Analyst",
    social: "Sentiment Analyst",
    news: "News Analyst",
    fundamentals: "Fundamentals Analyst",
  };
  const requestedAnalystLabels = requestedAnalysts.map((analyst) => analystLabels[analyst] ?? analyst);
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
  const reportedConfidence =
    typeof d?.confidence === "number"
      ? d.confidence
      : typeof result?.confidence === "number"
        ? result.confidence
        : undefined;
  const stanceCounts = stances.reduce(
    (counts, stance) => ({ ...counts, [stance.stance]: counts[stance.stance] + 1 }),
    { bullish: 0, bearish: 0, neutral: 0 },
  );
  const agreementConfidence = stances.length
    ? Math.round((Math.max(stanceCounts.bullish, stanceCounts.bearish, stanceCounts.neutral) / stances.length) * 100)
    : 0;
  const normalizedReportedConfidence =
    reportedConfidence === undefined || (reportedConfidence <= 0 && stances.length > 0)
      ? agreementConfidence
      : reportedConfidence <= 1
        ? Math.round(reportedConfidence * 100)
        : Math.round(reportedConfidence);
  const confidence = Math.min(100, Math.max(0, normalizedReportedConfidence));
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
      analysts: requestedAnalystLabels,
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
    const decisionSources = [d, result as Record<string, unknown> | undefined, riskSection, partial].filter(
      Boolean,
    ) as Record<string, unknown>[];
    let levels: TradeLevels | undefined;
    let scores: DecisionScores | undefined;
    for (const src of decisionSources) {
      levels = levels ?? readTradeLevels(src);
      scores = scores ?? readScores(src);
    }
    const str = (...keys: string[]) => {
      for (const src of decisionSources) {
        for (const k of keys) {
          const v = src[k];
          if (typeof v === "string" && v.trim()) return v.trim();
        }
      }
      return undefined;
    };
    const riskLevel = str("risk_level", "riskLevel", "risk");
    const horizon = str("horizon", "time_horizon", "timeframe", "timeHorizon");
    const rationale = str("rationale", "reasoning", "why");

    record.decision = {
      action,
      rating: actionText,
      confidence,
      consensus: confidence >= 70 ? "High" : confidence >= 40 ? "Medium" : "Low",
      ...(d?.position_size ? { positionSizing: titleCase(d.position_size) } : {}),
      ...(levels?.entry !== undefined ? { entryPrice: levels.entry } : {}),
      ...(levels?.stopLoss !== undefined ? { stopLoss: levels.stopLoss } : {}),
      ...(levels?.takeProfit !== undefined ? { takeProfit: levels.takeProfit } : {}),
      ...(levels ? { levels } : {}),
      ...(scores ? { scores } : {}),
      ...(riskLevel ? { riskLevel: titleCase(riskLevel) } : {}),
      ...(horizon ? { horizon } : {}),
      ...(rationale ? { rationale } : {}),
      executiveSummary: summaryText,
      bullPoints: summaryText ? [summaryText] : [],
      bearPoints: keyRisks,
    };
  }


  return record;
}

export const api = {
  health: () => request<HealthResponse>("/health"),
  /**
   * POST /runs. Some engine builds answer with `{run_id}`, others with `{id}`,
   * `{runId}` or the whole run object — accept any of them so polling (and the
   * chart / report artifact fetches that depend on the id) always starts.
   */
  startRun: async (config: RunConfig): Promise<{ run_id: string }> => {
    const raw = await request<unknown>("/runs", {
      method: "POST",
      body: JSON.stringify(runConfigPayload(config)),
    });
    const obj = (raw ?? {}) as Record<string, unknown>;
    const nested = (obj["run"] ?? {}) as Record<string, unknown>;
    const id = [obj["run_id"], obj["runId"], obj["id"], nested["run_id"], nested["id"]].find(
      (v): v is string => typeof v === "string" && v.trim().length > 0,
    );
    if (!id) throw new Error("The engine started a run but did not return a run id");
    return { run_id: id };
  },
  getRun: async (id: string) => normalizeRun(await request<unknown>(`/runs/${id}`)),
  listRuns: async () => {
    const raw = await request<unknown>("/runs");
    const items = Array.isArray(raw) ? raw : ((raw as { runs?: unknown[] }).runs ?? []);
    return items.map(normalizeRun);
  },
  cancelRun: (id: string) => request<{ ok: boolean }>(`/runs/${id}/cancel`, { method: "POST" }),

  /**
   * Late-bound artifact: market data. 404 means "not generated yet", which is
   * returned as null rather than thrown, per the backend contract.
   */
  marketData: async (id: string, url?: string): Promise<MarketData | null> => {
    const target = url ? bridgeAssetUrl(url) : bridgeAssetUrl(`/runs/${id}/market-data`);
    const res = await fetch(target, { cache: "no-store" });
    if (!res.ok) return null;
    return readMarketData(await res.json());
  },

  /** Returns true when an artifact URL currently exists (404 = not ready yet). */
  artifactReady: async (url: string): Promise<boolean> => {
    try {
      const res = await fetch(url, { method: "GET", cache: "no-store" });
      return res.ok;
    } catch {
      return false;
    }
  },

  /** GET /runs/{id}/price-chart.json — structured chart data for React Plotly. */
  priceChartJson: async (id: string): Promise<PriceChartData | null> => {
    const raw = await getJson(`/runs/${id}/price-chart.json`);
    return readPriceChart(raw);
  },

  /** GET /runs/{id}/reports — whichever analyst reports are ready so far. */
  reportsIndex: async (id: string): Promise<{ names: string[]; contents: Record<string, string> }> => {
    const raw = await getJson(`/runs/${id}/reports`);
    return readReportsIndex(raw);
  },

  /** GET /runs/{id}/reports/{name} — a single report as soon as it exists. */
  report: async (id: string, name: string): Promise<string | null> => {
    const raw = await getJson(`/runs/${id}/reports/${encodeURIComponent(name)}`);
    return readReportContent(raw);
  },
};

/** GET helper that treats "not ready" (404) and network errors as null. */
async function getJson(path: string): Promise<unknown> {
  try {
    const base = getBridgeUrl().replace(/\/$/, "");
    const res = await fetch(`${base}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text.trim()) return null;
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  } catch {
    return null;
  }
}

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


const numberList = (value: unknown): number[] =>
  Array.isArray(value)
    ? (value
        .map((v) =>
          v && typeof v === "object"
            ? num((v as Record<string, unknown>)["price"] ?? (v as Record<string, unknown>)["value"] ?? (v as Record<string, unknown>)["level"])
            : num(v),
        )
        .filter((v) => v !== undefined) as number[])
    : [];


/** Reads entry/stop/target/support/resistance from any snake- or camelCase shape. */
export function readTradeLevels(raw: unknown): TradeLevels | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const nested = (o["levels"] ?? o["trade_levels"] ?? o["price_levels"]) as Record<string, unknown> | undefined;
  const src = nested && typeof nested === "object" ? { ...o, ...nested } : o;
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = num(src[k]);
      if (v !== undefined) return v;
    }
    return undefined;
  };
  const entry = pick("entry", "entry_price", "entryPrice", "entry_zone");
  const stopLoss = pick("stop_loss", "stopLoss", "stop");
  const takeProfit = pick("take_profit", "takeProfit", "target_price", "targetPrice", "target");
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



function reportText(value: unknown): string | null {
  if (typeof value === "string") return value.trim() ? value : null;
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    for (const key of ["content", "report", "text", "markdown", "body"]) {
      const inner = o[key];
      if (typeof inner === "string" && inner.trim()) return inner;
    }
  }
  return null;
}

/** Reads a single-report response in any of the shapes the engine may use. */
export function readReportContent(raw: unknown): string | null {
  return reportText(raw);
}

/**
 * Reads GET /runs/{id}/reports. The engine may return a name→content map, a
 * wrapper object, or just a list of ready report names.
 */
export function readReportsIndex(raw: unknown): { names: string[]; contents: Record<string, string> } {
  const empty = { names: [] as string[], contents: {} as Record<string, string> };
  if (!raw) return empty;

  const collect = (value: unknown): { names: string[]; contents: Record<string, string> } => {
    if (Array.isArray(value)) {
      const names: string[] = [];
      const contents: Record<string, string> = {};
      for (const item of value) {
        if (typeof item === "string") {
          names.push(item);
          continue;
        }
        const o = (item ?? {}) as Record<string, unknown>;
        const name = typeof o["name"] === "string" ? o["name"] : typeof o["key"] === "string" ? o["key"] : undefined;
        if (!name) continue;
        names.push(name);
        const text = reportText(o);
        if (text) contents[name] = text;
      }
      return { names, contents };
    }
    if (value && typeof value === "object") {
      const o = value as Record<string, unknown>;
      const names: string[] = [];
      const contents: Record<string, string> = {};
      for (const [key, v] of Object.entries(o)) {
        if (v === null || v === undefined || v === false) continue;
        names.push(key);
        const text = reportText(v);
        if (text) contents[key] = text;
      }
      return { names, contents };
    }
    return empty;
  };

  if (typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    for (const key of ["reports", "available", "ready", "items"]) {
      if (o[key] !== undefined && o[key] !== null) return collect(o[key]);
    }
  }
  return collect(raw);
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
