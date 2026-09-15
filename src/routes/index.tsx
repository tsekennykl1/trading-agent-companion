import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, FlaskConical, Info, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
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
import { api, bridgeAssetUrl, EngineHttpError } from "@/lib/trading-agents/client";
import { finalReportReady, reportsReadyFor } from "@/lib/trading-agents/report-readiness";
import { canUseBrowserUrl } from "@/lib/trading-agents/url";
import { useRunArtifacts, type RunArtifacts } from "@/lib/trading-agents/useRunArtifacts";
import { clearCachedAnalysis, loadCachedAnalysis, saveCachedAnalysis } from "@/lib/trading-agents/run-cache";
import { SAMPLE_RUN } from "@/lib/trading-agents/sample-run";
import { DEFAULT_STAGES } from "@/lib/trading-agents/types";
import type { RunConfig, RunRecord } from "@/lib/trading-agents/types";
import { useT } from "@/lib/i18n";

const TITLE = "My Trading Agents — Financial Analysis";
const DESCRIPTION =
  "Run TradingAgents analyses with live progress, market charts, agent reports, confidence views, and an exportable decision memo.";
const FORM_CONFIG_KEY = "ta-analysis-form-v1";

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

  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [showingSample, setShowingSample] = useState(true);
  const [cachedRun, setCachedRun] = useState<RunRecord | null>(null);
  const [cachedArtifacts, setCachedArtifacts] = useState<RunArtifacts | null>(null);
  const [defaultConfig, setDefaultConfig] = useState<RunConfig>({
    ...SAMPLE_RUN.config,
    analysisDate: "",
    analysts: ["Market Analyst"],
    stages: DEFAULT_STAGES,
  });
  const [showFormAtTop, setShowFormAtTop] = useState(false);
  const [sidebarFormOpen, setSidebarFormOpen] = useState(true);

  useEffect(() => {
    const analysisDate = new Date().toISOString().slice(0, 10);
    try {
      const saved = window.localStorage.getItem(FORM_CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<RunConfig>;
        setDefaultConfig((current) => ({
          ...current,
          ...parsed,
          analysisDate,
          analysts: Array.isArray(parsed.analysts) ? parsed.analysts : current.analysts,
          ...(Array.isArray(parsed.stages) ? { stages: parsed.stages } : {}),
        }));
        return;
      }
    } catch {
      window.localStorage.removeItem(FORM_CONFIG_KEY);
    }
    setDefaultConfig((current) => ({ ...current, analysisDate }));
  }, []);

  const rememberConfig = (config: RunConfig) => {
    setDefaultConfig(config);
    window.localStorage.setItem(FORM_CONFIG_KEY, JSON.stringify(config));
  };


  // Lightweight readiness poll (GET /runs/{id}/status). When the engine does
  // not serve it, the full run poll below keeps its original cadence.
  const statusSupported = useRef(true);
  const statusQuery = useQuery({
    queryKey: ["run-status", activeRunId],
    queryFn: async () => {
      if (!activeRunId) throw new Error("No active run selected");
      const status = await api.runStatus(activeRunId);
      if (!status) statusSupported.current = false;
      return status;
    },
    enabled: !!activeRunId && statusSupported.current,
    refetchInterval: (q) => {
      const data = q.state.data;
      if (!data) return false;
      const done = data.status === "error" || finalReportReady({
        status: data.status,
        reportsReady: data.reportsReady,
        resultUrl: data.resultUrl,
      });
      return done ? false : (data.pollAfterMs ?? 2500);
    },
  });
  const status = statusQuery.data ?? null;

  const runQuery = useQuery({
    queryKey: ["run", activeRunId],
    queryFn: () => {
      if (!activeRunId) throw new Error("No active run selected");
      return api.getRun(activeRunId);
    },
    enabled: !!activeRunId,
    refetchInterval: (q) => {
      const data = q.state.data;
      const s = data?.status;
      if (s === "completed" || s === "error") return false;
      // With the cheap status endpoint available the heavy run payload is only
      // refetched when the status version changes — no timed polling at all.
      if (status) return false;
      return data?.pollAfterMs ?? 3000;
    },
    staleTime: 2000,
  });

  // Refresh the full run whenever the cheap status poll reports a change.
  const statusSignature = status
    ? status.version !== undefined
      ? String(status.version)
      : `${status.status}|${status.decisionReady}|${status.reportsReady.length}|${status.resultUrl ?? ""}`
    : "";
  useEffect(() => {
    if (!statusSignature || !activeRunId) return;
    void runQuery.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusSignature, activeRunId]);

  useEffect(() => {
    const error = statusQuery.error ?? runQuery.error;
    if (!(error instanceof EngineHttpError) || (error.status !== 404 && error.status !== 410)) return;
    clearCachedAnalysis();
    setCachedRun(null);
    setCachedArtifacts(null);
    setActiveRunId(null);
    setShowingSample(true);
  }, [statusQuery.error, runQuery.error]);

  // Elapsed time for the in-progress overlay
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (startedAt === null) return;
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);

  // Restore the latest engine snapshot after hydration, then let the active
  // queries refresh it in the background when the engine is reachable.
  useEffect(() => {
    const cached = loadCachedAnalysis();
    if (!cached) return;
    setCachedRun(cached.run);
    setCachedArtifacts(cached.artifacts);
    setActiveRunId(cached.run.id);
    setShowingSample(false);
    setStartedAt(cached.startedAt ?? Date.parse(cached.run.startedAt));
  }, []);

  // What the user asked for on this attempt, plus the runs that already existed
  // before it — so run discovery can never latch onto an earlier ticker's run.
  const requestedTicker = useRef<string | null>(null);
  const knownRunIds = useRef<Set<string>>(new Set());
  // Some engines only serve per-run endpoints and have no run list. After the
  // first failure we never ask for /runs again.
  const runListSupported = useRef(true);

  const startRun = useMutation({
    mutationFn: (config: RunConfig) => api.startRun(config),
    onMutate: (config: RunConfig) => {
      rememberConfig(config);
      requestedTicker.current = config.ticker.trim().toUpperCase();
      setActiveRunId(null);
      setCachedRun(null);
      setCachedArtifacts(null);
      setShowingSample(false);
      setStartedAt(Date.now());
      setElapsed(0);
      setShowFormAtTop(false);
      knownRunIds.current = new Set();
      if (runListSupported.current) {
        void api
          .listRuns()
          .then((runs) => {
            knownRunIds.current = new Set(runs.map((r) => r.id));
          })
          .catch(() => {
            runListSupported.current = false;
          });
      }
    },
    onSuccess: (data) => {
      setActiveRunId(data.run_id);
      setShowingSample(false);
      toast.success(t("toast.started"));
    },
    onError: (e: Error) =>
      toast.error(/responded 4\d\d/.test(e.message) ? t("toast.rejected") : t("toast.unreachable"), {
        description: /responded 4\d\d/.test(e.message) ? e.message : `${e.message}. ${t("toast.checkSetup")}`,
      }),
  });

  // Some engine builds keep POST /runs open until the analysis finishes, so no
  // run id arrives up front and nothing (chart, reports, progress) is polled.
  // While the start request is still open, look the run up from the run list.
  useEffect(() => {
    if (!startRun.isPending || activeRunId || !runListSupported.current) return;
    let alive = true;
    let timer: number | undefined;
    const discover = async () => {
      try {
        const runs = await api.listRuns();
        const want = requestedTicker.current;
        const fresh = runs.filter((r) => !knownRunIds.current.has(r.id));
        const match =
          fresh.find((r) => !want || r.config.ticker.trim().toUpperCase() === want) ?? undefined;
        if (alive && match?.id) {
          setActiveRunId(match.id);
          setShowingSample(false);
          return;
        }
      } catch {
        // The engine does not expose a run list. Stop asking and rely on the
        // run id from POST /runs plus the per-run endpoints.
        runListSupported.current = false;
        return;
      }
      if (alive) timer = window.setTimeout(() => void discover(), 4000);
    };
    timer = window.setTimeout(() => void discover(), 4000);
    return () => {
      alive = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [startRun.isPending, activeRunId]);

  const cancelRun = () => {
    if (!activeRunId) return;
    api
      .cancelRun(activeRunId)
      .then(() => toast.message(t("toast.stopRequested")))
      .catch(() => toast.error(t("toast.stopFailed")));
  };

  const fetchedRun = runQuery.data as RunRecord | undefined;
  const liveRunSource = fetchedRun ?? (cachedRun?.id === activeRunId ? cachedRun : undefined);
  const liveRun = liveRunSource
    ? liveRunSource
    : undefined;
  const run: RunRecord = showingSample || !liveRun ? SAMPLE_RUN : liveRun;
  const artifacts = useRunArtifacts(
    run,
    run.source === "engine",
    cachedRun?.id === run.id ? cachedArtifacts : null,
  );
  useEffect(() => {
    if (run.source !== "engine") return;
    setCachedRun(run);
    saveCachedAnalysis(run, artifacts, startedAt);
  }, [run, artifacts, startedAt]);
  const chartReady = Boolean(artifacts.chartData || artifacts.chartPngUrl || run.partial?.chartsReady);
  const running = run.status === "running" || run.status === "queued";
  const analysisBusy =
    startRun.isPending || (!showingSample && !!activeRunId && (!liveRun || running));
  const latestStep = analysisBusy ? liveRun?.agents.at(-1)?.agent : undefined;
  // Strict readiness per the engine contract: the run must be completed AND the
  // engine must list finished detail reports (partial_result.reports_ready).
  // A partial result page or a bare decision is NOT enough.
  const readyReportNames = reportsReadyFor(liveRun, status);
  const engineStatus = status?.status ?? liveRun?.status;
  const publishedReportUrl = status?.resultUrl ?? artifacts.resultHtmlUrl;
  const reportReady = finalReportReady({
    status: engineStatus,
    reportsReady: readyReportNames,
    resultUrl: publishedReportUrl,
  });
  const detailReportUrl = publishedReportUrl ?? (
    reportReady && liveRun?.source === "engine"
      ? bridgeAssetUrl(`/runs/${liveRun.id}/result.html`)
      : undefined
  );
  // The detail-report box only appears once an analysis has been started.
  const showExportBar = startedAt !== null;
  // While an analysis is loading the form only takes up space; it comes back
  // with the Show button or the New Analysis button at the top of the page.
  useEffect(() => {
    if (analysisBusy) setSidebarFormOpen(false);
  }, [analysisBusy]);
  // On the single-column layout the progress panel drops to the bottom of the
  // page once everything has finished.
  const allDone = !analysisBusy && (engineStatus === "completed" || run.status === "completed");
  const headerGridCols =
    showExportBar && chartReady && !showFormAtTop
      ? "xl:grid-cols-[minmax(0,1fr)_auto_minmax(28rem,0.85fr)]"
      : showExportBar
        ? "xl:grid-cols-[minmax(0,1fr)_minmax(32rem,0.9fr)]"
        : "";

  return (
    <AppShell>
      <div
        className={`mb-5 grid min-w-0 gap-4 xl:items-start sm:mb-6 ${headerGridCols}`}
      >
        <div className="min-w-0 pt-1">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{t("home.title")}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            {t("home.intro")}
          </p>
        </div>
        {showExportBar && chartReady && !showFormAtTop && (
          <div className="flex min-w-0 items-start justify-start xl:justify-center">
            <Button
              size="lg"
              className="w-full gap-2 rounded-lg bg-gradient-to-r from-primary to-primary/85 px-6 py-3 text-base font-semibold text-primary-foreground shadow-md transition-all hover:-translate-y-0.5 hover:from-primary/95 hover:to-primary/80 hover:shadow-lg active:translate-y-0 sm:w-auto sm:min-w-[10rem]"
              onClick={() => {
                setShowFormAtTop(true);
                setSidebarFormOpen(true);
              }}
            >
              <Plus className="size-5" aria-hidden="true" />
              {t("home.newAnalysis")}
            </Button>
          </div>
        )}
        {showExportBar && (
          <ExportBar
            run={run}
            reportUrl={canUseBrowserUrl(detailReportUrl) ? detailReportUrl : undefined}
            ready={reportReady}
            loading={!reportReady}
          />
        )}
      </div>

      {(!chartReady || showFormAtTop) && (
        <div className="mb-6 min-w-0 rounded-xl border-2 border-primary/40 bg-primary/5 p-3 shadow-sm sm:p-4">
          <RunForm
            key={`top-${defaultConfig.analysisDate}`}
            defaultConfig={defaultConfig}
            running={running && !showingSample}
            disabled={startRun.isPending}
            onConfigChange={rememberConfig}
            onRun={(c) => startRun.mutate(c)}
            onCancel={cancelRun}
          />
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

      <div className="flex min-w-0 flex-col gap-6 xl:grid xl:grid-cols-[21rem_minmax(0,1fr)] xl:items-start" aria-busy={analysisBusy}>
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
              {sidebarFormOpen && (
                <RunForm
                  key={defaultConfig.analysisDate}
                  defaultConfig={defaultConfig}
                  running={running && !showingSample}
                  disabled={startRun.isPending}
                  compact
                  onConfigChange={rememberConfig}
                  onRun={(c) => startRun.mutate(c)}
                  onCancel={cancelRun}
                />
              )}
            </div>
          )}

          {showingSample && run.source === "sample" && (
            <div className="order-2 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm sm:flex sm:flex-wrap sm:items-center">
              <FlaskConical className="size-4 shrink-0 text-accent-foreground" />
              <p className="mr-auto">
                {t("home.sampleNotice")} ({SAMPLE_RUN.config.ticker}, {SAMPLE_RUN.config.analysisDate})
                {!engineOnline && ` ${t("home.engineOffline")}`}
              </p>
              {activeRunId && (
                <Button size="sm" variant="outline" className="col-span-2 min-h-10 w-full sm:min-h-8 sm:w-auto" onClick={() => setShowingSample(false)}>
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

          <div className={`${allDone ? "order-9" : "order-6"} min-w-0 xl:order-none`}>
            <AgentBoard
              agents={run.agents}
              stats={run.stats}
              compact
              analysisBusy={analysisBusy}
              progress={liveRun?.progress}
              ticker={liveRun?.config.ticker ?? defaultConfig.ticker}
              elapsed={elapsed}
              latestStep={latestStep}
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
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  {t("home.pendingBody")}
                </p>
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
