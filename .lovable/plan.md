# Reliable progressive analysis pipeline

## Goal
Upgrade `myTradingAgentsBackend` and this dashboard as one compatible system: cheap readiness checks, reports that appear as agents finish, jobs that survive process restarts, and browser-safe canonical HTTPS artifact links.

## Backend repository

### 1. Consolidate the live code path
- Treat `app/routes/runs.py` and `app/services/analyze_service.py` as authoritative.
- Move shared database access into the existing repository layer and stop maintaining parallel JSON-file/SQLite implementations.
- Preserve current request and response fields so existing clients keep working.

### 2. Lightweight readiness contract
- Extend `GET /runs/{run_id}/status` with `decision_ready`, `reports_ready`, `result_url`, artifact readiness, and a monotonic `version`.
- Read only the small indexed status fields needed for polling; do not deserialize the full result, reports, or logs.
- Return `ETag` and support `If-None-Match` with `304 Not Modified`.
- Keep `poll_after_ms`, using shorter intervals during active transitions and zero at terminal states.

### 3. Progressive report publishing
- Add one atomic `publish_report(run_id, name, content)` path that persists each completed report, updates `reports_ready`, increments the run version, and advances progress.
- Adapt the TradingAgents integration to consume its graph stream/node updates when supported and publish reports as each agent finishes.
- Retain a final-result fallback for engine versions that expose only blocking `propagate()` output.
- Keep `/runs/{id}/reports` and `/runs/{id}/reports/{name}` available throughout execution; unfinished reports remain absent rather than returning placeholders.
- Generate the final HTML only after final reports are committed, then publish `result_url` and mark the run completed in that order.

### 4. Durable bounded worker
- Replace one daemon thread per request with a SQLite-backed queue and a fixed worker pool.
- Add lease ownership, lease expiry, attempt count, next-attempt time, and last-heartbeat fields through additive schema migration.
- Claim one queued job atomically; enforce single-flight execution per run and a fixed concurrency limit.
- On restart, reclaim expired leases and retry within a bounded attempt budget instead of immediately failing every interrupted run.
- Keep cancellation persisted in SQLite and checked between stages/report publications.
- Preserve request deduplication so repeated submissions cannot create duplicate active work.
- Document that SQLite and artifacts require a persistent volume; keep the storage boundary ready for managed database/object storage later.

### 5. Canonical secure artifact URLs
- Add `PUBLIC_BASE_URL` as the preferred deployment setting and centralize URL construction.
- Return absolute HTTPS URLs for market data, chart JSON/PNG/HTML, result HTML, and report resources.
- Honor trusted proxy scheme/host information only when the explicit base is absent.
- Return both canonical URL fields and legacy relative paths for one compatibility release.
- Tighten CORS to configured frontend origins while retaining an explicit local-development allowance.

### 6. Backend tests and operations
- Replace the live-only test script as the primary check with pytest fixtures and FastAPI test-client coverage.
- Test status payload size/shape, ETag/304 behavior, progressive report visibility, final readiness ordering, duplicate submission, cancellation, lease expiry/restart recovery, retry exhaustion, and canonical URL generation.
- Add an end-to-end test using a deterministic fake TradingAgents stream; keep the optional real-engine smoke test separate.
- Add startup/storage documentation and an example environment file for worker count, lease duration, retry limit, persistent paths, frontend origins, and public base URL.

## Frontend integration

### 7. Consume the enhanced contract efficiently
- Parse status `version`, readiness, canonical artifact URLs, retry/queue metadata, and terminal state without dropping legacy shapes.
- Use the status version as the change signal: refetch only newly ready reports and artifacts, rather than repeatedly probing every endpoint.
- Continue showing each report immediately while keeping Detail Report exports locked until the completed status and final result URL agree.
- Honor `ETag`/`304` and the backend polling hint, with a safe bounded fallback for older servers.
- Clear a restored browser snapshot when the backend confirms its run was removed or expired; keep the current offline-first display on temporary network failure.
- Prefer canonical HTTPS URLs and retain the configured-base/legacy fallback for older local engines.

### 8. Frontend tests and verification
- Add focused tests for old and new status payloads, readiness transitions, URL resolution, cache invalidation, and report-diff fetching.
- Run a browser flow against the deterministic backend: queue → partial chart/report updates → final report unlock → reload recovery → history view.
- Verify desktop and iPhone layouts, no mixed-content requests, no repeated full-run polling, and no runtime/build errors.

## Delivery sequence
1. Schema/status/URL compatibility changes.
2. Progressive report persistence and deterministic tests.
3. Durable queue, leasing, restart recovery, and bounded retries.
4. Frontend version-aware polling and cache invalidation.
5. End-to-end validation, documentation, and removal of confirmed dead duplicate backend paths.

## Technical notes
- The live backend currently uses `app/routes/runs.py` plus `app/services/analyze_service.py`; the similarly named root service/router files are not wired into `app/main.py`.
- The current dashboard already has legacy fallbacks, so rollout is additive and backward-compatible.
- Native progressive output depends on the installed TradingAgents graph API. The adapter will feature-detect streaming and fall back to final-only publication when unavailable.
- Durable recovery guarantees queue state and bounded retry across restarts; resuming inside an interrupted LLM call is not possible, so an expired lease restarts that run attempt from a safe stage.
