# Improve report defaults and integration performance

## Agent Report update
- Move the grouped **Company of Interest** row to the first position.
- Open **Company of Interest** automatically whenever its data is available.
- Keep **Final Trade Decision** open automatically whenever available.
- Keep every other report collapsed by default, while preserving the existing Show/Hide and Show All controls.
- Verify the ordering and defaults on desktop and phone layouts.

## Recommended frontend improvements
- Use `/runs/{id}/status` as the frequent lightweight poll and honor `poll_after_ms`; fetch the full run only when readiness or status changes.
- Cache the last complete run and artifacts, then refresh them in the background so returning users see useful content immediately.
- Resolve report/chart URLs from `/runs/{id}/artifacts` and retain the current secure public/local URL handling.
- Normalize backend aliases in one contract layer, including `price_change_percent`, to prevent silent missing values.
- Show progressive report updates when supported, but avoid repeated requests for reports already cached.

## Recommended backend improvements
- Add `decision_ready`, `reports_ready`, and `result_url` to `/runs/{id}/status` so the frontend can unlock controls precisely without downloading the full run.
- Persist each analyst report as it finishes, allowing genuinely progressive display instead of publishing all reports at completion.
- Return one canonical artifact manifest with public HTTPS URLs when deployed.
- Add chart `levels`, `markers`, and signal events to `price-chart.json` when available, matching the frontend chart contract.
- Move long-running work from in-process daemon threads to a durable job worker so runs survive restarts and concurrency is controlled.
- Hide server tracebacks from public responses, add authentication/usage controls for paid analysis runs, and keep detailed errors in server logs.
