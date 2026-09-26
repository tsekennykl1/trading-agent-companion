# Responsive dashboard

- [x] Make the shared header and page spacing work on iPhone portrait.
- [x] Reflow forms, decisions, progress, charts, reports, and export controls.
- [x] Apply mobile layouts to Simple dashboard, Connect engine, and About pages.
- [x] Verify all routes at iPhone portrait size and confirm a clean build.

# Analysis loading state

- [x] Replace the sample-run button with an animated analysis status message.
- [x] Show a loading overlay while the live analysis is running.
- [x] Remove the bridge URL hydration mismatch causing React error 418.
- [x] Verify the loading state and mobile layout.

# Progressive rendering
- [x] Show market snapshot and warnings from partial results while polling.
- [x] Embed the engine's price chart (interactive iframe or image) once ready.
- [x] Collapse reports by default with a one-line availability status.

# Report readability and chart priority
- [x] Move the market snapshot and chart to a wider position at the top.
- [x] Collapse the portfolio decision and each report behind availability rows.
- [x] Separate bullish signals and bearish risks into independent collapsed sections.
- [x] Improve generated report heading and paragraph spacing.
- [x] Derive confidence from agent agreement when the engine omits it.
- [x] Verify desktop and iPhone layouts and confirm a clean build.

# Chart indicators and report controls
- [x] Add price, volume, and RSI panels to Python-generated charts.
- [x] Add Agent reports Show All/Hide All title-row control.
- [x] Apply available, unavailable, and generating status colors.
- [x] Verify desktop, iPhone portrait, and a clean build.

# Detailed report presentation

- [x] Replace the raw artifact frame with a readable formatted report.
- [x] Keep the detailed report collapsed until requested.
- [x] Decode nested JSON/HTML report wrappers into headings, lists, tables, and paragraphs.

# Report cleanup and confidence correction

- [x] Remove JSON punctuation, empty fields, and quoted values from detailed reports.
- [x] Open the portfolio management decision by default.
- [x] Use agent agreement when the backend returns zero confidence with available stances.

# Compact layout and analyst selection

- [x] Move run settings into a highlighted full-width section near the top.
- [x] Present agent progress and structured report fields as compact tables.
- [x] Send analyst selections in both legacy and enhanced backend request fields.
- [x] Verify analyst request payloads, desktop/iPhone layouts, and a clean preview build.

# Report table fit and Simple dashboard results

- [x] Fit structured report Field columns to their labels instead of splitting tables evenly.
- [x] Use normalized live-run data and independent chart discovery in the Simple dashboard.
- [x] Show recommendation summary, confidence, and report availability in the Simple dashboard.
- [x] Verify report proportions, desktop/iPhone layouts, and a clean preview build.

# Responsive two-column trading workbench

- [x] Reorganize the laptop Workbench into a compact control rail and wider analysis workspace.
- [x] Keep tablet and phone layouts stacked, touch-friendly, and free of page-level overflow.
- [x] Adjust compact form, progress, confidence, and chart sizing for their responsive containers.
- [x] Verify laptop, iPad portrait/landscape, iPhone landscape/portrait, and a clean preview build.

# Compact results and complete decision data

- [x] Place report actions at the top-left of the main results column.
- [x] Pair stance and confidence responsively, with stance opening when data arrives.
- [x] Add collapsed summary, bullish, and bearish report controls.
- [x] Parse and display entry, target, and stop from common backend response shapes.
- [x] Verify desktop/mobile presentation and a clean preview build.

# Translate report roles and tighten dashboard layout

- [x] Translate standard report titles, agent roles, and team names with the interface language.
- [x] Align stance and confidence panels and enlarge their charts.
- [x] Place report actions beside the page title and move the market chart upward.
- [x] Put Annotations after OBV and remove its redundant All checkbox.
- [x] Verify English/Traditional Chinese, desktop/mobile layouts, and a clean preview build.

# Detail report controls and collapsible confidence

- [x] Rename and enlarge the Detail Report heading.
- [x] Hide report actions until the detailed report file is ready.
- [x] Keep export actions at the top-right of the detail page.
- [x] Add a Show/Hide control to Recommendation confidence.
- [x] Enlarge and bold the New analysis heading.
- [x] Verify ready/loading states, navigation back, responsive layouts, and a clean build.

# Final report controls and navigation cleanup

- [x] Allow completed reports from the connected local engine to expose their report controls.
- [x] Remove Connect engine and About from the main navigation.
- [x] Use the clickable connection badge as the setup entry point and move About to the footer.
- [x] Verify completed/loading report states and desktop/mobile layout.

# Grouped company context and progress

- [x] Group Company of Interest, Asset Type, Instrument Context, Trade Date, and Sender into one report row.
- [x] Hide completed agents by default while preserving active and pending rows.
- [x] Merge analysis status and agent progress into one panel.
- [x] Verify desktop/mobile presentation and a clean build.

# Compact chart controls and saved analysis

- [x] Place the chart range choices in the Technical Analysis header.
- [x] Open Final Trade Decision automatically when content is available.
- [x] Cache the latest engine run and retrieved artifacts in browser storage.
- [x] Verify restoration, refresh behavior, responsive layout, and a clean build.

