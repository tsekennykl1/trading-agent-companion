import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight, GitBranch, Network, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/workbench/AppShell";
import { Button } from "@/components/ui/button";

const title = "TradingAgents architecture and analysis lifecycle — My Trading Agents";
const description = "Follow an analysis from the dashboard or MCP assistant through the trading engine, market data, specialist agents, debate, risk review, chart and report artifacts.";

export const Route = createFileRoute("/mcp-architecture")({
  head: () => ({ meta: [
    { title }, { name: "description", content: description },
    { property: "og:title", content: title }, { property: "og:description", content: description },
    { property: "og:type", content: "article" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: ArchitecturePage,
});

const steps = [
  ["01", "Submit", "A trader chooses a stock, date, depth, language, model and participating analysts. An assistant instead discovers analyze_ticker via MCP tools/list, then calls it with validated inputs. Both paths create a run in the same engine queue."],
  ["02", "Gather evidence", "The engine retrieves company and market data. Price series and technical indicators can become available before the slower AI reports; the dashboard polls run status and loads chart artifacts separately."],
  ["03", "Specialist research", "Selected market, fundamentals, news and sentiment analysts produce independent reports. Their output is provisional while the run continues; report count and model choice affect elapsed time and model costs."],
  ["04", "Debate and decision", "Bull and bear researchers weigh the evidence, a trader proposes a position, risk reviewers challenge it and a portfolio manager forms the final action and confidence assessment. Stages not selected by the trader can be omitted."],
  ["05", "Publish results", "The engine stores progress, a decision, individual reports and final result.html. It also publishes price-chart.json for interactive exploration and price-chart.png for a static report image. History lets both dashboard and assistant revisit runs."],
] as const;

const endpoints = [
  ["GET /health", "Connection status"], ["POST /runs", "Queue an analysis"], ["GET /runs/{id}", "Run and decision"],
  ["GET /runs/{id}/status", "Lightweight progress"], ["GET /runs/{id}/result.html", "Complete report"],
  ["GET /runs/{id}/price-chart.json", "Interactive chart data"], ["GET /runs/{id}/price-chart.png", "Report image"],
  ["GET /market/security?ticker=0700.HK", "HKEX stock names"], ["POST /mcp", "Assistant protocol gateway"],
] as const;

function ArchitecturePage() {
  return <AppShell><main className="mx-auto max-w-5xl pb-16">
    <Button asChild variant="outline" size="sm"><Link to="/mcp-guide"><ArrowLeft className="mr-2 size-4" />MCP guide</Link></Button>
    <header className="mt-7 border-b border-rule pb-7"><p className="label-caps mb-3">System reference</p><h1 className="font-display text-3xl font-bold sm:text-4xl">Analysis architecture</h1><p className="mt-3 max-w-3xl leading-7 text-muted-foreground">One analysis engine serves the dashboard and MCP-connected assistants. The same run ID connects progress, charts, decisions and reports end to end.</p></header>
    <section className="mt-8"><h2 className="flex items-center gap-2 font-display text-2xl font-semibold"><Network className="size-5 text-primary" />The connections</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">{[
        ["Trader or assistant", "Dashboard form or MCP client starts a run and checks its progress."],
        ["Frontend gateway", "The dashboard reads the configured engine address. The MCP gateway exposes discoverable tools and checks a private access key."],
        ["TradingAgents engine", "The API queues work, gathers market evidence, coordinates agents, and serves results and artifacts."],
      ].map(([name, detail]) => <div key={name} className="rounded-md border border-rule bg-surface p-4"><h3 className="font-semibold">{name}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p></div>)}</div>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">The hosted engine base is <code className="break-all">https://www.myfinance5051.com/api</code>. Its direct MCP endpoint is <code className="break-all">https://www.myfinance5051.com/api/mcp/</code>; the frontend MCP gateway is <code className="break-all">https://www.myfinance5051.com/mcp</code>. The separate gateway and engine may enforce different access policies.</p>
    </section>
    <section className="mt-10"><h2 className="flex items-center gap-2 font-display text-2xl font-semibold"><GitBranch className="size-5 text-primary" />End-to-end analysis flow</h2><ol className="mt-4 divide-y divide-rule border-y border-rule">{steps.map(([number, name, text]) => <li key={number} className="grid gap-2 py-5 sm:grid-cols-[3rem_11rem_minmax(0,1fr)] sm:gap-4"><span className="font-mono text-sm text-primary">{number}</span><h3 className="font-semibold">{name}</h3><p className="text-sm leading-6 text-muted-foreground">{text}</p></li>)}</ol></section>
    <section className="mt-10"><h2 className="font-display text-2xl font-semibold">Engine API and artifacts</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Paths below are relative to the configured engine base. MCP uses JSON-RPC methods such as initialize, tools/list and tools/call rather than a separate URL for every tool.</p><div className="mt-4 divide-y divide-rule border-y border-rule">{endpoints.map(([path, purpose]) => <div key={path} className="grid min-w-0 gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_12rem]"><code className="break-all text-xs text-primary sm:text-sm">{path}</code><span className="text-sm text-muted-foreground">{purpose}</span></div>)}</div></section>
    <section className="mt-10 border-t border-rule pt-7"><h2 className="flex items-center gap-2 font-display text-2xl font-semibold"><ShieldCheck className="size-5 text-primary" />Access and limits</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">The frontend MCP tools require a private access key. Inputs are bounded; assistant-created runs are rate-limited, and cancellation through MCP is limited to MCP-owned runs. An analysis can use paid model credits. Keep access keys out of browser configuration and share them only with trusted clients.</p><Button asChild variant="outline" className="mt-5"><Link to="/mcp-guide">Client configuration <ArrowUpRight className="ml-2 size-4" /></Link></Button></section>
  </main></AppShell>;
}