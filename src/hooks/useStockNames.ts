/**
 * Official listing names for a ticker — HKEX English + Chinese names for
 * ".HK" codes, English name + exchange for US codes.
 *
 * US names come from the preloaded US directory first; otherwise the engine's
 * GET /market/security?ticker=… answers. The run itself also carries names once
 * market data is ready — pass those in as `fromRun` and the hook prefers them,
 * only asking the engine when they are missing (e.g. right after a run is queued).
 */
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/trading-agents/client";
import { findUsTicker, usTickerKey } from "@/lib/trading-agents/us-securities";
import { useUsSecurities } from "./useUsSecurities";

export interface StockNames {
  en?: string;
  zh?: string;
  exchange?: string;
}

export function isHkTicker(ticker: string) {
  return ticker.trim().toUpperCase().endsWith(".HK");
}

/** Letter codes without a non-US exchange suffix (BRK.B / BRK-B count as US). */
function mayBeUsTicker(symbol: string) {
  return /^[A-Z][A-Z0-9]*([.-][A-Z])?$/.test(symbol);
}

export function useStockNames(ticker: string, fromRun?: StockNames, offline = false): StockNames {
  const symbol = ticker.trim().toUpperCase();
  const known = Boolean(fromRun?.en || fromRun?.zh);
  const usList = useUsSecurities();
  const usKey = findUsTicker(symbol, usList);
  const usRow = usKey ? usList?.[usKey] : undefined;
  const lookupSymbol = isHkTicker(symbol) ? symbol : usTickerKey(symbol);

  const query = useQuery({
    queryKey: ["security", lookupSymbol],
    queryFn: () => api.security(lookupSymbol),
    enabled: !offline && !known && !usRow && (isHkTicker(symbol) || mayBeUsTicker(symbol)),
    staleTime: 24 * 60 * 60 * 1000, // the directories change at most daily
    retry: false,
  });

  if (known) return fromRun!;
  if (usRow) return { en: usRow[0], ...(usRow[2] ? { exchange: usRow[2] } : {}) };
  const row = query.data?.available ? query.data : null;
  return {
    ...(row?.name_en ? { en: row.name_en } : {}),
    ...(row?.name_zh ? { zh: row.name_zh } : {}),
    ...(row?.exchange ? { exchange: row.exchange } : {}),
  };
}
