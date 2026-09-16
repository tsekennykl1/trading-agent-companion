import type { PriceChartData } from "./chart-data";
import { TENCENT_HISTORY_RANGE, tencentHistoryRows } from "./tencent-history";
import { DEFAULT_STAGES } from "./types";
import type { RunRecord } from "./types";

/**
 * Sample run reproduced from a real TradingAgents CLI session
 * (0700.HK, 2026-09-11, DeepSeek). Used so the workbench can be
 * demonstrated and screenshotted without the engine running.
 */
export const SAMPLE_RUN: RunRecord = {
  id: "sample-0700hk-20260911",
  status: "completed",
  source: "sample",
  startedAt: "2026-08-31T11:21:04Z",
  config: {
    ticker: "0700.HK",
    analysisDate: "2026-08-31",
    provider: "DeepSeek",
    quickModel: "deepseek-flash",
    deepModel: "deepseek-flash",
    researchDepth: "Shallow",
    analysts: ["Market Analyst", "Sentiment Analyst", "News Analyst", "Fundamentals Analyst"],
    stages: [...DEFAULT_STAGES, "social", "news", "fundamentals"],
    language: "English",
  },
  agents: [
    { team: "Analyst Team", agent: "Market Analyst", status: "completed", time: "11:25:27", note: "Completed analysis for 2026-09-11" },
    { team: "Analyst Team", agent: "Sentiment Analyst", status: "completed", time: "11:25:32" },
    { team: "Analyst Team", agent: "News Analyst", status: "completed", time: "11:25:35" },
    { team: "Analyst Team", agent: "Fundamentals Analyst", status: "completed", time: "11:25:38" },
    { team: "Research Team", agent: "Bull Researcher", status: "completed", time: "11:25:41" },
    { team: "Research Team", agent: "Bear Researcher", status: "completed", time: "11:26:12" },
    { team: "Research Team", agent: "Research Manager", status: "completed", time: "11:26:44" },
    { team: "Trading Team", agent: "Trader", status: "completed", time: "11:27:02" },
    { team: "Risk Team", agent: "Aggressive Analyst", status: "completed", time: "11:27:31" },
    { team: "Risk Team", agent: "Conservative Analyst", status: "completed", time: "11:28:04" },
    { team: "Risk Team", agent: "Neutral Analyst", status: "completed", time: "11:28:39" },
    { team: "Portfolio Management", agent: "Portfolio Manager", status: "completed", time: "11:29:12" },
  ],
  prices: [
    { date: "2026-08-05", close: 492.2, ema10: 486.4, sma20: 480.1, sma50: 471.2 },
    { date: "2026-08-12", close: 470.6, ema10: 478.9, sma20: 476.4, sma50: 468.8 },
    { date: "2026-08-13", close: 452.8, ema10: 468.2, sma20: 470.9, sma50: 466.1 },
    { date: "2026-08-20", close: 448.1, ema10: 459.7, sma20: 464.3, sma50: 463.4 },
    { date: "2026-08-27", close: 441.3, ema10: 451.8, sma20: 456.2, sma50: 460.7 },
    { date: "2026-09-03", close: 436.9, ema10: 444.6, sma20: 449.8, sma50: 458.3 },
    { date: "2026-09-08", close: 431.5, ema10: 439.2, sma20: 445.6, sma50: 456.9 },
    { date: "2026-09-10", close: 421.9, ema10: 436.1, sma20: 443.4, sma50: 456.2 },
    { date: "2026-09-11", close: 428.4, ema10: 435.96, sma20: 442.25, sma50: 455.98 },
  ],
  stances: [
    { agent: "Market Analyst", stance: "bearish", score: -72 },
    { agent: "Bull Researcher", stance: "bullish", score: 78 },
    { agent: "Bear Researcher", stance: "bearish", score: -80 },
    { agent: "Research Manager", stance: "neutral", score: -8 },
    { agent: "Trader", stance: "neutral", score: -10 },
    { agent: "Aggressive Analyst", stance: "neutral", score: 18 },
    { agent: "Conservative Analyst", stance: "bearish", score: -34 },
    { agent: "Neutral Analyst", stance: "neutral", score: -5 },
    { agent: "Portfolio Manager", stance: "neutral", score: -12 },
  ],
  // Official HKEX names, so the offline sample titles match a real run.
  partial: {
    stockName: "Tencent Holdings Limited",
    stockNameEn: "TENCENT",
    stockNameZh: "騰訊控股",
    warnings: [],
  },
  stats: {
    llmCalls: 11,
    toolCalls: 13,
    tokensIn: 75200,
    tokensOut: 48800,
    reportsDone: 12,
    reportsTotal: 12,
    runtimeSeconds: 263,
  },
  decision: {
    action: "Hold",
    rating: "Hold",
    confidence: 62,
    consensus: "High",
    entryPrice: 428.4,
    takeProfit: 442.25,
    stopLoss: 411.9,
    positionSizing:
      "Maintain existing exposure at ~normal weight; add nothing at 428.40. If oversized, trim up to ~1/3 into the 436-442 cluster (10-EMA 435.96 / VWMA 441.05 / 20-SMA 442.25). Only add in tranches on a volume-backed close above 442.25; reduce on a decisive high-volume close below 419.40.",
    executiveSummary:
      "HOLD 0700.HK at HK$428.40 — maintain existing exposure at normal weight only if the position is not oversized; add nothing here and initiate no fresh shorts into support. Keep 411.90 (~1.5x ATR, at the June structure low) as the hard invalidation for the remaining core, and treat a decisive high-volume close below 419.40 as an early-warning reduce trigger (cut at least half). If oversized, trim up to one-third into the 436–442 cluster. Let the volatility coil resolve before committing new risk — resolution window roughly 1–3 months.",
    bullPoints: [
      "Price sits only 0.74% above the lower Bollinger band (425.24) and ~4.2% above the 411–414 June base — a three-month support shelf.",
      "The 2026-09-11 session opened at its low (419.40) and closed at 428.40, 78.9% up the day's range: rejection of lower prices, not a breakdown.",
      "Volatility is compressed — ATR down ~30% to 10.98 and Bollinger width roughly halved — a coil that typically precedes an expansion move.",
      "MACD at -7.13 is more extended than price, which sits just 1.77% below the 10-EMA: momentum is stretched beyond what price action justifies.",
      "One normal 1-ATR session (~2.5%) from 428.40 reaches ~439, putting the 441.05 VWMA within a single day's range.",
    ],
    bearPoints: [
      "Price trades below every reference average: 10-EMA 435.96, VWMA 441.05, 20-SMA 442.25, 50-SMA 455.98 and 200-SMA 507.90.",
      "The 200-SMA is itself falling — from 528.55 on 2026-08-12 to 507.90 on 2026-09-11 — a durable strategic downtrend, not a dip.",
      "A death cross (50 < 200) is in force and MACD histogram is re-widening to -1.48.",
      "The 09-11 hammer printed on just 15.63M shares versus the 66.4M capitulation on 08-13 — a pause, not confirmed demand.",
      "Overhead supply between 436 and 456 is real; the bull case needs a volume-backed reclaim of 442.25 before the trend argument changes.",
    ],
  },
  reports: {
    market_report: `## Multi-timeframe trend read — 0700.HK, 2026-09-11

This is a textbook, fully stacked bearish alignment — no timeframe offers a bullish counter-signal.

**Long-term (200-SMA = 507.90):** The 200-SMA is itself declining, from 528.55 (2026-08-12) to 507.90 (2026-09-11), a drop of ~20.7 points in one month. Every close in the entire May–September window (peak close 492.20 on 2026-08-05) sat below the 200-SMA. Price is ~15.7% below the 200-SMA.

**Medium-term (50-SMA = 455.98):** Nearly flat and acting as a ceiling; price ~6.1% below.

**Short-term (10-EMA = 435.96):** The fastest-falling line; price (428.40) ~1.7% below.

### Summary table

| Dimension | Indicator | Value (2026-09-11) | Signal |
| --- | --- | --- | --- |
| Short-term trend | close_10_ema | 435.96 | Bearish |
| Medium-term trend | close_50_sma | 455.98 | Bearish |
| Long-term trend | close_200_sma | 507.90 | Bearish |
| Momentum | MACD | -7.13 | Bearish |
| Volatility | ATR | 10.98 (-30%) | Compressing |

Conclusion: stand aside pending a volume-backed reclaim of 435.96, then 441–442.`,
    sentiment_report: `## Market sentiment

Investor sentiment is cautious rather than capitulatory. The weak trend and muted turnover keep conviction low, while the strong intraday recovery on 2026-09-11 suggests sellers are becoming less aggressive near support.

| Signal | Reading | Interpretation |
| --- | --- | --- |
| Price action | Close near session high | Mildly constructive |
| Participation | Below recent peak volume | Confirmation still absent |
| Overall tone | Cautious | Neutral to bearish |`,
    news_report: `## News review

Recent coverage does not provide a decisive near-term catalyst. The sample therefore gives greater weight to observable price, volume and risk controls than to headline momentum.

**Watch next:** company guidance, regulatory developments and evidence that improving operating trends can overcome the technical resistance cluster at HK$436–442.`,
    fundamentals_report: `## Fundamental perspective

Tencent remains a diversified platform business with durable cash generation, but this technical sample does not include enough fresh fundamental evidence to justify adding risk before price confirms.

| Area | Assessment |
| --- | --- |
| Business quality | Established, diversified platform |
| Valuation | Requires current earnings context |
| Balance-sheet risk | No immediate signal in this sample |
| Portfolio implication | Keep normal weight; wait for confirmation |`,
    bull_report: `**Pillar 1 — The confirmation tax.** The technical report concludes "stand aside", but that is internally inconsistent. It says bullish confirmation requires a close above 435.96, then above 441–442. If you wait for 442 you have surrendered 3.23% of the move and your stop is now 5.3% away instead of 2.1%. You cut your reward and doubled your risk to buy certainty. The bull gets paid precisely for absorbing the uncertainty the bear refuses to.

**Pillar 2 — The 2026-09-11 candle is a rejection, not a breakdown.** Open 419.40, Low 419.40, High 430.80, Close 428.40. The open was the low and the close was 78.9% of the way up the range.

**Pillar 3 — Location.** Price is 0.74% above the lower Bollinger band and ~4.2% above a three-month base at 411–414.

**Pillar 4 — The coil.** ATR ~11 and band width 7.7% means one normal day moves 2.5%. A single 1-ATR session from 428.40 reaches ~439. The VWMA at 441.05 — the bear's "distribution tell" — is 2.95% away. That's one good day.

**Pillar 5 — The bear's three best indicators are decaying, not strengthening.** MACD is a lagging oscillator and is currently more extended than price. MACD lows and price lows are coincident (no divergence). Coincident capitulation in momentum, at the lower band, on a hammer, on 76% volume decay, on top of a three-month support shelf. That is the setup, not the warning.

**Risk/reward:** blended R:R scaling out is roughly 3.7:1. What kills the thesis: a high-volume close below 411.00.

FINAL TRANSACTION PROPOSAL: BUY (staged, with 411.00 invalidation).`,
    bear_report: `Confirmation isn't a luxury — it's how you avoid catching a falling knife. Buying at 428 while price is below every moving average and MACD is making new lows isn't asymmetric, it's hopeful.

**The volume collapse is not seller exhaustion — it's a demand vacuum.** The 09-11 hammer printed on 15.63M shares against the 66.4M capitulation on 08-13. Thin volume at a low tells you nobody wants the stock, not that sellers are done.

**The coil is sitting at the bottom — and that's bearish until proven otherwise.** ATR is down ~30% and Bollinger width has roughly halved, but location matters. 0700.HK at 428.40 is just above the lower band at 425.24 and below the 10-EMA, VWMA, 20-SMA, 50-SMA and 200-SMA. That is not a coiled spring resting on a floor; it is a coiled spring compressed under a stack of resistance.

There is not "nothing but air" between 436 and 456 — that band holds the 10-EMA, VWMA, 20-SMA and the 50-SMA, every one of them a supply shelf.

The bull case requires 0700.HK to reclaim 435.96, then 441–442, on expanding volume. Until that happens the trend is down, overhead supply is real, and the burden of proof remains on the bulls.

FINAL TRANSACTION PROPOSAL: SELL / AVOID — no fresh long exposure; sell rallies into 436–442 or wait for a confirmed break below 419.40 to target 411–414. Bear case invalidated on a volume-backed close above 442.25.`,
    investment_plan: `**Recommendation:** Hold

**Rationale:** Both sides argued well and, unusually, converged on the two points that matter most: neither fresh longs at 428.40 nor fresh shorts into support offer acceptable risk/reward. The bull's reversal signals are unconfirmed on volume; the bear's trend evidence is real but already heavily discounted by a 15.7% discount to the 200-SMA and a halved band width.

The disciplined course is to hold a properly sized core with hard, pre-committed triggers rather than to pre-empt the break in either direction.

**Invalidation:** high-volume close below 411.00 (bear confirmation) or volume-backed close above 442.25 (bull confirmation).`,
    trader_plan: `**Action:** Hold

**Reasoning:** 0700.HK at HK$428.40 sits below every reference average (10-EMA 435.96, VWMA 441.05, 20-SMA 442.25, 50-SMA 455.98, 200-SMA 507.90) with a death cross in force, but rests directly on a three-month support shelf with volatility compressed ~30%. Neither direction offers good risk/reward at this exact price.

**Entry Price:** 428.40
**Stop Loss:** 411.90
**Position Sizing:** Maintain existing exposure at ~normal weight; add nothing at 428.40. If oversized, trim up to ~1/3 into the 436–442 cluster. Only add in tranches on a volume-backed close above 442.25; reduce on a decisive high-volume close below 419.40.

FINAL TRANSACTION PROPOSAL: HOLD`,
    risk_aggressive: `The coil at support is an option on an expansion move, and the 411.90 stop defines the downside precisely. I would not force a cut here, and I would not chase exits below 425. But I also cannot justify adding at 428.40 with every average overhead.

FINAL TRANSACTION PROPOSAL: HOLD`,
    risk_conservative: `Shorting into a three-month support shelf is poor risk/reward, so I will not press the bear case at this price. However, with no fundamental, sentiment or news coverage in this run, the evidence base is thin and I would prefer below-normal weight until 442.25 is reclaimed.

FINAL TRANSACTION PROPOSAL: HOLD (reduced weight bias)`,
    risk_neutral: `The trader's HOLD is the right base case, but both the aggressive and conservative versions overreach. The aggressive analyst treats a technical coil as an automatic bullish spring; the conservative analyst treats the same coil as a confirmed breakdown. The data supports neither extreme for 0700.HK at 428.40.

Keep normal weight with hard triggers at 419.40 (reduce) and 442.25 (add).

FINAL TRANSACTION PROPOSAL: HOLD`,
    final_decision: `## Portfolio Management Decision

**Rating: Hold**

All three risk analysts independently landed on Hold, and the convergence is genuine rather than a forced compromise. The trend evidence is one-sided and conceded even by the Aggressive analyst. But the same price is only 0.74% above the lower Bollinger band and ~4.2% above the 411–414 June base, with volatility compressed.

On sizing I favour the Neutral analyst over the Conservative analyst: forcing a cut to below-normal weight at a price resting on support, with a defined 411.90 invalidation, risks a whipsaw if 442.25 is reclaimed on volume. With no fundamental, sentiment or news data available to break the tie, the disciplined course is to maintain a survivable, properly sized position with pre-committed triggers.

FINAL TRANSACTION PROPOSAL: HOLD (bearish bias — no fresh long exposure; tactical short only on a confirmed break below 419.40, or sell into rallies toward 436–442; abandon the bear case on a volume-backed reclaim of 442).`,
  },
};

