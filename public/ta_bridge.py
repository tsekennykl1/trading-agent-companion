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
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from pydantic import BaseModel, Field

HOST = "127.0.0.1"
PORT = 8000

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

# Display names the dashboard may send -> names your TradingAgents install accepts.
MODEL_ALIASES: dict[str, str] = {
    # DeepSeek
    "deepseek-flash": "deepseek-flash",
    "deepseek v4 flash": "deepseek-flash",
    "deepseek v4 pro": "deepseek-v4-pro",
    "deepseek-v4-pro": "deepseek-v4-pro",
    "deepseek v3": "deepseek-chat",
    "deepseek-chat": "deepseek-chat",
    "deepseek r1": "deepseek-reasoner",
    "deepseek-reasoner": "deepseek-reasoner",
    # OpenAI
    "gpt-5.6": "gpt-5.6",
    "gpt-4o": "gpt-4o",
    "gpt-4o-mini": "gpt-4o-mini",
    "o3-mini": "o3-mini",
    # Anthropic
    "claude-3-7-sonnet": "claude-3-7-sonnet-latest",
    "claude-3-7-sonnet-latest": "claude-3-7-sonnet-latest",
    "claude-3-5-sonnet": "claude-3-5-sonnet-latest",
    "claude-3-5-sonnet-latest": "claude-3-5-sonnet-latest",
    "claude-3-opus": "claude-3-opus-latest",
    "claude-3-opus-latest": "claude-3-opus-latest",
    # Google
    "gemini-2.5-pro": "gemini-2.5-pro-preview-03-25",
    "gemini-2.5-flash": "gemini-2.5-flash-preview-04-17",
    # Qwen
    "qwen3-235b-a22b": "qwen3-235b-a22b",
    "qwen3-30b-a3b": "qwen3-30b-a3b",
    "qwen-max": "qwen-max",
}

def normalize_model(name: str) -> str:
    """Map a user-facing model label to the exact API id the engine expects."""
    if not name:
        return name
    key = name.strip().lower()
    return MODEL_ALIASES.get(key, name)

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
            closes = [float(value) for value in df["Close"].tolist()]
            dates = [str(d)[:10] for d in df.index.tolist()]
            opens = df["Open"].tolist() if "Open" in df.columns else closes
            highs = df["High"].tolist() if "High" in df.columns else closes
            lows = df["Low"].tolist() if "Low" in df.columns else closes
            volumes = df["Volume"].tolist() if "Volume" in df.columns else [0] * len(closes)
            deltas = pd.Series(closes).diff()
            gains = deltas.clip(lower=0).ewm(alpha=1 / 14, adjust=False, min_periods=14).mean()
            losses = (-deltas.clip(upper=0)).ewm(alpha=1 / 14, adjust=False, min_periods=14).mean()
            relative_strength = gains / losses.replace(0, float("nan"))
            rsi14 = (100 - (100 / (1 + relative_strength))).fillna(50).tolist()
            ema10 = None
            ema20 = None
            ema50 = None
            k10 = 2 / (10 + 1)
            k20 = 2 / (20 + 1)
            k50 = 2 / (50 + 1)
            for i, (d, c) in enumerate(zip(dates, closes)):
                ema10 = c if ema10 is None else (c * k10 + ema10 * (1 - k10))
                ema20 = c if ema20 is None else (c * k20 + ema20 * (1 - k20))
                ema50 = c if ema50 is None else (c * k50 + ema50 * (1 - k50))
                window = closes[max(0, i - 19) : i + 1]
                window50 = closes[max(0, i - 49) : i + 1]
                rows.append(
                    {
                        "date": d,
                        "open": round(float(opens[i]), 2),
                        "high": round(float(highs[i]), 2),
                        "low": round(float(lows[i]), 2),
                        "close": round(c, 2),
                        "volume": max(0, int(float(volumes[i]))),
                        "rsi14": round(float(rsi14[i]), 1),
                        "ema10": round(ema10, 2),
                        "ema20": round(ema20, 2),
                        "ema50": round(ema50, 2),
                        "sma20": round(sum(window) / len(window), 2),
                        "sma50": round(sum(window50) / len(window50), 2),
                    }
                )
        return rows
    except Exception:  # pragma: no cover - charts are optional
        return []


