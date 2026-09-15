# Stage timing and parallel risk review

## What will change

- Add a compact **Stage timing** panel to the workbench showing every stage selected for that analysis, its state, start time, end time, and elapsed duration.
- Update the timing rows live while an analysis runs, distinguish selected-but-not-started from actually executed stages, and highlight the slowest completed stage.
- Keep stage choices attached to each analysis result, while separately retaining the latest form choices for the next analysis across layout changes and refreshes.
- Run Aggressive, Conservative, and Neutral risk analysts concurrently within each debate round. Each round will use the same prior-round context, then merge all three responses in a stable order before the next round or Portfolio Manager step.
- Preserve the existing analyst parallelism, stage opt-outs, report publishing, cancellation behavior, and sequential fallback.

## Verification

- Confirm a request and its returned run retain the exact selected stage list, including partial or empty optional selections.
- Confirm timing records survive polling and refresh, and that skipped stages never appear as executed.
- Test that all three risk viewpoints overlap in time and the merged risk history still reaches Portfolio Manager correctly.
- Compare sequential versus concurrent risk-stage runtime with deterministic stubbed tests.
- Check the timing panel at desktop and phone widths, then confirm clean frontend and backend checks.

## Technical details

- Extend backend `timings` with structured per-stage entries containing status, ISO start/end timestamps, duration, and attempt count; expose these in full run responses and lightweight status polling.
- Instrument analyst branches and downstream grouped stages at their actual execution boundaries rather than estimating from report arrival times.
- Implement batch-synchronous risk rounds: three independent calls per round share one immutable input snapshot; their outputs are merged Aggressive → Conservative → Neutral for deterministic reporting.
- Add typed frontend normalization and a focused responsive timing component using existing semantic styles and translated labels.