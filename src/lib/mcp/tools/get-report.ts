import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { accessKeyField, requireAccessKey } from "../auth";
import { engineFetch, asObject } from "../engine";

const REPORT_NAME = /^[a-z0-9_]{1,60}$/;

export default defineTool({
  name: "get_report",
  title: "Read an analyst report",
  description:
    "List the analyst reports produced by a run, or read one of them (e.g. market_report, investment_plan, final_decision).",
  inputSchema: {
    ...accessKeyField,
    run_id: z.string().trim().min(1).max(120),
    report: z
      .string()
      .trim()
      .max(60)
      .optional()
      .describe("Report name. Omit to list the reports available for this run."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ access_key, run_id, report }, ctx) => {
    requireAccessKey(access_key);
    const id = encodeURIComponent(run_id);
    if (!report) {
      const raw = await engineFetch<unknown>(`/runs/${id}/reports`, { signal: ctx.signal });
      const obj = asObject(raw);
      const names = Array.isArray(raw)
        ? (raw as string[])
        : Array.isArray(obj["names"])
          ? (obj["names"] as string[])
          : Object.keys(asObject(obj["reports"] ?? obj));
      return {
        content: [{ type: "text", text: `Reports available: ${names.join(", ") || "none yet"}` }],
        structuredContent: { reports: names },
      };
    }
    if (!REPORT_NAME.test(report)) throw new ToolError(`Invalid report name: ${report}`);
    const raw = await engineFetch<unknown>(`/runs/${id}/reports/${report}`, { signal: ctx.signal });
    const obj = asObject(raw);
    const content =
      typeof raw === "string"
        ? raw
        : typeof obj["content"] === "string"
          ? (obj["content"] as string)
          : typeof obj["text"] === "string"
            ? (obj["text"] as string)
            : JSON.stringify(raw);
    if (!content?.trim()) throw new ToolError(`Report ${report} is not available for run ${run_id}.`);
    return {
      content: [{ type: "text", text: content.slice(0, 100_000) }],
      structuredContent: { run_id, report },
    };
  },
});
