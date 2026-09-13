# iPhone portrait responsiveness

## Scope
- Rework the shared header into a compact mobile layout with a horizontally scrollable navigation row and stable status placement.
- Tighten page spacing and card padding for narrow screens while preserving the existing desktop layout.
- Stack form controls and action buttons at full width on phones, with comfortable touch targets.
- Reflow decision metrics, confidence details, report tabs, status panels, and export actions to prevent clipping.
- Adapt charts for narrow widths by reducing margins, label widths, and side-by-side content.
- Apply the same mobile treatment to the Simple dashboard, Connect engine, and About pages.

## Verification
- Check all four pages at iPhone portrait dimensions, including horizontal overflow and chart rendering.
- Confirm the latest preview build succeeds without new browser errors.

## Technical details
- Use responsive Tailwind classes and existing design tokens/components only.
- Keep current behavior, data flow, copy, and desktop presentation unchanged.
