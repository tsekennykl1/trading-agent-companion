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
