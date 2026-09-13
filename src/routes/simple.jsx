import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/workbench/AppShell";
import { ConfidenceChart } from "@/components/workbench/RunCharts";
import { DecisionPanel } from "@/components/workbench/DecisionPanel";
import { LiveSnapshot } from "@/components/workbench/LiveSnapshot";
import { ReportsSection } from "@/components/workbench/ReportsSection";
import { Button } from "@/components/ui/button";
import { api, bridgeAssetUrl } from "@/lib/trading-agents/client";
import { useRunArtifacts } from "@/lib/trading-agents/useRunArtifacts";

const TITLE = "Simple Dashboard — TradingAgents Workbench";
const DESCRIPTION =
  "A minimal React dashboard for the TradingAgents engine: set a ticker and date, run the agents, and view the price-trend and moving-average charts generated in Python with Plotly and Matplotlib.";

export const Route = createFileRoute("/simple")({
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
  component: SimpleDashboard,
});

/** Plain-JSX, dependency-light dashboard. All charting happens in Python. */
function SimpleDashboard() {
  const [ticker, setTicker] = useState("0700.HK");
  const [date, setDate] = useState("");
  const [depth, setDepth] = useState("Shallow");
  const [runId, setRunId] = useState(null);
  const [run, setRun] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDate(new Date().toISOString().slice(0, 10));
  }, []);

  // Poll the local Python engine while a run is in flight.
  useEffect(() => {
    if (!runId) return undefined;
    let active = true;
    let timer;
    const tick = async () => {
      try {
        const data = await api.getRun(runId);
        if (!active) return;
        setRun(data);
        if (data.status !== "completed" && data.status !== "error") {
          timer = window.setTimeout(tick, data.pollAfterMs ?? 3000);
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Could not refresh this run");
      }
    };
    void tick();
    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [runId]);

  const start = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await api.startRun({
        ticker,
        analysisDate: date,
        provider: "DeepSeek",
        quickModel: "",
        deepModel: "",
        researchDepth: depth,
        analysts: ["Market Analyst"],
          language: "English",
      });
      setRunId(data.run_id);
      setRun(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not start the analysis";
      const hint = /responded 4\d\d/.test(message)
        ? "The engine rejected the run settings — see the message above for the field it expects."
        : "Start the Python bridge, then check the Connect engine page.";
      setError(`${message}. ${hint}`);
    } finally {
      setBusy(false);
    }
  };

  const decision = run?.decision ?? null;
  const running = run?.status === "running" || run?.status === "queued";
  const probedArtifacts = useRunArtifacts(run ?? undefined, Boolean(run));
  const legacyCharts = run?.charts;
  const artifacts = {
    ...probedArtifacts,
    chartHtmlUrl:
      probedArtifacts.chartHtmlUrl ||
      (legacyCharts?.plotly ? bridgeAssetUrl(legacyCharts.plotly) : undefined),
    chartPngUrl:
      probedArtifacts.chartPngUrl ||
      (legacyCharts?.png ? bridgeAssetUrl(legacyCharts.png) : undefined),
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Simple dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            A stripped-back view: one form, one decision, and the price-trend and moving-average charts
            drawn in Python (Plotly and Matplotlib) by the engine itself.
          </p>
        </header>

        <form onSubmit={start} className="panel grid gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-[auto_auto_1fr_auto] lg:items-end">
          <label className="flex min-w-0 flex-col gap-1 text-sm">
            <span className="label-caps">Ticker</span>
            <input
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              className="h-11 w-full min-w-0 rounded-md border border-rule bg-background px-3 font-mono text-sm sm:h-9"
              required
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-sm">
            <span className="label-caps">Analysis date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11 min-w-0 rounded-md border border-rule bg-background px-3 text-sm sm:h-9"
              required
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-sm">
            <span className="label-caps">Depth</span>
            <select
              value={depth}
              onChange={(e) => setDepth(e.target.value)}
              className="h-11 min-w-0 rounded-md border border-rule bg-background px-3 text-sm sm:h-9"
            >
              <option>Shallow</option>
              <option>Medium</option>
              <option>Deep</option>
            </select>
          </label>
          <Button
            type="submit"
            disabled={busy}
            className="min-h-11 w-full sm:col-span-2 sm:min-h-9 lg:col-span-1 lg:w-auto"
          >
            {busy ? "Starting…" : "Run analysis"}
          </Button>
        </form>

        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">{error}</p>
        )}

        {run ? (
          <div className="space-y-6">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-sm text-muted-foreground">
              <p className="min-w-0 truncate">
                Run <span className="font-mono">{run.id}</span> · {run.status}
              </p>
              {running && <Loader2 className="size-4 shrink-0 animate-spin text-primary motion-reduce:animate-none" aria-label="Analysis in progress" />}
            </div>

            <LiveSnapshot run={run} artifacts={artifacts} />

            {decision ? (
              <>
                <DecisionPanel decision={decision} ticker={run.config.ticker} />
                <ConfidenceChart decision={decision} stances={run.stances} />
              </>
            ) : (
              <section className="panel flex items-center gap-3 px-4 py-5" role="status">
                <Loader2 className="size-5 shrink-0 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
                <div className="min-w-0">
                  <h2 className="text-base font-semibold">Recommendation pending</h2>
                  <p className="mt-1 text-sm text-muted-foreground">The report summary and confidence score will appear when the decision is ready.</p>
                </div>
              </section>
            )}

            <ReportsSection run={run} />
          </div>
        ) : (
          <section className="panel px-4 py-10 text-center text-sm text-muted-foreground">
            Run an analysis to display the chart, recommendation summary, confidence score, and available reports.
          </section>
        )}

        <p className="text-xs text-muted-foreground">
          Research prototype. Not financial advice and not an autonomous trading system.
        </p>
      </div>
    </AppShell>
  );
}
