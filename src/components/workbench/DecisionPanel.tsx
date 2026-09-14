import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronDown, ChevronRight, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markdownToHtml } from "@/lib/trading-agents/report";
import { fill, useT } from "@/lib/i18n";

import type { Decision } from "@/lib/trading-agents/types";
import { cn } from "@/lib/utils";

type Tone = { cls: string; Icon: typeof Minus };

const FALLBACK_TONE: Tone = { cls: "bg-muted text-muted-foreground border-rule", Icon: Minus };

const TONE: Record<string, Tone> = {
  Buy: { cls: "bg-bull/12 text-bull border-bull/30", Icon: ArrowUpRight },
  Overweight: { cls: "bg-bull/12 text-bull border-bull/30", Icon: ArrowUpRight },
  Hold: { cls: "bg-neutral/12 text-neutral border-neutral/30", Icon: Minus },
  Review: { cls: "bg-muted text-muted-foreground border-rule", Icon: Minus },
  Underweight: { cls: "bg-bear/12 text-bear border-bear/30", Icon: ArrowDownRight },
  Sell: { cls: "bg-bear/12 text-bear border-bear/30", Icon: ArrowDownRight },
};

export function DecisionPanel({ decision, ticker }: { decision: Decision; ticker: string }) {
  const t = useT();
  const [open, setOpen] = useState(true);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [bullOpen, setBullOpen] = useState(false);
  const [bearOpen, setBearOpen] = useState(false);
  const tone = TONE[decision.action] ?? FALLBACK_TONE;
  const { Icon } = tone;

  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold">{t("decision.title")}</h2>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {fill(t("decision.subtitle"), { action: decision.action, ticker })}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
          {open ? t("common.hide") : t("common.show")}
        </Button>
      </div>

      {open && (
        <div className="border-t border-rule">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-rule bg-surface px-4 py-4 sm:flex sm:flex-wrap sm:items-center sm:gap-4 sm:px-5">
            <span
              className={cn(
                "col-span-2 flex w-fit items-center gap-2 rounded-md border px-3 py-1.5 font-display text-xl font-semibold sm:col-auto",
                tone.cls,
              )}
            >
              <Icon className="size-5" />
              {decision.action}
            </span>
            <div className="min-w-0 text-sm">
              <p className="font-medium break-words">{fill(t("decision.heading"), { ticker })}</p>
              <p className="text-muted-foreground">
                {fill(t("decision.confidenceLine"), { c: decision.confidence, k: decision.consensus })}
              </p>
            </div>
            <div className="grid shrink-0 grid-cols-3 gap-3 text-sm sm:ml-auto sm:flex sm:gap-5">
              {[
                [t("decision.entry"), decision.entryPrice ?? decision.levels?.entry],
                [t("decision.target"), decision.takeProfit ?? decision.levels?.takeProfit],
                [t("decision.stopLoss"), decision.stopLoss ?? decision.levels?.stopLoss],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <p className="label-caps">{label}</p>
                  <p className="font-mono text-base">{value === undefined ? "—" : value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="px-4 py-4 sm:px-5 sm:py-5">
            <DecisionNarrative
              title={t("decision.summary")}
              content={decision.executiveSummary}
              open={summaryOpen}
              onToggle={() => setSummaryOpen((value) => !value)}
            />

            {decision.positionSizing && (
              <div className="mt-4 rounded-md border border-rule bg-muted/50 p-3 text-sm">
                <p className="label-caps">{t("decision.sizing")}</p>
                <div
                  className="prose-report mt-2"
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(decision.positionSizing) }}
                />
              </div>
            )}

            <div className="divide-y divide-rule border-y border-rule">
              <DecisionEvidence
                title={t("decision.bull")}
                tone="bull"
                points={decision.bullPoints}
                open={bullOpen}
                onToggle={() => setBullOpen((value) => !value)}
              />
              <DecisionEvidence
                title={t("decision.bear")}
                tone="bear"
                points={decision.bearPoints}
                open={bearOpen}
                onToggle={() => setBearOpen((value) => !value)}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function DecisionNarrative({
  title,
  content,
  open,
  onToggle,
}: {
  title: string;
  content: string;
  open: boolean;
  onToggle: () => void;
}) {
  const t = useT();
  const available = content.trim().length > 0;
  return (
    <section className="border-y border-rule py-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {available ? t("reports.available") : t("decision.notAvailable")}
          </p>
        </div>
        <Button type="button" size="sm" variant="ghost" disabled={!available} aria-expanded={open} onClick={onToggle}>
          {open ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
          {open ? t("common.hide") : t("common.show")}
        </Button>
      </div>
      {available && open && (
        <div className="prose-report mt-3 text-sm" dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }} />
      )}
    </section>
  );
}


function DecisionEvidence({
  title,
  tone,
  points,
  open,
  onToggle,
}: {
  title: string;
  tone: "bull" | "bear";
  points: string[];
  open: boolean;
  onToggle: () => void;
}) {
  const t = useT();
  const available = points.length > 0;

  return (
    <section className="py-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h3 className={cn("text-sm font-semibold", tone === "bull" ? "text-bull" : "text-bear")}>{title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {available ? fill(t("decision.signals"), { n: points.length }) : t("decision.notAvailable")}
          </p>
        </div>
        <Button type="button" size="sm" variant="ghost" disabled={!available} aria-expanded={open} onClick={onToggle}>
          {open ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
          {open ? t("common.hide") : t("common.show")}
        </Button>
      </div>

      {available && open && (
        <div className="mt-3 space-y-4 text-sm">
          {points.map((point, index) => (
            <div
              key={`${title}-${index}`}
              className={cn("prose-report border-l-2 pl-3", tone === "bull" ? "border-bull/40" : "border-bear/40")}
              dangerouslySetInnerHTML={{ __html: markdownToHtml(point) }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
