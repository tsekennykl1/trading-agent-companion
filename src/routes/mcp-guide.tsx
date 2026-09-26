import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/workbench/AppShell";
import { Button } from "@/components/ui/button";
import { getBridgeUrl } from "@/lib/trading-agents/client";
import { useEffect, useState } from "react";

const title = "Connect an AI assistant with MCP — My Trading Agents";
const description = "How to connect an MCP-compatible assistant to TradingAgents, discover its tools, and safely start or inspect analyses.";

export const Route = createFileRoute("/mcp-guide")({
  head: () => ({ meta: [
    { title }, { name: "description", content: description },
    { property: "og:title", content: title }, { property: "og:description", content: description },
    { property: "og:type", content: "article" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: McpGuide,
});

function McpGuide() {
  const [endpoint, setEndpoint] = useState("");
  useEffect(() => setEndpoint(`${getBridgeUrl().replace(/\/$/, "")}/mcp`), []);
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-7 pb-12">
        <Button asChild variant="outline" size="sm"><Link to="/setup"><ArrowLeft className="mr-2 size-4" />Back to setup</Link></Button>
        <header><h1 className="font-display text-3xl font-bold">Connect an AI assistant with MCP</h1>
          <p className="mt-3 text-muted-foreground">MCP lets an assistant discover and use your trading analysis tools through one standard connection.</p></header>
        <section className="space-y-3"><h2 className="text-xl font-semibold">Connect</h2>
          <p>In an MCP-compatible assistant, add a Streamable HTTP server at this address:</p>
          <code className="block break-all rounded border border-rule bg-muted p-3 text-sm">{endpoint || "Your engine address /mcp"}</code>
          <p>Use the access key configured on your engine as a bearer token, or send it in the X-MCP-Key header. Keep that key private. Without a configured key, the engine closes MCP access.</p>
        </section>
        <section className="space-y-3"><h2 className="text-xl font-semibold">What happens next</h2>
          <ol className="list-inside list-decimal space-y-2 text-muted-foreground">
            <li>The assistant initializes a session with the MCP server.</li>
            <li>It asks for the tool list and learns each tool’s inputs.</li>
            <li>It calls a tool to start an analysis, inspect progress, read a report, or retrieve chart data.</li>
            <li>The engine returns structured results that the assistant can explain.</li>
          </ol>
          <p>The HTTP address is the transport; MCP defines the messages such as initialize, tools/list, and tools/call. This means a compatible assistant does not need custom code for each tool.</p>
        </section>
        <section className="space-y-3"><h2 className="text-xl font-semibold">Access and cost</h2>
          <p>An analysis can spend paid model credits. Share the key only with trusted assistants and keep the engine’s run limits enabled. MCP-created analyses share the engine’s run queue and appear in Historical Analysis.</p>
        </section>
      </div>
    </AppShell>
  );
}