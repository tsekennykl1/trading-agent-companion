# Fix report controls and simplify navigation

## Report controls
- Update browser URL validation so a connected loopback engine (`localhost` or `127.0.0.1`) remains usable from the hosted dashboard.
- Keep blocking genuinely unsafe HTTP report links from non-local hosts.
- When the engine marks the final report ready, pass its resolved result URL through to the Detail Report card so **View Report**, **Markdown**, **HTML**, and **PDF** appear together.
- Preserve the loading spinner until final-report readiness is confirmed, and keep all exports backed by the engine’s real report.

## Header and footer
- Remove **Connect engine** and **About the project** from the main navigation.
- Keep the connection status and URL at the right side of the header as the single entry point for connection setup; make the full badge clickable and accessible.
- Add **About the project** to the footer while retaining the existing project references and disclaimer.
- Preserve English and Traditional Chinese labels.

## Verification
- Test a completed run using a localhost report URL and confirm all four controls appear and open/download the real report.
- Confirm an in-progress run still shows only the spinner.
- Check the simplified header and footer on desktop and phone widths, then confirm a clean preview build.
