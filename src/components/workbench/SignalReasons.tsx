import { useMemo } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { extractReasons } from "@/lib/trading-agents/signals";
import { cn } from "@/lib/utils";

/**
 * "Why this signal?" — the strongest bullish and bearish points pulled from
 * whichever analyst reports have already arrived.
 */
export function SignalReasons({ reports }: { reports: Record<string, string> }) {
  const { bullish, bearish } = useMemo(() => extractReasons(reports), [reports]);
  if (!bullish.length && !bearish.length) return null;

  return (
    <section className="panel p-4">
      <h3 className="text-sm font-semibold">Why this signal?</h3>
      <div className="mt-3 space-y-4">
        <ReasonList title="Bullish" tone="bull" points={bullish} Icon={TrendingUp} />
        <ReasonList title="Bearish" tone="bear" points={bearish} Icon={TrendingDown} />
      </div>
    </section>
  );
}

function ReasonList({
  title,
  tone,
  points,
  Icon,
}: {
  title: string;
  tone: "bull" | "bear";
  points: string[];
  Icon: typeof TrendingUp;
}) {
  if (!points.length) return null;
  return (
    <div>
      <p className={cn("flex items-center gap-1.5 text-xs font-semibold", tone === "bull" ? "text-bull" : "text-bear")}>
        <Icon className="size-3.5" aria-hidden="true" />
        {title}
      </p>
      <ul className="mt-1.5 space-y-1.5">
        {points.map((point) => (
          <li
            key={point}
            className={cn(
              "border-l-2 pl-2.5 text-xs leading-5 text-muted-foreground",
              tone === "bull" ? "border-bull/40" : "border-bear/40",
            )}
          >
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
}
