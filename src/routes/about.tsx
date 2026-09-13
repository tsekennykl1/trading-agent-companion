import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/workbench/AppShell";

const TITLE = "About — TradingAgents Workbench project";
const DESCRIPTION =
  "Project scope, design goals and evaluation plan for turning the TradingAgents multi-agent LLM framework into a workplace-ready decision support tool.";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: About,
});

const STRENGTHS = [
  ["Strong modularity", "Analyst, researcher, trader and risk roles mirror real organisational specialisation."],
  ["Professional reasoning", "Bull/bear debate and risk review resemble genuine finance workflows."],
  ["Explainability", "Intermediate role-specific reasoning can be inspected, unlike single-agent tools."],
  ["Flexible engineering base", "Multi-provider support, config options, checkpoints and decision memory."],
];

const LIMITATIONS = [
  ["Developer-centric interaction", "Access is mainly through a CLI and config files."],
  ["High cognitive load", "Users must read large volumes of agent text to reach the decision."],
  ["Limited visual communication", "Little built-in graphing or dashboard capability."],
  ["Limited end-user automation", "No polished batch or scheduled reporting pipeline."],
  ["Limited managerial summarisation", "Outputs are research-oriented, not executive-oriented."],
  ["Audit and traceability gaps", "Run provenance matters in finance settings."],
];

const LAYERS = [
  ["Interface layer", "Browser dashboard for ticker, date, provider, models, depth and analyst team."],
  ["Live execution layer", "Streams agent status, tool calls and token usage while the graph runs."],
  ["Visualisation layer", "Price trend, agent stance/consensus and recommendation confidence charts."],
  ["Narration layer", "Executive summary, bull/bear points and agent contributions as a manager-facing memo."],
  ["Audit layer", "Run metadata: timestamp, provider/model, runtime, token counts and decision trail."],
];

function About() {
  return (
    <AppShell>
      <article className="mx-auto max-w-[95%]">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">
          From research prototype to workplace tool
        </h1>
        <p className="mt-3 text-muted-foreground">
          TradingAgents already demonstrates that multi-agent LLM systems can perform specialised,
          debate-driven financial reasoning. Its current form is oriented toward developers and researchers.
          This project adds an interactive dashboard, automated visual analytics and executive-style
          reporting so that non-technical professionals can interpret multi-agent AI output — reducing
          cognitive load, improving explainability and aligning the system with professional workflows.
        </p>

        <h2 className="mt-10 text-xl font-semibold">Strengths of the current system</h2>
        <dl className="mt-4 space-y-3">
          {STRENGTHS.map(([t, d]) => (
            <div key={t} className="panel p-4">
              <dt className="font-medium">{t}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{d}</dd>
            </div>
          ))}
        </dl>

        <h2 className="mt-10 text-xl font-semibold">Limitations as a workplace AI tool</h2>
        <dl className="mt-4 space-y-3">
          {LIMITATIONS.map(([t, d]) => (
            <div key={t} className="panel p-4">
              <dt className="font-medium">{t}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{d}</dd>
            </div>
          ))}
        </dl>

        <h2 className="mt-10 text-xl font-semibold">What this workbench adds</h2>
        <ol className="mt-4 space-y-3">
          {LAYERS.map(([t, d], i) => (
            <li key={t} className="panel flex gap-3 p-4 sm:gap-4">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-xs text-primary-foreground">
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="block font-medium">{t}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{d}</span>
              </span>
            </li>
          ))}
        </ol>

        <h2 className="mt-10 text-xl font-semibold">How consensus and confidence are derived</h2>
        <p className="mt-3 text-muted-foreground">
          The framework does not emit a native numeric confidence for every agent, so this layer uses
          documented proxy metrics: the balance of bullish versus bearish arguments, how many role outputs
          align with the final action, and confidence language extracted from the text. High consensus means
          most role outputs align; low consensus means major bull/bear conflict. This is an interpretive
          layer and is labelled as such throughout the interface.
        </p>

        <h2 className="mt-10 text-xl font-semibold">Evaluation plan</h2>
        <p className="mt-3 text-muted-foreground">
          Evaluation compares the original CLI baseline against this enhanced system across four dimensions —
          usability, explainability, automation efficiency and governance/traceability — rather than trading
          returns. Task-based user testing measures time to complete, perceived difficulty, clarity of
          outputs and confidence in understanding.
        </p>

        <h2 className="mt-10 text-xl font-semibold">References</h2>
        <ul className="mt-3 space-y-2 text-sm">
            <li className="break-words">
            Tauric Research. (2024). <em>TradingAgents: Multi-Agent LLM Framework for Financial Trading.</em>{" "}
            <a
              className="text-primary underline underline-offset-2"
              href="https://github.com/TauricResearch/TradingAgents"
              target="_blank"
              rel="noreferrer"
            >
              github.com/TauricResearch/TradingAgents
            </a>
          </li>
            <li className="break-words">
            Liu, Z., et al. (2024).{" "}
            <em>TradingAgents: Multi-Agent Collaboration for Financial Decision-Making.</em> arXiv preprint{" "}
            <a
              className="text-primary underline underline-offset-2"
              href="https://arxiv.org/abs/2412.20138"
              target="_blank"
              rel="noreferrer"
            >
              arXiv:2412.20138
            </a>
          </li>
        </ul>
      </article>
    </AppShell>
  );
}
