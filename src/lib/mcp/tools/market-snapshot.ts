import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { engineFetch } from "../engine";
import { json } from "../json";
import { accessKeyField, requireAccessKey } from "../auth";

export default defineTool({
  name: "get_market_snapshot",
  title: "Get a company snapshot",
  description:
    "Fetch the company profile, valuation and latest quote for a ticker, plus official English and Chinese names for Hong Kong listings.",
  inputSchema: {
    ...accessKeyField, ticker: z.string().trim().min(1).max(20) },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ access_key, ticker }, ctx) => {
    requireAccessKey(access_key);
    const symbol = encodeURIComponent(ticker.toUpperCase());
    const [company, security] = await Promise.all([
      engineFetch<unknown>(`/market/company?ticker=${symbol}`, { signal: ctx.signal }).catch(() => null),
      ticker.toUpperCase().endsWith(".HK")
        ? engineFetch<unknown>(`/market/security?ticker=${symbol}`, { signal: ctx.signal }).catch(() => null)
        : Promise.resolve(null),
    ]);
    const payload = { ticker: ticker.toUpperCase(), company, security };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: json(payload),
    };
  },
});
