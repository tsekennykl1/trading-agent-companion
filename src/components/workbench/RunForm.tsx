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
      analysts: checked ? [...c.analysts, name] : c.analysts.filter((a) => a !== name),
    }));

  return (
    <form
      className="panel p-5"
      onSubmit={(e) => {
        e.preventDefault();
        onRun(config);
      }}
    >
      <h2 className="text-lg font-semibold">New analysis</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Sent to your local TradingAgents engine — the same inputs as the CLI prompts.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
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
        <div className="space-y-1.5">
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

        <div className="space-y-1.5 sm:col-span-2">
          <Label className="label-caps">Research depth</Label>
          <Select
            value={config.researchDepth}
            onValueChange={(v) => update("researchDepth", v as RunConfig["researchDepth"])}
          >
            <SelectTrigger>
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

      <div className="mt-5">
        <Label className="label-caps">Analyst team</Label>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {ANALYST_OPTIONS.map((a) => (
            <label
              key={a}
              className="flex cursor-pointer items-center gap-2.5 rounded-md border border-rule px-3 py-2 text-sm transition-colors hover:bg-muted"
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

      <div className="mt-5 flex items-center gap-3">
        {running ? (
          <Button type="button" variant="outline" onClick={onCancel} className="gap-2">
            <Square className="size-4" /> Stop run
          </Button>
        ) : (
          <Button type="submit" disabled={disabled || config.analysts.length === 0} className="gap-2">
            <Play className="size-4" /> Run analysis
          </Button>
        )}
        {running && (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Agents are working…
          </span>
        )}
      </div>
      {config.analysts.length === 0 && (
        <p className="mt-2 text-xs text-bear">Select at least one analyst.</p>
      )}
    </form>
  );
}
