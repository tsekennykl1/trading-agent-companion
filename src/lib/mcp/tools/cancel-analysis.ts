import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { accessKeyField, requireAccessKey } from "../auth";
import { isMcpRun } from "../ownership";
import { engineFetch } from "../engine";

export default defineTool({
  name: "cancel_analysis",
  title: "Cancel an analysis",
  description:
    "Cancel a queued or running analysis by its run_id. Only runs that were started through this MCP server can be cancelled here.",
  inputSchema: {
    ...accessKeyField,
    run_id: z.string().trim().min(1).max(120),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
  handler: async ({ access_key, run_id }, ctx) => {
    requireAccessKey(access_key);
    if (!isMcpRun(run_id)) {
      throw new ToolError(
        "This run was not started through MCP, so it cannot be cancelled here. Cancel it from the dashboard instead.",
      );
    }
    await engineFetch<unknown>(`/runs/${encodeURIComponent(run_id)}/cancel`, {
      method: "POST",
      signal: ctx.signal,
    });
    return {
      content: [{ type: "text", text: `Cancellation requested for run ${run_id}.` }],
      structuredContent: { run_id, cancelled: true },
    };
  },
});
