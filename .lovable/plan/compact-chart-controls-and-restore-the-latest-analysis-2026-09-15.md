# Compact chart controls and restore the latest analysis

## Changes
- Move the chart range choices into the Technical Analysis header, aligned to the right of Select All and wrapping cleanly on phones.
- Automatically expand Final Trade Decision whenever that report has content, while keeping its existing hide/show control.
- Keep the latest real run and its retrieved chart, market, and report content in React state and browser storage.
- On a later visit, restore that snapshot immediately, then refresh it from the engine when available; starting a new run replaces the saved snapshot.

## Technical details
- Add a small versioned browser-cache helper with defensive JSON parsing and storage-failure handling.
- Seed the workbench and artifact loader from the saved snapshot after hydration to avoid server/browser rendering mismatches.
- Persist only engine results, not the bundled demonstration run.
- Verify the restored screen, default-open decision report, compact controls, mobile fit, and current build diagnostics.