# Agent report ordering and defaults

- [x] Move Company of Interest to the top of Agent Reports.
- [x] Open Company of Interest and Final Trade Decision by default.
- [x] Keep every other report collapsed by default.
- [x] Verify report ordering, default visibility, responsive layout, and a clean build.

# Reliable progressive analysis pipeline

- [x] Add lightweight versioned readiness polling with conditional requests.
- [x] Add progressive report publication and final readiness ordering.
- [x] Replace per-run daemon threads with a durable bounded worker queue.
- [x] Add canonical secure artifact URL configuration and deployment guidance.
- [x] Refresh frontend data only when the backend version changes and expire removed cached runs.

# Persistent stage opt-outs

- [x] Preserve empty and partial stage selections in the submitted request and returned run.
- [x] Keep analyst and stage choices across layout changes and refreshes.
- [x] Avoid fetching individual reports for unticked stages and mark them Not selected.
- [x] Verify the request, refresh persistence, report ordering, responsive layout, and clean preview.

# Stage timing and concurrent risk review

- [x] Record live start, end, duration, status, and execution state for every selected stage.
- [x] Show a compact stage timing panel on the workbench and identify the slowest completed stage.
- [x] Keep each run's selected stages immutable while preserving the next-run form choices across refreshes.
- [x] Execute the three risk viewpoints concurrently within each debate round and merge them deterministically.
- [x] Test timing persistence, stage accuracy, parallel speed, responsive layout, and clean frontend/backend builds.

# Dashboard controls and report fit

- [x] Make Clear show an empty dashboard until a new analysis starts.
- [x] Add persistent font-size controls and keep report tables readable at every size.
- [x] Clean stray backslashes from reports and rename the report return action.
- [x] Extend Ready notices to three seconds and improve the connection link cue.
- [x] List only configured LLM providers in New Analysis and submit their models.
- [x] Fix and reposition the New Analysis show/hide control.
- [x] Add a prominent stock/date heading above charts and compact consensus charts.
- [x] Improve entry, target, and stop-loss extraction from backend decisions.
- [x] Verify desktop/mobile behavior and current diagnostics.

# Chart-area analysis form and complete sample

- [x] Move New Analysis from the left rail to directly above the chart.
- [x] Add a Sample action beside Clear that restores the built-in demonstration.
- [x] Include a self-contained interactive sample chart and all agent reports.
- [x] Verify Clear, Sample, and New Analysis on desktop and phone with clean diagnostics.

# Full-width responsive layout and frontend tuning

- [x] Use the full screen width with responsive page spacing and chart heights.
- [x] Rename History to Historical Analysis and place return actions above page titles.
- [x] Stop inactive History refreshes and completed artifact polling.
- [x] Simplify shared page headings and dashboard action handlers.
- [x] Verify phone, tablet, laptop, and wide-desktop layouts with clean diagnostics.

# Full-width decision and beginner-friendly code

- [x] Let the chart decision and signal panels use the full available width.
- [x] Hide Ollama from the AI model list until explicitly enabled.
- [x] Share decision badges and price-level presentation between result views.
- [x] Split the chart results from the large live snapshot component and update the learning guide.
- [x] Verify desktop and phone layouts, provider defaults, and a clean build.

# Backend MCP and dashboard documentation

- [x] Add a public Streamable HTTP MCP server that reuses the existing run services.
- [x] Expose bounded tools for run control, progress, reports, decisions, charts, market data, and AI models.
- [x] Document the shared MCP/HTTP queue on Dashboard, Historical Analysis, Setup, README, and LEARN.
- [ ] Apply and publish the backend package to the backend repository (blocked: repository credentials are unavailable here).

# Blank-page crash guards

- [x] Add a site-wide catch-all so unknown or artifact URLs never blank the page.
- [x] Add router-level error and not-found screens.
- [x] Wrap dashboard panels in an error boundary with retry/reset.
- [x] Publish the fix and confirm a real analysis opens on the live site.

# Report, setup, and dashboard polish

- [x] Highlight the original report; remove duplicate generated sections and show downloadable artifacts with an inline PNG.
- [x] Clear previous analysis immediately when New Analysis is chosen; move error explanation to Setup.
- [x] Refresh the connection badge after saving the engine address; adjust stock and language labels.
- [x] Link the MCP invitation to a detailed in-app explanation and verify the updated screens.

# Report loading and dashboard defaults

- [ ] Verify the production frontend MCP handshake after deploying the updated frontend to the EC2 site (blocked: AWS deployment access is unavailable). The engine MCP handshake reaches the backend and correctly requires its access key.
- [x] Run a full 0700.HK analysis, keep the interactive chart visible during progress, and verify its completed report and inline price chart PNG.

- [x] Load completed reports and downloads through the configured engine artifact path.
- [x] Default Stock country to HK and collapse the MCP connection section when charts are ready.
- [x] Recolor the 5051 favicon red and verify the updated dashboard and report page.

# Full detail report presentation

- [x] Show the engine result's decision, agent reports, and timings in the detail page's style.
- [x] Promote bold labels to subtitles and show the chart only once.
- [x] Verify a real report and clean desktop/mobile rendering.
