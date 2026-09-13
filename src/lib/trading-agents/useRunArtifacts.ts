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
  const [artifacts, setArtifacts] = useState<RunArtifacts>(EMPTY);
  const currentId = useRef<string | undefined>(undefined);

  if (currentId.current !== runId) {
    currentId.current = runId;
  }

  const terminal = run?.status === "completed" || run?.status === "error";

  useEffect(() => {
    if (!runId || !enabled) {
      setArtifacts(EMPTY);
      return;
    }
    let alive = true;
    let timer: number | undefined;

    const chartHtml = bridgeAssetUrl(`/runs/${runId}/price-chart.html`);
    const chartPng = bridgeAssetUrl(`/runs/${runId}/price-chart.png`);
    const resultHtml = bridgeAssetUrl(`/runs/${runId}/result.html`);

    const probe = async () => {
      const snapshot = artifactsRef.current;

      const [market, chartOk, resultOk] = await Promise.all([
        snapshot.marketData ? Promise.resolve(snapshot.marketData) : api.marketData(runId).catch(() => null),
        snapshot.chartHtmlUrl ? Promise.resolve(true) : api.artifactReady(chartHtml),
        snapshot.resultHtmlUrl || !terminal ? Promise.resolve(Boolean(snapshot.resultHtmlUrl)) : api.artifactReady(resultHtml),
      ]);
      if (!alive) return;

      setArtifacts((prev) => {
        const next: RunArtifacts = {
          marketData: market ?? prev.marketData,
          ...(chartOk || prev.chartHtmlUrl ? { chartHtmlUrl: chartHtml, chartPngUrl: chartPng } : {}),
          ...(resultOk || prev.resultHtmlUrl ? { resultHtmlUrl: resultHtml } : {}),
        };
        artifactsRef.current = next;
        return next;
      });

      const done =
        artifactsRef.current.marketData && artifactsRef.current.chartHtmlUrl && (!terminal || artifactsRef.current.resultHtmlUrl);
      if (!done) timer = window.setTimeout(probe, terminal ? 5000 : 4000);
    };

    void probe();
    return () => {
      alive = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [runId, enabled, terminal]);

  const artifactsRef = useRef<RunArtifacts>(EMPTY);
  useEffect(() => {
    artifactsRef.current = artifacts;
  }, [artifacts]);

  return artifacts;
}
