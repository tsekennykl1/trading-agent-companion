"""
ta_bridge.py — local HTTP bridge between the TradingAgents engine and the
TradingAgents Workbench dashboard.

Place this file in the root of your TradingAgents checkout (next to cli/ and
tradingagents/), then:

    pip install fastapi uvicorn
    export DEEPSEEK_API_KEY="<your key>"
    python ta_bridge.py

It serves:
    GET  /health            -> engine availability
    POST /runs              -> start an analysis, returns {"run_id": "..."}
    GET  /runs              -> list runs
    GET  /runs/{id}         -> full run record (poll this while it runs)
    POST /runs/{id}/cancel  -> request cancellation

Nothing leaves your machine: the dashboard in the browser calls this bridge
directly on localhost.
"""

from __future__ import annotations

import re
import threading
import time
import uuid
from datetime import datetime, timezone
from typing import Any

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

HOST = "127.0.0.1"
PORT = 8787

AGENT_SEQUENCE = [
    ("Analyst Team", "Market Analyst", "market_report"),
    ("Analyst Team", "Sentiment Analyst", "sentiment_report"),
    ("Analyst Team", "News Analyst", "news_report"),
    ("Analyst Team", "Fundamentals Analyst", "fundamentals_report"),
    ("Research Team", "Bull Researcher", "bull_report"),
    ("Research Team", "Bear Researcher", "bear_report"),
    ("Research Team", "Research Manager", "investment_plan"),
    ("Trading Team", "Trader", "trader_plan"),
    ("Risk Team", "Aggressive Analyst", "risk_aggressive"),
    ("Risk Team", "Conservative Analyst", "risk_conservative"),
    ("Risk Team", "Neutral Analyst", "risk_neutral"),
    ("Portfolio Management", "Portfolio Manager", "final_decision"),
]

ANALYST_KEYS = {
    "Market Analyst": "market",
    "Sentiment Analyst": "social",
    "News Analyst": "news",
    "Fundamentals Analyst": "fundamentals",
}

ACTION_WORDS = ["Overweight", "Underweight", "Buy", "Hold", "Sell"]

app = FastAPI(title="TradingAgents Workbench bridge")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

RUNS: dict[str, dict[str, Any]] = {}
CANCELLED: set[str] = set()
LOCK = threading.Lock()


class RunConfig(BaseModel):
    ticker: str
    analysisDate: str
    provider: str = "DeepSeek"
    quickModel: str = ""
    deepModel: str = ""
    researchDepth: str = "Shallow"
    analysts: list[str] = Field(default_factory=lambda: ["Market Analyst"])
    language: str = "English"


# --------------------------------------------------------------------------
# Output interpretation helpers (the "interpretive layer" of the project)
# --------------------------------------------------------------------------

def extract_action(text: str) -> str:
    if not text:
        return "Review"
    match = re.search(r"FINAL TRANSACTION PROPOSAL[:\s*]*([A-Za-z]+)", text, re.I)
    if match:
        word = match.group(1).capitalize()
        if word in ACTION_WORDS:
            return word
    for word in ACTION_WORDS:
        if re.search(rf"\b(rating|recommendation)\b[^\n]*\b{word}\b", text, re.I):
            return word
    return "Review"


def score_text(text: str) -> int:
    """Crude lexical stance score in [-100, 100]. Documented as heuristic."""
    if not text:
        return 0
    bull = len(re.findall(r"\b(bullish|buy|upside|support|reclaim|rally|accumulate)\b", text, re.I))
    bear = len(re.findall(r"\b(bearish|sell|downtrend|resistance|breakdown|death cross|avoid)\b", text, re.I))
    total = bull + bear
    if total == 0:
        return 0
    return max(-100, min(100, round((bull - bear) / total * 100)))


def stance_of(score: int) -> str:
    if score >= 25:
        return "bullish"
    if score <= -25:
        return "bearish"
    return "neutral"


def split_points(text: str, limit: int = 5) -> list[str]:
    if not text:
        return []
    bullets = re.findall(r"^\s*[-*]\s+(.{40,400})$", text, re.M)
    if not bullets:
        bullets = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if 60 < len(s.strip()) < 400]
    cleaned = [re.sub(r"\s+", " ", b).strip(" *") for b in bullets]
    return cleaned[:limit]


