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

type EngineRun = {
  run_id: string;
  status: string;
  created_at?: string;
  updated_at?: string;
  request?: {
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
  result?: {
    ticker?: string;
    analysis_date?: string;
    decision?: {
      action?: string;
      confidence?: number;
      risk_level?: string;
      position_size?: string;
      summary?: string;
    };
    state?: Record<string, unknown>;
  } | null;
  error?: { type?: string; message?: string } | null;
  logs?: string[];
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

export function normalizeRun(raw: unknown): RunRecord {
  if (!isEngineRun(raw)) return raw as RunRecord;

  const req = raw.request ?? {};
  const params = req.params ?? {};
  const result = raw.result ?? undefined;
  const state = (result?.state ?? {}) as Record<string, Record<string, unknown>>;
  const ticker = result?.ticker ?? req.ticker ?? "—";
  const analysisDate = result?.analysis_date ?? req.end_date ?? "";
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

  // Analyst stances derived from the state sections
  const stances: RunRecord["stances"] = [];
  const stateLabels: Record<string, string> = {
    technical_analysis: "Market Analyst",
    sentiment_analysis: "Sentiment Analyst",
    fundamental_analysis: "Fundamentals Analyst",
    risk_assessment: "Risk Assessment",
  };
  for (const [key, label] of Object.entries(stateLabels)) {
    const section = state[key];
    if (!section) continue;
    const text = Object.values(section)
      .flatMap((v) => (Array.isArray(v) ? v : [v]))
      .filter((v) => typeof v === "string")
      .join(" ");
    stances.push({ agent: label, ...stanceScore(text) });
  }

  // Reports from state sections
  const reports: Record<string, string> = {};
  for (const [key, section] of Object.entries(state)) {
    if (section && typeof section === "object") {
      reports[key] = Object.entries(section)
        .map(([k, v]) => `- **${titleCase(k)}:** ${Array.isArray(v) ? v.join(", ") : String(v)}`)
        .join("\n");
    }
  }
  if (logs.length) reports["engine_log"] = logs.map((l) => `- ${l}`).join("\n");

  // Decision
  const d = result?.decision;
  const confidenceRaw = typeof d?.confidence === "number" ? d.confidence : 0;
  const confidence = confidenceRaw <= 1 ? Math.round(confidenceRaw * 100) : Math.round(confidenceRaw);
  const riskSection = state["risk_assessment"];
  const keyRisks = riskSection && Array.isArray(riskSection["key_risks"])
    ? (riskSection["key_risks"] as string[])
    : [];
  const actionText = titleCase(d?.action ?? "Review");
  const action: Action = (["Buy", "Overweight", "Hold", "Underweight", "Sell", "Review"] as const).find(
    (a) => a === actionText,
  ) ?? "Review";

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
    startedAt: raw.created_at ?? new Date().toISOString(),
    agents,
    prices: [],
    stances,
    reports,
    stats: {
      llmCalls: 0,
      toolCalls: 0,
      tokensIn: 0,
      tokensOut: 0,
      reportsDone: Object.keys(reports).length,
      reportsTotal: Object.keys(reports).length,
      runtimeSeconds,
    },
    source: "engine",
    ...(raw.error ? { error: `${raw.error.type ?? "Error"}: ${raw.error.message ?? ""}` } : {}),
  };

  if (d) {
    record.decision = {
      action,
      rating: actionText,
      confidence,
      consensus: confidence >= 70 ? "High" : confidence >= 40 ? "Medium" : "Low",
      ...(d.position_size ? { positionSizing: titleCase(d.position_size) } : {}),
      executiveSummary: d.summary ?? "",
      bullPoints: d.summary ? [d.summary] : [],
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
