// The engine API. Each function is a thin wrapper around one endpoint;
// the messy JSON-reading lives in the sibling files re-exported below.
import type { RunConfig, RunRecord } from "./types";
import { EngineHttpError, bridgeAssetUrl, getBridgeUrl, getJson, request } from "./http";
import { normalizeRun, readRunStatus, type RunStatus } from "./normalize-run";
import { runConfigPayload } from "./run-payload";
import { readMarketData, readPriceChart, type MarketData, type PriceChartData } from "./chart-data";
import { readReportContent, readReportsIndex } from "./reports";

export { canUseBrowserUrl, PUBLIC_ASSET_BASE_URL, resolvePublicUrl } from "./url";
export { DEFAULT_BRIDGE_URL, EngineHttpError, bridgeAssetUrl, getBridgeUrl, setBridgeUrl } from "./http";
export { runConfigPayload } from "./run-payload";
export { canonicalStatus, normalizeRun, type RunStatus } from "./normalize-run";
export {
  readChartMarkers,
  readMarketData,
  readPriceChart,
  readScores,
  readTradeLevels,
  type ChartRow,
  type MarketData,
  type PriceChartData,
} from "./chart-data";
export { readReportContent, readReportsIndex } from "./reports";

const statusCache = new Map<string, { etag?: string; value: RunStatus }>();

export interface HealthResponse {
  status: string;
  engine_version?: string;
  providers?: string[];
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
  /**
   * GET /runs/{id}/status — lightweight readiness poll. Returns null when the
   * engine does not expose the endpoint, so the caller can fall back to
   * polling the full run.
   */
  runStatus: async (id: string): Promise<RunStatus | null> => {
    const cached = statusCache.get(id);
    try {
      const res = await fetch(bridgeAssetUrl(`/runs/${id}/status`), {
        cache: "no-store",
        ...(cached?.etag ? { headers: { "If-None-Match": cached.etag } } : {}),
      });
      if (res.status === 304) return cached?.value ?? null;
      if (res.status === 404 || res.status === 410) {
        statusCache.delete(id);
        throw new EngineHttpError(res.status, `Run ${id} is no longer available`);
      }
      if (!res.ok) return null;
      const value = readRunStatus(await res.json());
      const etag = res.headers.get("etag");
      if (value) statusCache.set(id, { ...(etag ? { etag } : {}), value });
      return value;
    } catch (error) {
      if (error instanceof EngineHttpError) throw error;
      return null;
    }
  },
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
  priceChartJson: async (id: string, url?: string): Promise<PriceChartData | null> => {
    const raw = await getJson(url ?? `/runs/${id}/price-chart.json`);
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

  /** GET /market/company — Alpha Vantage profile, valuation and latest quote. */
  companyProfile: (ticker: string) =>
    request<CompanyProfile>(`/market/company?ticker=${encodeURIComponent(ticker)}`),
  /** GET /market/earnings — last quarters of EPS reported vs estimated. */
  companyEarnings: (ticker: string) =>
    request<CompanyEarnings>(`/market/earnings?ticker=${encodeURIComponent(ticker)}`),
  /** GET /market/security — HKEX directory: English + Chinese name for a .HK ticker. */
  hkSecurity: (ticker: string) =>
    request<HkSecurity>(`/market/security?ticker=${encodeURIComponent(ticker)}`),

  /** GET /providers — active LLM plus every provider with a key saved. */
  providers: () => request<ProvidersResponse>("/providers"),
  /** GET /providers/credit — key validity and, where published, remaining credit. */
  providerCredit: (provider?: string) =>
    request<ProviderCredit>(`/providers/credit${provider ? `?provider=${encodeURIComponent(provider)}` : ""}`),

  /** GET /llm/config — OpenAI endpoint settings and credit-tracking capability. */
  llmConfig: () => request<LlmConfig>("/llm/config"),
  /** GET /llm/credits — OpenAI remaining credit (budget minus usage). */
  llmCredits: () => request<LlmCredits>("/llm/credits"),

  /** POST /providers/active — switch the engine to another configured provider. */
  setActiveProvider: (provider: string, deepModel?: string, quickModel?: string) =>
    request<{ active: ActiveProvider; credit: ProviderCredit; restart_required?: boolean }>(
      "/providers/active",
      {
        method: "POST",
        body: JSON.stringify({
          provider,
          ...(deepModel ? { deep_model: deepModel } : {}),
          ...(quickModel ? { quick_model: quickModel } : {}),
        }),
      },
    ),
};

export interface CompanyProfile {
  available: boolean;
  message?: string;
  symbol?: string;
  name?: string | null;
  sector?: string | null;
  industry?: string | null;
  exchange?: string | null;
  currency?: string | null;
  market_cap?: number | null;
  pe_ratio?: number | null;
  forward_pe?: number | null;
  eps?: number | null;
  dividend_yield?: number | null;
  beta?: number | null;
  week52_high?: number | null;
  week52_low?: number | null;
  analyst_target_price?: number | null;
  quote?: {
    price: number | null;
    change: number | null;
    change_percent: number | null;
    previous_close: number | null;
    volume: number | null;
    latest_trading_day: string | null;
  } | null;
}

export interface CompanyEarnings {
  available: boolean;
  message?: string;
  symbol?: string;
  quarters?: {
    fiscal_date: string | null;
    reported_date?: string | null;
    reported_eps: number | null;
    estimated_eps: number | null;
    surprise?: number | null;
    surprise_percent: number | null;
  }[];
  annual?: { fiscal_date: string | null; reported_eps: number | null }[];
}

export type ProviderCreditStatus =

  | "valid"
  | "invalid"
  | "missing_key"
  | "no_key_required"
  | "unreachable"
  | "unknown";

export interface ProviderCredit {
  provider: string;
  label: string;
  status: ProviderCreditStatus;
  supports_balance: boolean;
  balance: number | null;
  currency: string | null;
  checked_at?: string;
  message?: string;
}

export interface ActiveProvider {
  provider: string | null;
  deep_model: string | null;
  quick_model: string | null;
  configured: boolean;
}

export interface ProviderSummary {
  provider: string;
  label: string;
  configured: boolean;
  supports_balance: boolean;
  env_keys: string[];
  deep_models: string[];
  quick_models: string[];
  default_deep_model: string;
  default_quick_model: string;
}

export interface ProvidersResponse {
  active: ActiveProvider;
  providers: ProviderSummary[];
}

/** One row of the engine's HKEX securities directory. */
export interface HkSecurity {
  available: boolean;
  message?: string;
  ticker?: string;
  code?: string;
  name_en?: string | null;
  name_zh?: string | null;
  category?: string | null;
}

export interface LlmConfig {
  provider: string;
  deep_think_model?: string | null;
  quick_think_model?: string | null;
  budget_usd?: number | null;
  has_admin_key?: boolean;
  billing_dashboard_url?: string;
  capabilities?: { credits_api?: boolean; fred_enabled?: boolean };
}

export interface LlmCredits {
  provider: string;
  available: boolean;
  budget_usd?: number;
  used_usd?: number;
  remaining_usd?: number;
  remaining_pct?: number;
  low_balance?: boolean;
  query_window_days?: number;
  as_of?: string;
  billing_url?: string;
  message?: string;
  error?: string;
}
