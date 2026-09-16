# Understanding this frontend

A guided tour of the React + TypeScript code in this project. Read it top to
bottom once, then use it as a map when you open a file.

---

## 1. The big picture

```text
Browser (this app) ──HTTP──┐
                           ├──> local engine ──> one queue and run history
AI assistant ──────MCP─────┘       │
                                   └──> TradingAgents + charts + reports
```

The frontend never runs any analysis itself. It:

1. sends a configuration (ticker, date, model, stages) to the engine,
2. polls the engine while the analysis runs,
3. draws whatever the engine has produced so far (progress, chart, reports),
4. lets you export the finished decision.

MCP is a second entrance to the same backend. An assistant calls `/mcp`; the MCP
tool calls the same Python service function as the matching HTTP route. Therefore
an assistant-created run appears in Dashboard and History without special frontend
state or another database. `McpConnectionNote` only explains this relationship and
shows the endpoint; it does not call MCP from React.

## 2. The building blocks

| Term | What it means here |
| --- | --- |
| **Component** | A function returning JSX (HTML-like markup). Example: `DecisionPanel`. |
| **Props** | The arguments a component receives: `<DecisionPanel decision={...} />`. |
| **State** | Values that change over time; created with `useState`. Changing state re-draws the component. |
| **Effect** | `useEffect` — code that runs after drawing, e.g. starting a timer or reading localStorage. |
| **Hook** | Any function starting with `use`. Hooks may only be called at the top level of a component. |
| **Query** | `useQuery` from TanStack Query: fetches data, caches it, and can re-fetch on a timer. |
| **Mutation** | `useMutation`: an action that changes something on the server (starting a run). |
| **TypeScript type** | A description of a data shape. It is checked at build time and disappears at runtime. |

## 3. Folder map

```text
src/
  routes/            one file per page (file name = URL)
    __root.tsx       the shell around every page (fonts, providers, toaster)
    index.tsx        "/"        the dashboard
    setup.tsx        "/setup"   the Connect page
    history.tsx      "/history" past runs
    report.tsx       "/report"  the detail report viewer
    about.tsx        "/about"
  components/
    ui/              shadcn building blocks (Button, Card, ...) — rarely edited
    workbench/       this app's own panels (chart, agent board, reports, ...)
  lib/
    trading-agents/  everything that talks to or interprets the engine
    i18n.tsx         English / Chinese text
  hooks/             small reusable pieces of logic
  styles.css         colours, fonts and design tokens
```

Routing is by file name: `src/routes/history.tsx` becomes `/history`. The file
`routeTree.gen.ts` is generated automatically — never edit it.

## 4. The data layer (`src/lib/trading-agents/`)

| File | Responsibility |
| --- | --- |
| `types.ts` | The shapes of a run, decision, config, stage list. Start here. |
| `client.ts` | The `api` object: one short function per engine endpoint. |
| `http.ts` | Which engine URL to use, how a request is sent, how errors read. |
| `run-payload.ts` | Builds the JSON body sent when you start an analysis. |
| `parse.ts` | Tiny helpers for reading messy JSON (numbers, titles, dates). |
| `normalize-run.ts` | Turns an engine run into the dashboard's `RunRecord`. |
| `chart-data.ts` | Readers for the price chart and market data. |
| `reports.ts` | Readers for the report endpoints. |
| `report-readiness.ts` | One rule: when is the final report really finished. |
| `useRunArtifacts.ts` | Fetches chart data, market data and report texts for a run. |
| `run-cache.ts` | Saves the latest analysis in the browser so a refresh keeps it. |
| `signals.ts`, `indicators.ts`, `report.ts` | Pure calculations and text building — no network. |
| `providers.ts` | The catalogue of AI providers and model names. |
| `sample-run.ts` | The demo run shown before you start your own. |

**Why the readers look repetitive:** engines differ in the exact JSON they
return, so each `readX` function accepts several spellings and returns one clean
type. The rest of the app then only ever sees the clean type.

### Concurrent requests are not extra browser threads

The browser already asks for independent market data, chart data and reports at
the same time with `Promise.all` in `useRunArtifacts.ts`. This is the simplest
and fastest approach for network work. A Web Worker would add another JavaScript
thread, but it would not make HTTP responses or the Python analysis finish
sooner. CPU-heavy parallel TradingAgents work therefore belongs in the engine.


## 5. How the dashboard works (`src/routes/index.tsx`)

The page itself is now almost pure layout. The moving parts live in two hooks:

- `useSavedRunConfig()` restores the last form you used.
- `useAnalysisRun()` (`src/hooks/useAnalysisRun.ts`) does the rest:
  1. `start(config)` posts the config; the engine replies with a run id.
  2. Two queries then poll — `run-status` (cheap readiness check) and `run`
     (the full payload, re-fetched only when the status changes).
  3. `useRunArtifacts(run)` fetches the chart and report files.
  4. It returns the run to show (live engine run, cached run, or `SAMPLE_RUN`)
     plus simple flags: `analysisBusy`, `chartReady`, `reportReady`, `allDone`.

Everything below that is presentation: `LiveSnapshot`, `AgentBoard`,
`DecisionPanel`, charts, `ReportsSection`, `ExportBar`.

`PageHeading` provides the repeated Back to Dashboard, title, description and
action layout used by secondary pages. The page files supply only their text and
buttons.

`AgentBoard` is the biggest panel, so it is split into named pieces inside
one file: `BusyBanner` (the "working on…" banner), `StatusCounts` (the
collapsed summary), `TeamList` (every agent grouped by team), `StageTimings`
(start / end / duration per stage) and `StatsGrid` (the counters). The
`AgentBoard` function itself only decides which of those to show.

All date and duration text comes from `src/lib/format.ts`
(`formatElapsed`, `formatDuration`, `formatClock`, `formatDateTime`) so every
screen shows the same English AM/PM style.

The chart area follows the same idea. `LiveSnapshot` gathers the available
market and chart data, while `SnapshotResults` only arranges the finished
decision and signal panels. `DecisionBadge` owns the Buy/Hold/Sell appearance,
and `PriceLevels` owns the repeated Entry/Target/Stop display. Small components
make each file easier to read and keep the two decision views consistent.

AI model visibility is kept in `llm-prefs.ts`. With no saved preference, local
Ollama, OpenAI-compatible endpoints, and AWS Bedrock stay hidden. Ticking one on
Setup saves an explicit list in the browser and makes it available in the New
Analysis form.


## 6. Reading any component

Every workbench component follows the same skeleton:

```tsx
export function DecisionCard({ decision }: { decision: Decision }) {
  const t = useT();                    // translation helper
  if (!decision) return null;          // nothing to show yet
  return <section className="panel">...</section>;
}
```

- `className` holds Tailwind utility classes; colours come from the tokens in
  `styles.css` (`bg-primary`, `text-muted-foreground`), never raw hex values.
- Text goes through `t("some.key")` so both languages stay in sync; the keys
  live in `src/lib/i18n.tsx`.

## 7. Suggested reading order

1. `src/lib/trading-agents/types.ts`
2. `src/routes/__root.tsx`
3. `src/routes/index.tsx`
4. `src/components/workbench/RunForm.tsx`
5. `src/components/workbench/SnapshotResults.tsx`
6. `src/components/workbench/DecisionCard.tsx`
7. `src/components/workbench/DecisionPanel.tsx`
8. `src/lib/trading-agents/client.ts` (only the `api` object at first)

## 8. Everyday commands

```bash
npm run dev    # start the dashboard on http://localhost:8080
npm run build  # production build
```
