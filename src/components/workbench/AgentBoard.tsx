import { useState } from "react";
import { Check, CircleDashed, Eye, EyeOff, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STAGE_OPTIONS, type AgentProgress, type RunProgress, type RunStats } from "@/lib/trading-agents/types";
import { fill, useT, type TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const ROLE_KEYS: Record<string, TKey> = {
  "Market Analyst": "analyst.Market Analyst",
  "Sentiment Analyst": "analyst.Sentiment Analyst",
  "News Analyst": "analyst.News Analyst",
  "Fundamentals Analyst": "analyst.Fundamentals Analyst",
  "Bull Researcher": "role.Bull Researcher",
  "Bear Researcher": "role.Bear Researcher",
  "Research Manager": "role.Research Manager",
  Trader: "role.Trader",
  "Aggressive Analyst": "role.Aggressive Analyst",
  "Conservative Analyst": "role.Conservative Analyst",
  "Neutral Analyst": "role.Neutral Analyst",
  "Portfolio Manager": "role.Portfolio Manager",
};

const TEAM_KEYS: Record<string, TKey> = {
  "Analyst Team": "team.Analyst Team",
  "Research Team": "team.Research Team",
  "Trading Team": "team.Trading Team",
  "Risk Team": "team.Risk Team",
  "Portfolio Management": "team.Portfolio Management",
  Engine: "team.Engine",
};

function translatedValue(value: string, keys: Record<string, TKey>, t: (key: TKey) => string) {
  const key = keys[value];
  return key ? t(key) : value;
}

const ICONS = {
  completed: Check,
  in_progress: Loader2,
  pending: CircleDashed,
  error: TriangleAlert,
} as const;

function StatusIcon({ status }: { status: AgentProgress["status"] }) {
  const Icon = ICONS[status];
  return (
    <Icon
      className={cn(
        "size-3.5 shrink-0",
        status === "completed" && "text-bull",
        status === "in_progress" && "animate-spin text-primary",
        status === "pending" && "text-muted-foreground/60",
        status === "error" && "text-bear",
      )}
    />
  );
}

const EMPTY_STATS: RunStats = {
  llmCalls: 0,
  toolCalls: 0,
  tokensIn: 0,
  tokensOut: 0,
  reportsDone: 0,
  reportsTotal: 0,
  runtimeSeconds: 0,
};

export function AgentBoard({
  agents: agentsProp,
  stats: statsProp,
  compact = false,
  analysisBusy = false,
  progress,
  ticker,
  elapsed = 0,
  latestStep,
  selectedStages,
  stageTimingEnabled = false,
}: {
  agents: AgentProgress[];
  stats?: RunStats;
  compact?: boolean;
  analysisBusy?: boolean;
  progress?: RunProgress | undefined;
  ticker?: string | undefined;
  elapsed?: number;
  latestStep?: string | undefined;
  selectedStages?: string[] | undefined;
  stageTimingEnabled?: boolean;
}) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);
  // An engine payload can omit progress counters entirely; never crash on it.
  const agents = agentsProp ?? [];
  const stats = statsProp ?? EMPTY_STATS;
  // Completed rows stay tucked away by default; active, pending, and error rows remain visible.
  // Engine log rows are noise once they finish, so they always drop out.
  const visibleAgents = agents.filter((a) => !(a.team === "Engine" && a.status === "completed"));
  const listedAgents = showCompleted ? visibleAgents : visibleAgents.filter((a) => a.status !== "completed");
  const teams = listedAgents.reduce<Record<string, AgentProgress[]>>((acc, a) => {
    (acc[a.team] ??= []).push(a);
    return acc;
  }, {});

  const counts = {
    completed: agents.filter((a) => a.status === "completed").length,
    in_progress: agents.filter((a) => a.status === "in_progress").length,
    pending: agents.filter((a) => a.status === "pending").length,
    error: agents.filter((a) => a.status === "error").length,
  };

  const isRunning = counts.in_progress > 0;
  const showDetails = isRunning || expanded;
  const statusLabel = (status: AgentProgress["status"]) =>
    t(`agents.${status.replace("_", " ")}` as TKey);
  const formatElapsed = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return minutes > 0 ? `${minutes}m ${String(remainder).padStart(2, "0")}s` : `${remainder}s`;
  };
  const timingByStage = new Map((stats.stageTimings ?? []).map((item) => [item.stage, item]));
  const timingRows = STAGE_OPTIONS
    .filter((stage) => selectedStages === undefined || selectedStages.includes(stage.id))
    .map((stage) => ({ stage, timing: timingByStage.get(stage.id) }));
  const slowestMs = Math.max(0, ...timingRows.map(({ timing }) => timing?.durationMs ?? 0));
  const stageLabel = (roles: string[]) => roles.map((role) => translatedValue(role, ROLE_KEYS, t)).join(" + ");
  const clock = (value?: string) => value
    ? new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value))
    : "—";
  const duration = (ms?: number) => ms === undefined ? "—" : formatElapsed(Math.max(0, Math.round(ms / 1000)));

  return (
    <section className="panel p-4 sm:p-5">
      {analysisBusy && (
        <div className="mb-4 border-b border-rule pb-4" role="status" aria-live="polite">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full border border-primary/25 bg-primary/10">
              <Loader2 className="size-4 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-base font-semibold sm:text-lg">{t("home.progressTitle")}</h2>
              {progress && (
                <div className="mt-2">
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500 motion-reduce:transition-none"
                      style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs break-words text-muted-foreground">
                    {progress.message || progress.stage}
                    {progress.totalSteps > 0 && ` · ${t("home.step")} ${progress.step} ${t("home.of")} ${progress.totalSteps}`}
                  </p>
                </div>
              )}
              {!progress && latestStep && (
                <p className="mt-2 break-words text-xs text-muted-foreground">{latestStep}</p>
              )}
              <span className="mt-2 inline-flex items-center gap-2 text-xs font-medium text-primary">
                <span className="size-1.5 animate-pulse rounded-full bg-primary motion-reduce:animate-none" />
                {t("home.workingOn")} {ticker} · {formatElapsed(elapsed)}
              </span>
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
        <h2 className="text-lg font-semibold">{t("agents.title")}</h2>
        <span className="font-mono text-xs text-muted-foreground">
          {fill(t("agents.count"), { n: counts.completed, m: agents.length })}
        </span>
      </div>

      {!showDetails ? (
        <div className="mt-4 space-y-2 rounded-lg border border-rule bg-muted/30 px-3 py-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Check className="size-3.5 text-bull" /> {t("agents.completed")}
            </span>
            <span className="font-mono font-medium">{counts.completed}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-3.5 text-primary" /> {t("agents.in progress")}
            </span>
            <span className="font-mono font-medium">{counts.in_progress}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-muted-foreground">
              <CircleDashed className="size-3.5 text-muted-foreground/60" /> {t("agents.pending")}
            </span>
            <span className="font-mono font-medium">{counts.pending}</span>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {Object.entries(teams).map(([team, list]) => (
            <div key={team} className="overflow-hidden rounded-md border border-rule">
               <div className="bg-muted/70 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                 {translatedValue(team, TEAM_KEYS, t)}
               </div>
              <div className="divide-y divide-rule">
                {list.map((agent) => (
                  <div
                    key={`${team}-${agent.agent}`}
                    className={cn(
                      "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 px-3 py-2",
                      agent.status === "in_progress" && "bg-primary/8",
                    )}
                  >
                    <div className="min-w-0">
                      <p className={cn("break-words text-sm", agent.status === "pending" && "text-muted-foreground")}>
                         {translatedValue(agent.agent, ROLE_KEYS, t)}
                      </p>
                      <span className="inline-flex flex-wrap items-center gap-1.5 text-xs">
                        <StatusIcon status={agent.status} />
                        {agent.note === "Not selected" ? t("agents.notSelected") : statusLabel(agent.status)}
                      </span>
                    </div>
                    <span className="shrink-0 whitespace-nowrap pt-0.5 text-right font-mono text-[11px] text-muted-foreground">
                      {agent.time ?? "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {stageTimingEnabled && timingRows.length > 0 && (
        <div className="mt-4 border-t border-rule pt-4">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h3 className="text-sm font-semibold">{t("agents.stageTiming")}</h3>
            {slowestMs > 0 && <span className="text-[11px] text-muted-foreground">{t("agents.slowest")} · {duration(slowestMs)}</span>}
          </div>
          <div className="overflow-x-auto rounded-md border border-rule">
            <div className="min-w-[34rem] divide-y divide-rule">
              {timingRows.map(({ stage, timing }) => {
                const status = timing?.status ?? "pending";
                const isSlowest = status === "completed" && timing?.durationMs === slowestMs && slowestMs > 0;
                // Some engine builds report only a duration; derive the completed time from it.
                const endedAt = timing?.endedAt
                  ?? (timing?.startedAt && timing?.durationMs !== undefined
                    ? new Date(new Date(timing.startedAt).getTime() + timing.durationMs).toISOString()
                    : undefined);
                const endedMs = timing?.durationMs
                  ?? (timing?.startedAt && timing?.endedAt
                    ? new Date(timing.endedAt).getTime() - new Date(timing.startedAt).getTime()
                    : undefined);
                return (
                  <div key={stage.id} className={cn("grid grid-cols-[minmax(11rem,1fr)_7rem_7rem_5rem] items-center gap-3 px-3 py-2 text-xs", isSlowest && "bg-accent/10")}>
                    <span className="flex min-w-0 items-center gap-2">
                      <StatusIcon status={status} />
                      <span className="truncate font-medium">{stageLabel(stage.roles)}</span>
                    </span>
                    <span><span className="text-muted-foreground">{t("agents.started")}</span><br /><span className="font-mono">{clock(timing?.startedAt)}</span></span>
                    <span><span className="text-muted-foreground">{t("agents.ended")}</span><br /><span className="font-mono">{clock(timing?.endedAt)}</span></span>
                    <span className="text-right"><span className="text-muted-foreground">{t("agents.duration")}</span><br /><span className="font-mono font-medium">{duration(timing?.durationMs)}</span></span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-end gap-1">
        {showDetails && counts.completed > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setShowCompleted((v) => !v)}
            aria-pressed={showCompleted}
          >
            {showCompleted ? (
              <>
                <EyeOff className="size-3.5" /> {t("agents.hideCompleted")}
              </>
            ) : (
              <>
                <Eye className="size-3.5" /> {t("agents.showCompleted")}
              </>
            )}
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded((v) => !v)}
          disabled={isRunning}
          aria-pressed={showDetails}
        >
          {showDetails ? (
            <>
              <EyeOff className="size-3.5" /> {t("agents.hideDetails")}
            </>
          ) : (
            <>
              <Eye className="size-3.5" /> {t("agents.showDetails")}
            </>
          )}
        </Button>
      </div>

      <dl
        className={cn(
          "mt-4 grid gap-x-5 gap-y-2 border-t border-rule pt-4 text-xs",
          compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
        )}
      >
        {[
          [t("stats.llmCalls"), stats.llmCalls],
          [t("stats.toolCalls"), stats.toolCalls],
          [t("stats.tokensIn"), stats.tokensIn.toLocaleString()],
          [t("stats.tokensOut"), stats.tokensOut.toLocaleString()],
          [t("stats.reports"), `${stats.reportsDone}/${stats.reportsTotal}`],
          [t("stats.runtime"), `${Math.floor(stats.runtimeSeconds / 60)}m ${stats.runtimeSeconds % 60}s`],
        ].map(([label, value]) => (
          <div key={String(label)} className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-mono">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
