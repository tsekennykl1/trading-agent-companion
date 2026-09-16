import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, FlaskConical, Info, Loader2, Plus } from "lucide-react";
import { AppShell } from "@/components/workbench/AppShell";
import { RunForm } from "@/components/workbench/RunForm";
import { AgentBoard } from "@/components/workbench/AgentBoard";
import { DecisionPanel } from "@/components/workbench/DecisionPanel";
import { ConfidenceChart, PriceChart, StanceChart } from "@/components/workbench/RunCharts";
import { ReportsSection } from "@/components/workbench/ReportsSection";
import { LiveSnapshot } from "@/components/workbench/LiveSnapshot";
import { ExportBar } from "@/components/workbench/ExportBar";
import { useBridgeHealth } from "@/components/workbench/BridgeStatusBadge";
import { Button } from "@/components/ui/button";
import { canUseBrowserUrl } from "@/lib/trading-agents/url";
import { SAMPLE_RUN } from "@/lib/trading-agents/sample-run";
import type { RunConfig } from "@/lib/trading-agents/types";
import { useSavedRunConfig } from "@/hooks/useSavedRunConfig";
import { useAnalysisRun } from "@/hooks/useAnalysisRun";
import { useT } from "@/lib/i18n";

const TITLE = "My Trading Agents — Financial Analysis";
const DESCRIPTION =
  "Run TradingAgents analyses with live progress, market charts, agent reports, confidence views, and an exportable decision memo.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Workbench,
});

