import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight, Bot, CheckCircle2, Clipboard, Code2, KeyRound, Network, ShieldCheck, TriangleAlert, Wrench } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/workbench/AppShell";
import { Button } from "@/components/ui/button";

const title = "MCP Integration Guide — Tauric TradingAgents Connect";
const description = "Connect an MCP-compatible assistant to Tauric TradingAgents, discover its tools, and safely run or inspect stock analyses.";

const tools = [
  ["analyze_ticker", "Start a multi-agent analysis. Returns the decision when ready, or a run_id to poll.", "access_key, ticker, analysis_date?, research_depth?, language?, analysts?, wait_seconds?", "Write"],
  ["get_analysis", "Read the status, progress, and trade decision for one run.", "access_key, run_id", "Read"],
  ["list_analyses", "List recent analysis runs in newest-first order.", "access_key, limit?", "Read"],
  ["get_report", "List available reports for a run, or read one by name.", "access_key, run_id, report?", "Read"],
  ["cancel_analysis", "Cancel a queued or running analysis started through this MCP server.", "access_key, run_id", "Destructive"],
  ["get_market_snapshot", "Fetch company profile, valuation, quote, and Hong Kong company names when available.", "access_key, ticker", "Read"],
] as const;

const troubleshooting = [
  ["Invalid access key", "Confirm access_key exactly matches the operator’s MCP_ACCESS_KEY. Never place it in public source code."],
  ["No access key configured", "The server fails closed. Set MCP_ACCESS_KEY, then republish or restart the service."],
  ["Could not reach the trading engine", "Open Setup, confirm the engine address, and use Save and test."],
  ["Analysis not found", "Check the run_id. The run may have been removed by the engine’s retention policy."],
  ["Decision is not available yet", "The run is still active. Wait, then call get_analysis again with the same run_id."],
  ["Too many analyses started", "The cost-control window is full. Wait for the indicated time before trying again."],
] as const;

