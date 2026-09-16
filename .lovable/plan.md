# Add MCP to the TradingAgents backend

## Goal
Expose the existing TradingAgents backend through a standards-based MCP server so compatible assistants can start analyses, monitor them, cancel them, and read completed decisions, charts, and reports. Keep the browser dashboard on its current HTTP API and document how both surfaces relate.

## Backend implementation

- Add the official Python MCP SDK to the backend dependencies and mount a Streamable HTTP MCP endpoint at `/mcp` in the existing FastAPI application.
- Keep all MCP code outside `/TradingAgents`; tools will call the existing `analyze_service`, artifact, chart, market-data, and provider helpers rather than duplicate analysis logic.
- Add small MCP modules with one clear responsibility:
  - server definition and instructions;
  - input/output schemas and bounded validation;
  - tool wrappers;
  - response formatting for text, structured JSON, and chart/report links.
- Preserve the current worker queue: `create_analysis` queues a run and returns immediately, while status/read tools remain fast enough for normal MCP client timeouts.

## MCP tools

### Run control
- `create_analysis` — validate the same ticker, date, AI model, depth, language, analyst, and stage options as `POST /runs`, then create or reuse a run.
- `cancel_analysis` — cancel a queued or running run.

### Run discovery and progress
- `list_analyses` — list recent runs with bounded pagination/limit.
- `get_analysis` — return the normalized full run record.
- `get_analysis_status` — return lightweight status, progress, version, report readiness, and stage timings.

### Results
- `get_decision` — return action, confidence, rationale, bullish/bearish signals, entry, target, and stop loss.
- `list_reports` and `get_report` — discover and read published analyst/final reports with validated report names.
- `get_chart_data` — return the structured price and technical-indicator payload plus available chart links.
- `get_market_snapshot` and `get_earnings` — expose the existing cached company and earnings lookups.
- `get_engine_info` and `list_ai_models` — report engine availability and configured provider/model metadata without exposing API keys.

The provider-changing endpoint, raw environment values, and secret validation details will not be exposed as MCP tools.

## Public access and safeguards

You selected **Public — no login** with **Full run control**. The MCP endpoint will therefore have no authentication requirement.

- Anyone who can reach `/mcp` will be able to view run data, start paid AI analyses, and cancel active analyses.
- Keep strict input limits, existing provider validation, bounded list sizes, safe report-name validation, and concise error responses.
- Add optional deployment controls for operators: `MCP_ENABLED`, a create-run rate limit, and a configurable MCP tool allow-list. The documented/default requested mode remains public with full tools enabled.
- Never return provider keys, `.env` contents, internal file paths, or unrestricted filesystem artifacts.

## Dashboard and History documentation

- Add a concise MCP connection section to the Setup page showing the endpoint derived from the configured engine address, supported clients, the public-access warning, and the available tool groups.
- Add a small explanatory MCP note on the Dashboard near the analysis controls: browser actions use the HTTP API, while assistants use `/mcp` and create the same runs.
- Add an MCP note on Historical Analysis explaining that runs created through MCP appear in the same history and can be opened exactly like dashboard-created runs.
- Add English and Traditional Chinese copy through the existing translation system.
- Update the frontend README and learning guide with a diagram showing both clients converging on the same service layer, queue, SQLite run records, and artifacts.

## Backend documentation and tests

- Replace the backend README’s “MCP is not implemented” section with setup, endpoint, client configuration examples, public-access warning, and tool catalogue.
- Extend `docs/API.md`, `docs/ARCHITECTURE.md`, `docs/DATA_FLOW.md`, and `docs/CODE_TOUR.md` with transport, lifecycle, tool-to-service mapping, and troubleshooting.
- Add tests for manifest/tool discovery, create/list/status/read/cancel flows, invalid IDs and report names, disabled MCP mode, secret non-disclosure, and public endpoint behavior.
- Verify the normal FastAPI HTTP endpoints and dashboard behavior remain unchanged, then test MCP initialization and representative tool calls against stubbed analysis services.

## Technical notes

- Transport: MCP Streamable HTTP at `<engine-base-url>/mcp`.
- The MCP server and dashboard REST routes share `app/services/analyze_service.py`; neither calls the other over HTTP.
- Long analyses are asynchronous by design: create returns a run ID, clients call status, then retrieve results when ready.
- No edits will be made inside the upstream `/TradingAgents` directory.