# --------------------------------------------------------------------------
# Python-generated charts (Plotly + Matplotlib)
# --------------------------------------------------------------------------

def build_plotly_html(ticker: str, rows: list[dict[str, Any]]) -> str:
    """Interactive price, volume, and RSI chart rendered with Plotly."""
    try:
        import plotly.graph_objects as go
        from plotly.subplots import make_subplots

        fig = make_subplots(
            rows=3,
            cols=1,
            shared_xaxes=True,
            vertical_spacing=0.035,
            row_heights=[0.64, 0.18, 0.18],
        )
        dates = [r["date"] for r in rows]
        has_ohlc = all(all(key in row for key in ("open", "high", "low", "close")) for row in rows)
        if has_ohlc:
            fig.add_trace(
                go.Candlestick(
                    x=dates,
                    open=[r["open"] for r in rows],
                    high=[r["high"] for r in rows],
                    low=[r["low"] for r in rows],
                    close=[r["close"] for r in rows],
                    name="Close",
                    increasing_line_color="#11823b",
                    decreasing_line_color="#dc2626",
                ),
                row=1,
                col=1,
            )
        else:
            fig.add_trace(
                go.Scatter(
                    x=dates,
                    y=[r["close"] for r in rows],
                    name="Close",
                    mode="lines",
                    line=dict(color="#1d6472", width=2.4),
                ),
                row=1,
                col=1,
            )
        for key, label, colour in (
            ("ema20", "EMA 20", "#f59e0b"),
            ("ema50", "EMA 50", "#11823b"),
        ):
            if rows and key in rows[0]:
                fig.add_trace(
                    go.Scatter(
                        x=dates,
                        y=[r.get(key) for r in rows],
                        name=label,
                        mode="lines",
                        line=dict(width=1.4, color=colour),
                    ),
                    row=1,
                    col=1,
                )

        fig.add_trace(
            go.Bar(
                x=dates,
                y=[r.get("volume", 0) for r in rows],
                name="Volume",
                marker_color="#7276d9",
                opacity=0.8,
            ),
            row=2,
            col=1,
        )
        fig.add_trace(
            go.Scatter(
                x=dates,
                y=[r.get("rsi14") for r in rows],
                name="RSI 14",
                mode="lines",
                line=dict(color="#666666", width=1.8),
            ),
            row=3,
            col=1,
        )
        fig.add_hline(y=70, line_dash="dash", line_color="#dc2626", line_width=1.4, row=3, col=1)
        fig.add_hline(y=30, line_dash="dash", line_color="#11823b", line_width=1.4, row=3, col=1)
        fig.update_layout(
            title=f"{ticker} — price trend, volume and RSI",
            template="plotly_white",
            height=760,
            margin=dict(l=64, r=32, t=64, b=44),
            legend=dict(orientation="v", x=1.01, y=1),
            hovermode="x unified",
            xaxis_rangeslider_visible=False,
        )
        fig.update_yaxes(title_text="Price", row=1, col=1)
        fig.update_yaxes(title_text="Volume", rangemode="tozero", row=2, col=1)
        fig.update_yaxes(title_text="RSI", range=[0, 100], row=3, col=1)
        fig.update_xaxes(title_text="Date", row=3, col=1)
        return fig.to_html(full_html=True, include_plotlyjs="cdn")
    except Exception as exc:  # pragma: no cover
        return f"<html><body><p>Plotly chart unavailable: {exc}</p></body></html>"


