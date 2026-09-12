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
import type { Decision, PricePoint, StancePoint } from "@/lib/trading-agents/types";

const AXIS = { stroke: "var(--muted-foreground)", fontSize: 11 };

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--rule)",
  borderRadius: "8px",
  fontSize: "12px",
  color: "var(--foreground)",
} as const;

export function PriceChart({ data, ticker }: { data: PricePoint[]; ticker: string }) {
  return (
    <section className="panel p-5">
      <h3 className="text-base font-semibold">Price trend and moving averages — {ticker}</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Close versus 10-EMA, 20-SMA and 50-SMA over the analysis window.
      </p>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 8, left: -12, bottom: 0 }}>
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
  return (
    <section className="panel p-5">
      <h3 className="text-base font-semibold">Agent stance and consensus</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Interpretive score derived from each agent's output: −100 fully bearish to +100 fully bullish.
      </p>
      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 16, left: 34, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" horizontal={false} />
            <XAxis type="number" domain={[-100, 100]} tick={AXIS} tickLine={false} axisLine={{ stroke: "var(--rule)" }} />
            <YAxis type="category" dataKey="agent" width={124} tick={AXIS} tickLine={false} axisLine={false} />
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
    </section>
  );
}

export function ConfidenceChart({ decision, stances }: { decision: Decision; stances: StancePoint[] }) {
  const counts = stances.reduce(
    (acc, s) => ({ ...acc, [s.stance]: (acc[s.stance] ?? 0) + 1 }),
    { bullish: 0, bearish: 0, neutral: 0 },
  );

  return (
    <section className="panel p-5">
      <h3 className="text-base font-semibold">Recommendation confidence</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Confidence and agreement are interpretive proxies computed from agent alignment.
      </p>
      <div className="mt-3 flex items-center gap-6">
        <div className="relative h-40 w-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              innerRadius="72%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              data={[{ name: "confidence", value: decision.confidence }]}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar dataKey="value" cornerRadius={8} fill="var(--chart-1)" background={{ fill: "var(--muted)" }} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-3xl font-semibold">{decision.confidence}%</span>
            <span className="label-caps">confidence</span>
          </div>
        </div>

        <dl className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-bull" />
            <dt className="text-muted-foreground">Bullish agents</dt>
            <dd className="font-mono">{counts.bullish}</dd>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-neutral" />
            <dt className="text-muted-foreground">Neutral agents</dt>
            <dd className="font-mono">{counts.neutral}</dd>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-bear" />
            <dt className="text-muted-foreground">Bearish agents</dt>
            <dd className="font-mono">{counts.bearish}</dd>
          </div>
          <div className="mt-3 border-t border-rule pt-2">
            <dt className="label-caps">Consensus level</dt>
            <dd className="font-medium">{decision.consensus}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
