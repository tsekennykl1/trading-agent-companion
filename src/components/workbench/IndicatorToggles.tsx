import { Checkbox } from "@/components/ui/checkbox";
import type { ChartRow } from "@/lib/trading-agents/client";
import { availableIndicators, type IndicatorKey, type IndicatorSpec } from "@/lib/trading-agents/indicators";

const GROUPS: IndicatorSpec["group"][] = ["Overlays", "Panels", "Annotations"];

/** Tick boxes for every technical study the current chart payload supports. */
export function IndicatorToggles({
  rows,
  hasLevels,
  visible,
  onToggle,
}: {
  rows: ChartRow[];
  hasLevels: boolean;
  visible: IndicatorKey[];
  onToggle: (key: IndicatorKey, next: boolean) => void;
}) {
  const specs = availableIndicators(rows, hasLevels);
  if (!specs.length) return null;

  return (
    <div className="rounded-md border border-rule bg-surface px-3 py-2.5">
      <p className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        Technical analysis
      </p>
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
        {GROUPS.map((group) => {
          const list = specs.filter((s) => s.group === group);
          if (!list.length) return null;
          return (
            <div key={group} className="min-w-0">
              <p className="mb-1.5 text-xs font-semibold">{group}</p>
              <ul className="space-y-1.5">
                {list.map((spec) => (
                  <li key={spec.key} className="flex items-center gap-2">
                    <Checkbox
                      id={`ind-${spec.key}`}
                      checked={visible.includes(spec.key)}
                      onCheckedChange={(v) => onToggle(spec.key, v === true)}
                    />
                    <label htmlFor={`ind-${spec.key}`} className="cursor-pointer text-xs break-words">
                      {spec.label}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
