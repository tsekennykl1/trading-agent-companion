# Report page toolbar, cleaner report content, full Chinese, report language, faster loading

## 1. Export buttons on the detailed report page

The top bar of the detailed report page gets **Markdown**, **HTML** and **Print / PDF**
buttons sitting right next to the EN / 繁中 switch.

- The page header gains an optional actions slot; only the report page fills it.
- The buttons save exactly what the page is showing: the cleaned-up report text as a
  Markdown file, a styled standalone HTML file, or a print dialog for PDF.
- Buttons stay disabled until the report has finished loading, and collapse into a
  compact row on phones.

## 2. Hide system information inside the report

Sections named **Artifacts** and **Raw** (plus other machine-only leftovers such as raw
payloads, run identifiers and log dumps) are dropped while the report is being formatted,
so the page shows only analysis content. The download links to those files stay where they
are today on the workbench, so nothing becomes unreachable.

## 3. Complete the Traditional Chinese translation

Translate everything still in English, mostly on the left rail:

- New analysis form: heading, helper line, Ticker, Analysis date, Research depth and its
  three options, Analyst team, the four analyst names, selected count, Run analysis,
  Stop run, "Agents are working…", the validation line.
- Agent progress: title, agent count, Completed / In progress / Pending rows, Not selected,
  status words, Show details / Hide details, and the statistics labels
  (LLM calls, Tool calls, Tokens in, Tokens out, Reports, Runtime).
- Decision panel, stance and confidence charts, chart data panel, artifact link labels,
  and the pop-up notices ("report is ready", run started, engine errors).

## 4. Report language selector

The New analysis form gets a **Report language** dropdown (English — default, Traditional
Chinese, Simplified Chinese). The choice is sent with the run so the engine can write its
reports in that language.

- Sent as `language`, `report_language`, `output_language` at the top level and inside
  `params`, matching how the other settings are already sent, so the backend can read
  whichever name it expects.
- If the backend ignores it, the run still works exactly as now — reports simply come back
  in English.
- Note: this only changes the language the engine writes in; the dashboard's own wording is
  controlled by the EN / 繁中 switch.

## 5. Faster, smoother loading

- Market data, chart data, each individual report and the artifact checks are all requested
  in parallel and each one is published to the screen the moment it lands, instead of
  waiting for the slowest request in the batch.
- Individual reports are fetched concurrently with a small cap so a long report list cannot
  flood the engine.
- The artifact loader becomes a single shared subscribable store: one polling loop feeds
  every panel that needs it, and each panel re-renders only when its own slice of data
  changes — no more whole-page refreshes on every poll tick.
- Already-final data is never re-requested.

## Technical notes

- `AppShell` takes an optional `actions` node rendered beside the language switch;
  `src/routes/report.tsx` passes the export buttons, lifting the cleaned Markdown out of
  `DetailedReport` through an `onContent` callback and reusing `buildHtmlReport`-style
  wrapping from `src/lib/trading-agents/report.ts`.
- `DetailedReport` drops system keys (`artifacts`, `raw`, `raw_*`, `run_id`, `logs`,
  `payload`, `request`) in `valueToMarkdown` / `cleanJsonLikeMarkdown`.
- New i18n keys added to both dictionaries in `src/lib/i18n.tsx`; analyst names and status
  words translated through lookup maps so the values sent to the engine stay English.
- `RunConfig.language` already exists; `runConfigPayload` in `client.ts` adds the language
  aliases, and `RunForm` exposes the dropdown.
- `useRunArtifacts` is refactored into an external store (`useSyncExternalStore`) with
  incremental per-source updates and a concurrency-limited report fetcher.
