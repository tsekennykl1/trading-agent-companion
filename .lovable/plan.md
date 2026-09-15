# Group report context and simplify live progress

## What will change

- Replace the five separate Agent Report rows — Company of Interest, Asset Type, Instrument Context, Trade Date, and Sender — with one **Company of Interest** row.
- Inside that single expandable row, present all five values together as labeled fields, while preserving each value exactly as returned by the engine.
- Automatically hide completed Agent Progress rows as soon as completed work exists; in-progress, pending, and error rows remain visible.
- Keep a compact control to reveal completed rows again when needed.
- Merge the separate **Analysis in progress** panel into **Agent progress**, including the spinner, overall progress bar, current stage, ticker, and elapsed time.
- Keep the merged panel compact and readable in the existing left column and on narrow screens.

## Technical details

- Build the grouped company-context entry in `ReportsSection` without changing the backend response contract.
- Pass live analysis status into `AgentBoard` and render the run-level progress header there.
- Remove the standalone progress panel from the workbench after its content is represented in `AgentBoard`.
- Update English and Traditional Chinese labels only where needed.
- Verify the preview at desktop and phone widths, then confirm the build and runtime logs are clean.