/**
 * Complete local chart payload so Sample never depends on the connected engine:
 * three years of real 0700.HK daily bars with every technical study computed in
 * the browser.
 */
const HISTORY_ROWS = tencentHistoryRows();
const LAST_BAR = HISTORY_ROWS[HISTORY_ROWS.length - 1];

export const SAMPLE_CHART_DATA: PriceChartData = {
  ticker: SAMPLE_RUN.config.ticker,
  analysisDate: SAMPLE_RUN.config.analysisDate,
  meta: {
    stockName: "Tencent Holdings Limited",
    stockCode: SAMPLE_RUN.config.ticker,
    rows: HISTORY_ROWS.length,
    range: `${TENCENT_HISTORY_RANGE.start} to ${TENCENT_HISTORY_RANGE.end}`,
    visibleStart: HISTORY_ROWS[Math.max(0, HISTORY_ROWS.length - 180)]?.date ?? TENCENT_HISTORY_RANGE.start,
    visibleEnd: TENCENT_HISTORY_RANGE.end,
    vwapMode: "rolling_vwap_20",
  },
  rows: HISTORY_ROWS,
  levels: {
    entry: LAST_BAR?.close ?? 455.2,
    stopLoss: 428.4,
    takeProfit: 487.5,
    support: [443.4, 428.4],
    resistance: [462.2, 487.5],
  },
  markers: [
    { date: "2026-08-13", kind: "sell", label: "High-volume breakdown", price: HISTORY_ROWS.find((r) => r.date === "2026-08-13")?.close ?? 452.8 },
    { date: TENCENT_HISTORY_RANGE.end, kind: "buy", label: "Support rejection", price: LAST_BAR?.close ?? 455.2 },
  ],
};


