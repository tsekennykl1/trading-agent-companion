import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { FlaskConical, Info } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/workbench/AppShell";
import { RunForm } from "@/components/workbench/RunForm";
import { AgentBoard } from "@/components/workbench/AgentBoard";
import { DecisionPanel } from "@/components/workbench/DecisionPanel";
import { ConfidenceChart, PriceChart, StanceChart } from "@/components/workbench/RunCharts";
import { ReportsSection } from "@/components/workbench/ReportsSection";
import { ExportBar } from "@/components/workbench/ExportBar";
import { useBridgeHealth } from "@/components/workbench/BridgeStatusBadge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/trading-agents/client";
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
    queryFn: () => api.getRun(activeRunId!),
    enabled: !!activeRunId,
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === "completed" || s === "error" ? false : 2000;
    },
  });

  const startRun = useMutation({
    mutationFn: (config: RunConfig) => api.startRun(config),
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
  const running = run.status === "running" || run.status === "queued";

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

        <div className="min-w-0 space-y-6">
          {run.source === "sample" && (
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
            <section className="panel px-5 py-10 text-center">
              <h2 className="font-display text-xl font-semibold">Analysis in progress</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                The portfolio manager's decision appears here once the analyst, research and risk teams have
                finished debating.
              </p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowingSample(true)}>
                View sample run meanwhile
              </Button>
            </section>
          )}

          <div className="grid gap-6 xl:grid-cols-2">
            <PriceChart data={run.prices} ticker={run.config.ticker} />
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
