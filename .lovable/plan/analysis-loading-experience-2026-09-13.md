# Analysis loading experience

## Changes

- Replace “View sample run meanwhile” with an animated loading indicator and a clearer message explaining that the analyst teams are working.
- Add a lightweight overlay over the live results area while an analysis is queued or running, without covering the run controls or agent progress.
- Make the saved bridge address render consistently during page hydration, resolving React error 418.
- Keep the loading treatment compact and readable on iPhone portrait screens.

## Verification

- Check the running and completed states in the browser at desktop and iPhone portrait sizes.
- Confirm the browser console no longer reports a hydration mismatch and the project remains build-clean.

## Technical details

- Use the existing semantic colors and Lucide loading icon with reduced-motion support.
- Defer the locally saved bridge URL until after the page has mounted so server and browser text match.