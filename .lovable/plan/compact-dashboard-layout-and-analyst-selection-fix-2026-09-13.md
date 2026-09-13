# Compact dashboard layout and analyst selection fix

## What will change
- Move the New analysis controls into a prominent full-width section near the top, directly below the market snapshot and chart.
- Emphasize Ticker, Analysis date, and Research depth as the primary run settings, while keeping the analyst choices clearly grouped beneath them.
- Rework Agent progress into a compact table on wider screens, with columns for team, agent, status, and time; retain a readable stacked layout on phones.
- Constrain detailed and agent-report reading widths and use compact tables for structured key/value data so long reports use horizontal space without becoming overly tall.
- Ensure the selected analyst list is sent in both the top-level request and the backend `params` object, preserving compatibility with the current local bridge and the newer backend format.
- Read selected analysts back from run responses when available so the dashboard accurately reflects which analysts were requested.

## Verification
- Inspect the exact POST body after checking and unchecking each analyst.
- Confirm the local Python bridge still maps selected names to TradingAgents analyst keys.
- Check expanded progress and report sections at desktop and iPhone portrait sizes.
- Confirm all content routes keep their metadata and the preview builds without errors.

## Technical details
- Keep the existing academic visual system, semantic colors, design buttons, and mobile behavior.
- Treat the uploaded screenshots as layout references only.