export const Route = createFileRoute("/mcp-guide")({
  head: () => ({ meta: [
    { title }, { name: "description", content: description },
    { property: "og:title", content: title }, { property: "og:description", content: description },
    { property: "og:type", content: "article" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: McpGuide,
});

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  return <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={() => { void navigator.clipboard.writeText(value); toast.success("Copied to clipboard"); }}>
    <Clipboard className="size-3.5" />{label}
  </Button>;
}

function Section({ id, title: heading, icon: Icon, children }: { id: string; title: string; icon: typeof Bot; children: React.ReactNode }) {
  return <section id={id} className="scroll-mt-24 border-t border-rule pt-8 first:border-t-0 first:pt-0">
    <div className="mb-4 flex items-center gap-2.5"><span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary"><Icon className="size-4" /></span><h2 className="font-display text-2xl font-semibold">{heading}</h2></div>
    {children}
  </section>;
}

function McpGuide() {
  // Public endpoints: the frontend gateway lives at /mcp on the production
  // domain; the engine's own MCP is reachable through the /api proxy.
  const frontendEndpoint = "https://www.myfinance5051.com/mcp";
  const engineEndpoint = "https://www.myfinance5051.com/api/mcp/";
  const config = `{
  "mcpServers": {
    "tauric-trading-connect": {
      "url": "${frontendEndpoint}",
      "transport": "streamable-http"
    }
  }
}`;
  const flow = `1. initialize
2. notifications/initialized
3. tools/list
4. tools/call → analyze_ticker
   { "access_key": "••••••••", "ticker": "0700.HK" }
5. tools/call → get_analysis
   { "access_key": "••••••••", "run_id": "<returned run_id>" }`;

  return <AppShell><div className="mx-auto max-w-6xl pb-14">
    <Button asChild variant="outline" size="sm"><Link to="/setup"><ArrowLeft className="mr-2 size-4" />Back to setup</Link></Button>
    <header className="mt-7 border-b border-rule pb-8"><p className="label-caps mb-3">Integration reference · September 2026</p><h1 className="font-display text-3xl font-bold sm:text-4xl">MCP Integration Guide</h1><p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">Connect Claude, ChatGPT, Cursor, or another MCP-compatible assistant to Tauric TradingAgents. Assistants can discover tools, start analyses, monitor progress, and read results without using the dashboard.</p></header>
    <div className="mt-8 grid gap-10 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <aside className="hidden lg:block"><nav className="sticky top-24 space-y-1" aria-label="Guide sections"><p className="label-caps mb-3">On this page</p>{[["overview","Overview"],["architecture","Architecture"],["connect","Connect"],["access","Access control"],["tools","Tool reference"],["safety","Safety rails"],["flow","Protocol flow"],["troubleshooting","Troubleshooting"]].map(([id,label]) => <a key={id} href={`#${id}`} className="block rounded px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">{label}</a>)}</nav></aside>
      <article className="min-w-0 space-y-9">
        <Section id="overview" title="What MCP adds" icon={Bot}><p className="leading-7 text-muted-foreground">Model Context Protocol standardises how an AI assistant discovers and calls external tools. The connection still uses HTTP, while MCP defines the handshake, catalogue, input schemas, calls, and structured responses.</p><div className="mt-4 grid gap-3 sm:grid-cols-3">{[["Discover","The assistant requests tools/list."],["Choose","It selects a tool and prepares valid inputs."],["Act","The server validates, runs, and returns results."]].map(([a,b]) => <div key={a} className="rounded-md border border-rule bg-surface p-4"><p className="font-semibold">{a}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{b}</p></div>)}</div></Section>
        <Section id="architecture" title="How the connection works" icon={Network}><pre className="overflow-x-auto rounded-md border border-rule bg-muted p-4 font-mono text-xs leading-6">{`MCP-compatible assistant
        │  Streamable HTTP
        ▼
Tauric Trading Connect  /mcp
  • access-key validation
  • input limits and cost controls
        │  HTTPS
        ▼
TradingAgents engine
  • analysis queue and progress
  • reports, decisions and market data
        │
        ▼
 Dashboard and Historical Analysis`}</pre><p className="mt-3 text-sm leading-6 text-muted-foreground">Assistant-created analyses use the same engine queue and appear in Historical Analysis.</p><Button asChild variant="outline" className="mt-4"><a href="/mcp-architecture" target="_blank" rel="noopener noreferrer">Open full analysis architecture <ArrowUpRight className="ml-2 size-4" /></a></Button></Section>
         <Section id="connect" title="Connect an assistant" icon={Code2}><div className="space-y-4 rounded-md border border-rule bg-surface p-4"><div><div className="mb-2 flex items-center gap-2"><p className="font-semibold">Frontend MCP gateway</p><span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">Recommended</span></div><div className="flex flex-col gap-2 sm:flex-row"><code className="min-w-0 flex-1 overflow-x-auto rounded border border-rule bg-muted p-2 text-xs">{frontendEndpoint}</code><CopyButton value={frontendEndpoint} /></div></div><div className="border-t border-rule pt-4"><p className="mb-2 font-semibold">Direct engine MCP, when enabled</p><div className="flex flex-col gap-2 sm:flex-row"><code className="min-w-0 flex-1 overflow-x-auto rounded border border-rule bg-muted p-2 text-xs">{engineEndpoint}</code><CopyButton value={engineEndpoint} /></div></div></div><div className="mt-5 flex items-center justify-between gap-2"><h3 className="font-semibold">Typical client configuration</h3><CopyButton value={config} label="Copy JSON" /></div><pre className="mt-2 overflow-x-auto rounded-md border border-rule bg-muted p-4 font-mono text-xs leading-6">{config}</pre><p className="mt-2 text-sm leading-6 text-muted-foreground">Add it as a custom Streamable HTTP server. Supply the access key only in tool arguments—never store it in public configuration.</p></Section>
        <Section id="access" title="Authentication and access control" icon={KeyRound}><div className="flex gap-3 rounded-md border border-primary/30 bg-primary/5 p-4"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" /><p className="text-sm leading-6">Every frontend tool requires an <code>access_key</code>, checked against <code>MCP_ACCESS_KEY</code>. Missing configuration or a wrong key is rejected.</p></div><ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground"><li>Obtain the key privately from the server operator.</li><li>Never place it in browser code, screenshots, logs, repositories, or shared prompts.</li><li>Rotate it if exposed and update every trusted client.</li><li>The direct engine MCP may use a different policy; follow its operator’s instructions.</li></ul></Section>
        <Section id="tools" title="Frontend tool reference" icon={Wrench}><p className="mb-4 text-sm text-muted-foreground">The current frontend server publishes six tools. A question mark marks an optional input.</p><div className="divide-y divide-rule rounded-md border border-rule bg-surface">{tools.map(([name,text,inputs,kind]) => <div key={name} className="p-4"><div className="flex flex-wrap gap-2"><code className="font-mono text-sm font-semibold text-primary">{name}</code><span className={kind === "Destructive" ? "text-xs font-semibold text-destructive" : "text-xs font-semibold text-muted-foreground"}>{kind}</span></div><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p><p className="mt-2 break-words font-mono text-xs text-muted-foreground">Inputs: {inputs}</p></div>)}</div></Section>
        <Section id="safety" title="Rate limits and safety rails" icon={ShieldCheck}><div className="grid gap-3 sm:grid-cols-2">{[["Cost budget","At most five MCP-started analyses per ten minutes per running server."],["Cancellation ownership","Only runs started through this MCP server can be cancelled here."],["Strict validation","Ticker, run ID, reports, dates, analysts, and wait times are bounded."],["Fail closed","Without MCP_ACCESS_KEY, every frontend tool call is refused."]].map(([a,b]) => <div key={a} className="rounded-md border border-rule bg-surface p-4"><p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="size-4 text-bull" />{a}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{b}</p></div>)}</div><div className="mt-4 flex gap-3 rounded-md border border-accent/50 bg-accent/10 p-4 text-sm"><TriangleAlert className="size-5 shrink-0 text-neutral" /><p>An analysis can consume paid model credits. Share the key only with trusted assistants and keep engine limits enabled.</p></div></Section>
        <Section id="flow" title="Standard protocol flow" icon={Code2}><p className="mb-3 text-sm leading-6 text-muted-foreground">Compatible clients perform these steps automatically.</p><pre className="overflow-x-auto rounded-md border border-rule bg-muted p-4 font-mono text-xs leading-6">{flow}</pre><div className="mt-4 space-y-2 text-sm text-muted-foreground"><p><strong className="text-foreground">Quick lookup:</strong> “Get a snapshot for 0005.HK.” → <code>get_market_snapshot</code></p><p><strong className="text-foreground">History:</strong> “Show my five latest analyses.” → <code>list_analyses</code></p><p><strong className="text-foreground">Report:</strong> “Read this run’s market report.” → <code>get_report</code></p></div></Section>
        <Section id="troubleshooting" title="Troubleshooting" icon={TriangleAlert}><div className="divide-y divide-rule rounded-md border border-rule bg-surface">{troubleshooting.map(([a,b]) => <details key={a} className="p-4"><summary className="cursor-pointer font-semibold">{a}</summary><p className="mt-2 text-sm leading-6 text-muted-foreground">{b}</p></details>)}</div><p className="mt-4 text-sm text-muted-foreground">See the <a href="https://modelcontextprotocol.io/specification/2025-06-18" target="_blank" rel="noreferrer" className="font-medium text-primary underline underline-offset-2">MCP specification</a> for protocol details.</p></Section>
      </article>
    </div>
  </div></AppShell>;
}
