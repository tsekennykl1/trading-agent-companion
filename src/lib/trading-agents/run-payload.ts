// Builds the JSON body for POST /runs.
import type { RunConfig } from "./types";
import { STAGE_OPTIONS } from "./types";

/**
 * Payload sent to POST /runs. Matches the engine's { model, ticker, end_date,
 * params } schema and also carries camelCase/snake_case aliases so bridges
 * with either convention validate (extra keys are ignored).
 */
export function runConfigPayload(config: RunConfig): Record<string, unknown> {
  const maxDebateRounds =
    config.researchDepth === "Deep" ? 3 : config.researchDepth === "Medium" ? 2 : 1;
  const analystKeys: Record<string, string> = {
    "Market Analyst": "market",
    "Sentiment Analyst": "social",
    "News Analyst": "news",
    "Fundamentals Analyst": "fundamentals",
  };
  const selectedAnalysts = config.analysts.map((analyst) => analystKeys[analyst] ?? analyst);
  const language = config.language?.trim() || "English";
  // Stage opt-in/out: engines that understand it skip the unselected stages;
  // older engines ignore the extra keys and behave exactly as before.
  const selectedStages = config.stages;
  const skippedStages = selectedStages !== undefined
    ? STAGE_OPTIONS.map((s) => s.id).filter((id) => !selectedStages.includes(id))
    : undefined;
  const stageKeys = selectedStages !== undefined
    ? {
        stages: selectedStages,
        selected_stages: selectedStages,
        skip_stages: skippedStages ?? [],
      }
    : {};
  return {
    // Engine's expected schema (ticker comes from ...config below)
    model: config.deepModel,
    end_date: config.analysisDate,
    params: {
      llm_provider: config.provider,
      deep_think_llm: config.deepModel,
      quick_think_llm: config.quickModel,
      max_debate_rounds: maxDebateRounds,
      temperature: 0.0,
      analysts: config.analysts,
      selected_analysts: selectedAnalysts,
      language,
      report_language: language,
      output_language: language,
      ...stageKeys,
    },
    // Aliases for other bridge implementations
    ...config,
    analysis_date: config.analysisDate,
    research_depth: config.researchDepth,
    quick_model: config.quickModel,
    deep_model: config.deepModel,
    selected_analysts: selectedAnalysts,
    language,
    report_language: language,
    output_language: language,
    ...stageKeys,
  };

}
