import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { api, getBridgeUrl } from "@/lib/trading-agents/client";
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
  const online = !!data && !isError;

  return (
    <Link
      to="/setup"
      className="flex items-center gap-2 rounded-full border border-rule bg-card px-3 py-1.5 text-xs transition-colors hover:bg-muted"
    >
      <span
        className={cn(
          "size-2 rounded-full",
          isLoading ? "bg-neutral animate-pulse" : online ? "bg-bull" : "bg-bear",
        )}
      />
      <span className="font-medium">
        {isLoading ? "Checking engine…" : online ? "Engine connected" : "Engine offline"}
      </span>
      <span className="hidden font-mono text-[10px] text-muted-foreground sm:inline">{getBridgeUrl()}</span>
    </Link>
  );
}
