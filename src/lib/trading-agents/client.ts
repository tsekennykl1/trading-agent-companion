import type { RunConfig, RunRecord } from "./types";

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
 * Payload sent to POST /runs. Includes snake_case aliases so FastAPI engines
 * that follow Python naming conventions validate too (extra keys are ignored).
 */
export function runConfigPayload(config: RunConfig): Record<string, unknown> {
  return {
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

export const api = {
  health: () => request<HealthResponse>("/health"),
  startRun: (config: RunConfig) =>
    request<{ run_id: string }>("/runs", {
      method: "POST",
      body: JSON.stringify(runConfigPayload(config)),
    }),
  getRun: (id: string) => request<RunRecord>(`/runs/${id}`),
  listRuns: () => request<RunRecord[]>("/runs"),
  cancelRun: (id: string) => request<{ ok: boolean }>(`/runs/${id}/cancel`, { method: "POST" }),
};
