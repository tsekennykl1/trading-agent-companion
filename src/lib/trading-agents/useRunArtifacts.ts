import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api, bridgeAssetUrl, type MarketData, type PriceChartData } from "./client";
import { REPORT_SECTIONS, type RunRecord } from "./types";

export interface RunArtifacts {
  marketData: MarketData | null;
  /** Structured chart data rendered client-side with React Plotly. */
  chartData: PriceChartData | null;
  /** Reports fetched one by one from the split report endpoints. */
  reports: Record<string, string>;
  chartHtmlUrl?: string;
  chartPngUrl?: string;
  chartJsonUrl?: string;
  marketDataUrl?: string;
  resultHtmlUrl?: string;
  /** Pre-rename artifacts, surfaced only when the new ones are absent. */
  chartPngLegacyUrl?: string;
  chartHtmlLegacyUrl?: string;
}

const EMPTY: RunArtifacts = { marketData: null, chartData: null, reports: {} };

function reportLabel(key: string): string {
  const known = REPORT_SECTIONS.find((s) => s.key === key);
  if (known) return known.label;
  return key.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Loads late-bound artifacts (market data, chart JSON, individual reports, rich
 * result HTML) separately from the run-status poll. Engine-published URLs from
 * partial_result win; otherwise the canonical price-chart.* paths are used, with
 * the legacy chart.* names as a migration fallback. A 404 simply means "not
 * ready yet" and is retried; each report is announced as soon as it arrives.
 */
export function useRunArtifacts(run: RunRecord | undefined, enabled: boolean): RunArtifacts {
  const runId = run?.source === "engine" ? run.id : undefined;
  const terminal = run?.status === "completed" || run?.status === "error";
  const partial = run?.partial;
  const givenChartJson = partial?.chartJsonUrl;
  const givenMarketData = partial?.marketDataUrl;
  const givenChartHtml = partial?.chartHtmlUrl;
  const givenChartPng = partial?.chartPngUrl;
  const givenResult = partial?.resultHtmlUrl;
  const [artifacts, setArtifacts] = useState<RunArtifacts>(EMPTY);
  const cache = useRef<RunArtifacts>(EMPTY);

  useEffect(() => {
    cache.current = EMPTY;
    setArtifacts(EMPTY);
    if (!runId || !enabled) return;

    let alive = true;
    let timer: number | undefined;
    let firstPass = true;

    const chartHtml = givenChartHtml ?? bridgeAssetUrl(`/runs/${runId}/price-chart.html`);
    const chartPng = givenChartPng ?? bridgeAssetUrl(`/runs/${runId}/price-chart.png`);
    const legacyHtml = bridgeAssetUrl(`/runs/${runId}/chart.html`);
    const legacyPng = bridgeAssetUrl(`/runs/${runId}/chart.png`);
    const chartJson = givenChartJson ?? `/runs/${runId}/price-chart.json`;
    const marketDataUrl = givenMarketData ?? `/runs/${runId}/market-data`;
    const resultHtml = givenResult ?? bridgeAssetUrl(`/runs/${runId}/result.html`);

    const loadReports = async (have: Record<string, string>) => {
      const index = await api.reportsIndex(runId);
      const next = { ...have, ...index.contents };
      const missing = index.names.filter((name) => !next[name]);
      const fetched = await Promise.all(
        missing.map(async (name) => [name, await api.report(runId, name)] as const),
      );
      for (const [name, content] of fetched) if (content) next[name] = content;
      return next;
    };

    const probe = async () => {
      const have = cache.current;
      const [market, chartData, reports, chartOk, resultOk] = await Promise.all([
        have.marketData ? Promise.resolve(have.marketData) : api.marketData(runId, marketDataUrl).catch(() => null),
        have.chartData && terminal
          ? Promise.resolve(have.chartData)
          : api.priceChartJson(runId, chartJson).catch(() => null),
        loadReports(have.reports).catch(() => have.reports),
        have.chartHtmlUrl ? Promise.resolve(true) : api.artifactReady(chartHtml),
        have.resultHtmlUrl ? Promise.resolve(true) : terminal ? api.artifactReady(resultHtml) : Promise.resolve(false),
      ]);
      if (!alive) return;

      // Older engines only publish chart.png / chart.html.
      const legacyOk =
        chartOk || have.chartHtmlLegacyUrl ? false : await api.artifactReady(legacyPng).catch(() => false);
      if (!alive) return;

      const next: RunArtifacts = {
        marketData: market ?? have.marketData,
        chartData: chartData ?? have.chartData,
        reports,
        ...(chartOk
          ? { chartHtmlUrl: chartHtml, chartPngUrl: chartPng }
          : have.chartHtmlUrl
            ? { chartHtmlUrl: have.chartHtmlUrl, chartPngUrl: have.chartPngUrl }
            : legacyOk || have.chartPngLegacyUrl
              ? {
                  chartHtmlUrl: have.chartHtmlLegacyUrl ?? legacyHtml,
                  chartPngUrl: have.chartPngLegacyUrl ?? legacyPng,
                  chartHtmlLegacyUrl: have.chartHtmlLegacyUrl ?? legacyHtml,
                  chartPngLegacyUrl: have.chartPngLegacyUrl ?? legacyPng,
                }
              : {}),
        ...(chartData || have.chartData ? { chartJsonUrl: bridgeAssetUrl(chartJson) } : {}),
        ...(market || have.marketData ? { marketDataUrl: bridgeAssetUrl(marketDataUrl) } : {}),
        ...(resultOk ? { resultHtmlUrl: resultHtml } : {}),
      };

      const newReports = Object.keys(next.reports).filter((key) => !have.reports[key]);
      cache.current = next;
      setArtifacts(next);

      if (!firstPass) {
        for (const key of newReports) {
          toast.success(`${reportLabel(key)} report is ready`, {
            description: "Open it in the Agent reports section below.",
            duration: 3000,
            closeButton: true,
          });
        }
      }
      firstPass = false;

      const done = terminal && next.chartData && next.resultHtmlUrl;
      if (!done) timer = window.setTimeout(() => void probe(), terminal ? 5000 : 4000);
    };

    void probe();
    return () => {
      alive = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [runId, enabled, terminal, givenChartJson, givenMarketData, givenChartHtml, givenChartPng, givenResult]);

  return artifacts;
}
