import { useEffect, useRef, useState } from "react";
import { api, bridgeAssetUrl, type MarketData } from "./client";
import type { RunRecord } from "./types";

export interface RunArtifacts {
  marketData: MarketData | null;
  chartHtmlUrl?: string;
  chartPngUrl?: string;
  resultHtmlUrl?: string;
}

const EMPTY: RunArtifacts = { marketData: null };

/**
 * Loads late-bound artifacts (market data, charts, rich result HTML) separately
 * from the run-status poll. A 404 simply means "not ready yet" and is retried;
 * once an artifact is found it is cached and no longer requested.
 */
export function useRunArtifacts(run: RunRecord | undefined, enabled: boolean): RunArtifacts {
  const runId = run?.source === "engine" ? run.id : undefined;
  const terminal = run?.status === "completed" || run?.status === "error";
  const [artifacts, setArtifacts] = useState<RunArtifacts>(EMPTY);
  const cache = useRef<RunArtifacts>(EMPTY);

  useEffect(() => {
    cache.current = EMPTY;
    setArtifacts(EMPTY);
    if (!runId || !enabled) return;

    let alive = true;
    let timer: number | undefined;

    const chartHtml = bridgeAssetUrl(`/runs/${runId}/price-chart.html`);
    const chartPng = bridgeAssetUrl(`/runs/${runId}/price-chart.png`);
    const resultHtml = bridgeAssetUrl(`/runs/${runId}/result.html`);

    const probe = async () => {
      const have = cache.current;
      const [market, chartOk, resultOk] = await Promise.all([
        have.marketData ? Promise.resolve(have.marketData) : api.marketData(runId).catch(() => null),
        have.chartHtmlUrl ? Promise.resolve(true) : api.artifactReady(chartHtml),
        have.resultHtmlUrl ? Promise.resolve(true) : terminal ? api.artifactReady(resultHtml) : Promise.resolve(false),
      ]);
      if (!alive) return;

      const next: RunArtifacts = {
        marketData: market ?? have.marketData,
        ...(chartOk ? { chartHtmlUrl: chartHtml, chartPngUrl: chartPng } : {}),
        ...(resultOk ? { resultHtmlUrl: resultHtml } : {}),
      };
      cache.current = next;
      setArtifacts(next);

      const done = next.marketData && next.chartHtmlUrl && (!terminal || next.resultHtmlUrl);
      if (!done) timer = window.setTimeout(() => void probe(), terminal ? 5000 : 4000);
    };

    void probe();
    return () => {
      alive = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [runId, enabled, terminal]);

  return artifacts;
}
