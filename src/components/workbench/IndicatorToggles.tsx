import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Info } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { ChartRow } from "@/lib/trading-agents/client";
import { availableIndicators, type IndicatorKey, type IndicatorSpec } from "@/lib/trading-agents/indicators";
import { useT } from "@/lib/i18n";

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
  rangeControl,
}: {
  rows: ChartRow[];
  hasLevels: boolean;
  visible: IndicatorKey[];
  onToggle: (key: IndicatorKey, next: boolean) => void;
  onToggleMany: (keys: IndicatorKey[], next: boolean) => void;
  rangeControl?: ReactNode;
}) {
  const t = useT();
  const specs = availableIndicators(rows, hasLevels);
  if (!specs.length) return null;

  const allKeys = specs.map((s) => s.key);
  const allOn = allKeys.every((k) => visible.includes(k));
  const overlays = specs.filter((s) => s.group === "Overlays");
  const panels = specs.filter((s) => s.group === "Panels");
  const annotations = specs.filter((s) => s.group === "Annotations");

  const renderGroup = (group: IndicatorSpec["group"], list: IndicatorSpec[], showAll = true) => {
    if (!list.length) return null;
    const keys = list.map((s) => s.key);
    const groupOn = keys.every((k) => visible.includes(k));
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="text-xs font-semibold whitespace-nowrap">{t(`ind.${group}` as "ind.Overlays")}</span>
        {showAll && (
          <>
            <Tick
              id={`ind-group-${group}`}
              label={t("ind.all")}
              checked={groupOn}
              onChange={(next) => onToggleMany(keys, next)}
            />
            <span className="text-rule">|</span>
          </>
        )}
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
  };

  return (
    <div className="rounded-md border border-rule bg-surface px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
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
          <Link
            to="/technical-analysis"
            title={t("ind.learn")}
            aria-label={t("ind.learn")}
            className="inline-flex size-5 items-center justify-center rounded-full border border-rule text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Info className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
        {rangeControl}
      </div>

      <div className="mt-1.5 space-y-1.5">
        <div className="border-t border-rule/60 pt-1.5">{renderGroup("Overlays", overlays)}</div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-rule/60 pt-1.5">
          {renderGroup("Panels", panels)}
          {renderGroup("Annotations", annotations, false)}
        </div>
      </div>
    </div>
  );
}
