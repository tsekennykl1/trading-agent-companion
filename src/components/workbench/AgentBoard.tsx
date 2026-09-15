import { useState } from "react";
import { Check, CircleDashed, Eye, EyeOff, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AgentProgress, RunStats } from "@/lib/trading-agents/types";
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
}: {
  agents: AgentProgress[];
  stats?: RunStats;
  compact?: boolean;
}) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false);
  // An engine payload can omit progress counters entirely; never crash on it.
  const agents = agentsProp ?? [];
  const stats = statsProp ?? EMPTY_STATS;
  const teams = agents.reduce<Record<string, AgentProgress[]>>((acc, a) => {
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

  return (
    <section className="panel p-4 sm:p-5">
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

      <div className="mt-3 flex items-center justify-end">
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