def build_prices(ticker: str, end_date: str) -> list[dict[str, Any]]:
    """Price series for the chart, via the engine's own dataflow layer."""
    try:
        import pandas as pd  # noqa: F401
        from tradingagents.dataflows import interface  # type: ignore

        raw = interface.get_YFin_data_online(ticker, "", end_date)  # type: ignore[attr-defined]
        rows = []
        if hasattr(raw, "tail"):
            df = raw.tail(60)
            closes = df["Close"].tolist()
            dates = [str(d)[:10] for d in df.index.tolist()]
            for i, (d, c) in enumerate(zip(dates, closes)):
                window = closes[max(0, i - 19) : i + 1]
                window50 = closes[max(0, i - 49) : i + 1]
                rows.append(
                    {
                        "date": d,
                        "close": round(float(c), 2),
                        "sma20": round(sum(window) / len(window), 2),
                        "sma50": round(sum(window50) / len(window50), 2),
                    }
                )
        return rows
    except Exception:  # pragma: no cover - charts are optional
        return []


# --------------------------------------------------------------------------
# Run execution
# --------------------------------------------------------------------------

def new_record(run_id: str, cfg: RunConfig) -> dict[str, Any]:
    agents = []
    for team, agent, _ in AGENT_SEQUENCE:
        selected = agent not in ANALYST_KEYS or agent in cfg.analysts
        agents.append(
            {
                "team": team,
                "agent": agent,
                "status": "pending",
                "note": None if selected else "Not selected",
            }
        )
    return {
        "id": run_id,
        "status": "queued",
        "source": "engine",
        "config": cfg.model_dump(),
        "startedAt": datetime.now(timezone.utc).isoformat(),
        "agents": agents,
        "prices": [],
        "stances": [],
        "reports": {},
        "decision": None,
        "stats": {
            "llmCalls": 0,
            "toolCalls": 0,
            "tokensIn": 0,
            "tokensOut": 0,
            "reportsDone": 0,
            "reportsTotal": len(cfg.analysts),
            "runtimeSeconds": 0,
        },
    }


def set_agent(record: dict[str, Any], agent_name: str, status: str) -> None:
    for a in record["agents"]:
        if a["agent"] == agent_name:
            a["status"] = status
            if status in ("completed", "error"):
                a["time"] = datetime.now().strftime("%H:%M:%S")


def ingest_state(record: dict[str, Any], state: dict[str, Any]) -> None:
    """Copy whatever the graph has produced so far into the run record."""
    for _team, agent, key in AGENT_SEQUENCE:
        value = state.get(key)
        if isinstance(value, dict):
            value = value.get("content") or value.get("text")
        if isinstance(value, str) and value.strip():
            if record["reports"].get(key) != value:
                record["reports"][key] = value
                set_agent(record, agent, "completed")

    debate = state.get("investment_debate_state") or {}
    for key, agent in (("bull_history", "Bull Researcher"), ("bear_history", "Bear Researcher")):
        text = debate.get(key)
        if isinstance(text, str) and text.strip():
            report_key = "bull_report" if "bull" in key else "bear_report"
            record["reports"][report_key] = text
            set_agent(record, agent, "completed")

    risk = state.get("risk_debate_state") or {}
    for key, agent, report_key in (
        ("risky_history", "Aggressive Analyst", "risk_aggressive"),
        ("safe_history", "Conservative Analyst", "risk_conservative"),
        ("neutral_history", "Neutral Analyst", "risk_neutral"),
    ):
        text = risk.get(key)
        if isinstance(text, str) and text.strip():
            record["reports"][report_key] = text
            set_agent(record, agent, "completed")

    stances = []
    for _team, agent, key in AGENT_SEQUENCE:
        text = record["reports"].get(key)
        if text:
            score = score_text(text)
            stances.append({"agent": agent, "stance": stance_of(score), "score": score})
    record["stances"] = stances

    record["stats"]["reportsDone"] = sum(
        1 for a in ANALYST_KEYS if record["reports"].get(f"{ANALYST_KEYS[a]}_report") or record["reports"].get(
            {"Market Analyst": "market_report", "Sentiment Analyst": "sentiment_report",
             "News Analyst": "news_report", "Fundamentals Analyst": "fundamentals_report"}[a]
        )
    )


