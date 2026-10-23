/**
 * Market detection for the stock field. There is no market picker: an
 * all-numeric code (optionally ending in ".HK") is a Hong Kong stock when it
 * is on the HKEX list; anything with letters is sent to the engine as typed.
 */
export type TickerKind =
  | { kind: "empty" }
  | { kind: "hk"; code: string; ticker: string }
  | { kind: "unlisted"; code: string }
  | { kind: "other"; ticker: string };

/** Zero-padded HK code for numeric input ("700" → "0700"), otherwise null. */
export function numericHkCode(input: string): string | null {
  const digits = input.trim().toUpperCase().replace(/\.HK$/, "");
  return /^\d{1,5}$/.test(digits) ? digits.padStart(4, "0") : null;
}

export function classifyTicker(input: string, hkList: Record<string, unknown>): TickerKind {
  const raw = input.trim().toUpperCase();
  if (!raw) return { kind: "empty" };
  const code = numericHkCode(raw);
  if (!code) return { kind: "other", ticker: raw };
  return hkList[code] ? { kind: "hk", code, ticker: `${code}.HK` } : { kind: "unlisted", code };
}