/**
 * Full detail report for the built-in sample so the Detail Report page works
 * with no engine and no internet.
 */
export const SAMPLE_DETAIL_REPORT = `# TradingAgents detail report — 0700.HK (Tencent Holdings Limited)

**Analysis date:** 2026-08-31 · **Sample run** · Generated offline for demonstration.

## 1. Final recommendation

| Field | Value |
| --- | --- |
| Action | Hold |
| Confidence | 62% |
| Consensus | High |
| Entry | HK$428.40 |
| Take profit | HK$442.25 |
| Stop loss | HK$411.90 |

Price sits below the 10-EMA, 50-SMA and 200-SMA, so the sample run declines to add
risk until a volume-backed reclaim of HK$436 is confirmed.

## 2. Market analyst

| Dimension | Indicator | Value | Signal |
| --- | --- | --- | --- |
| Short-term trend | 10-EMA | 435.96 | Bearish |
| Medium-term trend | 50-SMA | 455.98 | Bearish |
| Long-term trend | 200-SMA | 507.90 | Bearish |
| Momentum | MACD | -7.13 | Bearish |
| Volatility | ATR 14 | 10.98 | Compressing |

Volume on the recovery day (15.6M) is far below the 66.4M capitulation bar, so the
bounce lacks participation.

## 3. Sentiment and news

Sentiment is cautious rather than capitulatory: sellers are less aggressive near
support, but no headline catalyst is present. Coverage is balanced, so the sample
weights observable price, volume and risk controls above narrative.

## 4. Fundamentals

Tencent remains a diversified platform business with durable cash generation.
Nothing in the sample window changes the long-term earnings picture; the issue is
timing, not quality.

## 5. Research debate

**Bull case.** Valuation support, buyback capacity and a hammer candle at the lower
Bollinger band argue the drawdown is late-stage.

**Bear case.** Every trend filter is negative, each rally has been sold, and overhead
supply between 436 and 456 remains unabsorbed.

**Research manager.** The bear case is better evidenced today; wait for confirmation
rather than anticipating a turn.

## 6. Risk review

| Analyst | Stance | Note |
| --- | --- | --- |
| Aggressive | Neutral | Would scale in only below 415 with a hard stop |
| Conservative | Bearish | Prefers no exposure until price closes above the 50-SMA |
| Neutral | Neutral | Half-size starter is acceptable for long-horizon holders |

## 7. Portfolio manager decision

Hold existing exposure, add nothing new. Re-assess on a daily close above HK$442.25
with volume above the 20-day average, or on a close below HK$411.90, which invalidates
the support shelf and triggers the stop.

## 8. How to read this sample

Every number above is fixed demonstration data for 0700.HK. Run your own analysis from
the dashboard to replace it with live engine output.`;
