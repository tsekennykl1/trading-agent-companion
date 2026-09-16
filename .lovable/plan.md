# Full-width decision and simpler frontend

## What will change
- Make the chart result area a single-column flow so the Decision box and “Why this signal?” each use the full available width at every screen size, eliminating the blank right side.
- Add Ollama to the providers hidden by default. It will only appear in the AI model list after being explicitly enabled on Setup.
- Simplify the dashboard code for learning by extracting chart/results presentation from `LiveSnapshot` into small named components and replacing repeated decision-level expressions with one clear data list.
- Update the beginner guide to explain the new component breakdown and provider visibility rule.

## Verification
- Check Dashboard and Sample at phone and desktop widths for full-width decision content and no horizontal overflow.
- Confirm Ollama is absent by default and remains available as an opt-in choice on Setup.
- Confirm the project builds without errors.

## Technical details
- Preserve all existing analysis, reports, charts, persistence, and engine API behavior.
- Keep provider preferences in the existing browser setting; only the default hidden-provider list changes.
