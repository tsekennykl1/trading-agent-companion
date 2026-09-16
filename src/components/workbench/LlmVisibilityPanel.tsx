import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/trading-agents/client";
import { getEnabledLlms, isLlmEnabled, setEnabledLlms } from "@/lib/trading-agents/llm-prefs";

/**
 * Choose which AI providers appear in the New Analysis form. Only providers
 * whose API key is already configured in the engine can be switched on.
 */
export function LlmVisibilityPanel() {
  const providersQuery = useQuery({
    queryKey: ["configured-providers"],
    queryFn: api.providers,
    retry: false,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
  const providers = providersQuery.data?.providers ?? [];
  const configured = providers.filter((provider) => provider.configured);

  const [enabled, setEnabled] = useState<string[] | null>(null);
  useEffect(() => setEnabled(getEnabledLlms()), []);

  const toggle = (id: string, on: boolean) => {
    const base = enabled && enabled.length > 0 ? enabled : configured.map((p) => p.provider);
    const next = on ? Array.from(new Set([...base, id])) : base.filter((value) => value !== id);
    setEnabled(next);
    setEnabledLlms(next);
  };

  return (
    <section className="panel mt-6 p-4 sm:p-5">
      <h2 className="text-lg font-semibold">Available AI models</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Tick the providers you want offered in the New Analysis form. Only providers with a key saved in the
        engine can be used; the rest need their key added to <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">.env</code>.
      </p>

      {providersQuery.isError && (
        <p className="mt-3 text-sm text-bear">
          Not connected to the engine, so the provider list is unavailable right now.
        </p>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {providers.map((provider) => (
          <label
            key={provider.provider}
            className={`flex min-h-10 items-center gap-2 rounded-md border border-rule px-2.5 py-1.5 text-sm ${
              provider.configured ? "cursor-pointer hover:bg-muted" : "opacity-60"
            }`}
          >
            <Checkbox
              disabled={!provider.configured}
              checked={provider.configured && isLlmEnabled(enabled, provider.provider)}
              onCheckedChange={(checked) => toggle(provider.provider, checked === true)}
            />
            <span className="min-w-0 flex-1 truncate">{provider.label}</span>
            {!provider.configured && <span className="text-xs text-muted-foreground">no key</span>}
          </label>
        ))}
      </div>
    </section>
  );
}
