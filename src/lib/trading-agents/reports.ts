// Readers for the report endpoints (one report, or the index of ready ones).

function reportText(value: unknown): string | null {
  if (typeof value === "string") return value.trim() ? value : null;
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    for (const key of ["content", "report", "text", "markdown", "body"]) {
      const inner = o[key];
      if (typeof inner === "string" && inner.trim()) return inner;
    }
  }
  return null;
}

/** Reads a single-report response in any of the shapes the engine may use. */
export function readReportContent(raw: unknown): string | null {
  return reportText(raw);
}

/**
 * Reads GET /runs/{id}/reports. The engine may return a name→content map, a
 * wrapper object, or just a list of ready report names.
 */
export function readReportsIndex(raw: unknown): { names: string[]; contents: Record<string, string> } {
  const empty = { names: [] as string[], contents: {} as Record<string, string> };
  if (!raw) return empty;

  const collect = (value: unknown): { names: string[]; contents: Record<string, string> } => {
    if (Array.isArray(value)) {
      const names: string[] = [];
      const contents: Record<string, string> = {};
      for (const item of value) {
        if (typeof item === "string") {
          names.push(item);
          continue;
        }
        const o = (item ?? {}) as Record<string, unknown>;
        const name = typeof o["name"] === "string" ? o["name"] : typeof o["key"] === "string" ? o["key"] : undefined;
        if (!name) continue;
        names.push(name);
        const text = reportText(o);
        if (text) contents[name] = text;
      }
      return { names, contents };
    }
    if (value && typeof value === "object") {
      const o = value as Record<string, unknown>;
      const names: string[] = [];
      const contents: Record<string, string> = {};
      for (const [key, v] of Object.entries(o)) {
        if (v === null || v === undefined || v === false) continue;
        names.push(key);
        const text = reportText(v);
        if (text) contents[key] = text;
      }
      return { names, contents };
    }
    return empty;
  };

  if (typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    for (const key of ["reports", "available", "ready", "items"]) {
      if (o[key] !== undefined && o[key] !== null) return collect(o[key]);
    }
  }
  return collect(raw);
}
