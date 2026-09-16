import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { accessKeyField, requireAccessKey } from "../auth";
import { engineFetch } from "../engine";

export default defineTool({
  name: "cancel_analysis",
  title: "Cancel an analysis",
  description: "Cancel a queued or running analysis by its run_id.",
  inputSchema: {
    ...accessKeyField, run_id: z.string().trim().min(1).max(120) },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
  handler: async ({ access_key, run_id }, ctx) => {
    requireAccessKey(access_key);
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
