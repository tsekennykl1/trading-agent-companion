import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  RadialBar,
  RadialBarChart,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Decision, PricePoint, StancePoint } from "@/lib/trading-agents/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { fill, useT } from "@/lib/i18n";

const AXIS = { stroke: "var(--muted-foreground)", fontSize: 11 };

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--rule)",
  borderRadius: "8px",
  fontSize: "12px",
  color: "var(--foreground)",
} as const;

export function PriceChart({ data, ticker }: { data: PricePoint[]; ticker: string }) {
  const isMobile = useIsMobile();
  const t = useT();

  return (
    <section className="panel p-4 sm:p-5">
      <h3 className="text-base font-semibold">{fill(t("charts.priceTitle"), { ticker })}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{t("charts.priceBody")}</p>
      <div className="mt-4 h-56 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: isMobile ? 2 : 8, left: isMobile ? -28 : -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" vertical={false} />
            <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={{ stroke: "var(--rule)" }} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="close" name="Close" stroke="var(--chart-1)" strokeWidth={2.4} dot={false} />
            <Line type="monotone" dataKey="ema10" name="10-EMA" stroke="var(--chart-4)" strokeWidth={1.4} dot={false} strokeDasharray="4 3" />
            <Line type="monotone" dataKey="sma20" name="20-SMA" stroke="var(--chart-5)" strokeWidth={1.4} dot={false} strokeDasharray="4 3" />
            <Line type="monotone" dataKey="sma50" name="50-SMA" stroke="var(--chart-3)" strokeWidth={1.4} dot={false} strokeDasharray="4 3" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export function StanceChart({ data }: { data: StancePoint[] }) {
  const isMobile = useIsMobile();
  const t = useT();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (data.length > 0) setOpen(true);
  }, [data.length]);

  return (
    <section className="panel overflow-hidden">
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold">{t("charts.stanceTitle")}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {data.length > 0 ? t("charts.stanceBody") : t("charts.stancePending")}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={data.length === 0}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
          {open ? t("common.hide") : t("common.show")}
        </Button>
      </div>
      {open && data.length > 0 && (
        <div className="h-64 border-t border-rule px-3 pb-4 pt-3 sm:h-72 sm:px-5">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: isMobile ? 4 : 16, left: isMobile ? 0 : 34, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" horizontal={false} />
              <XAxis type="number" domain={[-100, 100]} tick={AXIS} tickLine={false} axisLine={{ stroke: "var(--rule)" }} />
              <YAxis type="category" dataKey="agent" width={isMobile ? 82 : 124} tick={AXIS} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
              <Bar dataKey="score" name="Stance score" radius={[3, 3, 3, 3]} barSize={14}>
                {data.map((d) => (
                  <Cell
                    key={d.agent}
                    fill={
                      d.stance === "bullish"
                        ? "var(--bull)"
                        : d.stance === "bearish"
                          ? "var(--bear)"
                          : "var(--neutral)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

export function ConfidenceChart({ decision, stances }: { decision: Decision; stances: StancePoint[] }) {
  const t = useT();
  const counts = stances.reduce(
    (acc, s) => ({ ...acc, [s.stance]: (acc[s.stance] ?? 0) + 1 }),
    { bullish: 0, bearish: 0, neutral: 0 },
  );
  const agreement = stances.length
    ? Math.round((Math.max(counts.bullish, counts.bearish, counts.neutral) / stances.length) * 100)
    : 0;
  const confidence = decision.confidence > 0 || stances.length === 0 ? decision.confidence : agreement;

  return (
    <section className="panel p-4 sm:p-5">
      <h3 className="text-base font-semibold">{t("charts.confTitle")}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{t("charts.confBody")}</p>
      <div className="mt-3 flex flex-col items-center gap-3 min-[380px]:flex-row min-[380px]:gap-4 sm:gap-6">
        <div className="relative h-40 w-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              innerRadius="72%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              data={[{ name: "confidence", value: confidence }]}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar dataKey="value" cornerRadius={8} fill="var(--chart-1)" background={{ fill: "var(--muted)" }} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-3xl font-semibold">{confidence}%</span>
            <span className="label-caps">{t("charts.confidence")}</span>
          </div>
        </div>

        <dl className="w-full space-y-2 text-sm min-[380px]:w-auto">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-bull" />
            <dt className="text-muted-foreground">{t("charts.bullAgents")}</dt>
            <dd className="font-mono">{counts.bullish}</dd>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-neutral" />
            <dt className="text-muted-foreground">{t("charts.neutralAgents")}</dt>
            <dd className="font-mono">{counts.neutral}</dd>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-bear" />
            <dt className="text-muted-foreground">{t("charts.bearAgents")}</dt>
            <dd className="font-mono">{counts.bearish}</dd>
          </div>
          <div className="mt-3 border-t border-rule pt-2">
            <dt className="label-caps">{t("charts.consensus")}</dt>
            <dd className="font-medium">{decision.consensus}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
