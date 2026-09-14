import { useState } from "react";
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
import { ANALYST_OPTIONS, type RunConfig } from "@/lib/trading-agents/types";
import { fill, useT, type TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface Props {
  defaultConfig: RunConfig;
  running: boolean;
  disabled?: boolean;
  compact?: boolean;
  onRun: (config: RunConfig) => void;
  onCancel: () => void;
}

/** Values sent to the engine stay English; only the labels are translated. */
const REPORT_LANGUAGES = ["English", "Traditional Chinese", "Simplified Chinese"] as const;

export function RunForm({ defaultConfig, running, disabled, compact = false, onRun, onCancel }: Props) {
  const t = useT();
  const [config, setConfig] = useState<RunConfig>({
    ...defaultConfig,
    language: defaultConfig.language || "English",
  });

  const update = <K extends keyof RunConfig>(key: K, value: RunConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: value }));

  const toggleAnalyst = (name: string, checked: boolean) =>
    setConfig((c) => ({
      ...c,
      analysts: checked ? Array.from(new Set([...c.analysts, name])) : c.analysts.filter((a) => a !== name),
    }));

  return (
    <form
      className="panel overflow-hidden"
      onSubmit={(e) => {
        e.preventDefault();
        onRun(config);
      }}
    >
      <header className="border-b border-primary/20 bg-primary/8 px-4 py-4 sm:px-5">
        <h2 className="font-display text-xl font-bold sm:text-2xl">{t("form.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("form.subtitle")}</p>
      </header>

      <div className="p-4 sm:p-5">
        <div
          className={cn(
            "grid min-w-0 gap-4",
            compact
              ? "md:grid-cols-3 xl:grid-cols-1"
              : "md:grid-cols-[minmax(9rem,0.8fr)_minmax(11rem,0.9fr)_minmax(16rem,1.5fr)]",
          )}
        >
          <div className="min-w-0 space-y-1.5">
            <Label htmlFor="ticker" className="label-caps">
              {t("form.ticker")}
            </Label>
            <Input
              id="ticker"
              value={config.ticker}
              onChange={(e) => update("ticker", e.target.value.toUpperCase())}
              placeholder="0700.HK"
              required
              className="font-mono"
            />
          </div>
          <div className="min-w-0 space-y-1.5">
            <Label htmlFor="date" className="label-caps">
              {t("form.date")}
            </Label>
            <Input
              id="date"
              type="date"
              value={config.analysisDate}
              onChange={(e) => update("analysisDate", e.target.value)}
              required
            />
          </div>

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
                <SelectItem value="Deep">{t("form.depthDeep")}</SelectItem>
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
            <p className="text-xs text-muted-foreground">{t("form.languageHint")}</p>
          </div>
        </div>

        <div className="mt-5 border-t border-rule pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Label className="label-caps">{t("form.team")}</Label>
            <span className="text-xs text-muted-foreground">
              {fill(t("form.selected"), { n: config.analysts.length, m: ANALYST_OPTIONS.length })}
            </span>
          </div>
          <div className={cn("mt-2 grid gap-2 sm:grid-cols-2", !compact && "xl:grid-cols-4")}>
            {ANALYST_OPTIONS.map((a) => (
              <label
                key={a}
                className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md border border-rule px-3 py-2 text-sm transition-colors has-[[data-state=checked]]:border-primary/40 has-[[data-state=checked]]:bg-primary/8 hover:bg-muted"
              >
                <Checkbox
                  checked={config.analysts.includes(a)}
                  onCheckedChange={(c) => toggleAnalyst(a, c === true)}
                />
                {t(`analyst.${a}` as TKey)}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {running ? (
            <Button type="button" variant="outline" onClick={onCancel} className="min-h-11 gap-2 sm:min-h-9">
              <Square className="size-4" /> {t("form.stop")}
            </Button>
          ) : (
            <Button type="submit" disabled={disabled || config.analysts.length === 0} className="min-h-11 gap-2 sm:min-h-9">
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
