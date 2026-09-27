import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, ExternalLink, KeyRound, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/trading-agents/client";
import { getEnabledLlms, isLlmEnabled, subscribeEnabledLlms } from "@/lib/trading-agents/llm-prefs";
import type {
  ActiveProvider,
  LlmCredits,
  ProviderCredit,
  ProviderSummary,
} from "@/lib/trading-agents/client";

/**
 * Display rules asked for by the user:
 *  - cap the number shown: above $20 USD (or $100 in any other currency)
 *    show "> $20 USD" instead of the exact figure;
 *  - red below $3 USD (or $100-currency equivalent threshold of $20);
 *  - black otherwise.
 */
const USD_CAP = 20;
const USD_LOW = 3;
const OTHER_CAP = 100;
const OTHER_LOW = 20;

function formatAmount(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export function creditDisplay(balance: number, currency: string) {
  const isUsd = currency.toUpperCase() === "USD";
  const cap = isUsd ? USD_CAP : OTHER_CAP;
  const low = isUsd ? USD_LOW : OTHER_LOW;
  const text =
    balance > cap ? `> ${formatAmount(cap, currency)}` : formatAmount(balance, currency);
  return { text, low: balance < low };
}

const STATUS_TEXT: Record<string, string> = {
  valid: "Key works",
  invalid: "Key rejected",
  missing_key: "No key saved",
  no_key_required: "No key needed",
  unreachable: "Could not reach provider",
  unknown: "Key check not available",
};

export function ProviderCreditPanel() {
  const [active, setActive] = useState<ActiveProvider | null>(null);
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [credit, setCredit] = useState<ProviderCredit | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openaiCredits, setOpenaiCredits] = useState<LlmCredits | null>(null);
  const [enabled, setEnabled] = useState<string[] | null>(null);

  useEffect(() => {
    setEnabled(getEnabledLlms());
    return subscribeEnabledLlms(() => setEnabled(getEnabledLlms()));
  }, []);

  const loadOpenaiCredits = useCallback(async (provider: string | null | undefined) => {
    if (provider !== "openai" && provider !== "azure_openai") {
      setOpenaiCredits(null);
      return;
    }
    try {
      setOpenaiCredits(await api.llmCredits());
    } catch {
      setOpenaiCredits({
        provider: "openai",
        available: false,
        message: "The engine has no /llm/credits endpoint yet.",
      });
    }
  }, []);

  const load = useCallback(async (provider?: string) => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.providers();
      setActive(list.active);
      setProviders(list.providers);
      const target = provider ?? list.active.provider ?? undefined;
      setCredit(target ? await api.providerCredit(target) : null);
      void loadOpenaiCredits(target);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The engine did not answer.");
      setCredit(null);
    } finally {
      setLoading(false);
    }
  }, [loadOpenaiCredits]);

  useEffect(() => {
    void load();
  }, [load]);

  // Only providers with a key AND ticked under "Available AI models" appear;
  // the one currently in use always stays listed so the selection is visible.
  const configured = useMemo(
    () =>
      providers.filter(
        (p) => (p.configured && isLlmEnabled(enabled, p.provider)) || p.provider === active?.provider,
      ),
    [providers, enabled, active?.provider],
  );
  const activeSummary = providers.find((p) => p.provider === active?.provider);

  const switchProvider = async (provider: string) => {
    setLoading(true);
    try {
      const res = await api.setActiveProvider(provider);
      setActive(res.active);
      setCredit(res.credit);
      void loadOpenaiCredits(res.active.provider);
      toast.success(`Now using ${res.credit.label}. Restart the engine to apply it.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not switch provider");
    } finally {
      setLoading(false);
    }
  };

  const oa = openaiCredits?.available && typeof openaiCredits.remaining_usd === "number" ? openaiCredits : null;
  const display = oa
    ? { ...creditDisplay(oa.remaining_usd as number, "USD"), low: oa.low_balance ?? (oa.remaining_usd as number) < USD_LOW }
    : credit && credit.balance !== null && credit.currency
      ? creditDisplay(credit.balance, credit.currency)
      : null;

  return (
    <section className="panel mt-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">AI provider and credit</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Checks the key saved in your engine and, where the provider publishes it, how much
            credit is left. DeepSeek, OpenRouter and OpenAI (via the engine's credit tracker) report
            a balance; the others only confirm the key works.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={loading}
          onClick={() => void load(active?.provider ?? undefined)}
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Check again
        </Button>
      </div>

      {error && (
        <p className="mt-3 flex items-start gap-2 rounded-md border border-rule bg-muted/40 px-3 py-2.5 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-bear" />
          <span>
            Could not read the provider settings. Make sure the engine is running and up to date
            (this needs the new /providers endpoint).
          </span>
        </p>
      )}

      {!error && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="label-caps">In use</Label>
            <Select
              value={active?.provider ?? ""}
              onValueChange={(v) => void switchProvider(v)}
              disabled={loading || configured.length === 0}
            >
              <SelectTrigger className="min-h-11 sm:min-h-9">
                <SelectValue placeholder="No provider configured" />
              </SelectTrigger>
              <SelectContent>
                {configured.map((p) => (
                  <SelectItem key={p.provider} value={p.provider}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Only providers with a key already saved in your settings file are listed. Switching
              rewrites the settings file — restart the engine afterwards.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="label-caps">Credit available</Label>
            <div className="flex min-h-11 items-center gap-2 rounded-md border border-rule bg-muted/40 px-3 sm:min-h-9">
              {display ? (
                <span
                  className={`font-mono text-lg font-semibold ${display.low ? "text-bear" : "text-foreground"}`}
                >
                  {display.text}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {openaiCredits && !openaiCredits.available
                    ? "Credit tracking not set up"
                    : credit?.supports_balance === false
                      ? "This provider does not publish a balance"
                      : "—"}
                </span>
              )}
            </div>
            {oa && (
              <div className="space-y-1">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full ${oa.low_balance ? "bg-bear" : "bg-bull"}`}
                    style={{ width: `${Math.min(100, Math.max(0, oa.remaining_pct ?? 0))}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Used ${(oa.used_usd ?? 0).toFixed(2)} of ${(oa.budget_usd ?? 0).toFixed(2)} budget
                  {oa.query_window_days ? ` (last ${oa.query_window_days} days)` : ""}
                  {oa.as_of ? ` · as of ${new Date(oa.as_of).toLocaleString()}` : ""}
                </p>
                {oa.low_balance && (
                  <p className="text-xs text-bear">Low credit balance — an analysis may fail mid-run.</p>
                )}
              </div>
            )}
            {openaiCredits && !openaiCredits.available && (
              <p className="text-xs text-muted-foreground">
                {openaiCredits.message ??
                  "Set OPENAI_ADMIN_KEY and OPENAI_CREDIT_BUDGET in the engine .env to track credit."}
              </p>
            )}
            {openaiCredits?.billing_url && (
              <a
                href={openaiCredits.billing_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs underline"
              >
                <ExternalLink className="size-3" /> Open OpenAI billing
              </a>
            )}
            {credit && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {credit.status === "valid" || credit.status === "no_key_required" ? (
                  <CheckCircle2 className="size-3.5 text-bull" />
                ) : (
                  <AlertCircle className="size-3.5 text-bear" />
                )}
                {credit.message ?? STATUS_TEXT[credit.status] ?? credit.status}
              </p>
            )}
          </div>

          <div className="sm:col-span-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <KeyRound className="size-3.5" />
            <span>API key:</span>
            {activeSummary && activeSummary.env_keys.length > 0 ? (
              activeSummary.env_keys.map((k) => (
                <code key={k} className="rounded bg-muted px-1 py-0.5 font-mono">
                  {k}
                </code>
              ))
            ) : (
              <span>{activeSummary ? "none needed" : "—"}</span>
            )}
            {activeSummary && activeSummary.env_keys.length > 0 && (
              <span className={activeSummary.configured ? "text-bull" : "text-bear"}>
                {activeSummary.configured ? "saved" : "missing"}
              </span>
            )}
          </div>

          <div className="sm:col-span-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
            <span>Deep-thinking model: {active?.deep_model ?? "—"}</span>
            <span>Quick-thinking model: {active?.quick_model ?? "—"}</span>
          </div>
        </div>
      )}
    </section>
  );
}
