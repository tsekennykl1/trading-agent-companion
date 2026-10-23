/**
 * The engine's US stock directory, fetched once per day. The last good copy
 * lives in localStorage: it is shown immediately on load and used whenever
 * the engine can't be reached.
 */
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/trading-agents/client";
import {
  loadStoredUsSecurities,
  storeUsSecurities,
  type UsSecurities,
} from "@/lib/trading-agents/us-securities";

export const US_SECURITIES_KEY = ["us-securities"] as const;

export function useUsSecurities(): UsSecurities | undefined {
  const queryClient = useQueryClient();

  // Seed from the stored copy after hydration (marked stale so a refresh still runs).
  useEffect(() => {
    if (queryClient.getQueryData(US_SECURITIES_KEY)) return;
    const stored = loadStoredUsSecurities();
    if (stored) queryClient.setQueryData(US_SECURITIES_KEY, stored, { updatedAt: 0 });
  }, [queryClient]);

  const query = useQuery({
    queryKey: US_SECURITIES_KEY,
    queryFn: async (): Promise<UsSecurities> => {
      try {
        const list = await api.usSecurities();
        if (list) {
          storeUsSecurities(list);
          return list;
        }
      } catch {
        /* engine offline — fall back below */
      }
      const stored = loadStoredUsSecurities();
      if (stored) return stored;
      throw new Error("US stock list unavailable");
    },
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });
  return query.data;
}
