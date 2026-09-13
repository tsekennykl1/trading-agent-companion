# Fit report tables and upgrade Simple dashboard

## What will change
- Make detailed-report tables size their first “Field” column to its content, with sensible limits so long labels wrap without consuming half the table.
- Replace the Simple dashboard’s raw backend handling with the same response normalization and independent artifact loading used by the main workbench.
- Show market data and the interactive/static price chart as soon as they become available while polling continues.
- Add a compact recommendation summary with corrected confidence and consensus values.
- Add collapsed report rows showing Available, In progress, or Not available, with Show/Hide controls.
- Keep the Simple dashboard focused and responsive on desktop and iPhone portrait.

## Technical details
- Reuse the existing run adapter, artifact polling hook, chart reader, confidence logic, and report formatter rather than maintaining a second backend contract.
- Keep polling compatible with backend completion aliases and the backend-provided polling interval.
- Use semantic design tokens and existing buttons; no backend changes are required.

## Verification
- Check the adjusted Field/Value table proportions.
- Start or simulate a normalized run and verify partial chart rendering, summary, confidence, and report controls.
- Check desktop and iPhone portrait layouts and confirm the preview build is clean.
