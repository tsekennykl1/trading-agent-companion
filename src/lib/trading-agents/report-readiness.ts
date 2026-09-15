import type { RunStatus } from "./client";
import type { RunRecord } from "./types";

/** Accept the readiness shapes used by current and older bridge versions. */
export function normalizeReportsReady(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string" || typeof item === "number") return String(item);
        if (!item || typeof item !== "object") return "";
        const record = item as Record<string, unknown>;
        return String(record["name"] ?? record["key"] ?? record["report"] ?? "");
      })
      .filter(Boolean);
  }
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (value === true) return ["detail_report"];
  if (typeof value === "number" && value > 0) return ["detail_report"];
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, ready]) => {
        if (ready === false || ready === null || ready === undefined) return false;
        return typeof ready !== "string" || ready.trim().length > 0;
      })
      .map(([name]) => name);
  }
  return [];
}

export function finalReportReady({
  status,
  reportsReady = [],
  resultUrl,
}: {
  status: RunRecord["status"] | undefined;
  reportsReady?: string[];
  resultUrl?: string | undefined;
}): boolean {
  return status === "completed" && (reportsReady.length > 0 || Boolean(resultUrl));
}

export function reportsReadyFor(run?: RunRecord, status?: RunStatus | null): string[] {
  const names = new Set<string>([
    ...(run?.partial?.reportsReady ?? []),
    ...(status?.reportsReady ?? []),
  ]);
  return [...names];
}