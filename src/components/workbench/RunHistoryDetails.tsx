import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ExternalLink, Loader2 } from "lucide-react";
import { api, bridgeAssetUrl } from "@/lib/trading-agents/client";
import { canUseBrowserUrl } from "@/lib/trading-agents/url";
import { REPORT_SECTIONS, type RunRecord } from "@/lib/trading-agents/types";
import { useT } from "@/lib/i18n";

function reportLabel(key: string): string {
  const known = REPORT_SECTIONS.find((s) => s.key === key);
  if (known) return known.label;
  return key.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** On-demand detail for one history row: chart, decision and report previews. */
export function RunHistoryDetails({ run }: { run: RunRecord }) {
  const t = useT();
  const detailQuery = useQuery({
    queryKey: ["run", run.id],
    queryFn: () => api.getRun(run.id),
    retry: false,
  });
  const reportsQuery = useQuery({
    queryKey: ["run-reports", run.id],
    queryFn: () => api.reportsIndex(run.id),
    retry: false,
  });

  const detail = detailQuery.data ?? run;
  const decision = detail.decision;
  const chartUrl = detail.partial?.chartPngUrl ?? bridgeAssetUrl(`/runs/${run.id}/price-chart.png`);
  const reports = reportsQuery.data?.contents ?? {};
  const reportNames = reportsQuery.data?.names ?? Object.keys(detail.reports ?? {});

  if (detailQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-4 text-sm text-muted-foreground" role="status">
        <Loader2 className="size-4 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
        {t("report.loading")}
      </div>
    );
  }

  return (
    <div className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-3">
        {canUseBrowserUrl(chartUrl) && (
          <img
            src={chartUrl}
            alt={`${detail.config.ticker} price chart`}
            loading="lazy"
            className="w-full rounded-md border border-rule bg-card"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
          <dt className="text-muted-foreground">{t("history.colDecision")}</dt>
          <dd className="font-medium">
            {decision ? `${decision.action}${decision.confidence ? ` · ${decision.confidence}%` : ""}` : "—"}
          </dd>
          <dt className="text-muted-foreground">{t("form.analysts")}</dt>
          <dd className="break-words">{detail.config.analysts.join(", ") || "—"}</dd>
          <dt className="text-muted-foreground">{t("form.depth")}</dt>
          <dd>{detail.config.researchDepth}</dd>
        </dl>
        {decision?.executiveSummary && (
          <div className="rounded-md border border-rule bg-muted/30 p-3 text-xs">
            <p className="mb-1 font-semibold">{t("decision.summary")}</p>
            <p className="break-words whitespace-pre-line text-muted-foreground">
              {decision.executiveSummary.slice(0, 600)}
            </p>
          </div>
        )}
      </div>

      <div className="min-w-0 space-y-2">
        <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
          {t("history.colReports")}
        </p>
        {reportsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">{t("report.loading")}</p>
        ) : reportNames.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("history.reportsPending")}</p>
        ) : (
          <ul className="space-y-2">
            {reportNames.map((name) => (
              <li key={name} className="rounded-md border border-rule p-3">
                <p className="text-sm font-medium">{reportLabel(name)}</p>
                {reports[name] && (
                  <p className="mt-1 line-clamp-3 text-xs break-words text-muted-foreground">
                    {reports[name].replace(/[#*`>|-]/g, " ").slice(0, 320)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
        {canUseBrowserUrl(detail.partial?.resultHtmlUrl ?? bridgeAssetUrl(`/runs/${run.id}/result.html`)) && (
          <Link
            to="/report"
            search={{
              url: detail.partial?.resultHtmlUrl ?? bridgeAssetUrl(`/runs/${run.id}/result.html`),
              ticker: detail.config.ticker,
            }}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {t("history.open")} <ExternalLink className="size-3" aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>
  );
}
