// Shared-access-key gate for the MCP tools.
// Every tool takes an `access_key` argument and it must match the server's
// MCP_ACCESS_KEY secret, otherwise the call is rejected.

import { ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";

/** Spread into each tool's inputSchema. */
export const accessKeyField = {
  access_key: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .describe("Shared access key for this trading MCP server. Ask the owner for it."),
};

function configuredKey(): string | undefined {
  const env = (globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  }).process?.env;
  return env?.["MCP_ACCESS_KEY"]?.trim() || undefined;
}

/** Constant-time string compare, so a wrong key leaks no timing hints. */
function equals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Throws unless the caller supplied the correct shared access key. */
export function requireAccessKey(key: string | undefined): void {
  const expected = configuredKey();
  if (!expected) {
    throw new ToolError(
      "This server has no access key configured yet, so all tool calls are refused. The owner must set MCP_ACCESS_KEY.",
    );
  }
  if (!key || !equals(key.trim(), expected)) {
    throw new ToolError("Invalid access key.");
  }
}
