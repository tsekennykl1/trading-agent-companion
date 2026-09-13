# Responsive two-column trading workbench

## What will change
- Reorganize the main Workbench into a laptop layout with a compact left rail and a wider analysis workspace.
- Keep run inputs, current run status, agent progress, and recommendation confidence in the left rail.
- Keep the market snapshot and large chart, portfolio decision, stance view, exports, detailed report, and agent reports in the wider right workspace.
- Preserve the current academic visual system, content, controls, progressive loading, and report behavior.
- Adapt the layout by screen size:
  - Laptop and desktop: two columns, with a narrow left rail and flexible main workspace.
  - iPad and smaller tablets: single-column task flow, with compact paired summaries where they fit.
  - iPhone landscape: condensed single column with efficient grids and reduced chart height.
  - iPhone portrait: fully stacked controls, touch-friendly actions, readable tables, and no horizontal page clipping.
- Keep the Simple dashboard behavior unchanged unless shared sizing rules are needed to prevent overflow.

## Responsive order
1. New analysis
2. Active-run or saved-sample status
3. Market snapshot and chart
4. Portfolio decision
5. Confidence and agent progress
6. Stance, exports, detailed report, and agent reports

On laptops, items 1, 2, 5 remain in the left rail while the main analysis sequence occupies the right.

## Verification
- Check the Workbench at laptop, iPad portrait/landscape, iPhone landscape, and iPhone portrait sizes.
- Confirm form controls, navigation, charts, progress tables, confidence details, and report controls do not clip or overlap.
- Confirm the desktop chart receives more width than the left rail and all existing interactions still work.
- Confirm every content route retains its metadata and the preview build is clean.

## Technical details
- Use responsive CSS grid with `minmax(0, 1fr)` and stable left-column sizing at the laptop breakpoint.
- Use source-order-safe layout areas so mobile reading order remains logical without duplicating stateful components.
- Retain semantic design tokens and existing design-system buttons.
