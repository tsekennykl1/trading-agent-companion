import { Checkbox } from "@/components/ui/checkbox";
import type { ChartRow } from "@/lib/trading-agents/client";
import { availableIndicators, type IndicatorKey, type IndicatorSpec } from "@/lib/trading-agents/indicators";
import { useT } from "@/lib/i18n";

const GROUPS: IndicatorSpec["group"][] = ["Overlays", "Panels", "Annotations"];

function Tick({
  id,
  label,
  checked,
  onChange,
  strong,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  strong?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      <label
        htmlFor={id}
        className={`cursor-pointer text-xs whitespace-nowrap ${strong ? "font-semibold" : ""}`}
      >
        {label}
      </label>
    </span>
  );
}

/** Tick boxes for every technical study the current chart payload supports. */
export function IndicatorToggles({
  rows,
  hasLevels,
  visible,
  onToggle,
  onToggleMany,
}: {
  rows: ChartRow[];
  hasLevels: boolean;
  visible: IndicatorKey[];
  onToggle: (key: IndicatorKey, next: boolean) => void;
  onToggleMany: (keys: IndicatorKey[], next: boolean) => void;
}) {
  const t = useT();
  const specs = availableIndicators(rows, hasLevels);
  if (!specs.length) return null;

  const allKeys = specs.map((s) => s.key);
  const allOn = allKeys.every((k) => visible.includes(k));

  return (
    <div className="rounded-md border border-rule bg-surface px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {t("ind.title")}
        </p>
        <Tick
          id="ind-all"
          label={t("ind.selectAll")}
          checked={allOn}
          strong
          onChange={(next) => onToggleMany(allKeys, next)}
        />
      </div>

      <div className="mt-1.5 space-y-1.5">
        {GROUPS.map((group) => {
          const list = specs.filter((s) => s.group === group);
          if (!list.length) return null;
          const keys = list.map((s) => s.key);
          const groupOn = keys.every((k) => visible.includes(k));
          return (
            <div key={group} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-rule/60 pt-1.5">
              <span className="text-xs font-semibold whitespace-nowrap">
                {t(`ind.${group}` as "ind.Overlays")}
              </span>
              <Tick
                id={`ind-group-${group}`}
                label={t("ind.all")}
                checked={groupOn}
                onChange={(next) => onToggleMany(keys, next)}
              />
              <span className="text-rule">|</span>
              {list.map((spec) => (
                <Tick
                  key={spec.key}
                  id={`ind-${spec.key}`}
                  label={spec.label}
                  checked={visible.includes(spec.key)}
                  onChange={(next) => onToggle(spec.key, next)}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
