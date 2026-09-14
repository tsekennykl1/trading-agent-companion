# Compact results and complete decision data

## What will change
- Replace the long introductory heading and description with shorter, academic wording in English and Traditional Chinese.
- Move the manager-facing report controls to the top-left of the desktop results column; place “Detailed report” immediately before “Markdown” in the same action row.
- Pair Agent stance and consensus with Recommendation confidence in one responsive row. Keep the stance panel hidden while no stance data exists, then open it automatically when data arrives; phones will stack both panels.
- Add independent Show/Hide rows for Executive summary, Key bullish signals, and Key bearish risks, all collapsed initially.
- Expand decision-response parsing for entry, target, and stop values across direct, nested, snake-case, camel-case, and common range/object formats so the three decision boxes populate whenever the engine supplies levels.
- Show Entry, Target, and Stop consistently in the portfolio decision summary.

## Verification
- Check a live or representative response containing nested trade levels and confirm all three values render.
- Confirm stance stays closed without data and opens when stance data arrives.
- Confirm confidence and stance share one row on desktop and stack without clipping on narrow screens.
- Confirm report actions are compact, ordered Detailed report, Markdown, HTML, Print/PDF, and positioned at the top-left of the main column.
- Confirm all three decision narrative sections toggle independently and start closed.
- Confirm the preview builds without errors.

## Technical details
- Preserve the existing academic visual system, semantic colors, shared buttons, language switching, and progressive data loading.
- Keep all changes in the frontend response adapter and presentation components; no backend changes.
