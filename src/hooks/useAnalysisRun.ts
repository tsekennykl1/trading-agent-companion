/**
 * Everything about "which analysis are we showing, and is it finished yet".
 *
 * The dashboard page (src/routes/index.tsx) only lays things out; this hook
 * owns the moving parts:
 *   - starting a run (POST /runs) and remembering the form used
 *   - polling the engine for progress and for the finished run
 *   - restoring the last analysis from the browser cache after a refresh
 *   - falling back to the built-in sample run before you start your own
 */
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api, bridgeAssetUrl, EngineHttpError } from "@/lib/trading-agents/client";
import { finalReportReady, reportsReadyFor } from "@/lib/trading-agents/report-readiness";
import { useRunArtifacts, type RunArtifacts } from "@/lib/trading-agents/useRunArtifacts";
import { clearCachedAnalysis, loadCachedAnalysis, saveCachedAnalysis } from "@/lib/trading-agents/run-cache";
import { SAMPLE_CHART_DATA, SAMPLE_RUN } from "@/lib/trading-agents/sample-run";
import type { RunConfig, RunRecord } from "@/lib/trading-agents/types";
import { useT } from "@/lib/i18n";

export function useAnalysisRun(rememberConfig: (config: RunConfig) => void) {
  const t = useT();

  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [showingSample, setShowingSample] = useState(true);
  const [cleared, setCleared] = useState(false);
  const [cachedRun, setCachedRun] = useState<RunRecord | null>(null);
  const [cachedArtifacts, setCachedArtifacts] = useState<RunArtifacts | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  // Increments every time a run fails to start, so the page can reopen the form.
  const [startFailures, setStartFailures] = useState(0);

  // --- polling ------------------------------------------------------------
  // Cheap readiness poll (GET /runs/{id}/status). Engines that do not serve it
  // fall back to polling the full run below.
  const statusSupported = useRef(true);
  const statusQuery = useQuery({
    queryKey: ["run-status", activeRunId],
    queryFn: async () => {
      if (!activeRunId) throw new Error("No active run selected");
      const result = await api.runStatus(activeRunId);
      if (!result) statusSupported.current = false;
      return result;
    },
    enabled: !!activeRunId && statusSupported.current,
    refetchInterval: (q) => {
      const data = q.state.data;
      if (!data) return false;
      const done =
        data.status === "error" ||
        finalReportReady({ status: data.status, reportsReady: data.reportsReady, resultUrl: data.resultUrl });
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
      if (data?.status === "completed" || data?.status === "error") return false;
      // With the cheap status poll available the heavy run payload is only
      // refetched when that status changes — no timed polling at all.
      if (status) return false;
      return data?.pollAfterMs ?? 3000;
    },
    staleTime: 2000,
  });

  // Refresh the full run whenever the cheap status poll reports a change.
  const statusSignature = status
    ? (status.version !== undefined
        ? String(status.version)
        : `${status.status}|${status.decisionReady}|${status.reportsReady.length}|${status.resultUrl ?? ""}`)
    : "";
  useEffect(() => {
    if (!statusSignature || !activeRunId) return;
    void runQuery.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusSignature, activeRunId]);

  // The engine forgot this run (404/410): drop it and show the sample again.
  useEffect(() => {
    const error = statusQuery.error ?? runQuery.error;
    if (!(error instanceof EngineHttpError) || (error.status !== 404 && error.status !== 410)) return;
    clearCachedAnalysis();
    setCachedRun(null);
    setCachedArtifacts(null);
    setActiveRunId(null);
    setShowingSample(true);
  }, [statusQuery.error, runQuery.error]);

  // --- elapsed timer and cache restore ------------------------------------
  useEffect(() => {
    if (startedAt === null) return;
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);

  useEffect(() => {
    const cached = loadCachedAnalysis();
    if (!cached) return;
    setCachedRun(cached.run);
    setCachedArtifacts(cached.artifacts);
    setActiveRunId(cached.run.id);
    setShowingSample(false);
    setCleared(false);
    setStartedAt(cached.startedAt ?? Date.parse(cached.run.startedAt));
  }, []);

  // --- starting a run -----------------------------------------------------
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
      clearCachedAnalysis();
      rememberConfig(config);
      requestedTicker.current = config.ticker.trim().toUpperCase();
      setActiveRunId(null);
      setCachedRun(null);
      setCachedArtifacts(null);
      setShowingSample(false);
      setCleared(true);
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
    onError: (e: Error) => {
      const rejected = /responded 4\d\d/.test(e.message);
      toast.error(rejected ? t("toast.rejected") : t("toast.unreachable"), {
        description: rejected ? e.message : `${e.message}. ${t("toast.checkSetup")}`,
      });
      // The run never started: put the dashboard back into a useful state
      // (sample content visible, form can be reopened) instead of a blank page.
      setStartedAt(null);
      setElapsed(0);
      setCleared(false);
      setShowingSample(true);
      setStartFailures((n) => n + 1);
    },
  });

  // Some engine builds keep POST /runs open until the analysis finishes, so no
  // run id arrives up front. While the start request is still open, look the
  // run up from the run list instead.
  useEffect(() => {
    if (!startRun.isPending || activeRunId || !runListSupported.current) return;
    let alive = true;
    let timer: number | undefined;
    const discover = async () => {
      try {
        const runs = await api.listRuns();
        const want = requestedTicker.current;
        const fresh = runs.filter((r) => !knownRunIds.current.has(r.id));
        const match = fresh.find((r) => !want || r.config.ticker.trim().toUpperCase() === want);
        if (alive && match?.id) {
          setActiveRunId(match.id);
          setShowingSample(false);
          return;
        }
      } catch {
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

  // --- what to display ----------------------------------------------------
  // The freshly fetched run, else the one restored from the browser cache,
  // else the built-in sample.
  const liveRun: RunRecord | undefined =
    (runQuery.data as RunRecord | undefined) ?? (cachedRun?.id === activeRunId ? cachedRun : undefined);
  useEffect(() => {
    if (liveRun) setCleared(false);
  }, [liveRun]);
  const run: RunRecord = showingSample || !liveRun ? SAMPLE_RUN : liveRun;
  const fetchedArtifacts = useRunArtifacts(run, run.source === "engine", cachedRun?.id === run.id ? cachedArtifacts : null);
  const artifacts: RunArtifacts = showingSample
    ? { marketData: null, chartData: SAMPLE_CHART_DATA, reports: SAMPLE_RUN.reports }
    : fetchedArtifacts;

  useEffect(() => {
    if (run.source !== "engine") return;
    setCachedRun(run);
    saveCachedAnalysis(run, artifacts, startedAt);
  }, [run, artifacts, startedAt]);

  const running = run.status === "running" || run.status === "queued";
  const analysisBusy = startRun.isPending || (!showingSample && !!activeRunId && (!liveRun || running));

  // Strict readiness per the engine contract: the run must be completed AND the
  // engine must list finished detail reports. A partial page is not enough.
  const engineStatus = status?.status ?? liveRun?.status;
  const publishedReportUrl = status?.resultUrl ?? artifacts.resultHtmlUrl;
  const reportReady = finalReportReady({
    status: engineStatus,
    reportsReady: reportsReadyFor(liveRun, status),
    resultUrl: publishedReportUrl,
  });
  const detailReportUrl =
    publishedReportUrl ??
    (reportReady && liveRun?.source === "engine" ? bridgeAssetUrl(`/runs/${liveRun.id}/result.html`) : undefined);

  return {
    run,
    liveRun,
    artifacts,
    activeRunId,
    showingSample,
    cleared,
    clear: () => {
      clearCachedAnalysis();
      setActiveRunId(null);
      setCachedRun(null);
      setCachedArtifacts(null);
      setStartedAt(null);
      setElapsed(0);
      setShowingSample(false);
      setCleared(true);
    },
    showSample: () => {
      setShowingSample(true);
      setCleared(false);
      setElapsed(0);
    },
    dismissSample: () => setShowingSample(false),
    startedAt,
    elapsed,
    running,
    analysisBusy,
    allDone: !analysisBusy && (engineStatus === "completed" || run.status === "completed"),
    chartReady: Boolean(artifacts.chartData || artifacts.chartPngUrl || run.partial?.chartsReady),
    reportReady,
    detailReportUrl,
    latestStep: analysisBusy ? liveRun?.agents.at(-1)?.agent : undefined,
    starting: startRun.isPending,
    start: (config: RunConfig) => startRun.mutate(config),
    cancelRun,
  };
}
