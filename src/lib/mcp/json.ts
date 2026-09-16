// MCP structuredContent must be plain JSON; this strips undefined and narrows types.
export function json(value: unknown): Record<string, never> {
  return JSON.parse(JSON.stringify(value ?? {})) as Record<string, never>;
}
