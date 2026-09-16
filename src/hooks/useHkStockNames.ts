/**
 * Official HKEX names for a Hong Kong ticker (anything ending in ".HK").
 *
 * The engine keeps the HKEX "List of Securities" in its database, so this is a
 * fast local lookup: GET /market/security?ticker=0700.HK returns the English
 * and Chinese name. The run itself also carries both names once market data is
 * ready — pass those in as `fromRun` and the hook prefers them, only asking the
 * engine when they are missing (for example right after a run is queued).
 */
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/trading-agents/client";

export interface StockNames {
  en?: string;
  zh?: string;
}

export function isHkTicker(ticker: string) {
  return ticker.trim().toUpperCase().endsWith(".HK");
}

export function useHkStockNames(ticker: string, fromRun?: StockNames, offline = false): StockNames {
  const symbol = ticker.trim().toUpperCase();
  const known = Boolean(fromRun?.en || fromRun?.zh);

  const query = useQuery({
    queryKey: ["hk-security", symbol],
    queryFn: () => api.hkSecurity(symbol),
    enabled: !offline && !known && isHkTicker(symbol),
    staleTime: 24 * 60 * 60 * 1000, // the HKEX list changes at most daily
    retry: false,
  });

  if (known) return fromRun!;
  const row = query.data?.available ? query.data : null;
  return { ...(row?.name_en ? { en: row.name_en } : {}), ...(row?.name_zh ? { zh: row.name_zh } : {}) };
}
