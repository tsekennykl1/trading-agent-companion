import { Check, CircleDashed, Loader2, TriangleAlert } from "lucide-react";
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

export function AgentBoard({ agents, stats }: { agents: AgentProgress[]; stats: RunStats }) {
  const teams = agents.reduce<Record<string, AgentProgress[]>>((acc, a) => {
    (acc[a.team] ??= []).push(a);
    return acc;
  }, {});
  const done = agents.filter((a) => a.status === "completed").length;

  return (
    <section className="panel p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Agent progress</h2>
        <span className="font-mono text-xs text-muted-foreground">
          {done}/{agents.length} agents
        </span>
      </div>

      <div className="mt-4 space-y-4">
        {Object.entries(teams).map(([team, list]) => (
          <div key={team}>
            <p className="label-caps">{team}</p>
            <ul className="mt-1.5 space-y-1">
              {list.map((a) => (
                <li
                  key={a.agent}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                    a.status === "in_progress" && "bg-primary/8",
                  )}
                >
                  <StatusIcon status={a.status} />
                  <span className={cn(a.status === "pending" && "text-muted-foreground")}>{a.agent}</span>
                  <span className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground">
                    {a.time ?? (a.note === "Not selected" ? "skipped" : "")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-rule pt-4 text-xs">
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
