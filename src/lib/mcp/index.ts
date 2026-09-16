import { defineMcp } from "@lovable.dev/mcp-js";
import analyzeTicker from "./tools/analyze-ticker";
import getAnalysis from "./tools/get-analysis";
import listAnalyses from "./tools/list-analyses";
import getReport from "./tools/get-report";
import cancelAnalysis from "./tools/cancel-analysis";
import marketSnapshot from "./tools/market-snapshot";

export default defineMcp({
  name: "tauric-trading-connect",
  title: "Tauric Trading Connect",
  version: "0.1.0",
  instructions:
    "Tools for the TradingAgents engine. Use `analyze_ticker` to run a multi-agent stock analysis for a ticker; it returns the trade decision, or a run_id to poll with `get_analysis`. Use `get_report` for the individual analyst write-ups, `list_analyses` for run history, `get_market_snapshot` for company data, and `cancel_analysis` to stop a run.",
  tools: [analyzeTicker, getAnalysis, listAnalyses, getReport, cancelAnalysis, marketSnapshot],
});
