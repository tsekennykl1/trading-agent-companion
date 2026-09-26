// Small HTTP client the MCP tools use to talk to the TradingAgents engine.
// Kept import-safe: no env reads at module load, only inside functions.

type RuntimeGlobals = typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
};

function runtimeEnv(name: string): string | undefined {
  return (globalThis as RuntimeGlobals).process?.env?.[name]?.trim() || undefined;
}

/** Base URL of the running engine (FastAPI app exposing /runs, /market, ...). */
export function engineBaseUrl(): string {
  const url =
    runtimeEnv("TRADING_ENGINE_URL") ??
    runtimeEnv("VITE_API_BASE_URL") ??
    "https://www.myfinance5051.com/api";
  return url.replace(/\/$/, "");
}

export class EngineError extends Error {}

export async function engineFetch<T>(
  path: string,
  init?: RequestInit & { signal?: AbortSignal },
): Promise<T> {
  const url = `${engineBaseUrl()}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch (error) {
    throw new EngineError(
      `Could not reach the trading engine at ${engineBaseUrl()}: ${(error as Error).message}`,
    );
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new EngineError(`Engine responded ${res.status}${text ? `: ${text.slice(0, 300)}` : ""}`);
  }
  const text = await res.text();
  if (!text.trim()) return null as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

export type Json = Record<string, unknown>;

export function asObject(value: unknown): Json {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Json) : {};
}

export function pickString(obj: Json, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

/** Normalized, assistant-friendly view of one engine run. */
export function summarizeRun(raw: unknown) {
  const run = asObject(raw);
  const nested = asObject(run["run"]);
  const src = Object.keys(run).length ? run : nested;
  const config = asObject(src["config"]);
  const decision = asObject(src["decision"] ?? src["final_decision"]);
  const reports = asObject(src["reports"]);
  const progress = asObject(src["progress"]);

  return {
    run_id: pickString(src, "id", "run_id", "runId") ?? null,
    status: (pickString(src, "status", "state") ?? "unknown").toLowerCase(),
    ticker: pickString(src, "ticker") ?? pickString(config, "ticker") ?? null,
    analysis_date:
      pickString(src, "analysis_date", "end_date") ??
      pickString(config, "analysis_date", "analysisDate", "end_date") ??
      null,
    progress: {
      stage: pickString(progress, "stage") ?? null,
      message: pickString(progress, "message") ?? null,
      percent: typeof progress["percent"] === "number" ? progress["percent"] : null,
    },
    decision: Object.keys(decision).length ? decision : null,
    reports_available: Object.keys(reports),
    error: pickString(src, "error") ?? null,
  };
}

export const FINISHED = new Set(["completed", "complete", "done", "finished", "error", "failed", "cancelled", "canceled"]);
