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

interface Props {
  defaultConfig: RunConfig;
  running: boolean;
  disabled?: boolean;
  onRun: (config: RunConfig) => void;
  onCancel: () => void;
}

export function RunForm({ defaultConfig, running, disabled, onRun, onCancel }: Props) {
  const [config, setConfig] = useState<RunConfig>(defaultConfig);

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
        <h2 className="text-lg font-semibold">New analysis</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose the market, date, research depth, and specialists for this run.
        </p>
      </header>

      <div className="p-4 sm:p-5">
        <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(9rem,0.8fr)_minmax(11rem,0.9fr)_minmax(16rem,1.5fr)]">
          <div className="min-w-0 space-y-1.5">
          <Label htmlFor="ticker" className="label-caps">
            Ticker
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
            Analysis date
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
          <Label className="label-caps">Research depth</Label>
          <Select
            value={config.researchDepth}
            onValueChange={(v) => update("researchDepth", v as RunConfig["researchDepth"])}
          >
             <SelectTrigger className="w-full min-w-0 [&>span]:truncate">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Shallow">Shallow — quick, few debate rounds</SelectItem>
              <SelectItem value="Medium">Medium — balanced debate</SelectItem>
              <SelectItem value="Deep">Deep — extended debate rounds</SelectItem>
            </SelectContent>
          </Select>
          </div>
        </div>

        <div className="mt-5 border-t border-rule pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Label className="label-caps">Analyst team</Label>
            <span className="text-xs text-muted-foreground">
              {config.analysts.length} of {ANALYST_OPTIONS.length} selected
            </span>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {ANALYST_OPTIONS.map((a) => (
            <label
              key={a}
              className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md border border-rule px-3 py-2 text-sm transition-colors has-[[data-state=checked]]:border-primary/40 has-[[data-state=checked]]:bg-primary/8 hover:bg-muted"
            >
              <Checkbox
                checked={config.analysts.includes(a)}
                onCheckedChange={(c) => toggleAnalyst(a, c === true)}
              />
              {a}
            </label>
          ))}
          </div>
        </div>

        <div className="mt-5 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        {running ? (
          <Button type="button" variant="outline" onClick={onCancel} className="min-h-11 gap-2 sm:min-h-9">
            <Square className="size-4" /> Stop run
          </Button>
        ) : (
          <Button type="submit" disabled={disabled || config.analysts.length === 0} className="min-h-11 gap-2 sm:min-h-9">
            <Play className="size-4" /> Run analysis
          </Button>
        )}
        {running && (
          <span className="flex items-center justify-center gap-2 text-sm text-muted-foreground sm:justify-start">
            <Loader2 className="size-4 animate-spin" /> Agents are working…
          </span>
        )}
        </div>
        {config.analysts.length === 0 && (
          <p className="mt-2 text-xs text-bear">Select at least one analyst.</p>
        )}
      </div>
    </form>
  );
}
