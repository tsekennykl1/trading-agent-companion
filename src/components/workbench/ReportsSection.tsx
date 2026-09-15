import { useState } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markdownToHtml } from "@/lib/trading-agents/report";
import { useT, type TKey } from "@/lib/i18n";
import { REPORT_SECTIONS, type RunRecord } from "@/lib/trading-agents/types";

const REPORT_LABEL_KEYS: Record<string, TKey> = {
  market_report: "analyst.Market Analyst",
  sentiment_report: "analyst.Sentiment Analyst",
  news_report: "analyst.News Analyst",
  fundamentals_report: "analyst.Fundamentals Analyst",
  bull_report: "role.Bull Researcher",
  bear_report: "role.Bear Researcher",
  investment_plan: "role.Research Manager",
  trader_plan: "role.Trader",
  risk_aggressive: "role.Aggressive Analyst",
  risk_conservative: "role.Conservative Analyst",
  risk_neutral: "role.Neutral Analyst",
  final_decision: "role.Portfolio Manager",
  company_of_interest: "role.Company Of Interest",
  asset_type: "role.Asset Type",
  instrument_context: "role.Instrument Context",
  trade_date: "role.Trade Date",
  sender: "role.Sender",
  trader_investment_plan: "role.Trader Investment Plan",
  final_trade_decision: "role.Final Trade Decision",
  engine_log: "role.Engine Log",
};

const TEAM_KEYS: Record<string, TKey> = {
  "Analyst Team": "team.Analyst Team",
  "Research Team": "team.Research Team",
  "Trading Team": "team.Trading Team",
  "Risk Team": "team.Risk Team",
  "Portfolio Management": "team.Portfolio Management",
  Engine: "team.Engine",
};

const COMPANY_CONTEXT_KEYS = [
  "company_of_interest",
  "asset_type",
  "instrument_context",
  "trade_date",
  "sender",
] as const;

function translatedValue(value: string, keys: Record<string, TKey>, t: (key: TKey) => string) {
  const key = keys[value];
  return key ? t(key) : value;
}

export function ReportsSection({
  run,
  extraReports,
}: {
  run: RunRecord;
  /** Reports fetched individually from the split report endpoints. */
  extraReports?: Record<string, string>;
}) {
  const t = useT();
  const reports: Record<string, string> = { ...(extraReports ?? {}), ...run.reports };
  for (const [key, value] of Object.entries(extraReports ?? {})) {
    if (!reports[key]?.trim() && value?.trim()) reports[key] = value;
  }
  const companyContext = COMPANY_CONTEXT_KEYS.map((key) => ({
    key,
    value: reports[key]?.trim() ?? "",
  })).filter((field) => Boolean(field.value));
  const companyContextContent = companyContext
    .map(({ key, value }) => `### ${translatedValue(key, REPORT_LABEL_KEYS, t)}\n\n${value}`)
    .join("\n\n");
  const available = REPORT_SECTIONS.filter((s) => reports[s.key]?.trim());
  // The engine log duplicates the Agent progress panel — never list it here.
  const isEngineLog = (key: string) => key.toLowerCase().replace(/[-\s]/g, "_") === "engine_log";
  const extra = Object.keys(reports).filter(
    (k) => reports[k]?.trim()
      && !isEngineLog(k)
      && !COMPANY_CONTEXT_KEYS.includes(k as (typeof COMPANY_CONTEXT_KEYS)[number])
      && !REPORT_SECTIONS.some((s) => s.key === k),
  );
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    company_of_interest: true,
    final_decision: true,
    final_trade_decision: true,
  });

  const running = run.status === "running" || run.status === "queued";
  const sectionRows = REPORT_SECTIONS.map((section) => ({
    ...section,
    content: reports[section.key]?.trim() ?? "",
  }));
  if (companyContext.length > 0) {
    sectionRows.unshift({
      key: "company_of_interest",
      label: "Company of Interest",
      team: "Engine",
      content: companyContextContent,
    });
  }
  sectionRows.push(
    ...extra.map((key) => ({
      key,
      label: key.replace(/[_-]/g, " ").replace(/\b\w/g, (character) => character.toUpperCase()),
      team: "Engine",
      content: reports[key]?.trim() ?? "",
    })),
  );
  const readyKeys = sectionRows.filter((section) => Boolean(section.content)).map((section) => section.key);
  const allReadyOpen = readyKeys.length > 0 && readyKeys.every((key) => openSections[key]);

  const toggleAll = () => {
    setOpenSections(
      allReadyOpen
        ? {}
        : Object.fromEntries(readyKeys.map((key) => [key, true])),
    );
  };

  return (
    <section className="panel overflow-hidden">
      <header className="flex items-center gap-3 border-b border-rule bg-secondary px-4 py-3 sm:px-5">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold">{t("reports.title")}</h2>
          <p className="mt-0.5 text-xs text-secondary-foreground/75">
            {available.length + (companyContext.length > 0 ? 1 : 0) > 0
              ? `${available.length + (companyContext.length > 0 ? 1 : 0)} · ${t("reports.available")}`
              : running
                ? t("reports.writing")
                : t("reports.produced")}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={readyKeys.length === 0}
          aria-expanded={allReadyOpen}
          onClick={toggleAll}
        >
          {allReadyOpen ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
          {allReadyOpen ? t("reports.hideAll") : t("reports.showAll")}
        </Button>
      </header>

      <div className="divide-y divide-rule">
        {sectionRows.map((section) => {
          const ready = Boolean(section.content);
          const open = Boolean(openSections[section.key]);
          return (
            <section key={section.key}>
              <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold">
                    {translatedValue(section.key, REPORT_LABEL_KEYS, t) === section.key
                      ? section.label
                      : translatedValue(section.key, REPORT_LABEL_KEYS, t)}
                  </h3>
                  <p
                    className={`mt-0.5 flex items-center gap-2 text-xs font-medium ${
                      ready ? "text-bull" : running ? "text-primary" : "text-bear"
                    }`}
                  >
                    {!ready && running && (
                      <Loader2 className="size-3 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
                    )}
                    {`${ready ? t("reports.available") : running ? t("reports.inProgress") : t("reports.notAvailable")} · ${translatedValue(section.team, TEAM_KEYS, t)}`}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={!ready}
                  aria-expanded={open}
                  onClick={() => setOpenSections((current) => ({ ...current, [section.key]: !open }))}
                >
                  {open ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
                  {open ? t("reports.hide") : t("reports.show")}
                </Button>
              </div>
              {ready && open && (
                <article
                  className="prose-report report-columns max-h-[36rem] min-w-0 overflow-x-auto overflow-y-auto border-t border-rule px-4 py-5 text-sm break-words sm:px-6 sm:py-6"
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(section.content) }}
                />
              )}
            </section>
          );
        })}
        {sectionRows.length === 0 && (
          <p className="px-4 py-4 text-sm text-muted-foreground sm:px-5">{t("reports.none")}</p>
        )}
      </div>
    </section>
  );
}
