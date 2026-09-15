# Fix final Detail Report readiness

## Goal
Show the Detail Report controls as soon as the backend confirms the final report is complete, while keeping them hidden during partial generation.

## Changes
- Normalize `reports_ready` from the status and run responses when it arrives as an array, object/map, or other supported completed-report shape instead of silently treating non-array values as empty.
- Centralize final-report readiness so the workbench, Run History, and report controls use the same rule.
- Resolve the final report URL from `result_url`, the run artifact metadata, or the canonical `/runs/{id}/result.html` endpoint once availability is confirmed.
- Separate “final report is ready” from “URL is safe to open”: show a clear unavailable-link state for blocked URLs rather than incorrectly displaying the loading spinner forever.
- Preserve the strict guard against partial reports: a decision or one incremental analyst report alone will not unlock the controls.

## Verification
- Test staged responses covering running, partial reports, completed with array readiness, completed with object readiness, and completed with the canonical result page.
- Confirm the spinner remains during generation, then all four controls appear together when the final report becomes available.
- Confirm View Detail Report opens the dedicated report page and Markdown, HTML, and PDF use the same final backend report.
- Check desktop and phone layouts, plus build and runtime diagnostics.

## Technical note
The current page requires `status === completed`, `reportsReady.length > 0`, and a report URL at the same time. The status parser currently accepts only an array for `reports_ready`; other backend response shapes become an empty list and keep the controls locked.
