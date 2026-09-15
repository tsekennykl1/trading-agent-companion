/**
 * Date and duration formatting used across the app.
 * Times are always English AM/PM so they never mix locale formats.
 */

const DASH = "—";

/** "90" -> "1m 30s", "45" -> "45s" */
export function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes > 0 ? `${minutes}m ${String(rest).padStart(2, "0")}s` : `${rest}s`;
}

/** Milliseconds as "1m 30s"; undefined becomes a dash. */
export function formatDuration(ms: number | undefined): string {
  return ms === undefined ? DASH : formatElapsed(Math.max(0, Math.round(ms / 1000)));
}

function format(value: string | undefined, options: Intl.DateTimeFormatOptions, fallback: string): string {
  if (!value) return DASH;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return new Intl.DateTimeFormat("en-US", { hour12: true, ...options }).format(parsed);
}

/** Time only: "09:41:07 AM" */
export function formatClock(value: string | undefined): string {
  return format(value, { hour: "2-digit", minute: "2-digit", second: "2-digit" }, DASH);
}

/** Date and time: "Sep 15, 2026, 09:41:07 AM" */
export function formatDateTime(value: string | undefined): string {
  return format(
    value,
    { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" },
    value ?? DASH,
  );
}
