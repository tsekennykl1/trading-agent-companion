import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, DEFAULT_BRIDGE_URL, getBridgeUrl } from "@/lib/trading-agents/client";
import { cn } from "@/lib/utils";

export function useBridgeHealth() {
  return useQuery({
    queryKey: ["bridge-health"],
    queryFn: api.health,
    retry: false,
    refetchInterval: 15000,
    staleTime: 5000,
  });
}

export function BridgeStatusBadge() {
  const { data, isError, isLoading } = useBridgeHealth();
  const [bridgeUrl, setBridgeUrl] = useState(DEFAULT_BRIDGE_URL);
  const online = !!data && !isError;

  useEffect(() => {
    setBridgeUrl(getBridgeUrl());
  }, []);

  return (
    <Link
      to="/setup"
      aria-label={`${isLoading ? "Checking" : online ? "Connected" : "Offline"}: ${bridgeUrl}. Open connection settings.`}
      title="Open connection settings"
      className="flex min-h-9 max-w-full items-center gap-2 rounded-full border border-rule bg-card px-2.5 py-1.5 text-xs transition-colors hover:border-primary/40 hover:bg-muted sm:px-3"
    >
      <span
        className={cn(
          "size-2 rounded-full",
          isLoading ? "bg-neutral animate-pulse" : online ? "bg-bull" : "bg-bear",
        )}
      />
      <span className="font-medium">
        {isLoading ? "Checking…" : online ? "Connected" : "Offline"}
      </span>
      <span className="max-w-36 truncate font-mono text-[10px] text-muted-foreground sm:max-w-48">{bridgeUrl}</span>
    </Link>
  );
}
