# Responsive width, clearer navigation, and frontend tuning

## What will change

- Let the shared page shell use the full available screen width with responsive side spacing instead of a fixed 95% cap.
- Make chart areas and main dashboard columns resize smoothly with the browser width and available height, while preserving readable minimum heights on phones.
- Keep controls and tables inside the viewport at phone, tablet, laptop, and wide-desktop sizes.
- Rename the History page heading to **Historical Analysis** and place **Back to Dashboard** on its own row above the heading.
- Keep the Technical Analysis **Back to Dashboard** action on its own row above its heading at every width.

## Performance and beginner-friendly code

- Keep parallel loading for independent chart, market-data, report-index, and report-content requests; this is already the correct browser equivalent of concurrent work.
- Avoid adding browser worker threads: they do not make HTTP or the TradingAgents engine faster and would make the React code harder to learn.
- Reduce unnecessary History refreshes by polling only while a listed analysis is still active; completed history will use normal cache plus manual Refresh.
- Stop artifact polling as soon as the engine’s required chart and final report are available, while retaining progressive display during a run.
- Extract the shared page-heading/back-navigation pattern into one small, clearly named component and simplify the dashboard’s UI handlers without changing behavior.
- Update `LEARN.md` with the revised page structure and a plain-language explanation of concurrent requests versus backend parallel processing.

## Verification

- Check Dashboard, Historical Analysis, and Technical Analysis at phone, current 776px, laptop, and wide-desktop widths.
- Confirm no horizontal page overflow, charts resize correctly, navigation order is correct, and the current build remains clean.

## Technical note

Actual multi-core TradingAgents execution belongs in the Python engine. The frontend can issue independent requests concurrently—which it already does—but cannot safely make one analysis run faster by creating more browser threads.
