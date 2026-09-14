# Make the chart tell the whole story

Right now the chart shows price, volume and RSI, and the recommendation lives in a separate box lower down. The biggest win is to bring the decision, the trade levels and the reasoning onto and around the chart — no new indicators needed.

## What you'll see

**1. Trade levels drawn on the chart**
Entry, stop loss and take-profit shown as labelled horizontal lines, with a soft green band above entry (profit zone) and a soft red band below (risk zone). Support and resistance levels appear as dashed labelled lines when the engine provides them.

**2. A decision card pinned beside the chart**
Buy / Hold / Sell badge with colour, a confidence meter, risk level, time horizon and a one-line rationale — visible without scrolling.

**3. Signal markers on the candles**
Triangle markers for buy/sell signals, dots where the moving averages cross, and small flags where RSI enters overbought or oversold. Hovering explains each one.

**4. A "Why this signal?" panel**
Top bullish reasons and top bearish reasons, pulled from the reports the engine has already produced, in two short lists instead of long prose.

**5. Score gauges above the chart**
Compact readouts for bullishness, conviction and risk, filled in only when the engine supplies them.

Everything degrades quietly: if the engine sends no levels, no markers or no scores, that piece simply doesn't appear and the chart looks exactly as it does today.

## Order of work

1. Trade levels + zones on the chart (biggest visual gain)
2. Decision card beside the chart
3. Signal markers
4. Why-this-signal panel
5. Score gauges

## Technical notes

- Extend `PriceChartData` and `Decision` in `src/lib/trading-agents/types.ts` with optional `levels` (entry, stop, target, support[], resistance[]), `markers[]` (date, kind, label), `scores` (bullishness, conviction, risk), `horizon`, `rationale`.
- Parse these defensively in `normalizeRun` / `readPriceChart` (`src/lib/trading-agents/client.ts`), accepting both snake_case and camelCase, and both the run object and the `/decision` endpoint. Missing fields stay `undefined`.
- `PlotlyPriceChart.tsx`: add Plotly `shapes` for level lines and filled rect zones, `annotations` for labels, and a scatter trace with triangle/circle symbols for markers, all on the price axis. Marker fallback: derive MA-cross and RSI 70/30 crossings client-side from existing rows when the engine sends none.
- New `DecisionCard` and `SignalReasons` components in `src/components/workbench`, rendered in `LiveSnapshot.tsx` as a right-hand column on `xl` and stacked below the chart on smaller screens.
- Reason extraction reuses the existing markdown parsing in `src/lib/trading-agents/report.ts` — pull bullet lists under bullish/bearish/risk headings from the reports already fetched by `useRunArtifacts`.
- No backend change required; all additions are optional-field reads.
