import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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

const TITLE = "TradingAgents Workbench — Multi-Agent Financial Decision Support";
const DESCRIPTION =
  "Run the TradingAgents multi-agent LLM framework from a browser dashboard: live agent progress, consensus charts and an exportable executive decision memo.";

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

  const startRun = useMutation({
    mutationFn: (config: RunConfig) => api.startRun(config),
    onMutate: () => {
      setStartedAt(Date.now());
      setElapsed(0);
    },
    onSuccess: (data) => {
      setActiveRunId(data.run_id);
      setShowingSample(false);
      toast.success("Analysis started on your local engine");
    },
    onError: (e: Error) =>
      toast.error(/responded 4\d\d/.test(e.message) ? "The engine rejected the run settings" : "Could not reach the engine", {
        description: /responded 4\d\d/.test(e.message)
          ? e.message
          : `${e.message}. Check the connection on the Connect engine page.`,
      }),
  });

  const cancelRun = () => {
    if (!activeRunId) return;
    api
      .cancelRun(activeRunId)
      .then(() => toast.message("Stop requested"))
      .catch(() => toast.error("Could not stop the run"));
  };

  const liveRun = runQuery.data as RunRecord | undefined;
  const run: RunRecord = showingSample || !liveRun ? SAMPLE_RUN : liveRun;
  const artifacts = useRunArtifacts(run, run.source === "engine");
  const chartReady = Boolean(artifacts.chartHtmlUrl || run.partial?.chartsReady);
  const running = run.status === "running" || run.status === "queued";
  const analysisBusy =
    startRun.isPending || (!showingSample && !!activeRunId && (!liveRun || running));
  const latestStep = analysisBusy ? liveRun?.agents.at(-1)?.agent : undefined;

  return (
    <AppShell>
      <div className="mb-5 max-w-3xl sm:mb-7">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Multi-agent analysis, in one workspace</h1>
        <p className="mt-2 text-muted-foreground">
          A dashboard, visual analytics and reporting layer over the TradingAgents framework — so a
          non-technical colleague can run an analysis, see how the agents disagreed, and take a memo to a
          meeting.
        </p>
      </div>

      <div className="mb-6 space-y-6">
        <LiveSnapshot run={run} artifacts={artifacts} />
        {!chartReady && (
          <PriceChart
            data={artifacts.marketData?.prices.length ? artifacts.marketData.prices : run.prices}
            ticker={run.config.ticker}
          />
        )}
        {artifacts.resultHtmlUrl && (
          <section className="panel overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-rule bg-surface px-4 py-3 sm:px-5">
              <h3 className="text-base font-semibold">Detailed report</h3>
              <a
                href={artifacts.resultHtmlUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-auto text-xs text-primary hover:underline"
              >
                Open in a new tab
              </a>
            </div>
            <iframe
              src={artifacts.resultHtmlUrl}
              title={`${run.config.ticker} detailed analysis report`}
              className="h-[34rem] w-full bg-surface"
              loading="lazy"
            />
          </section>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
        <div className="min-w-0 space-y-6">
          <RunForm
            key={defaultConfig.analysisDate}
            defaultConfig={defaultConfig}
            running={running && !showingSample}
            disabled={startRun.isPending}
            onRun={(c) => startRun.mutate(c)}
            onCancel={cancelRun}
          />
          <AgentBoard agents={run.agents} stats={run.stats} />
        </div>

        <div className="relative min-w-0 space-y-6" aria-busy={analysisBusy}>
          {analysisBusy && (
            <section className="panel px-4 py-4 sm:px-5" role="status" aria-live="polite">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full border border-primary/25 bg-primary/10">
                  <Loader2 className="size-4 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-base font-semibold sm:text-lg">Analysis in progress</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Everything the engine has finished so far appears below and keeps updating. The portfolio
                    manager's decision arrives when the debate is complete.
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
                          ` · step ${liveRun.progress.step} of ${liveRun.progress.totalSteps}`}
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
                    Working on {liveRun?.config.ticker ?? defaultConfig.ticker} · {formatElapsed(elapsed)}
                  </span>
                </div>
              </div>
            </section>
          )}

          {showingSample && run.source === "sample" && (
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm sm:flex sm:flex-wrap sm:items-center">
              <FlaskConical className="size-4 shrink-0 text-accent-foreground" />
              <p className="mr-auto">
                Showing a saved sample run ({SAMPLE_RUN.config.ticker}, {SAMPLE_RUN.config.analysisDate}) so
                the workbench is demonstrable offline.
                {!engineOnline && " Your engine is not reachable right now."}
              </p>
              {activeRunId && (
                <Button size="sm" variant="outline" className="col-span-2 min-h-10 w-full sm:min-h-8 sm:w-auto" onClick={() => setShowingSample(false)}>
                  Back to live run
                </Button>
              )}
            </div>
          )}

          {run.status === "error" && (
            <div className="flex items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
              <Info className="size-4 shrink-0 text-destructive" />
              <p>{run.error ?? "The engine reported an error during this run."}</p>
            </div>
          )}

          {run.decision ? (
            <DecisionPanel decision={run.decision} ticker={run.config.ticker} />
          ) : (
            <section className="panel flex flex-col items-center justify-center px-5 py-8 text-center" role="status">
              <Loader2 className="mb-3 size-6 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
              <h2 className="font-display text-lg font-semibold">Recommendation pending</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Analyst teams are reviewing the evidence. The portfolio manager's decision will appear when
                their debate is complete.
              </p>
            </section>
          )}

          <div className="grid gap-6 xl:grid-cols-2">
            {run.decision ? (
              <ConfidenceChart decision={run.decision} stances={run.stances} />
            ) : (
              <section className="panel p-5">
                <h3 className="text-base font-semibold">Recommendation confidence</h3>
                <p className="mt-2 text-sm text-muted-foreground">Available once the run completes.</p>
              </section>
            )}
          </div>

          <StanceChart data={run.stances} />
          <ExportBar run={run} />
          <ReportsSection run={run} />
        </div>
      </div>
    </AppShell>
  );
}
