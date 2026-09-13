# Improve report readability and chart priority

## What will change
- Move the market snapshot and its price chart above the portfolio decision so available market data appears first.
- Give the interactive chart more width and height, reducing cramped viewing and unnecessary internal scrolling.
- Collapse the portfolio management decision by default. Its single-line header will say whether it is available and provide a Show/Hide control.
- Keep every agent report collapsed by default with a one-line availability status and a Show/Hide control.
- Separate Key Bullish Signals and Key Bearish Risks into two independent full-width collapsed sections instead of side-by-side columns.
- Format report labels such as `**Rating:**`, `**Executive Summary:**`, and similar leading fields as proper headings, with clearer spacing between headings, paragraphs, lists, and tables.
- Fix confidence fallback behavior: use the backend confidence when supplied; otherwise derive a percentage from the available agent stances instead of displaying 0% beside bullish agents.

## Verification
- Check the completed-run layout at desktop and iPhone portrait sizes.
- Confirm all expandable sections start closed, open independently, and preserve readable report formatting.
- Confirm confidence is bounded to 0–100 and no longer shows a misleading zero when stance data is available.
- Confirm the preview builds without errors.

## Technical details
- Reuse the existing design buttons and semantic color tokens.
- Keep backend response compatibility unchanged; the confidence correction remains in the frontend adapter.
