# Fix report loading and dashboard defaults

## Changes
- Resolve completed report links through the configured engine address before reading them, so the detail page displays the actual report instead of the app’s artifact-redirect message.
- Keep the Original link and related artifact downloads on the same corrected engine path.
- Default Stock country to HK whenever the New Analysis form is initialized.
- Add a Show/Hide control for the MCP connection section; start expanded, then collapse it automatically once the chart is ready.
- Recolor the existing transparent 5051 favicon lettering to red while preserving its shape and favicon-friendly 64×64 format.

## Verification
- Check the detail report against a completed run URL.
- Check the HK default and MCP expand/collapse behavior on desktop and mobile.
- Confirm the new favicon is served and the preview builds cleanly.
