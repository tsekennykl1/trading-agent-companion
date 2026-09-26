# Restyle the complete detailed report

## Changes
- Render the complete readable content from the engine’s `result.html` instead of removing its decision, reports, and timing sections.
- Convert bold report labels such as `**Executive Summary**` into styled subtitles, including labels followed by English or Chinese punctuation.
- Suppress the chart embedded in `result.html` and keep the existing detailed-page chart as the single chart instance.
- Preserve the current Original link and artifact download controls.

## Verification
- Open a real detailed report and confirm its decision, reports, and timing content appears in the page’s existing visual style.
- Confirm bold labels display as subtitles and only one chart is visible on desktop and narrow screens.
- Confirm the preview builds without errors.
