import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/workbench/AppShell";
import { Button } from "@/components/ui/button";
import { getBridgeUrl, runConfigPayload } from "@/lib/trading-agents/client";
import { SAMPLE_RUN } from "@/lib/trading-agents/sample-run";

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
  const [chartKind, setChartKind] = useState("plotly");
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    setDate(new Date().toISOString().slice(0, 10));
  }, []);

  // Poll the local Python engine while a run is in flight.
  useEffect(() => {
    if (!runId) return undefined;
    const base = getBridgeUrl().replace(/\/$/, "");
    const tick = async () => {
      try {
        const res = await fetch(`${base}/runs/${runId}`);
        if (!res.ok) throw new Error(`Engine responded ${res.status}`);
        const data = await res.json();
        setRun(data);
        if (data.status === "completed" || data.status === "error") {
          clearInterval(timer.current);
        }
      } catch (e) {
        setError(e.message);
      }
    };
    tick();
    timer.current = setInterval(tick, 2500);
    return () => clearInterval(timer.current);
  }, [runId]);

  const start = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const base = getBridgeUrl().replace(/\/$/, "");
      const res = await fetch(`${base}/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          runConfigPayload({
            ticker,
            analysisDate: date,
            provider: "DeepSeek",
            quickModel: "",
            deepModel: "",
            researchDepth: depth,
            analysts: ["Market Analyst"],
          language: "English",
          })
        ),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Engine responded ${res.status}${text ? `: ${text.slice(0, 300)}` : ""}`);
      }
      const data = await res.json();
      setRunId(data.run_id);
      setRun(null);
    } catch (err) {
      setError(`${err.message}. Start the Python bridge, then check the Connect engine page.`);
    } finally {
      setBusy(false);
    }
  };

  const base = getBridgeUrl().replace(/\/$/, "");
  const decision = run?.decision ?? null;
  const sample = SAMPLE_RUN.decision;

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

        {run && (
          <p className="text-sm text-muted-foreground">
            Run <span className="font-mono">{run.id}</span> — status {run.status}
            {run.error ? ` — ${run.error}` : ""}
          </p>
        )}

        <section className="panel p-4 sm:p-5">
          <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold">Price trend and moving averages (Python)</h2>
            <div className="grid grid-cols-2 gap-1 text-xs">
              {["plotly", "png"].map((k) => (
                <Button
                  key={k}
                  type="button"
                  onClick={() => setChartKind(k)}
                  variant={chartKind === k ? "secondary" : "ghost"}
                  size="sm"
                  className="min-h-10 min-w-0 whitespace-normal px-2 leading-tight sm:min-h-8"
                >
                  {k === "plotly" ? "Interactive (Plotly)" : "Static (Matplotlib)"}
                </Button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            {runId && run?.charts?.plotly ? (
              chartKind === "plotly" ? (
                <iframe
                  title="Plotly price chart"
                  src={`${base}/runs/${runId}/chart.html`}
                  className="h-[300px] w-full rounded-md border border-rule bg-surface sm:h-[420px]"
                />
              ) : (
                <img
                  src={`${base}/runs/${runId}/chart.png`}
                  alt={`${run.config.ticker} price trend with 10-EMA, 20-SMA and 50-SMA, drawn with Matplotlib`}
                  className="w-full rounded-md border border-rule"
                />
              )
            ) : (
              <p className="rounded-md border border-dashed border-rule px-4 py-10 text-center text-sm text-muted-foreground">
                The chart is rendered by the Python engine and appears here once a run starts.
              </p>
            )}
          </div>
        </section>

        <section className="panel p-4 sm:p-5">
          <h2 className="text-base font-semibold">Recommendation</h2>
          {decision ? (
            <div className="mt-3 space-y-2 text-sm">
              <p className="font-display text-2xl font-semibold">{decision.action}</p>
              <p className="text-muted-foreground">
                Confidence {decision.confidence}% · Consensus {decision.consensus}
              </p>
              <p>{decision.executiveSummary}</p>
            </div>
          ) : (
            <div className="mt-3 space-y-2 text-sm">
              <p className="text-muted-foreground">
                No live decision yet. Saved sample ({SAMPLE_RUN.config.ticker},{" "}
                {SAMPLE_RUN.config.analysisDate}):
              </p>
              <p className="font-display text-2xl font-semibold">{sample?.action}</p>
              <p>{sample?.executiveSummary}</p>
            </div>
          )}
        </section>

        <p className="text-xs text-muted-foreground">
          Research prototype. Not financial advice and not an autonomous trading system.
        </p>
      </div>
    </AppShell>
  );
}
