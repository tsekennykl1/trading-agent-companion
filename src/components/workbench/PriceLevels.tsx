import type { Decision } from "@/lib/trading-agents/types";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Entry, target, and stop prices with one shared fallback rule. */
export function PriceLevels({ decision, boxed = false }: { decision: Decision; boxed?: boolean }) {
  const t = useT();
  const items = [
    { label: t("decision.entry"), value: decision.entryPrice ?? decision.levels?.entry },
    { label: t("decision.target"), value: decision.takeProfit ?? decision.levels?.takeProfit, tone: "text-bull" },
    { label: t("decision.stopLoss"), value: decision.stopLoss ?? decision.levels?.stopLoss, tone: "text-bear" },
  ];

  return (
    <div className="grid min-w-0 grid-cols-3 gap-2 sm:gap-3">
      {items.map(({ label, value, tone }) => (
        <div key={label} className={cn(boxed && "min-w-0 rounded-md border border-rule bg-surface px-2.5 py-1.5")}>
          <p className="label-caps truncate">{label}</p>
          <p className={cn("mt-0.5 break-words font-mono text-sm sm:text-base", tone)}>
            {value === undefined ? "—" : value}
          </p>
        </div>
      ))}
    </div>
  );
}