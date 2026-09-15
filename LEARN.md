# Understanding this frontend

A guided tour of the React + TypeScript code in this project. Read it top to
bottom once, then use it as a map when you open a file.

---

## 1. The big picture

```text
Browser (this app)  ──HTTP──>  your local engine (FastAPI, port 8000)
   React components              TradingAgents analysis + artifacts
```

The frontend never runs any analysis itself. It:

1. sends a configuration (ticker, date, model, stages) to the engine,
2. polls the engine while the analysis runs,
3. draws whatever the engine has produced so far (progress, chart, reports),
4. lets you export the finished decision.

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

`AgentBoard` is the biggest panel, so it is split into named pieces inside
one file: `BusyBanner` (the "working on…" banner), `StatusCounts` (the
collapsed summary), `TeamList` (every agent grouped by team), `StageTimings`
(start / end / duration per stage) and `StatsGrid` (the counters). The
`AgentBoard` function itself only decides which of those to show.

All date and duration text comes from `src/lib/format.ts`
(`formatElapsed`, `formatDuration`, `formatClock`, `formatDateTime`) so every
screen shows the same English AM/PM style.


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
5. `src/components/workbench/DecisionPanel.tsx`
6. `src/lib/trading-agents/client.ts` (only the `api` object at first)

## 8. Everyday commands

```bash
npm run dev    # start the dashboard on http://localhost:8080
npm run build  # production build
```
