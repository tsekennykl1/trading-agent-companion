import { useEffect, useState } from "react";
import { SAMPLE_RUN } from "@/lib/trading-agents/sample-run";
import { DEFAULT_STAGES, type RunConfig } from "@/lib/trading-agents/types";

/**
 * Remembers the last analysis form the user filled in.
 *
 * The form starts from the sample run, is overwritten by whatever was saved in
 * the browser last time, and always uses today's date.
 */
const STORAGE_KEY = "ta-analysis-form-v1";

const BLANK_CONFIG: RunConfig = {
  ...SAMPLE_RUN.config,
  // Start with an empty stock code — the sample run's 0700.HK is demo data,
  // not a suggestion the trader should have to clear every time.
  ticker: "",
  analysisDate: "",
  analysts: ["Market Analyst"],
  stages: DEFAULT_STAGES,
};

function readSavedConfig(): Partial<RunConfig> {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as Partial<RunConfig>) : {};
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return {};
  }
}

export function useSavedRunConfig() {
  const [config, setConfig] = useState<RunConfig>(BLANK_CONFIG);

  // Runs once, in the browser only: localStorage does not exist on the server.
  useEffect(() => {
    const saved = readSavedConfig();
    setConfig((current): RunConfig => {
      const next: RunConfig = { ...current, ...saved } as RunConfig;
      next.analysisDate = new Date().toISOString().slice(0, 10);
      next.analysts = Array.isArray(saved.analysts) ? saved.analysts : current.analysts;
      next.stages = Array.isArray(saved.stages) ? saved.stages : (current.stages ?? DEFAULT_STAGES);
      return next;
    });
  }, []);

  const remember = (next: RunConfig) => {
    setConfig(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  /** Empties the remembered ticker and date (used by the Clear button). */
  const reset = () => {
    const next: RunConfig = { ...config, ticker: "", analysisDate: "" };
    setConfig(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  return { config, remember, reset };
}