function Workbench() {
  const t = useT();
  const health = useBridgeHealth();
  const engineOnline = !!health.data && !health.isError;

  // The analysis form remembers what you last used (see hooks/useSavedRunConfig).
  const { config: defaultConfig, remember: rememberConfig } = useSavedRunConfig();
  // Everything about the current analysis (see hooks/useAnalysisRun).
  const analysis = useAnalysisRun(rememberConfig);
  const { run, liveRun, artifacts, analysisBusy, chartReady } = analysis;

  // Where the form sits: at the top of the page, or in the sidebar.
  const [showFormAtTop, setShowFormAtTop] = useState(false);
  const [sidebarFormOpen, setSidebarFormOpen] = useState(true);
  // While an analysis is loading the form only takes up space; it comes back
  // with the Show button or the New Analysis button at the top of the page.
  useEffect(() => {
    if (analysisBusy) setSidebarFormOpen(false);
  }, [analysisBusy]);

  const startAnalysis = (config: RunConfig) => {
    setShowFormAtTop(false);
    analysis.start(config);
  };

  const formProps = {
    defaultConfig,
    running: analysis.running && !analysis.showingSample,
    disabled: analysis.starting,
    onConfigChange: rememberConfig,
    onRun: startAnalysis,
    onCancel: analysis.cancelRun,
  };

  // The detail-report box only appears once an analysis has been started.
  const showExportBar = analysis.startedAt !== null;
  const headerGridCols =
    showExportBar && chartReady && !showFormAtTop
      ? "xl:grid-cols-[minmax(0,1fr)_auto_minmax(28rem,0.85fr)]"
      : showExportBar
        ? "xl:grid-cols-[minmax(0,1fr)_minmax(32rem,0.9fr)]"
        : "";

  return (
    <AppShell>
      <div className={`mb-5 grid min-w-0 gap-4 xl:items-start sm:mb-6 ${headerGridCols}`}>
        <div className="min-w-0 pt-1">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{t("home.title")}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{t("home.intro")}</p>
        </div>
        {showExportBar && chartReady && !showFormAtTop && (
          <div className="flex min-w-0 flex-wrap items-start justify-start gap-2 xl:justify-center">
            <Button
              size="lg"
              className="flex-1 gap-2 rounded-lg bg-gradient-to-r from-primary to-primary/85 px-6 py-3 text-base font-semibold text-primary-foreground shadow-md transition-all hover:-translate-y-0.5 hover:from-primary/95 hover:to-primary/80 hover:shadow-lg active:translate-y-0 sm:flex-none sm:min-w-[10rem]"
              onClick={() => {
                setShowFormAtTop(true);
                setSidebarFormOpen(true);
              }}
            >
              <Plus className="size-5" aria-hidden="true" />
              {t("home.newAnalysis")}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="flex-1 gap-2 rounded-lg px-6 py-3 text-base font-semibold sm:flex-none"
              onClick={() => {
                clearCachedAnalysis();
                window.location.reload();
              }}
            >
              <Trash2 className="size-5" aria-hidden="true" />
              {t("home.clear")}
            </Button>
          </div>
        )}

        {showExportBar && (
          <ExportBar
            run={run}
            reportUrl={canUseBrowserUrl(analysis.detailReportUrl) ? analysis.detailReportUrl : undefined}
            ready={analysis.reportReady}
            loading={!analysis.reportReady}
          />
        )}
      </div>

      {(!chartReady || showFormAtTop) && (
        <div className="mb-6 min-w-0 rounded-xl border-2 border-primary/40 bg-primary/5 p-3 shadow-sm sm:p-4">
          <RunForm key={`top-${defaultConfig.analysisDate}`} {...formProps} />
        </div>
      )}

      <div className="mb-6 min-w-0">
        <LiveSnapshot run={run} artifacts={artifacts} />
        {!chartReady && (
          <PriceChart
            data={artifacts.marketData?.prices.length ? artifacts.marketData.prices : run.prices}
            ticker={run.config.ticker}
          />
        )}
      </div>

      <div
        className="flex min-w-0 flex-col gap-6 xl:grid xl:grid-cols-[21rem_minmax(0,1fr)] xl:items-start"
        aria-busy={analysisBusy}
      >
        <aside className="contents min-w-0 xl:sticky xl:top-24 xl:flex xl:flex-col xl:gap-5">
          {chartReady && !showFormAtTop && (
            <div className="order-1 min-w-0 space-y-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-2"
                aria-expanded={sidebarFormOpen}
                onClick={() => setSidebarFormOpen((v) => !v)}
              >
                {sidebarFormOpen ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                {sidebarFormOpen ? t("home.hideForm") : t("home.showForm")}
              </Button>
              {sidebarFormOpen && <RunForm key={defaultConfig.analysisDate} compact {...formProps} />}
            </div>
          )}

          {analysis.showingSample && run.source === "sample" && (
            <div className="order-2 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm sm:flex sm:flex-wrap sm:items-center">
              <FlaskConical className="size-4 shrink-0 text-accent-foreground" />
              <p className="mr-auto">
                {t("home.sampleNotice")} ({SAMPLE_RUN.config.ticker}, {SAMPLE_RUN.config.analysisDate})
                {!engineOnline && ` ${t("home.engineOffline")}`}
              </p>
              {analysis.activeRunId && (
                <Button
                  size="sm"
                  variant="outline"
                  className="col-span-2 min-h-10 w-full sm:min-h-8 sm:w-auto"
                  onClick={analysis.dismissSample}
                >
                  {t("home.backToLive")}
                </Button>
              )}
            </div>
          )}

          {run.status === "error" && (
            <div className="order-2 flex items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
              <Info className="size-4 shrink-0 text-destructive" />
              <p>{run.error ?? t("home.runError")}</p>
            </div>
          )}

          {/* On the single-column layout the progress panel drops to the bottom
              of the page once everything has finished. */}
          <div className={`${analysis.allDone ? "order-9" : "order-6"} min-w-0 xl:order-none`}>
            <AgentBoard
              agents={run.agents}
              stats={run.stats}
              compact
              analysisBusy={analysisBusy}
              progress={liveRun?.progress}
              ticker={liveRun?.config.ticker ?? defaultConfig.ticker}
              elapsed={analysis.elapsed}
              latestStep={analysis.latestStep}
              selectedStages={run.config.stages}
              stageTimingEnabled={run.source === "engine"}
            />
          </div>
        </aside>

        <main className="contents min-w-0 xl:flex xl:flex-col xl:gap-6">
          <div className="order-5 min-w-0">
            {run.decision ? (
              <DecisionPanel decision={run.decision} ticker={run.config.ticker} />
            ) : (
              <section className="panel flex flex-col items-center justify-center px-5 py-8 text-center" role="status">
                <Loader2 className="mb-3 size-6 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
                <h2 className="font-display text-lg font-semibold">{t("home.pendingTitle")}</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t("home.pendingBody")}</p>
              </section>
            )}
          </div>

          <div className="order-7 min-w-0 space-y-6">
            <div className="grid min-w-0 gap-6 lg:grid-cols-2 lg:items-stretch">
              <StanceChart data={run.stances} />
              {run.decision ? (
                <ConfidenceChart decision={run.decision} stances={run.stances} />
              ) : (
                <section className="panel h-full p-4 sm:p-5">
                  <h3 className="text-base font-semibold">{t("home.confidenceTitle")}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{t("home.confidenceBody")}</p>
                </section>
              )}
            </div>
            <ReportsSection run={run} extraReports={artifacts.reports} />
          </div>
        </main>
      </div>
    </AppShell>
  );
}
