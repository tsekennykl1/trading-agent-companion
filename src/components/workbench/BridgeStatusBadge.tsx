import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { api, DEFAULT_BRIDGE_URL, getBridgeUrl } from "@/lib/trading-agents/client";
import { cn } from "@/lib/utils";

export function useBridgeHealth() {
  const [address, setAddress] = useState(DEFAULT_BRIDGE_URL);
  useEffect(() => {
    const update = () => setAddress(getBridgeUrl());
    update();
    window.addEventListener("ta-bridge-url-changed", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("ta-bridge-url-changed", update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return useQuery({
    queryKey: ["bridge-health", address],
    queryFn: api.health,
    retry: false,
    // Once the engine answers, stop hammering /health — a slow heartbeat is
    // enough to notice it going away. While offline, check a little more often.
    refetchInterval: (q) => (q.state.data && !q.state.error ? 120000 : 20000),
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });
}

export function BridgeStatusBadge() {
  const { data, isError, isLoading } = useBridgeHealth();
  const [bridgeUrl, setBridgeUrl] = useState(DEFAULT_BRIDGE_URL);
  const online = !!data && !isError;

  useEffect(() => {
    const update = () => setBridgeUrl(getBridgeUrl());
    update();
    window.addEventListener("ta-bridge-url-changed", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("ta-bridge-url-changed", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return (
    <Link
      to="/setup"
      aria-label={`${isLoading ? "Checking" : online ? "Connected" : "Offline"}: ${bridgeUrl}. Open connection settings.`}
      title="Open connection settings"
      className="flex min-h-9 min-w-0 max-w-full items-center gap-2 rounded-full border border-rule bg-card px-2.5 py-1.5 text-xs transition-colors hover:border-primary/40 hover:bg-muted sm:px-3"
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
      <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}
