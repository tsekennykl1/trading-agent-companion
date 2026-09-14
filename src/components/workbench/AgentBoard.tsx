import { useState } from "react";
import { Check, CircleDashed, Eye, EyeOff, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AgentProgress, RunStats } from "@/lib/trading-agents/types";
import { cn } from "@/lib/utils";

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

export function AgentBoard({ agents, stats, compact = false }: { agents: AgentProgress[]; stats: RunStats; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false);
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

  return (
    <section className="panel p-4 sm:p-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
        <h2 className="text-lg font-semibold">Agent progress</h2>
        <span className="font-mono text-xs text-muted-foreground">
          {counts.completed}/{agents.length} agents
        </span>
      </div>

      {!showDetails ? (
        <div className="mt-4 space-y-2 rounded-lg border border-rule bg-muted/30 px-3 py-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Check className="size-3.5 text-bull" /> Completed
            </span>
            <span className="font-mono font-medium">{counts.completed}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-3.5 text-primary" /> In progress
            </span>
            <span className="font-mono font-medium">{counts.in_progress}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-muted-foreground">
              <CircleDashed className="size-3.5 text-muted-foreground/60" /> Pending
            </span>
            <span className="font-mono font-medium">{counts.pending}</span>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {Object.entries(teams).map(([team, list]) => (
            <div key={team} className="overflow-hidden rounded-md border border-rule">
              <div className="bg-muted/70 px-3 py-1.5 text-xs font-medium text-muted-foreground">{team}</div>
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
                        {agent.agent}
                      </p>
                      <span className="inline-flex flex-wrap items-center gap-1.5 text-xs capitalize">
                        <StatusIcon status={agent.status} />
                        {agent.note === "Not selected" ? "Not selected" : agent.status.replace("_", " ")}
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
              <EyeOff className="size-3.5" /> Hide details
            </>
          ) : (
            <>
              <Eye className="size-3.5" /> Show details
            </>
          )}
        </Button>
      </div>

      <dl
        className={cn(
          "mt-4 grid grid-cols-2 gap-x-5 gap-y-2 border-t border-rule pt-4 text-xs sm:grid-cols-3",
          !compact && "lg:grid-cols-6",
        )}
      >
        {[
          ["LLM calls", stats.llmCalls],
          ["Tool calls", stats.toolCalls],
          ["Tokens in", stats.tokensIn.toLocaleString()],
          ["Tokens out", stats.tokensOut.toLocaleString()],
          ["Reports", `${stats.reportsDone}/${stats.reportsTotal}`],
          ["Runtime", `${Math.floor(stats.runtimeSeconds / 60)}m ${stats.runtimeSeconds % 60}s`],
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
