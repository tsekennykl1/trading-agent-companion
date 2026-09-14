import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { FlaskConical, Info, Loader2 } from "lucide-react";
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
import { api } from "@/lib/trading-agents/client";
import { useRunArtifacts } from "@/lib/trading-agents/useRunArtifacts";
import { SAMPLE_RUN } from "@/lib/trading-agents/sample-run";
import type { RunConfig, RunRecord } from "@/lib/trading-agents/types";
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

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`;
}

function Workbench() {
  const t = useT();
  const health = useBridgeHealth();
  const engineOnline = !!health.data && !health.isError;

  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [showingSample, setShowingSample] = useState(true);
  const [defaultConfig, setDefaultConfig] = useState<RunConfig>({
    ...SAMPLE_RUN.config,
    analysisDate: "",
    analysts: ["Market Analyst"],
  });

  useEffect(() => {
    setDefaultConfig((c) => ({ ...c, analysisDate: new Date().toISOString().slice(0, 10) }));
  }, []);


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
      // Honour the engine's suggested polling interval when it provides one.
      return data?.pollAfterMs ?? 3000;
    },
  });

  // Elapsed time for the in-progress overlay
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (startedAt === null) return;
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);

  // Restore an in-flight or completed run when the user returns to the workbench
  // (for example after viewing the detail report and clicking Back to Dashboard).
  useEffect(() => {
    try {
      const savedRunId = sessionStorage.getItem("ta-active-run-id");
      const savedStartedAt = sessionStorage.getItem("ta-started-at");
      if (savedRunId) {
        setActiveRunId(savedRunId);
        setShowingSample(false);
        if (savedStartedAt) setStartedAt(Number(savedStartedAt));
      }
    } catch {
      // sessionStorage may be unavailable in some environments.
    }
  }, []);

  // Persist the active run so it survives route navigation within the same tab.
  useEffect(() => {
    try {
      if (activeRunId) {
        sessionStorage.setItem("ta-active-run-id", activeRunId);
      } else {
        sessionStorage.removeItem("ta-active-run-id");
      }
      if (startedAt !== null) {
        sessionStorage.setItem("ta-started-at", String(startedAt));
      } else {
        sessionStorage.removeItem("ta-started-at");
      }
    } catch {
      // ignore
    }
  }, [activeRunId, startedAt]);

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
      requestedTicker.current = config.ticker.trim().toUpperCase();
      setActiveRunId(null);
      setStartedAt(Date.now());
      setElapsed(0);
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

  const liveRun = runQuery.data as RunRecord | undefined;
  const run: RunRecord = showingSample || !liveRun ? SAMPLE_RUN : liveRun;
  const artifacts = useRunArtifacts(run, run.source === "engine");
  const chartReady = Boolean(artifacts.chartData || artifacts.chartPngUrl || run.partial?.chartsReady);
  const running = run.status === "running" || run.status === "queued";
  const analysisBusy =
    startRun.isPending || (!showingSample && !!activeRunId && (!liveRun || running));
  const latestStep = analysisBusy ? liveRun?.agents.at(-1)?.agent : undefined;
  const reportReady = Boolean(artifacts.resultHtmlUrl);
  const showExportBar = startRun.isPending || activeRunId !== null || reportReady;

  return (
    <AppShell>
      <div
        className={`mb-5 grid min-w-0 gap-4 xl:items-start sm:mb-6 ${
          showExportBar ? "xl:grid-cols-[minmax(0,1fr)_minmax(32rem,0.9fr)]" : ""
        }`}
      >
        <div className="min-w-0 pt-1">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{t("home.title")}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            {t("home.intro")}
          </p>
        </div>
        {showExportBar && (
          <ExportBar
            run={run}
            reportUrl={artifacts.resultHtmlUrl}
            ready={reportReady}
            loading={!reportReady}
          />
        )}
      </div>

      {!chartReady && (
        <div className="mb-6 min-w-0 rounded-xl border-2 border-primary/40 bg-primary/5 p-3 shadow-sm sm:p-4">
          <RunForm
            key={`top-${defaultConfig.analysisDate}`}
            defaultConfig={defaultConfig}
            running={running && !showingSample}
            disabled={startRun.isPending}
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
          {chartReady && (
            <div className="order-1 min-w-0">
              <RunForm
                key={defaultConfig.analysisDate}
                defaultConfig={defaultConfig}
                running={running && !showingSample}
                disabled={startRun.isPending}
                compact
                onRun={(c) => startRun.mutate(c)}
                onCancel={cancelRun}
              />
            </div>
          )}

          {analysisBusy && (
            <section className="panel order-2 px-4 py-4 sm:px-5" role="status" aria-live="polite">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full border border-primary/25 bg-primary/10">
                  <Loader2 className="size-4 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-base font-semibold sm:text-lg">{t("home.progressTitle")}</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {t("home.progressBody")}
                  </p>
                  {liveRun?.progress && (
                    <div className="mt-3">
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500 motion-reduce:transition-none"
                          style={{ width: `${Math.min(100, Math.max(0, liveRun.progress.percent))}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs break-words text-muted-foreground">
                        {liveRun.progress.message || liveRun.progress.stage}
                        {liveRun.progress.totalSteps > 0 &&
                          ` · ${t("home.step")} ${liveRun.progress.step} ${t("home.of")} ${liveRun.progress.totalSteps}`}
                      </p>
                    </div>
                  )}
                  {!liveRun?.progress && latestStep && (
                    <p className="mt-2 truncate text-xs text-muted-foreground" title={latestStep}>
                      {latestStep}
                    </p>
                  )}
                  <span className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-primary">
                    <span className="size-1.5 animate-pulse rounded-full bg-primary motion-reduce:animate-none" />
                    {t("home.workingOn")} {liveRun?.config.ticker ?? defaultConfig.ticker} · {formatElapsed(elapsed)}
                  </span>
                </div>
              </div>
            </section>
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

          <div className="order-6 min-w-0">
            <AgentBoard agents={run.agents} stats={run.stats} compact />
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
