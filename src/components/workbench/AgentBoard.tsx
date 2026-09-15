/**
 * "Agent progress" panel: the live banner while a run is working, the list of
 * agents grouped by team, the per-stage timings, and the run statistics.
 * Each of those is a small component below; AgentBoard just arranges them.
 */
import { useState } from "react";
import { Check, CircleDashed, Eye, EyeOff, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STAGE_OPTIONS, type AgentProgress, type RunProgress, type RunStats, type StageTiming } from "@/lib/trading-agents/types";
import { formatClock, formatDuration, formatElapsed } from "@/lib/format";
import { fill, useT, type TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Translate = (key: TKey) => string;

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

/** Translate a role or team name when we have a translation for it. */
function label(value: string, keys: Record<string, TKey>, t: Translate) {
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

/** Small ghost button with an eye icon — used for the two show/hide toggles. */
function ToggleButton({
  on,
  onLabel,
  offLabel,
  onClick,
  disabled = false,
}: {
  on: boolean;
  onLabel: string;
  offLabel: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  const Icon = on ? EyeOff : Eye;
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
    >
      <Icon className="size-3.5" /> {on ? onLabel : offLabel}
    </Button>
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

/** The banner shown while an analysis is running. */
function BusyBanner({
  t,
  progress,
  latestStep,
  ticker,
  elapsed,
}: {
  t: Translate;
  progress?: RunProgress | undefined;
  latestStep?: string | undefined;
  ticker?: string | undefined;
  elapsed: number;
}) {
  return (
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
                {progress.totalSteps > 0 &&
                  ` · ${t("home.step")} ${progress.step} ${t("home.of")} ${progress.totalSteps}`}
              </p>
            </div>
          )}
          {!progress && latestStep && <p className="mt-2 break-words text-xs text-muted-foreground">{latestStep}</p>}
          <span className="mt-2 inline-flex items-center gap-2 text-xs font-medium text-primary">
            <span className="size-1.5 animate-pulse rounded-full bg-primary motion-reduce:animate-none" />
            {t("home.workingOn")} {ticker} · {formatElapsed(elapsed)}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Collapsed view: just how many agents are done, working and waiting. */
function StatusCounts({ t, counts }: { t: Translate; counts: Record<AgentProgress["status"], number> }) {
  const rows = [
    { key: "agents.completed", icon: <Check className="size-3.5 text-bull" />, value: counts.completed },
    { key: "agents.in progress", icon: <Loader2 className="size-3.5 text-primary" />, value: counts.in_progress },
    { key: "agents.pending", icon: <CircleDashed className="size-3.5 text-muted-foreground/60" />, value: counts.pending },
  ] as const;
  return (
    <div className="mt-4 space-y-2 rounded-lg border border-rule bg-muted/30 px-3 py-3 text-sm">
      {rows.map((row) => (
        <div key={row.key} className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-muted-foreground">
            {row.icon} {t(row.key as TKey)}
          </span>
          <span className="font-mono font-medium">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Expanded view: every agent, grouped by team. */
function TeamList({ t, agents }: { t: Translate; agents: AgentProgress[] }) {
  const teams = agents.reduce<Record<string, AgentProgress[]>>((acc, a) => {
    (acc[a.team] ??= []).push(a);
    return acc;
  }, {});
  return (
    <div className="mt-4 space-y-3">
      {Object.entries(teams).map(([team, list]) => (
        <div key={team} className="overflow-hidden rounded-md border border-rule">
          <div className="bg-muted/70 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            {label(team, TEAM_KEYS, t)}
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
                    {label(agent.agent, ROLE_KEYS, t)}
                  </p>
                  <span className="inline-flex flex-wrap items-center gap-1.5 text-xs">
                    <StatusIcon status={agent.status} />
                    {agent.note === "Not selected"
                      ? t("agents.notSelected")
                      : t(`agents.${agent.status.replace("_", " ")}` as TKey)}
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
  );
}

/** Start time, end time and duration for each selected stage. */
function StageTimings({
  t,
  timings,
  selectedStages,
}: {
  t: Translate;
  timings: StageTiming[];
  selectedStages?: string[] | undefined;
}) {
  const byStage = new Map(timings.map((item) => [item.stage, item]));
  const rows = STAGE_OPTIONS.filter((stage) => selectedStages === undefined || selectedStages.includes(stage.id)).map(
    (stage) => ({ stage, timing: byStage.get(stage.id) }),
  );
  if (!rows.length) return null;
  const slowestMs = Math.max(0, ...rows.map(({ timing }) => timing?.durationMs ?? 0));

  return (
    <div className="mt-4 border-t border-rule pt-4">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold">{t("agents.stageTiming")}</h3>
        {slowestMs > 0 && (
          <span className="text-[11px] text-muted-foreground">
            {t("agents.slowest")} · {formatDuration(slowestMs)}
          </span>
        )}
      </div>
      <div className="rounded-md border border-rule">
        <div className="divide-y divide-rule">
          {rows.map(({ stage, timing }) => {
            const status = timing?.status ?? "pending";
            const isSlowest = status === "completed" && timing?.durationMs === slowestMs && slowestMs > 0;
            const started = timing?.startedAt ? new Date(timing.startedAt).getTime() : undefined;
            const ended = timing?.endedAt ? new Date(timing.endedAt).getTime() : undefined;
            // Some engine builds report only one of "ended" and "duration";
            // whichever is missing is derived from the other.
            const endedAt =
              timing?.endedAt ??
              (started !== undefined && timing?.durationMs !== undefined
                ? new Date(started + timing.durationMs).toISOString()
                : undefined);
            const durationMs =
              timing?.durationMs ?? (started !== undefined && ended !== undefined ? ended - started : undefined);
            const cells = [
              { key: "agents.started", value: formatClock(timing?.startedAt) },
              { key: "agents.ended", value: formatClock(endedAt) },
              { key: "agents.duration", value: formatDuration(durationMs), align: "text-right", bold: true },
            ] as const;
            return (
              <div key={stage.id} className={cn("min-w-0 px-3 py-2 text-xs", isSlowest && "bg-accent/10")}>
                <span className="flex min-w-0 items-center gap-2">
                  <StatusIcon status={status} />
                  <span className="break-words font-medium">
                    {stage.roles.map((role) => label(role, ROLE_KEYS, t)).join(" + ")}
                  </span>
                </span>
                <div className="mt-1.5 grid grid-cols-3 gap-2 pl-5.5">
                  {cells.map((cell) => (
                    <span key={cell.key} className={cn("min-w-0", "align" in cell && cell.align)}>
                      <span className="block text-muted-foreground">{t(cell.key as TKey)}</span>
                      <span className={cn("block truncate font-mono", "bold" in cell && "font-medium")}>
                        {cell.value}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Token, call and runtime counters at the bottom of the panel. */
function StatsGrid({ t, stats, compact }: { t: Translate; stats: RunStats; compact: boolean }) {
  const rows: [string, string | number][] = [
    [t("stats.llmCalls"), stats.llmCalls],
    [t("stats.toolCalls"), stats.toolCalls],
    [t("stats.tokensIn"), stats.tokensIn.toLocaleString()],
    [t("stats.tokensOut"), stats.tokensOut.toLocaleString()],
    [t("stats.reports"), `${stats.reportsDone}/${stats.reportsTotal}`],
    [t("stats.runtime"), formatElapsed(stats.runtimeSeconds)],
  ];
  return (
    <dl
      className={cn(
        "mt-4 grid gap-x-5 gap-y-2 border-t border-rule pt-4 text-xs",
        compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
      )}
    >
      {rows.map(([name, value]) => (
        <div key={name} className="flex justify-between gap-2">
          <dt className="text-muted-foreground">{name}</dt>
          <dd className="font-mono">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

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
  // Engine log rows are noise once they finish, so they always drop out.
  const visible = agents.filter((a) => !(a.team === "Engine" && a.status === "completed"));
  const listed = showCompleted ? visible : visible.filter((a) => a.status !== "completed");

  const counts = {
    completed: agents.filter((a) => a.status === "completed").length,
    in_progress: agents.filter((a) => a.status === "in_progress").length,
    pending: agents.filter((a) => a.status === "pending").length,
    error: agents.filter((a) => a.status === "error").length,
  };
  const isRunning = counts.in_progress > 0;
  const showDetails = isRunning || expanded;

  return (
    <section className="panel p-4 sm:p-5">
      {analysisBusy && (
        <BusyBanner t={t} progress={progress} latestStep={latestStep} ticker={ticker} elapsed={elapsed} />
      )}

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
        <h2 className="text-lg font-semibold">{t("agents.title")}</h2>
        <span className="font-mono text-xs text-muted-foreground">
          {fill(t("agents.count"), { n: counts.completed, m: agents.length })}
        </span>
      </div>

      {showDetails ? <TeamList t={t} agents={listed} /> : <StatusCounts t={t} counts={counts} />}

      {stageTimingEnabled && (
        <StageTimings t={t} timings={stats.stageTimings ?? []} selectedStages={selectedStages} />
      )}

      <div className="mt-3 flex items-center justify-end gap-1">
        {showDetails && counts.completed > 0 && (
          <ToggleButton
            on={showCompleted}
            onLabel={t("agents.hideCompleted")}
            offLabel={t("agents.showCompleted")}
            onClick={() => setShowCompleted((v) => !v)}
          />
        )}
        <ToggleButton
          on={showDetails}
          onLabel={t("agents.hideDetails")}
          offLabel={t("agents.showDetails")}
          onClick={() => setExpanded((v) => !v)}
          disabled={isRunning}
        />
      </div>

      <StatsGrid t={t} stats={stats} compact={compact} />
    </section>
  );
}
