/**
 * The engine's US stock directory: ticker → [English name, Chinese name, exchange].
 * Loaded once from GET /market/securities?market=US and cached in localStorage
 * so suggestions keep working while the engine is offline.
 */
export type UsSecurityRow = [string, string | null, string | null];
export type UsSecurities = Record<string, UsSecurityRow>;

const STORAGE_KEY = "ta-us-securities";

/** Accept only the documented `{ securities: { TICKER: [name, zh, exchange] } }` shape. */
export function readUsSecurities(raw: unknown): UsSecurities | null {
  const securities = (raw as { securities?: unknown } | null)?.securities;
  if (!securities || typeof securities !== "object" || Array.isArray(securities)) return null;
  const out: UsSecurities = {};
  for (const [ticker, row] of Object.entries(securities as Record<string, unknown>)) {
    if (!Array.isArray(row) || typeof row[0] !== "string") continue;
    out[ticker.toUpperCase()] = [
      row[0],
      typeof row[1] === "string" ? row[1] : null,
      typeof row[2] === "string" ? row[2] : null,
    ];
  }
  return Object.keys(out).length ? out : null;
}

/** "brk.b" → "BRK-B": the directory writes share classes with a dash. */
export function usTickerKey(input: string): string {
  return input.trim().toUpperCase().replace(/\./g, "-");
}

/** The directory key a typed code refers to, or null when it is not listed. */
export function findUsTicker(input: string, list: UsSecurities | undefined | null): string | null {
  if (!list) return null;
  const raw = input.trim().toUpperCase();
  if (list[raw]) return raw;
  const key = usTickerKey(raw);
  return list[key] ? key : null;
}

/**
 * Up to `limit` matches: tickers starting with the text first (shortest
 * first), then names containing it.
 */
export function suggestUsSecurities(
  input: string,
  list: UsSecurities | undefined | null,
  limit = 5,
): [string, UsSecurityRow][] {
  const text = input.trim().toUpperCase();
  if (!list || !text || !/[A-Z]/.test(text)) return [];
  const key = usTickerKey(text);
  const byTicker: [string, UsSecurityRow][] = [];
  const byName: [string, UsSecurityRow][] = [];
  for (const entry of Object.entries(list)) {
    const [ticker, row] = entry;
    if (ticker.startsWith(text) || ticker.startsWith(key)) byTicker.push(entry);
    else if (row[0].toUpperCase().includes(text)) byName.push(entry);
  }
  byTicker.sort((a, b) => a[0].length - b[0].length || a[0].localeCompare(b[0]));
  return [...byTicker, ...byName].slice(0, limit);
}

export function loadStoredUsSecurities(): UsSecurities | null {
  if (typeof window === "undefined") return null;
  try {
    const text = window.localStorage.getItem(STORAGE_KEY);
    return text ? readUsSecurities({ securities: JSON.parse(text) }) : null;
  } catch {
    return null;
  }
}

export function storeUsSecurities(list: UsSecurities) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* storage full or disabled — the in-memory copy still works */
  }
}
