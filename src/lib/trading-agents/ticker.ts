/**
 * Market detection for the stock field. There is no market picker: an
 * all-numeric code (optionally ending in ".HK") is a Hong Kong stock when it
 * is on the HKEX list; a letter code on the engine's US list is a US stock;
 * anything else is sent to the engine as typed (e.g. 7203.T).
 */
import { findUsTicker } from "./us-securities";

export type TickerKind =
  | { kind: "empty" }
  | { kind: "hk"; code: string; ticker: string }
  | { kind: "unlisted"; code: string }
  | { kind: "us"; ticker: string }
  | { kind: "other"; ticker: string };

/** Zero-padded HK code for numeric input ("700" → "0700"), otherwise null. */
export function numericHkCode(input: string): string | null {
  const digits = input.trim().toUpperCase().replace(/\.HK$/, "");
  return /^\d{1,5}$/.test(digits) ? digits.padStart(4, "0") : null;
}

export function classifyTicker(
  input: string,
  hkList: Record<string, unknown>,
  usList?: Record<string, unknown> | null,
): TickerKind {
  const raw = input.trim().toUpperCase();
  if (!raw) return { kind: "empty" };
  const code = numericHkCode(raw);
  if (code) return hkList[code] ? { kind: "hk", code, ticker: `${code}.HK` } : { kind: "unlisted", code };
  const us = findUsTicker(raw, usList as Parameters<typeof findUsTicker>[1]);
  return us ? { kind: "us", ticker: us } : { kind: "other", ticker: raw };
}
