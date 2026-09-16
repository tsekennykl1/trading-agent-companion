import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/workbench/AppShell";
import { PlotlyPriceChart } from "@/components/workbench/PlotlyPriceChart";
import { Button } from "@/components/ui/button";
import { SAMPLE_CHART_DATA } from "@/lib/trading-agents/sample-run";
import { useT } from "@/lib/i18n";

const TITLE = "Technical analysis explained — My Trading Agents";
const DESCRIPTION =
  "A plain-language guide to the technical studies on the dashboard: trend, momentum, volatility and volume signals, with a worked 0700.HK example chart.";

export const Route = createFileRoute("/technical-analysis")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TechnicalAnalysisPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel mt-5 p-4 sm:p-5">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}

function SignalTable({ rows }: { rows: [string, string, string][] }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse text-sm">
        <thead>
          <tr className="bg-muted/60 text-left">
            <th className="border border-rule px-2 py-1.5 font-semibold">Signal</th>
            <th className="border border-rule px-2 py-1.5 font-semibold">What you see</th>
            <th className="border border-rule px-2 py-1.5 font-semibold">Usual reading</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([a, b, c]) => (
            <tr key={a}>
              <td className="border border-rule px-2 py-1.5 font-medium">{a}</td>
              <td className="border border-rule px-2 py-1.5">{b}</td>
              <td className="border border-rule px-2 py-1.5">{c}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TechnicalAnalysisPage() {
  const t = useT();
  // Three real years of 0700.HK, computed in the browser, so the example works offline.
  const chart = useMemo(() => SAMPLE_CHART_DATA, []);

  return (
    <AppShell>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Button asChild size="sm" variant="outline" className="min-h-9 gap-2">
          <Link to="/">
            <ArrowLeft className="size-4" /> {t("report.back")}
          </Link>
        </Button>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Technical analysis: theory and important signals
        </h1>
      </div>

      <p className="max-w-3xl text-sm text-muted-foreground">
        Technical analysis reads price, volume and derived studies to judge the direction, strength and
        exhaustion of a move. No indicator predicts the future; each is an objective measurement whose value
        comes from combining a trend reading, a momentum reading and a volume confirmation.
      </p>

      <section className="panel mt-5 p-3 sm:p-4">
        <h2 className="font-display text-xl font-semibold">Worked example — 0700.HK, three years</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The same chart the dashboard draws. Price with moving averages and Bollinger bands on top; RSI, MACD
          and volume in the panels below. Hover any point to read the exact values.
        </p>
        <div className="mt-3 min-w-0">
          <PlotlyPriceChart
            chart={chart}
            height={560}
            levels={chart.levels}
            visible={["sma50", "sma200", "bollinger", "rsi", "macd", "volume", "levels"]}
          />
        </div>
      </section>

      <Section title="1. Market structure, support and resistance">
        <p>
          An uptrend is a sequence of higher highs and higher lows; a downtrend is the opposite. Support is a
          price band where buyers repeatedly appeared, resistance a band where sellers did. Broken support
          commonly becomes resistance afterwards, which is why a reclaim of a lost level matters more than a
          single strong day. Structure is the frame; indicators only describe what is happening inside it.
        </p>
      </Section>

      <Section title="2. Trend — moving averages">
        <p>
          A simple moving average (SMA) is the mean close over a window; an exponential moving average (EMA)
          weights recent days more heavily, so it turns sooner. Price above a rising average signals an
          uptrend, price below a falling average a downtrend, and averages flatten in a range, which is where
          they mislead most often.
        </p>
        <SignalTable
          rows={[
            ["Golden cross", "50-day average crosses above the 200-day", "Trend turning up; slow but reliable"],
            ["Death cross", "50-day crosses below the 200-day", "Trend turning down; risk-off"],
            ["Stacked averages", "10 > 50 > 200, all rising", "Strongest trend alignment"],
            ["Pullback to the average", "Price dips to a rising 20 or 50 and holds", "Classic continuation entry"],
          ]}
        />
      </Section>

      <Section title="3. Momentum — RSI">
        <p>
          The Relative Strength Index compares average gains with average losses over 14 days on a 0–100 scale.
          Above 70 is called overbought, below 30 oversold — but in a strong trend price can stay there for
          weeks, so extremes alone are not entries. The high-value signal is divergence: price makes a new low
          while RSI makes a higher low, showing selling pressure is fading.
        </p>
        <SignalTable
          rows={[
            ["Bullish divergence", "Lower price low, higher RSI low", "Downside momentum exhausting"],
            ["Bearish divergence", "Higher price high, lower RSI high", "Rally losing power"],
            ["50-line cross", "RSI moves through 50", "Momentum changing hands"],
            ["Failure swing", "RSI fails to reach its prior extreme", "Early reversal warning"],
          ]}
        />
      </Section>

      <Section title="4. Trend plus momentum — MACD">
        <p>
          MACD is the 12-day EMA minus the 26-day EMA, with a 9-day signal line and a histogram of the gap
          between them. It confirms a trend rather than leading it: the histogram shrinking towards zero says
          the current move is slowing, often before the crossover prints.
        </p>
        <SignalTable
          rows={[
            ["Bullish crossover", "MACD line crosses above the signal line", "Momentum turning up"],
            ["Bearish crossover", "MACD crosses below the signal line", "Momentum turning down"],
            ["Zero-line cross", "MACD moves above or below zero", "Medium-term trend change"],
            ["Histogram divergence", "New price extreme, smaller histogram", "Move is running out of fuel"],
          ]}
        />
      </Section>

      <Section title="5. Volatility — Bollinger bands and ATR">
        <p>
          Bollinger bands sit two standard deviations either side of a 20-day average, so they widen when the
          market is volatile and squeeze when it is quiet. A squeeze precedes expansion but says nothing about
          direction — wait for the break. Average True Range measures the typical daily range and is the honest
          way to size a stop: a stop closer than roughly 1.5 ATR is usually noise, not risk control.
        </p>
      </Section>

      <Section title="6. Volume — the confirmation most people skip">
        <p>
          A breakout on below-average volume is a suspect breakout. Rising price on rising volume confirms
          demand; rising price on falling volume warns of a thin move. Climax volume after a long decline often
          marks capitulation, and On-Balance Volume or VWAP show whether accumulation is quietly under way.
        </p>
      </Section>

      <Section title="7. Putting it together — confluence">
        <p>
          Every professional framework asks the same three questions before a trade: what is the trend on the
          higher timeframe, does momentum agree, and does volume confirm. Two agreeing signals at a structural
          level beat six indicators that all repeat the same input. Define the entry, the stop that invalidates
          the idea and the target before entering, and size the position from the distance to the stop.
        </p>
        <p>
          Common mistakes: stacking correlated indicators, trading an oversold reading against a strong
          downtrend, ignoring the higher timeframe, and moving a stop after the fact.
        </p>
      </Section>

      <p className="mt-5 text-xs text-muted-foreground">
        Educational material only, not investment advice. Background reading:{" "}
        <a className="underline" href="https://www.fidelity.com/bin-public/060_www_fidelity_com/documents/learning-center/Understanding-Indicators-TA.pdf" target="_blank" rel="noreferrer">
          Fidelity, Understanding Indicators in Technical Analysis
        </a>{" "}
        and{" "}
        <a className="underline" href="https://us.etrade.com/knowledge/library/stocks/understanding-popular-technical-analysis-studies" target="_blank" rel="noreferrer">
          E*TRADE, Popular technical analysis studies
        </a>
        .
      </p>
    </AppShell>
  );
}
