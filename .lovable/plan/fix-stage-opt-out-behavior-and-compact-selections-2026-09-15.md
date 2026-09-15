# Fix stage opt-out behavior and compact selections

## What will change
- Preserve the exact selected stages at submission time, including the valid case where all research and decision stages are unticked.
- Restore the selected analysts and stages from the latest run after page changes or refreshes, and save form choices immediately in the browser for reliable persistence.
- Read stage selections back from backend run responses instead of silently replacing them with defaults.
- Request only reports belonging to selected stages; skipped reports will show **Not selected** in red and remain at the bottom of Agent Reports.
- Rename the grouped choices to **Bull & Bear Researcher** and **Aggressive + Conservative Analyst + Neutral Analyst**.
- Tighten the selection grid and label wrapping across the full-width and side-panel forms without reducing tap targets.
- Use **700** as the stock placeholder for both market choices.

## Verification
- Untick each research/decision group, submit, and inspect the request body to confirm its stage is absent and listed as skipped.
- Confirm no individual report request is sent for an unticked stage.
- Confirm skipped rows display **Not selected** below selected reports and Final Trade Decision.
- Refresh and move between the top and side form layouts; verify all choices remain unchanged.
- Check the selection layout on desktop and phone widths, then confirm the preview has no build or runtime errors.

## Technical details
- Treat an empty `stages` array as an intentional selection rather than falling back to defaults.
- Keep the submitted configuration locally until the backend echoes it, preventing polling responses from erasing opt-outs.
- Filter report-index results and split report requests using the stage-to-report mapping already defined by the app.
