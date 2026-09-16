import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { engineFetch, summarizeRun, FINISHED } from "../engine";
import { json } from "../json";
import { accessKeyField, requireAccessKey } from "../auth";

export default defineTool({
  name: "get_analysis",
  title: "Get an analysis result",
  description:
    "Read the current status, progress and trade decision of one analysis run by its run_id.",
  inputSchema: {
    ...accessKeyField, run_id: z.string().trim().min(1).max(120) },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ access_key, run_id }, ctx) => {
    requireAccessKey(access_key);
    const summary = summarizeRun(
      await engineFetch<unknown>(`/runs/${encodeURIComponent(run_id)}`, { signal: ctx.signal }),
    );
    return {
      content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      structuredContent: json({ finished: FINISHED.has(summary.status), ...summary }),
    };
  },
});
