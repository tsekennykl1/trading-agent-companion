# Move New Analysis and add a complete Sample view

## Changes
- Move the New Analysis form out of the left rail and place its show/hide control and form directly above the chart on every screen size.
- Keep the prominent top New Analysis action, but make it open and scroll to the form above the chart.
- Add a **Sample** button beside **Clear** that restores the built-in 0700.HK demonstration after the dashboard has been cleared or while viewing another run.
- Make the sample self-contained: show its interactive price chart, decision, confidence, progress, and every analyst/research/risk/portfolio report without requiring the local engine.
- Keep **Clear** as the intentionally empty state and preserve existing live-run behavior.

## Technical details
- Add an explicit `showSample()` action to the analysis state instead of reloading or requesting backend data.
- Expand the built-in sample configuration and report content to cover every selectable stage.
- Anchor the chart-area form so both New Analysis controls reliably reveal the same form.
- Verify Clear → Sample → New Analysis on desktop and phone, including report expansion and chart interaction, then check current diagnostics.
