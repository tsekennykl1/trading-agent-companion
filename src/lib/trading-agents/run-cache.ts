import type { RunArtifacts } from "./useRunArtifacts";
import type { RunRecord } from "./types";

const CACHE_KEY = "ta-last-analysis-v1";

export interface CachedAnalysis {
  version: 1;
  savedAt: string;
  startedAt: number | null;
  run: RunRecord;
  artifacts: RunArtifacts;
}

export function loadCachedAnalysis(): CachedAnalysis | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<CachedAnalysis>;
    if (value.version !== 1 || !value.run || value.run.source !== "engine" || !value.run.id) return null;
    return {
      version: 1,
      savedAt: typeof value.savedAt === "string" ? value.savedAt : new Date(0).toISOString(),
      startedAt: typeof value.startedAt === "number" ? value.startedAt : null,
      run: value.run,
      artifacts: value.artifacts ?? { marketData: null, chartData: null, reports: {} },
    };
  } catch {
    return null;
  }
}

export function saveCachedAnalysis(
  run: RunRecord,
  artifacts: RunArtifacts,
  startedAt: number | null,
): void {
  if (typeof window === "undefined" || run.source !== "engine") return;
  try {
    const value: CachedAnalysis = {
      version: 1,
      savedAt: new Date().toISOString(),
      startedAt,
      run,
      artifacts,
    };
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(value));
  } catch {
    // Storage may be unavailable or full; live data remains in React state.
  }
}

export function clearCachedAnalysis(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CACHE_KEY);
}