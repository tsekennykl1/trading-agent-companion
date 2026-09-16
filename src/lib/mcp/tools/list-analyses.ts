import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { engineFetch, summarizeRun } from "../engine";

export default defineTool({
  name: "list_analyses",
  title: "List recent analyses",
  description: "List the most recent analysis runs on the trading engine, newest first.",
  inputSchema: { limit: z.number().int().min(1).max(50).default(10).optional() },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ limit }, ctx) => {
    const raw = await engineFetch<unknown>("/runs", { signal: ctx.signal });
    const items = Array.isArray(raw) ? raw : ((raw as { runs?: unknown[] })?.runs ?? []);
    const runs = items.slice(0, limit ?? 10).map(summarizeRun);
    return {
      content: [{ type: "text", text: JSON.stringify(runs, null, 2) }],
      structuredContent: { runs },
    };
  },
});
