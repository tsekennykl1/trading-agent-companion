# My Trading Agent — dashboard for the TradingAgents multi-agent framework

A React dashboard that drives a locally running **TradingAgents** engine: it starts an analysis,
streams live agent progress, renders price charts with indicator studies, collects every agent's
write-up, and exports an executive decision memo.

> ## Acknowledgement
>
> The analysis engine behind this dashboard is **TradingAgents: Multi-Agents LLM Financial Trading
> Framework**, created by **Tauric Research** (Yijia Xiao, Edward Sun, Di Luo, Wei Wang, 2024).
>
> - Paper: [arXiv:2412.20138](https://arxiv.org/abs/2412.20138)
> - Source: [github.com/TauricResearch/TradingAgents](https://github.com/TauricResearch/TradingAgents)
>
> All agent roles, the debate structure and the trading logic are their work. This repository
> contains only the dashboard; the backend service wraps their framework in an HTTP API.

---

## 1. The big picture

```text
Browser (this app)            Your machine                      Data + LLM providers
┌──────────────────┐   HTTP   ┌───────────────────────────┐    ┌────────────────────┐
│ New Analysis form│ ───────► │ FastAPI bridge            │    │ Alpha Vantage      │
│ Live progress    │ ◄─────── │  app/main.py              │ ─► │ FRED               │
│ Charts / reports │  polling │  app/routes/runs.py       │    │ DeepSeek / OpenAI  │
│ Export memo      │          │  app/services/*           │    │ Gemini / Claude …  │
└──────────────────┘          │  TradingAgents framework  │    └────────────────────┘
                              └───────────────────────────┘
```

Nothing is hosted for you: the engine, your API keys and all run data stay on your own machine.
The dashboard only talks to the address you enter on the **Connect** page (default
`http://127.0.0.1:8000`).

---

## 2. The agents and what they produce

TradingAgents models a trading desk. Each role is an LLM agent with its own tools and prompt; the
dashboard calls each role a **stage** and lets you switch stages on or off per run.

| Stage id | Role(s) | Report key(s) | Purpose |
| --- | --- | --- | --- |
| `market` | Market Analyst | `market_report` | Price action, trend and indicator reading |
| `social` | Sentiment Analyst | `sentiment_report` | Social/retail sentiment |
| `news` | News Analyst | `news_report` | Headlines and macro events |
| `fundamentals` | Fundamentals Analyst | `fundamentals_report` | Financials, valuation, FRED macro series |
| `research_debate` | Bull & Bear Researcher | `bull_report`, `bear_report` | Adversarial debate over the analyst evidence |
| `research_manager` | Research Manager | `investment_plan` | Judges the debate, sets the investment thesis |
| `trader` | Trader | `trader_plan` | Turns the thesis into an actual trade plan |
| `risk_debate` | Aggressive + Conservative + Neutral Analyst | `risk_aggressive`, `risk_conservative`, `risk_neutral` | Three risk stances argue the trade |
| `portfolio_manager` | Portfolio Manager | `final_decision` | Final Buy/Hold/Sell with entry, stop and target |

**Minimum useful selection:** one analyst (Market Analyst is enough) plus Research Manager, Trader
and Portfolio Manager. Without those last three the executive summary and the bullish/bearish
signal lists stay empty, because there is no decision-maker write-up to summarise.

Unticked stages are skipped in the engine, which is the main speed lever: run time is roughly
proportional to the stages you keep.

---

## 3. Backend service (myTradingAgentsBackend)

Repository: <https://github.com/tsekennykl1/myTradingAgentsBackend>

### Module map

| Module | Responsibility |
| --- | --- |
| `app/main.py` | FastAPI application, CORS from `FRONTEND_ORIGINS`, static artifact mounting |
| `app/routes/runs.py` | All `/runs` HTTP endpoints (create, status, reports, artifacts, cancel) |
| `app/services/analyze_service.py` | Run lifecycle: queue, SQLite persistence, worker leases, retries, stage timings |
| `app/services/tradingagents_service.py` | Adapter onto `TradingAgentsGraph`; maps dashboard config to framework config |
| `app/fast_path.py` | Performance layer: concurrent analysts, fan-out risk debate, per-ticker data cache, stage opt-out |
| `app/services/chart_service.py`, `app/charts.py`, `app/chart_payloads.py` | Price series, indicators and chart artifacts (JSON/PNG/HTML) |
| `app/market_data.py` | Alpha Vantage / FRED fetching with TTL cache |
| `app/formatter.py` | Renders markdown reports and the rich `result.html` page |
| `app/artifacts.py` | Writes run artifacts and builds canonical URLs from `PUBLIC_BASE_URL` |
| `app/worker.py` | Background worker loop draining the run queue |
| `app/db.py` | SQLite schema and access helpers |
| `app/schemas.py` | Pydantic request/response models |
| `app/initialSetup.py` | Interactive configurator that writes `.env` (providers, models, data keys) |

### HTTP endpoints

| Method + path | Purpose |
| --- | --- |
| `GET /health` | Liveness plus `engine_version`. The dashboard uses it for the connection badge. |
| `POST /runs` | Start an analysis. Body: ticker, analysis date, provider, quick/deep model, research depth, `analysts`, `stages`, language. Returns the run id. |
| `GET /runs/{id}/status` | Cheap readiness poll: status, progress, a monotonic `version`, `reports_ready`, `result_url`, stage timings. Supports ETag/304. |
| `GET /runs/{id}` | Full run payload — only fetched when `version` changes. |
| `GET /runs/{id}/reports/{key}` | One agent report, so the dashboard can fetch them all in parallel. |
| `GET /runs/{id}/price-chart.json` | Structured chart payload (OHLC + indicator series + markers). |
| `GET /runs/{id}/chart.png` / `chart.html` | Rendered chart artifacts. |
| `GET /runs/{id}/result.html` | The full detail report page (the Detail Report button). |
| `POST /runs/{id}/cancel` | Cancels a queued or running analysis. |

**Contract the dashboard relies on:** a run is only "ready" when `status = completed` **and** the
engine lists finished reports (`reports_ready`) or a `result_url`. A partial page or a bare decision
is deliberately not enough — exports stay disabled until then.

### Configuration (`.env`)

Generated for you by the **Build your .env** form on the dashboard's Connect page, or by
`python initialSetup.py`.

```ini
PUBLIC_BASE_URL=http://127.0.0.1:8000
FRONTEND_ORIGINS=http://localhost:8080,https://trading-agent-companion.lovable.app

LLM_PROVIDER=deepseek
DEEP_THINK_LLM=deepseek-v4-pro
QUICK_THINK_LLM=deepseek-v4-flash
DEEPSEEK_API_KEY="…"

ALPHA_VANTAGE_API_KEY="DGJFSPTFUJ6ZRKA1"   # shared starter key, rate limited
FRED_API_KEY="a18ce0f4ff2108251c4a0467c60338e1"

TRADINGAGENTS_PARALLEL_ANALYSTS=1
TRADINGAGENTS_DATA_CACHE=1
TRADINGAGENTS_DATA_CACHE_TTL=21600
RUN_WORKER_COUNT=2
```

`initialSetup.py` owns the provider catalogue: `PROVIDER_MODELS` (valid deep/quick model ids per
provider), `PROVIDER_ENV_MAPPING` (which key names each provider needs), `PROVIDER_DEFAULT_MODELS`
(the suggested pair) and `GENERIC_MODEL_ALIASES` (friendly names → real ids). The dashboard mirrors
that catalogue in `src/lib/trading-agents/providers.ts`; keep the two in step when the engine adds a
provider or model.

### Running it

```sh
git clone https://github.com/tsekennykl1/myTradingAgentsBackend.git
cd myTradingAgentsBackend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python initialSetup.py          # writes .env
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

If the browser blocks requests, your dashboard address is missing from `FRONTEND_ORIGINS`.

---

## 4. Frontend (this repository)

TanStack Start + React 19 + Tailwind v4.

### Routes

| Route | What it is |
| --- | --- |
| `/` | Dashboard: New Analysis form, price chart, signal reasons, decision panel, agent reports, agent progress and stage timings |
| `/report` | The full detail report for a run, with Markdown / HTML / PDF export |
| `/history` | Past runs, each expandable to its chart, decision and report previews |
| `/setup` | Connect page: engine address, `.env` builder, step-by-step install, key sources |
| `/about` | Background and credits |

### Key modules

| File | Responsibility |
| --- | --- |
| `src/lib/trading-agents/client.ts` | Every call to the engine; normalises payloads into the app's types; holds the engine address |
| `src/lib/trading-agents/types.ts` | `RunRecord`, `Decision`, `StageOption`, `StageTiming`, report section list |
| `src/lib/trading-agents/useRunArtifacts.ts` | Parallel fetching of reports and chart artifacts via a small pub/sub, version-aware |
| `src/lib/trading-agents/report-readiness.ts` | The strict readiness rule described above |
| `src/lib/trading-agents/run-cache.ts` | Versioned local cache so the last run appears instantly on reload |
| `src/lib/trading-agents/providers.ts` | Mirror of the engine's provider/model catalogue used by the `.env` builder |
| `src/components/workbench/*` | Form, charts, decision card, reports, progress board, export bar, ready overlay |
| `src/lib/i18n.tsx` | English and Traditional Chinese strings; the chosen language is sent to the engine |

### Polling behaviour

- `/health` every 2 minutes once connected (20 s while offline).
- `/runs/{id}/status` every 2.5 s while a run is active.
- The heavy `/runs/{id}` payload is fetched **only** when the status `version` changes.
- Reports are fetched individually and in parallel as soon as each becomes ready.

### Local development

```sh
npm i
npm run dev      # http://localhost:8080
```

---

## 5. Typical run, end to end

1. You pick a ticker, a date, a research depth and the stages to run.
2. `POST /runs` queues the job; a worker leases it and builds the TradingAgents graph.
3. Market data is fetched (cached per ticker + date) and the chart artifacts are published early.
4. Analysts run concurrently; each report is published the moment it is finished, and a short
   confirmation appears on screen.
5. The research debate, trader plan and the three risk stances run, then the Portfolio Manager
   issues the final decision with entry, stop and target.
6. Once the engine reports completion with finished reports, the Detail Report and the Markdown /
   HTML / PDF exports unlock.

---

## 6. Licensing and disclaimer

This dashboard is yours to use and modify. The TradingAgents framework is licensed by Tauric
Research — see their repository for terms. **Nothing here is financial advice**; the output is
LLM-generated research support and must not be traded on without your own judgement.
