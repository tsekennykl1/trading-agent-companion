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
- [ ] Verify desktop/mobile presentation and a clean preview build.
