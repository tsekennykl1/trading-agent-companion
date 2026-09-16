import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { engineFetch, summarizeRun, asObject, pickString, FINISHED } from "../engine";
import { runConfigPayload } from "@/lib/trading-agents/run-payload";
import type { RunConfig } from "@/lib/trading-agents/types";
import { DEFAULT_STAGES } from "@/lib/trading-agents/types";

const ANALYSTS = ["Market Analyst", "Sentiment Analyst", "News Analyst", "Fundamentals Analyst"] as const;

export default defineTool({
  name: "analyze_ticker",
  title: "Analyze a stock ticker",
  description:
    "Start a multi-agent trading analysis for a stock ticker on the trading engine and wait briefly for the result. Returns the trade decision when the run finishes in time, otherwise a run_id to poll with get_analysis.",
  inputSchema: {
    ticker: z.string().trim().min(1).max(20).describe("Stock ticker, e.g. AAPL or 0700.HK"),
    analysis_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("Analysis end date as YYYY-MM-DD. Defaults to today."),
    research_depth: z.enum(["Shallow", "Medium", "Deep"]).default("Medium").optional(),
    language: z.string().trim().max(40).default("English").optional(),
    analysts: z.array(z.enum(ANALYSTS)).max(4).optional().describe("Analyst agents to run. Defaults to Market Analyst."),
    wait_seconds: z
      .number()
      .int()
      .min(0)
      .max(60)
      .default(30)
      .optional()
      .describe("How long to wait for the run to finish before returning a run_id."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  handler: async (input, ctx) => {
    const today = new Date().toISOString().slice(0, 10);
    const config: RunConfig = {
      ticker: input.ticker.toUpperCase(),
      analysisDate: input.analysis_date ?? today,
      provider: "",
      quickModel: "",
      deepModel: "",
      researchDepth: input.research_depth ?? "Medium",
      analysts: input.analysts?.length ? [...input.analysts] : ["Market Analyst"],
      stages: DEFAULT_STAGES,
      language: input.language ?? "English",
    };

    const started = asObject(
      await engineFetch<unknown>("/runs", {
        method: "POST",
        body: JSON.stringify(runConfigPayload(config)),
        signal: ctx.signal,
      }),
    );
    const runId =
      pickString(started, "run_id", "runId", "id") ?? pickString(asObject(started["run"]), "run_id", "id");
    if (!runId) throw new ToolError("The engine started a run but did not return a run id.");

    const waitMs = (input.wait_seconds ?? 30) * 1000;
    const deadline = Date.now() + waitMs;
    let summary = summarizeRun(started);

    while (Date.now() < deadline && !ctx.signal?.aborted) {
      await new Promise((r) => setTimeout(r, 3000));
      summary = summarizeRun(await engineFetch<unknown>(`/runs/${runId}`, { signal: ctx.signal }));
      await ctx.progress?.({
        progress: summary.progress.percent ?? 0,
        total: 100,
        message: summary.progress.message ?? summary.status,
      });
      if (FINISHED.has(summary.status)) break;
    }

    const finished = FINISHED.has(summary.status);
    const text = finished
      ? `Analysis ${runId} for ${summary.ticker} finished with status ${summary.status}.`
      : `Analysis ${runId} for ${summary.ticker} is still ${summary.status}. Call get_analysis with this run_id to read the result.`;

    return {
      content: [{ type: "text", text: `${text}\n\n${JSON.stringify(summary, null, 2)}` }],
      structuredContent: { run_id: runId, finished, ...summary },
    };
  },
});
