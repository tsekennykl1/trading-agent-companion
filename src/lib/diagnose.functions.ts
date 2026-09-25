// Server-side helper: sends an analysis error / run log to an AI model and
// returns a plain-language explanation plus recommended settings.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const INSTRUCTIONS = `You are a support engineer for a TradingAgents deployment (Python FastAPI backend running the TauricResearch TradingAgents framework v0.4.0, installed from git+https://github.com/TauricResearch/TradingAgents.git@v0.4.0 — the PyPI "tradingagents" package is an unrelated fork and must never be used).
The backend reads settings from backend/.env, e.g. LLM_PROVIDER, DEEP_THINK_LLM, QUICK_THINK_LLM, provider keys (DEEPSEEK_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY...), ALPHA_VANTAGE_API_KEY, FRED_API_KEY, RUN_WORKER_COUNT, TRADINGAGENTS_PARALLEL_ANALYSTS. .env is only read at startup, so the service (systemd unit "mytradingagents-backend") must be restarted after edits.
Given an error or run log, reply in Markdown with exactly these sections:
## What went wrong
## Likely cause
## Recommended settings
(a fenced env block with the corrected values, when relevant)
## Steps to fix
Be concise (under 300 words), practical, and written for a non-expert. Never invent API keys; use placeholders.`;

export const diagnoseError = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        log: z.string().trim().min(1).max(20000),
        context: z.string().max(2000).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("The AI helper is not configured on this server (missing LOVABLE_API_KEY).");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        instructions: INSTRUCTIONS,
        input: `${data.context ? `Context: ${data.context}\n\n` : ""}Error / run log:\n${data.log}`,
        reasoning: { effort: "low" },
        store: false,
        stream: true,
      }),
    });

    if (!res.ok || !res.body) {
      const body = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("The AI helper is busy right now. Please try again in a minute.");
      if (res.status === 402) throw new Error("AI credits are used up. Add credits in Settings → Plans & credits.");
      throw new Error(`AI request failed (${res.status}): ${body.slice(0, 300)}`);
    }

    // Read the streamed answer and collect the text pieces.
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload) as { type?: string; delta?: string; response?: { error?: { message?: string } } };
          if (evt.type === "response.output_text.delta" && evt.delta) text += evt.delta;
          if (evt.type === "response.failed") throw new Error(evt.response?.error?.message ?? "AI request failed");
        } catch (e) {
          if (e instanceof Error && e.message !== "" && !(e instanceof SyntaxError)) throw e;
        }
      }
    }
    if (!text.trim()) throw new Error("The AI returned no explanation. Please try again.");
    return { markdown: text };
  });
