// Converts an engine run (snake_case JSON) into the dashboard's RunRecord.
import type { Action, DecisionScores, RunRecord, StageTiming, TradeLevels, RunPartial } from "./types";
import { STAGE_OPTIONS } from "./types";
import { bridgeAssetUrl } from "./http";
import { normalizeReportsReady } from "./report-readiness";
import { extractReasons } from "./signals";
import { num, stanceScore, titleCase } from "./parse";
import { readScores, readTradeLevels } from "./chart-data";

/** Lightweight readiness payload from GET /runs/{id}/status. */
export interface RunStatus {
  runId: string;
  status: RunRecord["status"];
  decisionReady: boolean;
  reportsReady: string[];
  resultUrl?: string;
  error?: string;
  pollAfterMs?: number;
  progressPercent?: number;
  progressMessage?: string;
  version?: number;
  artifactsReady?: Record<string, boolean>;
  attemptCount?: number;
  stageTimings?: import("./types").StageTiming[];
}

export function readRunStatus(raw: unknown): RunStatus | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const rawStatus = o["status"];
  if (typeof rawStatus !== "string") return null;
  const progress = (o["progress"] ?? {}) as Record<string, unknown>;
  const resultUrl = o["result_url"] ?? o["resultUrl"];
  const reportsReady = normalizeReportsReady(o["reports_ready"] ?? o["reportsReady"]);
  const pollAfter = num(o["poll_after_ms"] ?? o["pollAfterMs"]);
  const percent = num(progress["percent"]);
  const message = progress["message"] ?? progress["stage"];
  const version = num(o["version"]);
  const attemptCount = num(o["attempt_count"] ?? o["attemptCount"]);
  const artifactsReadyRaw = o["artifacts_ready"] ?? o["artifactsReady"];
  const stageTimings = readStageTimings((o["timings"] as Record<string, unknown> | undefined)?.["stages"]);
  const artifactsReady = artifactsReadyRaw && typeof artifactsReadyRaw === "object"
    ? Object.fromEntries(Object.entries(artifactsReadyRaw as Record<string, unknown>).map(([key, value]) => [key, value === true]))
    : undefined;
  return {
    runId: String(o["run_id"] ?? o["runId"] ?? ""),
    status: canonicalStatus(rawStatus),
    decisionReady: (o["decision_ready"] ?? o["decisionReady"]) === true,
    reportsReady,
    ...(typeof resultUrl === "string" && resultUrl ? { resultUrl: bridgeAssetUrl(resultUrl) } : {}),
    ...(typeof o["error"] === "string" && o["error"] ? { error: o["error"] } : {}),
    ...(pollAfter !== undefined ? { pollAfterMs: pollAfter } : {}),
    ...(percent !== undefined ? { progressPercent: percent } : {}),
    ...(typeof message === "string" && message ? { progressMessage: message } : {}),
    ...(version !== undefined ? { version } : {}),
    ...(artifactsReady ? { artifactsReady } : {}),
    ...(attemptCount !== undefined ? { attemptCount } : {}),
    ...(stageTimings.length ? { stageTimings } : {}),
  };
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
  stages?: string[];
  selected_stages?: string[];
  params?: {
    llm_provider?: string;
    deep_think_llm?: string;
    quick_think_llm?: string;
    max_debate_rounds?: number;
    analysts?: string[];
    selected_analysts?: string[];
    stages?: string[];
    selected_stages?: string[];
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
    stages?: unknown;
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

export function isEngineRun(raw: unknown): raw is EngineRun {
  return typeof raw === "object" && raw !== null && "run_id" in raw && !("config" in raw);
}

export function readStageTimings(raw: unknown): import("./types").StageTiming[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  return Object.entries(raw as Record<string, unknown>).flatMap(([stage, value]) => {
    if (!value || typeof value !== "object") return [];
    const item = value as Record<string, unknown>;
    const rawStatus = item["status"];
    const status = rawStatus === "in_progress" || rawStatus === "completed" || rawStatus === "error"
      ? rawStatus
      : "pending";
    const startedAt = item["started_at"];
    const endedAt = item["ended_at"];
    const durationMs = num(item["duration_ms"]);
    const attempts = num(item["attempts"]);
    return [{
      stage,
      status,
      ...(typeof startedAt === "string" ? { startedAt } : {}),
      ...(typeof endedAt === "string" ? { endedAt } : {}),
      ...(durationMs !== undefined ? { durationMs } : {}),
      ...(attempts !== undefined ? { attempts } : {}),
    }];
  });
}

/** Read the engine's partial_result (plus nested summary_cards / chart_urls). */
export function readPartial(
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
    ...(partial["reports_ready"] !== undefined
      ? { reportsReady: normalizeReportsReady(partial["reports_ready"]) }
      : {}),
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
  const requestedStagesRaw =
    (Array.isArray(req.stages) ? req.stages : undefined) ??
    (Array.isArray(req.selected_stages) ? req.selected_stages : undefined) ??
    (Array.isArray(params.stages) ? params.stages : undefined) ??
    (Array.isArray(params.selected_stages) ? params.selected_stages : undefined);
  const requestedStages = requestedStagesRaw?.filter(
    (stage): stage is string => typeof stage === "string" && STAGE_OPTIONS.some((option) => option.id === stage),
  );
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
  // Executive summary: prefer an engine-provided summary, then fall back to the
  // decision-level narratives so the panel is never left with just a ticker.
  const meaningful = (value: unknown): string | undefined =>
    typeof value === "string" && value.trim().length > 24 ? value.trim() : undefined;
  const summaryText =
    meaningful(d?.summary) ??
    meaningful(result?.summary) ??
    meaningful(finalText) ??
    meaningful(reports["final_decision"]) ??
    meaningful(reports["trader_plan"]) ??
    meaningful(reports["investment_plan"]) ??
    (typeof d?.summary === "string" ? d.summary : typeof result?.summary === "string" ? result.summary : finalText);

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
      ...(requestedStages !== undefined ? { stages: requestedStages } : {}),
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
      stageTimings: readStageTimings(raw.timings?.stages),
    },
    source: "engine",
    ...(raw.error ? { error: `${raw.error.type ?? "Error"}: ${raw.error.message ?? ""}` } : {}),
  };

  // Render a decision whenever the engine gave one — or whenever the run is
  // finished, so a completed run without a structured decision never leaves
  // the dashboard stuck on "Analysis in progress".
  if (rawDecision || status === "completed") {
    const decisionSources = [
      d,
      result?.raw_decision,
      result as Record<string, unknown> | undefined,
      state["portfolio_management_decision"],
      state["final_trade_decision"],
      riskSection,
      partial["decision"],
      partial,
    ].filter((value): value is Record<string, unknown> => Boolean(value && typeof value === "object"));
    let levels: TradeLevels | undefined;
    const levelTexts = [
      finalText,
      reports["trader_plan"],
      reports["investment_plan"],
      reports["final_decision"],
      typeof result?.summary === "string" ? result.summary : undefined,
    ];
    for (const text of levelTexts) levels = levels ?? readTradeLevels(text);
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

    // Evidence: prefer the decision-level narratives (portfolio manager, trader,
    // research manager, risk debate) and only fall back to analyst reports.
    const decisionReportKeys = [
      "final_decision",
      "trader_plan",
      "investment_plan",
      "bull_report",
      "bear_report",
      "risk_aggressive",
      "risk_conservative",
      "risk_neutral",
    ];
    const pickReports = (keys: string[]) =>
      Object.fromEntries(keys.filter((k) => reports[k]).map((k) => [k, reports[k] as string]));
    const decisionReports = pickReports(decisionReportKeys);
    const analystReports = pickReports(["market_report", "sentiment_report", "news_report", "fundamentals_report"]);
    const primary = extractReasons(decisionReports);
    const secondary = extractReasons(analystReports);
    const decisionBull = primary.bullish.length ? primary.bullish : secondary.bullish;
    const decisionBear = primary.bearish.length ? primary.bearish : secondary.bearish;

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
      bullPoints: decisionBull,
      bearPoints: decisionBear.length ? decisionBear : keyRisks,
    };
  }


  return record;
}
