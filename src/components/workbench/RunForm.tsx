import { useEffect, useMemo, useState } from "react";
import { getEnabledLlms, isLlmEnabled, subscribeEnabledLlms } from "@/lib/trading-agents/llm-prefs";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ANALYST_OPTIONS, DEFAULT_STAGES, STAGE_OPTIONS, type RunConfig } from "@/lib/trading-agents/types";
import { fill, useLanguage, useT, type TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { api } from "@/lib/trading-agents/client";
import { INITIAL_HK_STOCK_NAMES } from "@/lib/trading-agents/hk-stock-directory";
import { classifyTicker, numericHkCode } from "@/lib/trading-agents/ticker";
import { suggestUsSecurities } from "@/lib/trading-agents/us-securities";
import { useUsSecurities } from "@/hooks/useUsSecurities";

interface Props {
  defaultConfig: RunConfig;
  running: boolean;
  disabled?: boolean;
  compact?: boolean;
  onRun: (config: RunConfig) => void;
  onCancel: () => void;
  onConfigChange?: (config: RunConfig) => void;
}

/** Values sent to the engine stay English; only the labels are translated. */
const REPORT_LANGUAGES = ["English", "Traditional Chinese", "Simplified Chinese"] as const;

export function RunForm({ defaultConfig, running, disabled, compact = false, onRun, onCancel, onConfigChange }: Props) {
  const t = useT();
  const { lang } = useLanguage();
  const [stockNames, setStockNames] = useState<Record<string, [string, string]>>(() => ({ ...INITIAL_HK_STOCK_NAMES }));
  const [config, setConfig] = useState<RunConfig>({
    ...defaultConfig,
    // Deep depth is disabled in the form; a saved "Deep" choice falls back to Medium.
    researchDepth: defaultConfig.researchDepth === "Deep" ? "Medium" : defaultConfig.researchDepth,
    language: defaultConfig.language || "English",
    stages: defaultConfig.stages ?? DEFAULT_STAGES,
  });
  const [tickerError, setTickerError] = useState<string | null>(null);
  // Numeric codes the engine's HKEX list confirmed are not listed.
  const [unlistedCodes, setUnlistedCodes] = useState<Set<string>>(() => new Set());
  const [checkingTicker, setCheckingTicker] = useState(false);
  // Set when a suggestion is picked (or the field is cleared) so the list hides.
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  // Remembers the picked code so later unrelated edits (e.g. the analysis
  // date round-tripping through the saved form) can't revive the list.
  const [pickedCode, setPickedCode] = useState<string | null>(null);
  const usList = useUsSecurities();
  const digits = config.ticker.trim().toUpperCase().replace(/\.HK$/, "");
  const stockCode = numericHkCode(config.ticker) ?? "";
  const tickerKind = classifyTicker(config.ticker, stockNames, usList);
  const matchedNames = tickerKind.kind === "hk" ? stockNames[tickerKind.code] : undefined;
  const matchedUs = tickerKind.kind === "us" ? usList?.[tickerKind.ticker] : undefined;
  // Re-filter the bundled HKEX directory on every keypress while the user types.
  // Hidden once a complete code (4+ digits) resolves to a known stock, so
  // unrelated edits (e.g. picking the analysis date) don't bring the list back.
  const resolved = digits.length >= 4 && matchedNames;
  const suggestions = !suggestionDismissed && !resolved && digits !== pickedCode && stockCode
    ? Object.entries(stockNames).filter(([code]) => code.startsWith(digits) || String(Number(code)).startsWith(digits)).slice(0, 5)
    : [];
  // Letter codes filter the preloaded US directory on every keypress.
  const showUs = !suggestionDismissed && !stockCode && digits !== pickedCode;
  const usSuggestions = useMemo(
    () => (showUs ? suggestUsSecurities(config.ticker, usList) : []),
    [showUs, config.ticker, usList],
  );

  /** Ask the engine's HKEX list about a code missing from the bundled copy. */
  const lookupHkCode = async (code: string): Promise<boolean> => {
    try {
      const row = await api.security(`${code}.HK`);
      if (row.available) {
        setStockNames((current) => ({ ...current, [code]: [row.name_en ?? "", row.name_zh ?? row.name_en ?? ""] }));
        return true;
      }
      setUnlistedCodes((current) => new Set(current).add(code));
      return false;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (!stockCode || stockNames[stockCode] || unlistedCodes.has(stockCode)) return;
    const timer = window.setTimeout(() => void lookupHkCode(stockCode), 180);
    return () => window.clearTimeout(timer);
  }, [stockCode, stockNames, unlistedCodes]);
  const providersQuery = useQuery({
    queryKey: ["configured-providers"],
    queryFn: api.providers,
    retry: false,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });
  // The setup page can switch providers off; an empty preference means "all".
  const [enabledLlms, setEnabled] = useState<string[] | null>(null);
  useEffect(() => {
    const read = () => setEnabled(getEnabledLlms());
    read();
    return subscribeEnabledLlms(read);
  }, []);
  const configuredProviders = useMemo(
    () =>
      (providersQuery.data?.providers ?? []).filter(
        (provider) => provider.configured && isLlmEnabled(enabledLlms, provider.provider),
      ),
    [providersQuery.data, enabledLlms],
  );


  // Only adopt the initial date after hydration; subsequent form edits are local.
  useEffect(() => {
    if (!defaultConfig.analysisDate) return;
    setConfig((current) => current.analysisDate ? current : {
      ...defaultConfig,
      // Deep depth is disabled in the form; a saved "Deep" choice falls back to Medium.
      researchDepth: defaultConfig.researchDepth === "Deep" ? "Medium" : defaultConfig.researchDepth,
      language: defaultConfig.language || "English",
      stages: defaultConfig.stages ?? DEFAULT_STAGES,
    });
  }, [defaultConfig.analysisDate]);

  useEffect(() => {
    // Wait for the saved form to hydrate (it always sets today's date);
    // otherwise this would save the blank pre-hydration config over it.
    if (!defaultConfig.analysisDate) return;
    const first = configuredProviders[0];
    if (!first || configuredProviders.some((provider) => provider.provider === config.provider)) return;
    const next = {
      ...config,
      provider: first.provider,
      deepModel: first.default_deep_model,
      quickModel: first.default_quick_model,
    };
    setConfig(next);
    onConfigChange?.(next);
  }, [configuredProviders, config, onConfigChange]);

  /**
   * Numeric codes are HK stocks only when on the HKEX list (bundled copy first,
   * then the engine's database); they're zero-padded (700 → 0700.HK).
   * Letter codes on the US list use its form (BRK.B → BRK-B); any other
   * letter code is sent as typed.
   */
  const resolveTicker = async (): Promise<string | null> => {
    const kind = classifyTicker(config.ticker, stockNames, usList);
    if (kind.kind === "empty") return null;
    if (kind.kind === "other" || kind.kind === "hk" || kind.kind === "us") {
      setTickerError(null);
      return kind.ticker;
    }
    setCheckingTicker(true);
    const listed = unlistedCodes.has(kind.code) ? false : await lookupHkCode(kind.code);
    setCheckingTicker(false);
    if (!listed) {
      setTickerError(fill(t("form.notHkStock"), { code: kind.code }));
      return null;
    }
    setTickerError(null);
    return `${kind.code}.HK`;
  };

  const update = <K extends keyof RunConfig>(key: K, value: RunConfig[K]) => {
    const next = { ...config, [key]: value };
    setConfig(next);
    onConfigChange?.(next);
  };

  const stages = config.stages ?? DEFAULT_STAGES;
  const analystStages = STAGE_OPTIONS.filter((s) => s.analyst);
  const decisionStages = STAGE_OPTIONS.filter((s) => !s.analyst);

  /** Analyst stages keep `analysts` in sync so the engine payload is unchanged. */
  const toggleStage = (id: string, checked: boolean) =>
    setConfig((c) => {
      const current = c.stages ?? DEFAULT_STAGES;
      const next = checked ? Array.from(new Set([...current, id])) : current.filter((s) => s !== id);
      const analyst = STAGE_OPTIONS.find((s) => s.id === id)?.analyst;
      const analysts = !analyst
        ? c.analysts
        : checked
          ? Array.from(new Set([...c.analysts, analyst]))
          : c.analysts.filter((a) => a !== analyst);
      const nextConfig = { ...c, stages: next, analysts };
      onConfigChange?.(nextConfig);
      return nextConfig;
    });

  const stageLabel = (stage: (typeof STAGE_OPTIONS)[number]) => {
    if (stage.id === "research_debate") return t("form.researchDebate");
    if (stage.id === "risk_debate") return t("form.riskDebate");
    return stage.roles.map((role) => t(`role.${role}` as TKey)).join(" + ");
  };

  return (
    <form
      className="panel overflow-hidden"
      onSubmit={async (e) => {
        e.preventDefault();
        if (checkingTicker) return;
        const ticker = await resolveTicker();
        if (!ticker) return;
        const submitted = { ...config, ticker };
        setConfig(submitted);
        onConfigChange?.(submitted);
        onRun(submitted);
      }}
    >
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-primary/20 bg-primary/8 px-4 py-2.5 sm:px-5">
        <h2 className="font-display text-lg font-bold sm:text-xl">{t("form.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("form.subtitle")}</p>
      </header>

      <div className="p-3 sm:p-4">
        <div
          className={cn(
            "grid min-w-0 gap-3",
             compact
               ? "sm:grid-cols-2 xl:grid-cols-1"
               : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
          )}
        >


          <div className={cn("min-w-0 space-y-1.5", !compact && "xl:col-span-2")}>

            <Label htmlFor="ticker" className="label-caps">
              {t("form.ticker")}
            </Label>
            <Input
              id="ticker"
              value={config.ticker}
              onChange={(e) => {
                update("ticker", e.target.value.toUpperCase());
                setTickerError(null);
                setSuggestionDismissed(false);
                setPickedCode(null);
              }}
              onBlur={() => setSuggestionDismissed(true)}
              placeholder="eg. 700"
              required
              aria-invalid={!!tickerError}
              className="font-mono placeholder:text-xs"
            />
            {tickerError && <p className="text-xs text-bear">{tickerError}</p>}
            {!tickerError && tickerKind.kind === "unlisted" && unlistedCodes.has(tickerKind.code) && (
              <p className="text-xs text-bear">{fill(t("form.notHkStock"), { code: tickerKind.code })}</p>
            )}
            {matchedNames && <p role="status" className="text-xs font-medium text-primary">{lang === "zh" ? matchedNames[1] : matchedNames[0]}</p>}
            {matchedUs && (
              <p role="status" className="text-xs font-medium text-primary">
                {(lang === "zh" && matchedUs[1]) || matchedUs[0]}
                {matchedUs[2] && <span className="text-muted-foreground"> · {matchedUs[2]}</span>}
              </p>
            )}
            {tickerKind.kind === "other" && <p role="status" className="text-xs text-muted-foreground">{t("form.otherMarket")}</p>}
            {suggestions.length > 0 && digits.length < 4 && (
              <div aria-label="Matching stocks" className="max-h-44 overflow-y-auto rounded-md border border-rule bg-surface">
                {suggestions.map(([code, names]) => (
                  <Button
                    key={code}
                    type="button"
                    variant="ghost"
                    className="flex min-h-9 w-full justify-start gap-2 truncate text-xs"
                    // Select on pointer-down: the input's onBlur would otherwise
                    // dismiss the list before a click event reaches the button.
                    onPointerDown={(e) => {
                      e.preventDefault();
                      update("ticker", String(Number(code)));
                      setSuggestionDismissed(true);
                      setPickedCode(String(Number(code)));
                    }}
                  >
                    <span className="font-mono">{code}</span>
                    <span className="truncate">{lang === "zh" ? names[1] : names[0]}</span>
                  </Button>
                ))}
              </div>
            )}
            {usSuggestions.length > 0 && (
              <div aria-label="Matching stocks" className="max-h-44 overflow-y-auto rounded-md border border-rule bg-surface">
                {usSuggestions.map(([ticker, row]) => (
                  <Button
                    key={ticker}
                    type="button"
                    variant="ghost"
                    className="flex min-h-9 w-full justify-start gap-2 truncate text-xs"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      update("ticker", ticker);
                      setSuggestionDismissed(true);
                      setPickedCode(ticker);
                    }}
                  >
                    <span className="font-mono">{ticker}</span>
                    <span className="truncate">{(lang === "zh" && row[1]) || row[0]}</span>
                    {row[2] && <span className="shrink-0 text-muted-foreground">· {row[2]}</span>}
                  </Button>
                ))}
              </div>
            )}
          </div>

          <div className="min-w-0 space-y-1.5">
            <Label htmlFor="date" className="label-caps">
              {t("form.date")}
            </Label>
            <Input
              id="date"
              type="date"
              lang="en-CA"
              placeholder="YYYY/MM/DD"
              value={config.analysisDate}
              onChange={(e) => update("analysisDate", e.target.value)}
              required
              className="placeholder:text-xs"
            />

          </div>

          {configuredProviders.length > 0 && (
            <div className="min-w-0 space-y-1.5">
              <Label className="label-caps">{t("form.llm")}</Label>
              <Select
                value={config.provider}
                onValueChange={(value) => {
                  const provider = configuredProviders.find((item) => item.provider === value);
                  if (!provider) return;
                  setConfig((current) => {
                    const next = {
                      ...current,
                      provider: provider.provider,
                      deepModel: provider.default_deep_model,
                      quickModel: provider.default_quick_model,
                    };
                    onConfigChange?.(next);
                    return next;
                  });
                }}
              >
                <SelectTrigger className="w-full min-w-0 [&>span]:truncate">
                  <SelectValue placeholder={t("form.llmUnavailable")} />
                </SelectTrigger>
                <SelectContent>
                  {configuredProviders.map((provider) => (
                    <SelectItem key={provider.provider} value={provider.provider}>
                      {provider.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="min-w-0 space-y-1.5">
            <Label className="label-caps">{t("form.depth")}</Label>
            <Select
              value={config.researchDepth}
              onValueChange={(v) => update("researchDepth", v as RunConfig["researchDepth"])}
            >
              <SelectTrigger className="w-full min-w-0 [&>span]:truncate">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Shallow">{t("form.depthShallow")}</SelectItem>
                <SelectItem value="Medium">{t("form.depthMedium")}</SelectItem>
                <SelectItem value="Deep" disabled title="Not available">
                  {t("form.depthDeep")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-0 space-y-1.5">
            <Label className="label-caps">{t("form.language")}</Label>
            <Select value={config.language} onValueChange={(v) => update("language", v)}>
              <SelectTrigger className="w-full min-w-0 [&>span]:truncate">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_LANGUAGES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`lang.${value}` as TKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>


        <div className="mt-5 border-t border-rule pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Label className="label-caps">{t("form.team")}</Label>
            <span className="text-xs text-muted-foreground">
              {fill(t("form.selected"), { n: config.analysts.length, m: ANALYST_OPTIONS.length })}
            </span>
          </div>
          <div className={cn("mt-2 grid gap-2 sm:grid-cols-2", !compact && "lg:grid-cols-4")}>
            {analystStages.map((stage) => (
              <label
                key={stage.id}
                className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-rule px-2.5 py-1.5 text-sm leading-snug transition-colors has-[[data-state=checked]]:border-primary/40 has-[[data-state=checked]]:bg-primary/8 hover:bg-muted"
              >
                <Checkbox
                  checked={stages.includes(stage.id)}
                  onCheckedChange={(c) => toggleStage(stage.id, c === true)}
                />
                {t(`analyst.${stage.analyst}` as TKey)}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-5 border-t border-rule pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Label className="label-caps">{t("form.stages")}</Label>
            <span className="text-xs text-muted-foreground">
              {fill(t("form.selected"), {
                n: decisionStages.filter((s) => stages.includes(s.id)).length,
                m: decisionStages.length,
              })}
            </span>
          </div>
          <div className={cn("mt-2 grid gap-2 sm:grid-cols-2", !compact && "lg:grid-cols-3")}>
            {decisionStages.map((stage) => (
              <label
                key={stage.id}
                className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-rule px-2.5 py-1.5 text-sm leading-snug transition-colors has-[[data-state=checked]]:border-primary/40 has-[[data-state=checked]]:bg-primary/8 hover:bg-muted"
              >
                <Checkbox
                  checked={stages.includes(stage.id)}
                  onCheckedChange={(c) => toggleStage(stage.id, c === true)}
                />
                <span className="min-w-0">{stageLabel(stage)}</span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t("form.stagesHint")}</p>
        </div>

        <div className="mt-5 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {running ? (
            <Button type="button" variant="outline" onClick={onCancel} className="min-h-11 gap-2 sm:min-h-9">
              <Square className="size-4" /> {t("form.stop")}
            </Button>
          ) : (
            <Button type="submit" disabled={disabled || checkingTicker || config.analysts.length === 0} className="min-h-11 gap-2 sm:min-h-9">
              <Play className="size-4" /> {t("form.run")}
            </Button>
          )}
          {running && (
            <span className="flex items-center justify-center gap-2 text-sm text-muted-foreground sm:justify-start">
              <Loader2 className="size-4 animate-spin" /> {t("form.working")}
            </span>
          )}
        </div>
        {config.analysts.length === 0 && (
          <p className="mt-2 text-xs text-bear">{t("form.needAnalyst")}</p>
        )}
      </div>
    </form>
  );
}
