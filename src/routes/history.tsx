import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink, Loader2, RefreshCw, XCircle } from "lucide-react";
import { AppShell } from "@/components/workbench/AppShell";
import { Button } from "@/components/ui/button";
import { api, bridgeAssetUrl } from "@/lib/trading-agents/client";
import { finalReportReady } from "@/lib/trading-agents/report-readiness";
import { canUseBrowserUrl } from "@/lib/trading-agents/url";
import { useT } from "@/lib/i18n";
import type { RunRecord } from "@/lib/trading-agents/types";

const TITLE = "Run History — My Trading Agents";
const DESCRIPTION =
  "Past multi-agent analyses with run status, final decision and detailed-report readiness.";

export const Route = createFileRoute("/history")({
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
  component: HistoryPage,
});

function statusTone(status: RunRecord["status"]): string {
  if (status === "completed") return "text-emerald-600";
  if (status === "error") return "text-destructive";
  return "text-primary";
}

function formatTime(value: string | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  // Always English AM/PM, never locale-dependent 上午/下午.
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(parsed);
}

function HistoryPage() {
  const t = useT();
  const [openRunId, setOpenRunId] = useState<string | null>(null);
  const runsQuery = useQuery({
    queryKey: ["run-history"],
    queryFn: () => api.listRuns(),
    refetchInterval: 15000,
    retry: false,
  });

  const runs = runsQuery.data ?? [];

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-start gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{t("history.title")}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{t("history.intro")}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto min-h-9"
          onClick={() => void runsQuery.refetch()}
          disabled={runsQuery.isFetching}
        >
          <RefreshCw className={`size-4 ${runsQuery.isFetching ? "animate-spin motion-reduce:animate-none" : ""}`} />
          {t("history.refresh")}
        </Button>
      </div>

      {runsQuery.isLoading ? (
        <section className="panel flex items-center gap-2 px-5 py-8 text-sm text-muted-foreground" role="status">
          <Loader2 className="size-4 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
          {t("report.loading")}
        </section>
      ) : runsQuery.isError ? (
        <p className="panel px-5 py-6 text-sm text-muted-foreground">{t("history.unavailable")}</p>
      ) : runs.length === 0 ? (
        <p className="panel px-5 py-6 text-sm text-muted-foreground">{t("history.empty")}</p>
      ) : (
        <section className="panel min-w-0 overflow-x-auto p-0">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-rule text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                <th className="px-4 py-2.5 font-medium">{t("history.colTicker")}</th>
                <th className="px-4 py-2.5 font-medium">{t("history.colDate")}</th>
                <th className="px-4 py-2.5 font-medium">{t("history.colStarted")}</th>
                <th className="px-4 py-2.5 font-medium">{t("history.colStatus")}</th>
                <th className="px-4 py-2.5 font-medium">{t("history.colDecision")}</th>
                <th className="px-4 py-2.5 font-medium">{t("history.colReports")}</th>
                <th className="px-4 py-2.5 font-medium">{t("history.colDetails")}</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run, index) => {
                const readyCount = run.partial?.reportsReady?.length ?? Object.keys(run.reports ?? {}).length;
                const publishedResultUrl = run.partial?.resultHtmlUrl;
                const ready = finalReportReady({
                  status: run.status,
                  reportsReady: run.partial?.reportsReady ?? Object.keys(run.reports ?? {}),
                  resultUrl: publishedResultUrl,
                });
                const resultUrl = publishedResultUrl ?? (
                  ready && run.source === "engine" ? bridgeAssetUrl(`/runs/${run.id}/result.html`) : undefined
                );
                const open = openRunId === run.id;
                return (
                  <Fragment key={run.id || `run-${index}`}>
                  <tr className="border-b border-rule/60 align-top">
                    <td className="px-4 py-2.5 font-medium">{run.config.ticker}</td>
                    <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{run.config.analysisDate || "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{formatTime(run.startedAt)}</td>
                    <td className={`px-4 py-2.5 font-medium capitalize ${statusTone(run.status)}`}>{run.status}</td>
                    <td className="px-4 py-2.5">
                      {run.decision ? (
                        <span className="font-medium">
                          {run.decision.action}
                          {typeof run.decision.confidence === "number" ? ` · ${run.decision.confidence}%` : ""}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex flex-wrap items-center gap-2">
                        {ready ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 className="size-3.5" aria-hidden="true" />
                            {t("history.reportsReady")}
                            {readyCount > 0 ? ` (${readyCount})` : ""}
                          </span>
                        ) : run.status === "error" ? (
                          <span className="inline-flex items-center gap-1 text-destructive">
                            <XCircle className="size-3.5" aria-hidden="true" />—
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <Loader2
                              className="size-3.5 animate-spin text-primary motion-reduce:animate-none"
                              aria-hidden="true"
                            />
                            {t("history.reportsPending")}
                          </span>
                        )}
                        {ready && canUseBrowserUrl(resultUrl) && (
                          <Link
                            to="/report"
                            search={{ url: resultUrl!, ticker: run.config.ticker }}
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            {t("history.open")} <ExternalLink className="size-3" aria-hidden="true" />
                          </Link>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs"
                        onClick={() => setOpenRunId(open ? null : run.id)}
                        aria-expanded={open}
                      >
                        <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
                        {open ? t("history.hideDetails") : t("history.showDetails")}
                      </Button>
                    </td>
                  </tr>
                  {open && (
                    <tr className="border-b border-rule/60 bg-muted/20">
                      <td colSpan={7} className="p-0">
                        <RunHistoryDetails run={run} />
                      </td>
                    </tr>
                  )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </AppShell>
  );
}
