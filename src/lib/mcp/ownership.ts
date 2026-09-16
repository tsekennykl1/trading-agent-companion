// Guard rails for the MCP tools that cost money or stop other people's work.
//
// Two very small, in-memory helpers (no database needed):
//   1. rememberMcpRun / isMcpRun - only runs that were STARTED through MCP can
//      be cancelled through MCP, so an assistant can never stop a run someone
//      started from the dashboard.
//   2. checkStartBudget - a simple cap on how many analyses MCP may start in a
//      rolling window, so a leaked key cannot burn the whole LLM budget.
//
// Because this lives in memory, the lists reset whenever the site restarts.
// That is fine: the worst case is a cancel being refused (the caller can cancel
// from the dashboard) or the budget window starting over.

import { ToolError } from "@lovable.dev/mcp-js";

/** Keep the most recent MCP-started runs; plenty for cancelling in-flight work. */
const MAX_TRACKED_RUNS = 200;
const mcpRuns: string[] = [];

export function rememberMcpRun(runId: string): void {
  if (mcpRuns.includes(runId)) return;
  mcpRuns.push(runId);
  if (mcpRuns.length > MAX_TRACKED_RUNS) mcpRuns.shift();
}

export function isMcpRun(runId: string): boolean {
  return mcpRuns.includes(runId);
}

/** At most this many analyses may be started through MCP per window. */
const MAX_STARTS = 5;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
let starts: number[] = [];

/** Throws when MCP has started too many analyses recently. */
export function checkStartBudget(): void {
  const now = Date.now();
  starts = starts.filter((t) => now - t < WINDOW_MS);
  if (starts.length >= MAX_STARTS) {
    const waitMin = Math.ceil((WINDOW_MS - (now - (starts[0] as number))) / 60000);
    throw new ToolError(
      `Too many analyses started through MCP recently (limit ${MAX_STARTS} per ${WINDOW_MS / 60000} minutes). Try again in about ${waitMin} minute(s).`,
    );
  }
  starts.push(now);
}
