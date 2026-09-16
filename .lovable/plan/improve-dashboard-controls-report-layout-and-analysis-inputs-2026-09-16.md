# Improve dashboard controls, report layout, and analysis inputs

## Changes
- Make **Clear** remove the current analysis and show an intentionally empty dashboard instead of restoring the 0700.HK sample. A new analysis remains available immediately.
- Add global **A− / A+** font controls in the header, with sensible limits and a remembered preference. Report tables will use flexible column widths and wrap long content without overlap at every supported font size.
- Remove stray standalone backslashes from formatted reports and rename **Back to workbench** to **Back to Dashboard**.
- Keep ready notifications centered for three seconds and add a clear link icon to the engine connection badge. Rename the language switch from **繁中** to **繁**.
- Add an **LLM** selector to New Analysis, populated only from providers whose API key is configured in the connected engine. Selecting one will submit that provider and its default deep/quick models with the run.
- Replace the competing New Analysis placement states with one reliable show/hide state, keep its toggle immediately above Agent progress, and preserve the prominent top New Analysis action.
- Add a large stock name/ticker and analysis date heading directly above the chart. Reduce the open stance and confidence chart heights while retaining readable labels.
- Strengthen decision parsing so entry, target, and stop-loss values returned by the engine are accepted from structured fields and common report wording.

## Technical details
- Introduce an explicit empty-display state in the analysis hook rather than relying on page reload behavior.
- Reuse the existing `/providers` response; unavailable or unconfigured providers will never appear in the form. Older engines without that endpoint will retain the currently configured provider without blocking analysis.
- Apply report font scaling through a shared root setting, while table cells use wrapping, minimum readable widths, and horizontal scrolling only as a final fallback.
- Validate the controls and layouts in desktop and phone-sized views, then check current build and runtime diagnostics.
