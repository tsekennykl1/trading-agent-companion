# Restore chart indicators and improve report controls

## What will change
- Expand the Python-generated interactive and image charts to show price, volume, and RSI in aligned panels like the supplied reference.
- Preserve moving averages in the price panel and add RSI guide levels for faster interpretation.
- Turn the Agent reports heading into a darker title row with a Show All/Hide All control.
- Keep individual reports collapsed initially and color their status text green when available, red when unavailable, and blue while generating.

## Verification
- Confirm the chart includes visible price, volume, and RSI panels without internal clipping.
- Confirm Show All opens every available report and Hide All closes them.
- Confirm individual Show/Hide controls still work and all three report states use the requested colors.
- Check desktop and iPhone portrait layouts and confirm the preview builds without errors.

## Technical details
- Extend bridge price rows with OHLC, volume, and calculated RSI values, while remaining compatible with rows that only contain close prices.
- Reuse the current semantic bull, bear, primary, surface, and rule tokens for report state styling.
