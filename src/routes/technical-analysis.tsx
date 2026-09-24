import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { AppShell } from "@/components/workbench/AppShell";
import { PageHeading } from "@/components/workbench/PageHeading";
import { PlotlyPriceChart } from "@/components/workbench/PlotlyPriceChart";
import { SAMPLE_CHART_DATA } from "@/lib/trading-agents/sample-run";

const TITLE = "Technical analysis explained — My Trading Agents";
const DESCRIPTION =
  "A plain-language guide to the technical studies on the dashboard: market structure, trend, momentum, volatility and volume signals, plus a worked 0700.HK example chart.";

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

function Ref({ n }: { n: number }) {
  return <sup className="ml-0.5 align-super text-xs text-muted-foreground">[{n}]</sup>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel mt-5 p-4 sm:p-5">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}

function Callout({
  tone,
  title,
  children,
}: {
  tone: "buy" | "sell" | "warn" | "note";
  title: string;
  children: ReactNode;
}) {
  const toneClasses =
    tone === "buy"
      ? "border-emerald-500/40 bg-emerald-500/10"
      : tone === "sell"
        ? "border-rose-500/40 bg-rose-500/10"
        : tone === "warn"
          ? "border-amber-500/40 bg-amber-500/10"
          : "border-sky-500/40 bg-sky-500/10";

  return (
    <div className={`mt-3 rounded-md border p-3 ${toneClasses}`}>
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-sm text-foreground/90">{children}</div>
    </div>
  );
}

function Figure({
  src,
  alt,
  caption,
  credit,
  href,
}: {
  src: string;
  alt: string;
  caption: ReactNode;
  credit: ReactNode;
  href?: string;
}) {
  return (
    <figure className="mt-3">
      {/* Tip: for best reliability/performance, download and self-host these images.
          If you adapt CC BY-SA images, you must keep attribution + license and share-alike. */}
      <div className="overflow-hidden rounded-md border border-rule bg-muted/10">
        <img src={src} alt={alt} loading="lazy" className="h-auto w-full" />
      </div>
      <figcaption className="mt-2 text-xs leading-relaxed text-muted-foreground">
        <div>{caption}</div>
        <div className="mt-1">
          {href ? (
            <>
              <a className="underline" href={href} target="_blank" rel="noreferrer">
                {credit}
              </a>
            </>
          ) : (
            <>{credit}</>
          )}
        </div>
      </figcaption>
    </figure>
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

const IMAGES = {
  candleAnatomy: {
    src: "https://upload.wikimedia.org/wikipedia/commons/8/85/Candlestick_chart_scheme_02-en.svg",
    href: "https://commons.wikimedia.org/wiki/File:Candlestick_chart_scheme_02-en.svg",
    credit: "Probe-meteo.com (CC BY-SA 3.0) — Wikimedia Commons",
  },
  supportResistance: {
    src: "https://upload.wikimedia.org/wikipedia/commons/8/80/Support_and_Resistance.png",
    href: "https://commons.wikimedia.org/wiki/File:Support_and_Resistance.png",
    credit: "Jonlaw16 (CC BY-SA 4.0) — Wikimedia Commons",
  },
  movingAverageCrossover: {
    src: "https://upload.wikimedia.org/wikipedia/commons/e/ed/Moving_average_crossover.png",
    href: "https://commons.wikimedia.org/wiki/File:Moving_average_crossover.png",
    credit: "Henry Larkin (CC BY-SA 3.0) — Wikimedia Commons",
  },
  rsiExample: {
    src: "https://upload.wikimedia.org/wikipedia/commons/a/ac/Rsi.png",
    href: "https://commons.wikimedia.org/wiki/File:Rsi.png",
    credit: "Ehsan shahrjerdy (CC BY-SA 3.0) — Wikimedia Commons",
  },
  rsiDivergence: {
    src: "https://upload.wikimedia.org/wikipedia/commons/6/6e/Bitcoin_RSI14_Divergence.png",
    href: "https://commons.wikimedia.org/wiki/File:Bitcoin_RSI14_Divergence.png",
    credit: "Bundesstefan (CC BY-SA 4.0) — Wikimedia Commons",
  },
  macdExample: {
    src: "https://upload.wikimedia.org/wikipedia/commons/6/6a/MACD_example%2C_fast%3D12_slow%3D26_smooth%3D9.png",
    href: "https://commons.wikimedia.org/wiki/File:MACD_example,_fast%3D12_slow%3D26_smooth%3D9.png",
    credit: "Kevin Ryde (CC BY-SA) — Wikimedia Commons",
  },
  bollingerExample: {
    src: "https://upload.wikimedia.org/wikipedia/commons/8/89/Bollinger_bands_example%2C_2_stddevs.png",
    href: "https://commons.wikimedia.org/wiki/File:Bollinger_bands_example,_2_stddevs.png",
    credit: "Kevin Ryde (CC BY-SA) — Wikimedia Commons",
  },
} as const;

function TechnicalAnalysisPage() {
  // Three real years of 0700.HK, computed in the browser, so the example works offline.
  const chart = useMemo(() => SAMPLE_CHART_DATA, []);

  return (
    <AppShell>
      <PageHeading
        backToDashboard
        title="Technical analysis: theory and important signals"
        description={
          <>
            Technical analysis reads price, volume and derived studies to judge the{" "}
            <span className="font-medium">direction</span>, <span className="font-medium">strength</span> and{" "}
            <span className="font-medium">exhaustion</span> of a move. Indicators do not “predict”; they
            summarize what has already happened, so their value comes from a repeatable process: (1) identify
            structure, (2) confirm trend, (3) check momentum, (4) respect volatility, and (5) demand volume
            confirmation.
          </>
        }
      />

      <section className="panel mt-5 p-3 sm:p-4">
        <h2 className="font-display text-xl font-semibold">Worked example — 0700.HK, three years</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The same chart the dashboard draws. Price with moving averages and Bollinger bands on top; RSI, MACD
          and volume in the panels below. Hover any point to read the exact values.
        </p>
        <div className="mt-3 min-w-0">
          <PlotlyPriceChart
            chart={chart}
            height="clamp(28rem, 68vh, 46rem)"
            levels={chart.levels}
            visible={["sma50", "sma200", "bollinger", "rsi", "macd", "volume", "levels"]}
          />
        </div>
      </section>

      <Section title="0. A fast, repeatable way to read any chart (60–90 seconds)">
        <ol className="ml-4 list-decimal space-y-1">
          <li>
            <span className="font-medium">Timeframe & context:</span> What is your holding period (days vs.
            months), and is the market trending or ranging?
          </li>
          <li>
            <span className="font-medium">Structure first:</span> Mark the most obvious swing highs/lows and
            the nearest support/resistance band.
          </li>
          <li>
            <span className="font-medium">Trend:</span> Is price above or below key moving averages, and are
            they rising/falling?
          </li>
          <li>
            <span className="font-medium">Momentum:</span> Is RSI/MACD confirming the move or diverging?
          </li>
          <li>
            <span className="font-medium">Volatility:</span> Are bands/ATR expanding (harder stops, wider
            swings) or contracting (breakout risk)?
          </li>
          <li>
            <span className="font-medium">Volume:</span> Do “important” candles (breakouts, breakdowns,
            reversals) print with above-average volume?
          </li>
          <li>
            <span className="font-medium">Plan:</span> Define entry trigger, invalidation level (stop), and
            target before you click buy/sell.
          </li>
        </ol>

        <Callout tone="note" title="Why this order matters">
          Indicators are derived from price/volume. If you start with indicators, you can talk yourself into
          trades that violate obvious structure. Start with structure, then use indicators as confirmation.
        </Callout>
      </Section>

      <Section title="1. Candlesticks: what one bar can tell you">
        <p>
          Most of the dashboard signals ultimately come from the same four numbers each bar carries:{" "}
          <span className="font-medium">open</span>, <span className="font-medium">high</span>,{" "}
          <span className="font-medium">low</span>, and <span className="font-medium">close</span>. The body
          shows open-to-close; wicks show extremes. Long wicks near a level often mean rejection; a series of
          large bodies in one direction often means urgency and trend continuation.
        </p>

        <Figure
          src={IMAGES.candleAnatomy.src}
          alt="Diagram showing the anatomy of a candlestick: open, close, high, low, body and wicks."
          caption={
            <>
              Candlestick anatomy: bodies and wicks help you see buying/selling pressure and rejection at
              levels. <Ref n={1} />
            </>
          }
          credit={IMAGES.candleAnatomy.credit}
          href={IMAGES.candleAnatomy.href}
        />

        <Callout tone="warn" title="Common warning sign: big wick into resistance/support">
          A strong push into a level that closes back inside the range (long wick) is often a sign of
          absorption/rejection. Treat it as a <span className="font-medium">warning</span>, then look for
          confirmation (momentum shift, failed retest, or volume climax).
        </Callout>
      </Section>

      <Section title="2. Market structure, support and resistance">
        <p>
          An uptrend is a sequence of higher highs and higher lows; a downtrend is the opposite.{" "}
          <span className="font-medium">Support</span> is a price band where buyers repeatedly appeared,{" "}
          <span className="font-medium">resistance</span> is where sellers did. Levels are zones (bands), not
          single ticks. When a key level breaks, the most informative event is often the{" "}
          <span className="font-medium">retest</span>: does prior resistance hold as support (bullish), or does
          prior support fail as resistance (bearish)?
        </p>

        <Figure
          src={IMAGES.supportResistance.src}
          alt="Example chart marking multiple support and resistance levels with green and red arrows."
          caption={
            <>
              Support/resistance zones: repeated reactions at horizontal bands define structure. Breaks and
              retests are often more meaningful than a single strong day. <Ref n={2} />
            </>
          }
          credit={IMAGES.supportResistance.credit}
          href={IMAGES.supportResistance.href}
        />

        <Callout tone="buy" title="Typical ‘buy’ structure setup (example)">
          Break above resistance → pull back (retest) → hold the old level → then break the pullback high. The
          “signal” is not the indicator; it’s the market proving the level.
        </Callout>

        <Callout tone="sell" title="Typical ‘sell / risk-off’ structure setup (example)">
          Break below support → retest from below and fail → then make a lower low. Again, the key is the
          retest failing, not any single candle.
        </Callout>
      </Section>

      <Section title="3. Trend — moving averages (SMA/EMA)">
        <p>
          A moving average is a smoothing line. A simple moving average (SMA) is the mean close over a window;
          an exponential moving average (EMA) weights recent days more heavily, so it turns sooner. Many
          traders use a long-period average (e.g., 200) as a rough regime filter and shorter averages (e.g.,
          20/50) for pullbacks and trend continuation. <Ref n={8} />
        </p>

        <Figure
          src={IMAGES.movingAverageCrossover.src}
          alt="Example line chart showing a shorter moving average crossing above a longer moving average with a 'buy' label."
          caption={
            <>
              Moving-average crossover (illustrative): a faster average crossing above a slower average is
              commonly read as trend improvement; crossing down is commonly read as trend deterioration. <Ref n={3} />
            </>
          }
          credit={IMAGES.movingAverageCrossover.credit}
          href={IMAGES.movingAverageCrossover.href}
        />

        <SignalTable
          rows={[
            ["Golden cross", "50-day average crosses above the 200-day", "Trend turning up; slow but often steadier"],
            ["Death cross", "50-day crosses below the 200-day", "Trend turning down; risk-off"],
            ["Stacked averages", "10 > 50 > 200, all rising", "Strongest trend alignment"],
            ["Pullback to the average", "Price dips to a rising 20 or 50 and holds", "Classic continuation setup"],
            ["Slope matters", "Average rises/falls clearly", "Slope = regime; flat = range and chop"],
          ]}
        />

        <Callout tone="warn" title="Warning: moving averages are lagging">
          Averages confirm what already happened. In fast reversals or ranges, they can generate late entries
          and frequent whipsaws. Treat crossovers as <span className="font-medium">trend confirmation</span>,
          not as an isolated “buy” or “sell” button. <Ref n={8} />
        </Callout>
      </Section>

      <Section title="4. Momentum — RSI (Relative Strength Index)">
        <p>
          RSI is a bounded oscillator (0–100) that compares recent gains and losses (often over 14 periods). A
          classic reading is above 70 “overbought” and below 30 “oversold”, but extremes alone are not entries
          because strong trends can keep RSI elevated or depressed for long stretches. A higher-value RSI idea
          is <span className="font-medium">divergence</span>: price makes a new extreme while RSI fails to
          confirm, suggesting momentum is fading. <Ref n={8} />
        </p>

        <Figure
          src={IMAGES.rsiExample.src}
          alt="Price chart with RSI indicator panel below showing typical RSI lines and 30/70 threshold bands."
          caption={
            <>
              RSI in a typical chart layout: RSI thresholds are easy to see, but the underlying trend context
              changes how you interpret “overbought/oversold.” <Ref n={7} <Ref n={8} />
            </>
          }
          credit={IMAGES.rsiExample.credit}
          href={IMAGES.rsiExample.href}
        />

        <SignalTable
          rows={[
            ["Bullish divergence", "Lower price low, higher RSI low", "Downside momentum exhausting; watch for reversal structure"],
            ["Bearish divergence", "Higher price high, lower RSI high", "Rally losing power; watch for lower high / breakdown"],
            ["50-line cross", "RSI moves through ~50", "Momentum ‘ownership’ shifting"],
            ["Failure swing", "RSI fails to reach prior extreme", "Early reversal warning (needs structure confirmation)"],
          ]}
        />

        <Figure
          src={IMAGES.rsiDivergence.src}
          alt="Example chart showing bearish divergence between price and RSI, used as a sell or warning signal."
          caption={
            <>
              Divergence example (warning/sell context): price continues higher while RSI trends lower. Divergence
              is best treated as a <span className="font-medium">warning</span> until structure breaks. <Ref n={6} />
            </>
          }
          credit={IMAGES.rsiDivergence.credit}
          href={IMAGES.rsiDivergence.href}
        />

        <Callout tone="warn" title="Practical RSI rule: use it to time, not to fight, the trend">
          In uptrends, RSI often finds support around mid-range levels and re-accelerates; in downtrends it can
          fail around mid-range levels. That’s why combining RSI with structure (break/retest) is more robust
          than trading “30/70” in isolation. <Ref n={8} />
        </Callout>
      </Section>

      <Section title="5. Trend plus momentum — MACD">
        <p>
          MACD is derived from the difference between two EMAs (commonly 12 and 26), plus a signal line (often a
          9-period EMA of MACD). It is customarily shown with two lines and a histogram (the gap between MACD and
          signal). Traders often read (1) signal-line crossovers, (2) zero-line crosses, and (3) histogram
          expansion/contraction as momentum strengthening/weakening. <Ref n={8} />
        </p>

        <Figure
          src={IMAGES.macdExample.src}
          alt="Example chart with MACD indicator below showing two lines and a histogram."
          caption={
            <>
              MACD example with histogram: shrinking histogram bars can be an early “move is slowing” clue; the
              crossover is a later confirmation. <Ref n={4} />
            </>
          }
          credit={IMAGES.macdExample.credit}
          href={IMAGES.macdExample.href}
        />

        <SignalTable
          rows={[
            ["Bullish crossover", "MACD line crosses above the signal line", "Momentum turning up (best with structure break up)"],
            ["Bearish crossover", "MACD crosses below the signal line", "Momentum turning down (best with structure break down)"],
            ["Zero-line cross", "MACD moves above/below zero", "Medium-term trend change confirmation"],
            ["Histogram fade", "Histogram shrinks toward zero", "Warning: momentum is decelerating"],
          ]}
        />

        <Callout tone="note" title="MACD is a ‘trend-momentum’ tool (not a magic reversal detector)">
          Many false signals happen when you trade MACD crossovers inside a range. In ranges, prioritize structure
          boundaries + volatility contraction/expansion; in trends, MACD is more useful for “is the move still
          healthy?”
        </Callout>
      </Section>

      <Section title="6. Volatility — Bollinger bands and ATR">
        <p>
          Bollinger bands are envelopes around a moving average plotted at a standard-deviation distance, so
          they widen when volatility rises and tighten when volatility falls. A “squeeze” (tight bands) often
          precedes expansion but says nothing about direction—wait for the break and then use structure (level
          + retest) to avoid chasing false moves. <Ref n={8} />
        </p>

        <Figure
          src={IMAGES.bollingerExample.src}
          alt="Example chart showing Bollinger Bands around price with a middle moving average line."
          caption={
            <>
              Bollinger bands: the middle line is a moving average and the outer bands widen/narrow with
              volatility. Tight bands can precede a large move, but direction still needs confirmation. <Ref n={5} <Ref n={8} />
            </>
          }
          credit={IMAGES.bollingerExample.credit}
          href={IMAGES.bollingerExample.href}
        />

        <Callout tone="warn" title="Stops: use volatility, not feelings">
          Average True Range (ATR) is the honest way to size a stop: if your stop sits inside “normal daily
          noise,” you’ll be stopped out even when your idea is right. A common practice is to place stops
          beyond structure by some fraction/multiple of ATR—then size the position to keep risk constant. <Ref n={8} />
        </Callout>
      </Section>

      <Section title="7. Volume — the confirmation most people skip">
        <p>
          Volume is the audit trail. Breakouts on below-average volume are suspect; breakouts with strong
          volume are more credible. Rising price on rising volume confirms demand; rising price on falling
          volume warns of a thin move. Volume indicators (OBV, MFI, Accumulation/Distribution) often act as{" "}
          <span className="font-medium">warnings</span> via divergence rather than precise entry triggers. <Ref n={8} />
        </p>

        <Callout tone="warn" title="Warning: ‘breakout’ without participation">
          If price clears a well-watched level but volume is flat or declining, treat it as “needs proof.”
          A clean retest with renewed volume is often a higher-quality confirmation than chasing the first push.
        </Callout>
      </Section>

      <Section title="8. Putting it together — confluence (buy/sell/warning cheat-sheet)">
        <p>
          A robust framework asks three questions before a trade: what is the trend on the higher timeframe,
          does momentum agree, and does volume confirm. Two agreeing signals at a structural level beat six
          indicators that all repeat the same input. <Ref n={8} />
        </p>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-md border border-rule bg-muted/10 p-3">
            <div className="text-sm font-semibold">Buy-leaning confluence (example)</div>
            <ul className="mt-2 ml-4 list-disc space-y-1 text-sm text-foreground/90">
              <li>Price reclaims resistance and holds it on retest</li>
              <li>Trend filter improves (rising MA / bullish crossover)</li>
              <li>Momentum improves (RSI > ~50 or MACD histogram expands)</li>
              <li>Volume expands on the breakout day or the retest</li>
            </ul>
          </div>

          <div className="rounded-md border border-rule bg-muted/10 p-3">
            <div className="text-sm font-semibold">Sell-leaning confluence (example)</div>
            <ul className="mt-2 ml-4 list-disc space-y-1 text-sm text-foreground/90">
              <li>Support breaks and fails on retest from below</li>
              <li>Trend filter deteriorates (falling MA / bearish crossover)</li>
              <li>Momentum weakens (RSI fails at mid-range, MACD crosses down)</li>
              <li>Down days show heavier volume than up days</li>
            </ul>
          </div>

          <div className="rounded-md border border-rule bg-muted/10 p-3">
            <div className="text-sm font-semibold">Warnings (reduce risk / wait)</div>
            <ul className="mt-2 ml-4 list-disc space-y-1 text-sm text-foreground/90">
              <li>Divergence (price makes new extreme; RSI/MACD fails to confirm)</li>
              <li>Volatility squeeze into a major level (expect expansion)</li>
              <li>Breakout without volume participation</li>
              <li>Indicators disagree across timeframes (daily bullish, weekly bearish)</li>
            </ul>
          </div>
        </div>

        <Callout tone="note" title="Risk management is part of the ‘signal’">
          A setup is only tradable if you can place an invalidation level (stop) at a logical structure point
          and size the position so the loss is acceptable. If you can’t do that, it’s not a trade—just an idea.
        </Callout>

        <p className="mt-3">
          Common mistakes: stacking correlated indicators, trading an oversold reading against a strong
          downtrend, ignoring the higher timeframe, and moving a stop after the fact.
        </p>
      </Section>

      <Section title="References (APA 7)">
        <p className="text-sm text-muted-foreground">
          Note: Many images below are Creative Commons Attribution-ShareAlike (CC BY-SA). If you adapt them,
          you must keep attribution + license and (for SA) share your derivative under a compatible license.
        </p>

        <ol className="mt-3 ml-5 list-decimal space-y-2 text-sm">
          <li>
            Probe-meteo.com. (2013, May 12). <em>Candlestick chart scheme 02-en</em> [SVG image]. Wikimedia
            Commons. https://commons.wikimedia.org/wiki/File:Candlestick_chart_scheme_02-en.svg
          </li>
          <li>
            Jonlaw16. (2021, June 22). <em>Support and Resistance</em> [PNG image]. Wikimedia Commons.
            https://commons.wikimedia.org/wiki/File:Support_and_Resistance.png
          </li>
          <li>
            Larkin, H. (2012, April 25). <em>Moving average crossover</em> [PNG image]. Wikimedia Commons.
            https://commons.wikimedia.org/wiki/File:Moving_average_crossover.png
          </li>
          <li>
            Ryde, K. (2006, March 1). <em>MACD example, fast=12 slow=26 smooth=9</em> [PNG image]. Wikimedia
            Commons. https://commons.wikimedia.org/wiki/File:MACD_example,_fast%3D12_slow%3D26_smooth%3D9.png
          </li>
          <li>
            Ryde, K. (2006, February 16). <em>Bollinger bands example, 2 stddevs</em> [PNG image]. Wikimedia
            Commons. https://commons.wikimedia.org/wiki/File:Bollinger_bands_example,_2_stddevs.png
          </li>
          <li>
            Bundesstefan. (2021, April 30). <em>Bitcoin RSI14 Divergence</em> [PNG image]. Wikimedia Commons.
            https://commons.wikimedia.org/wiki/File:Bitcoin_RSI14_Divergence.png
          </li>
          <li>
            shahrjerdy, E. (2013, May 3). <em>Rsi</em> [PNG image]. Wikimedia Commons.
            https://commons.wikimedia.org/wiki/File:Rsi.png
          </li>
          <li>
            Fidelity Brokerage Services LLC. (2020). <em>Understanding indicators in technical analysis</em>{" "}
            [PDF]. Fidelity Investments.
            https://www.fidelity.com/bin-public/060_www_fidelity_com/documents/learning-center/Understanding-Indicators-TA.pdf
          </li>
          <li>
            E*TRADE from Morgan Stanley. (2024, October 25). <em>Understanding popular technical analysis studies</em>.
            https://us.etrade.com/knowledge/library/stocks/understanding-popular-technical-analysis-studies
          </li>
        </ol>
      </Section>

      <p className="mt-5 text-xs text-muted-foreground">
        Educational material only, not investment advice.
      </p>
    </AppShell>
  );
}