def finalise(record: dict[str, Any], final_text: str) -> None:
    action = extract_action(final_text or record["reports"].get("trader_plan", ""))
    bull_points = split_points(record["reports"].get("bull_report", ""))
    bear_points = split_points(record["reports"].get("bear_report", ""))

    scores = [s["score"] for s in record["stances"]] or [0]
    spread = max(scores) - min(scores)
    consensus = "High" if spread < 80 else "Medium" if spread < 140 else "Low"
    confidence = max(20, min(95, 100 - spread // 2))

    entry = stop = None
    entry_match = re.search(r"Entry Price[:\s*]*([0-9.]+)", final_text or "", re.I)
    stop_match = re.search(r"Stop Loss[:\s*]*([0-9.]+)", final_text or "", re.I)
    trader = record["reports"].get("trader_plan", "")
    entry_match = entry_match or re.search(r"Entry Price[:\s*]*([0-9.]+)", trader, re.I)
    stop_match = stop_match or re.search(r"Stop Loss[:\s*]*([0-9.]+)", trader, re.I)
    if entry_match:
        entry = float(entry_match.group(1))
    if stop_match:
        stop = float(stop_match.group(1))

    summary_source = final_text or record["reports"].get("investment_plan", "")
    summary = re.sub(r"\s+", " ", summary_source).strip()[:1200]

    record["decision"] = {
        "action": action,
        "rating": action,
        "confidence": confidence,
        "consensus": consensus,
        "entryPrice": entry,
        "stopLoss": stop,
        "positionSizing": (
            re.search(r"Position Sizing[:\s*]*(.+)", trader, re.I).group(1).strip()
            if re.search(r"Position Sizing[:\s*]*(.+)", trader, re.I)
            else None
        ),
        "executiveSummary": summary,
        "bullPoints": bull_points,
        "bearPoints": bear_points,
    }


def execute(run_id: str, cfg: RunConfig) -> None:
    record = RUNS[run_id]
    started = time.time()
    try:
        from tradingagents.default_config import DEFAULT_CONFIG  # type: ignore
        from tradingagents.graph.trading_graph import TradingAgentsGraph  # type: ignore

        config = dict(DEFAULT_CONFIG)
        config["llm_provider"] = cfg.provider.lower()
        if cfg.quickModel:
            config["quick_think_llm"] = cfg.quickModel
        if cfg.deepModel:
            config["deep_think_llm"] = cfg.deepModel
        rounds = {"Shallow": 1, "Medium": 2, "Deep": 3}.get(cfg.researchDepth, 1)
        config["max_debate_rounds"] = rounds
        config["max_risk_discuss_rounds"] = rounds

        selected = [ANALYST_KEYS[a] for a in cfg.analysts if a in ANALYST_KEYS] or ["market"]

        record["status"] = "running"
        record["prices"] = build_prices(cfg.ticker, cfg.analysisDate)

        graph = TradingAgentsGraph(selected_analysts=selected, debug=False, config=config)
        init_state = graph.propagator.create_initial_state(cfg.ticker, cfg.analysisDate)
        args = graph.propagator.get_graph_args()

        final_state: dict[str, Any] = {}
        for chunk in graph.graph.stream(init_state, **args):
            if run_id in CANCELLED:
                record["status"] = "error"
                record["error"] = "Run cancelled from the dashboard."
                return
            if isinstance(chunk, dict):
                final_state.update(chunk)
                with LOCK:
                    ingest_state(record, final_state)
                    record["stats"]["runtimeSeconds"] = int(time.time() - started)

        final_text = final_state.get("final_trade_decision") or ""
        if isinstance(final_text, dict):
            final_text = final_text.get("content", "")
        record["reports"]["final_decision"] = final_text or record["reports"].get("final_decision", "")
        ingest_state(record, final_state)
        finalise(record, final_text)
        for a in record["agents"]:
            if a["status"] == "pending" and a.get("note") != "Not selected":
                a["status"] = "completed"
        record["status"] = "completed"
    except Exception as exc:  # pragma: no cover
        record["status"] = "error"
        record["error"] = f"{type(exc).__name__}: {exc}"
    finally:
        record["stats"]["runtimeSeconds"] = int(time.time() - started)
        CANCELLED.discard(run_id)


# --------------------------------------------------------------------------
# HTTP API
# --------------------------------------------------------------------------

@app.get("/health")
def health() -> dict[str, Any]:
    try:
        import tradingagents  # type: ignore

        version = getattr(tradingagents, "__version__", "installed")
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"TradingAgents not importable: {exc}")
    return {"status": "ok", "engine_version": version}


@app.post("/runs")
def start_run(cfg: RunConfig) -> dict[str, str]:
    run_id = uuid.uuid4().hex[:12]
    RUNS[run_id] = new_record(run_id, cfg)
    threading.Thread(target=execute, args=(run_id, cfg), daemon=True).start()
    return {"run_id": run_id}


@app.get("/runs")
def list_runs() -> list[dict[str, Any]]:
    return sorted(RUNS.values(), key=lambda r: r["startedAt"], reverse=True)


@app.get("/runs/{run_id}")
def get_run(run_id: str) -> dict[str, Any]:
    if run_id not in RUNS:
        raise HTTPException(status_code=404, detail="Unknown run")
    return RUNS[run_id]


@app.post("/runs/{run_id}/cancel")
def cancel_run(run_id: str) -> dict[str, bool]:
    if run_id not in RUNS:
        raise HTTPException(status_code=404, detail="Unknown run")
    CANCELLED.add(run_id)
    return {"ok": True}


if __name__ == "__main__":
    print(f"TradingAgents Workbench bridge -> http://{HOST}:{PORT}")
    uvicorn.run(app, host=HOST, port=PORT, log_level="info")
