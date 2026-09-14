# Translate report roles and tighten dashboard layout

## What will change
- Translate every standard report title and team label into the selected interface language, including Analyst, Researcher, Manager, Trader, engine fields, and team names; unknown backend-provided labels remain unchanged.
- Give Agent stance and consensus and Recommendation confidence matching full-height panels on desktop, enlarging their charts to use the available vertical space while preserving stacked phone layouts.
- Move the Manager-facing report panel into the page heading area at the upper right on desktop, below the header language and connection controls, while keeping a clean stacked order on smaller screens.
- Move the market snapshot and chart upward so they begin immediately beneath the heading/report row, ahead of the left-side analysis controls on stacked layouts where practical.
- Keep Overlays on the first technical-analysis row, then place Panels and Annotations together on the second row; put Signal markers immediately after OBV and remove the redundant Annotations “All” checkbox.

## Verification
- Switch between English and Traditional Chinese and confirm all standard report titles and team labels change without altering backend keys.
- Check the paired stance/confidence panels at desktop width and confirm equal outer heights with larger charts.
- Check desktop and phone layouts for correct report/chart ordering and no clipping or horizontal overflow.
- Confirm Signal markers follows OBV and the annotation group has no redundant All control.
- Confirm all routes retain metadata and the preview builds without errors.

## Technical details
- Add translation keys and lookup helpers in the existing internationalization layer; preserve English identifiers in requests and stored run data.
- Recompose the workbench heading and export panel with responsive grid ordering rather than changing data flow.
- Use equal-height grid items and stable chart dimensions for the paired result panels.
