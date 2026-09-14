# Detail report controls and collapsible confidence

## Changes
- Rename “Manager-facing report” to “Detail Report” in English and Traditional Chinese, and enlarge its heading.
- Treat the detailed report file itself as the readiness signal. While unavailable, show only a spinning status; once available, show Detail Report, Markdown, HTML, and Print/PDF actions.
- Keep the report page’s Markdown, HTML, and Print/PDF actions in the top-right header and reveal them only after its content loads.
- Add a Show/Hide control to Recommendation confidence, matching Agent stance and consensus.
- Make the New analysis heading larger and bold.

## Verification
- Check loading and ready states, navigate to the report and back, and verify desktop and narrow layouts.
- Confirm the preview builds without errors.

## Technical details
- Reuse existing translated labels, Button controls, and loading icons.
- Base workbench report readiness on `resultHtmlUrl`, preventing exports before the detailed report exists.