def build_matplotlib_png(ticker: str, rows: list[dict[str, Any]]) -> bytes:
    """Static price, volume, and RSI chart for reports and slide decks."""
    try:
        import io

        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        dates = [r["date"] for r in rows]
        fig, axes = plt.subplots(
            3,
            1,
            figsize=(12, 8),
            dpi=140,
            sharex=True,
            gridspec_kw={"height_ratios": [3.5, 1, 1], "hspace": 0.08},
        )
        price_ax, volume_ax, rsi_ax = axes
        has_ohlc = all(all(key in row for key in ("open", "high", "low", "close")) for row in rows)
        if has_ohlc:
            for index, row in enumerate(rows):
                rising = row["close"] >= row["open"]
                colour = "#11823b" if rising else "#dc2626"
                price_ax.vlines(index, row["low"], row["high"], color=colour, linewidth=0.8)
                bottom = min(row["open"], row["close"])
                height = max(abs(row["close"] - row["open"]), 0.02)
                price_ax.bar(index, height, bottom=bottom, width=0.62, color=colour, edgecolor=colour)
        else:
            price_ax.plot(dates, [r["close"] for r in rows], label="Close", color="#1d6472", linewidth=2.2)
        for key, label, colour in (
            ("ema20", "EMA 20", "#f59e0b"),
            ("ema50", "EMA 50", "#11823b"),
        ):
            if rows and key in rows[0]:
                price_ax.plot(range(len(rows)), [r.get(key) for r in rows], label=label, linewidth=1.2, color=colour)
        price_ax.set_title(f"{ticker} — price trend, volume and RSI")
        price_ax.set_ylabel("Price")
        price_ax.grid(alpha=0.25)
        price_ax.legend(loc="best", fontsize=8)

        volume_ax.bar(range(len(rows)), [r.get("volume", 0) for r in rows], color="#7276d9", alpha=0.8)
        volume_ax.set_ylabel("Volume")
        volume_ax.grid(axis="y", alpha=0.2)

        rsi_ax.plot(range(len(rows)), [r.get("rsi14", 50) for r in rows], color="#666666", linewidth=1.5)
        rsi_ax.axhline(70, color="#dc2626", linestyle="--", linewidth=1)
        rsi_ax.axhline(30, color="#11823b", linestyle="--", linewidth=1)
        rsi_ax.set_ylim(0, 100)
        rsi_ax.set_ylabel("RSI")
        rsi_ax.set_xlabel("Date")
        rsi_ax.grid(alpha=0.2)
        step = max(1, len(dates) // 10)
        tick_positions = list(range(0, len(dates), step))
        rsi_ax.set_xticks(tick_positions, [dates[index] for index in tick_positions])
        plt.setp(rsi_ax.get_xticklabels(), rotation=45, ha="right", fontsize=7)
        fig.subplots_adjust(left=0.08, right=0.98, top=0.92, bottom=0.14)
        buf = io.BytesIO()
        fig.savefig(buf, format="png")
        plt.close(fig)
        return buf.getvalue()
    except Exception:  # pragma: no cover
        return b""


def build_charts(record: dict[str, Any]) -> None:
    rows = record.get("prices") or []
    ticker = record["config"]["ticker"]
    record["chartHtml"] = build_plotly_html(ticker, rows) if rows else ""
    record["_chartPng"] = build_matplotlib_png(ticker, rows) if rows else b""
    record["charts"] = {
        "plotly": f"/runs/{record['id']}/chart.html" if rows else None,
        "png": f"/runs/{record['id']}/chart.png" if rows else None,
    }



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
            config["quick_think_llm"] = normalize_model(cfg.quickModel)
        if cfg.deepModel:
            config["deep_think_llm"] = normalize_model(cfg.deepModel)
        rounds = {"Shallow": 1, "Medium": 2, "Deep": 3}.get(cfg.researchDepth, 1)
        config["max_debate_rounds"] = rounds
        config["max_risk_discuss_rounds"] = rounds

        selected = [ANALYST_KEYS[a] for a in cfg.analysts if a in ANALYST_KEYS] or ["market"]

        record["status"] = "running"
        record["prices"] = build_prices(cfg.ticker, cfg.analysisDate)
        build_charts(record)


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


def public_view(record: dict[str, Any]) -> dict[str, Any]:
    """JSON-safe copy: chart payloads are served by their own endpoints."""
    return {k: v for k, v in record.items() if k not in ("chartHtml", "_chartPng")}


@app.get("/runs")
def list_runs() -> list[dict[str, Any]]:
    return [public_view(r) for r in sorted(RUNS.values(), key=lambda r: r["startedAt"], reverse=True)]


@app.get("/runs/{run_id}")
def get_run(run_id: str) -> dict[str, Any]:
    if run_id not in RUNS:
        raise HTTPException(status_code=404, detail="Unknown run")
    return public_view(RUNS[run_id])


@app.get("/runs/{run_id}/status")
def run_status(run_id: str) -> dict[str, Any]:
    """Lightweight readiness poll: no reports, no chart payloads, no history.

    The dashboard polls this instead of the full run so it can tell when the
    decision and the detailed reports are actually finished.
    """
    if run_id not in RUNS:
        raise HTTPException(status_code=404, detail="Unknown run")
    record = RUNS[run_id]
    partial = record.get("partial_result") or record.get("partialResult") or {}
    reports = partial.get("reports") or record.get("reports") or {}
    reports_ready = partial.get("reports_ready")
    if not isinstance(reports_ready, list):
        reports_ready = [name for name, body in reports.items() if body]
    decision_ready = partial.get("decision_ready")
    if decision_ready is None:
        decision_ready = bool(record.get("decision"))
    return {
        "run_id": run_id,
        "status": record.get("status"),
        "created_at": record.get("createdAt") or record.get("created_at"),
        "updated_at": record.get("updatedAt") or record.get("updated_at"),
        "started_at": record.get("startedAt") or record.get("started_at"),
        "completed_at": record.get("completedAt") or record.get("completed_at"),
        "progress": record.get("progress"),
        "error": record.get("error"),
        "cancel_requested": run_id in CANCELLED,
        "poll_after_ms": record.get("poll_after_ms") or record.get("pollAfterMs"),
        "decision_ready": bool(decision_ready),
        "reports_ready": [str(name) for name in reports_ready],
        "result_url": partial.get("result_url") or partial.get("resultUrl"),
    }


@app.get("/runs/{run_id}/chart.html")
def chart_html(run_id: str) -> HTMLResponse:
    """Interactive Plotly chart generated in Python, embedded by the dashboard."""
    if run_id not in RUNS:
        raise HTTPException(status_code=404, detail="Unknown run")
    html = RUNS[run_id].get("chartHtml") or "<html><body><p>Chart not ready yet.</p></body></html>"
    return HTMLResponse(content=html)


@app.get("/runs/{run_id}/chart.png")
def chart_png(run_id: str) -> Response:
    """Static Matplotlib chart generated in Python (for reports and slides)."""
    if run_id not in RUNS:
        raise HTTPException(status_code=404, detail="Unknown run")
    png = RUNS[run_id].get("_chartPng") or b""
    if not png:
        raise HTTPException(status_code=404, detail="Chart not ready yet")
    return Response(content=png, media_type="image/png")


@app.post("/runs/{run_id}/cancel")
def cancel_run(run_id: str) -> dict[str, bool]:
    if run_id not in RUNS:
        raise HTTPException(status_code=404, detail="Unknown run")
    CANCELLED.add(run_id)
    return {"ok": True}



if __name__ == "__main__":
    print(f"TradingAgents Workbench bridge -> http://{HOST}:{PORT}")
    uvicorn.run(app, host=HOST, port=PORT, log_level="info")
