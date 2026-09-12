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
    throw new Error(`Engine responded ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`);
  }
  return (await res.json()) as T;
}

export interface HealthResponse {
  status: string;
  engine_version?: string;
  providers?: string[];
}

export const api = {
  health: () => request<HealthResponse>("/health"),
  startRun: (config: RunConfig) =>
    request<{ run_id: string }>("/runs", { method: "POST", body: JSON.stringify(config) }),
  getRun: (id: string) => request<RunRecord>(`/runs/${id}`),
  listRuns: () => request<RunRecord[]>("/runs"),
  cancelRun: (id: string) => request<{ ok: boolean }>(`/runs/${id}/cancel`, { method: "POST" }),
};
