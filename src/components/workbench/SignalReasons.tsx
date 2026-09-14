import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { extractReasons } from "@/lib/trading-agents/signals";
import { cn } from "@/lib/utils";

/**
 * "Why this signal?" — the strongest bullish and bearish points pulled from
 * whichever analyst reports have already arrived.
 */
export function SignalReasons({ reports }: { reports: Record<string, string> }) {
  const t = useT();
  const [open, setOpen] = useState(true);
  const { bullish, bearish } = useMemo(() => extractReasons(reports), [reports]);
  if (!bullish.length && !bearish.length) return null;

  return (
    <section className="panel p-4">
      <div className="flex items-center gap-3">
        <h3 className="min-w-0 flex-1 text-sm font-semibold">Why this signal?</h3>
        <Button type="button" size="sm" variant="ghost" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
          {open ? t("reports.hide") : t("reports.show")}
        </Button>
      </div>
      {open && (
        <div className="mt-3 space-y-4">
          <ReasonList title="Bullish" tone="bull" points={bullish} Icon={TrendingUp} />
          <ReasonList title="Bearish" tone="bear" points={bearish} Icon={TrendingDown} />
        </div>
      )}
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
