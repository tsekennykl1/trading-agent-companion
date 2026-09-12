import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Copy, Download, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/workbench/AppShell";
import { useBridgeHealth } from "@/components/workbench/BridgeStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_BRIDGE_URL, getBridgeUrl, setBridgeUrl } from "@/lib/trading-agents/client";

const TITLE = "Connect your TradingAgents engine — Workbench setup";
const DESCRIPTION =
  "Start the local bridge next to your TradingAgents checkout and point the workbench dashboard at it to run live multi-agent analyses.";

export const Route = createFileRoute("/setup")({
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
  component: Setup,
});

const STEPS: { title: string; body: string; code?: string }[] = [
  {
    title: "Activate the environment you already use",
    body: "Use the same virtual environment in which you installed TradingAgents.",
    code: "cd ~/…/Group\nsource .venv/bin/activate\ncd TradingAgents",
  },
  {
    title: "Install the two bridge dependencies",
    body: "FastAPI serves the small HTTP API the dashboard talks to.",
    code: "pip install fastapi uvicorn",
  },
  {
    title: "Save the bridge script into your TradingAgents folder",
    body: "Download ta_bridge.py below and place it next to cli/ and tradingagents/.",
  },
  {
    title: "Set your LLM key and start the bridge",
    body: "Keep this terminal open while you use the dashboard.",
    code: 'export DEEPSEEK_API_KEY="<your key>"\npython ta_bridge.py',
  },
  {
    title: "Point the dashboard at it",
    body: "Enter the address the bridge prints (default http://127.0.0.1:8787) in the box above and test the connection.",
  },
];

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative mt-3">
      <pre className="overflow-x-auto rounded-md border border-rule bg-muted/60 p-3 font-mono text-xs leading-relaxed">
        {code}
      </pre>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="absolute top-1.5 right-1.5 h-7 gap-1.5 px-2 text-xs"
        onClick={() => {
          void navigator.clipboard.writeText(code);
          toast.success("Copied");
        }}
      >
        <Copy className="size-3" /> Copy
      </Button>
    </div>
  );
}

function Setup() {
  const health = useBridgeHealth();
  const [url, setUrl] = useState(DEFAULT_BRIDGE_URL);

  useEffect(() => setUrl(getBridgeUrl()), []);

  const online = !!health.data && !health.isError;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-3xl font-semibold">Connect your engine</h1>
        <p className="mt-2 text-muted-foreground">
          TradingAgents is a Python system that runs on your own machine. A small bridge exposes it to this
          dashboard, so nothing about your API keys or data leaves your computer.
        </p>

        <section className="panel mt-6 p-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-56 flex-1 space-y-1.5">
              <Label htmlFor="bridge" className="label-caps">
                Engine address
              </Label>
              <Input
                id="bridge"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={DEFAULT_BRIDGE_URL}
                className="font-mono"
              />
            </div>
            <Button
              onClick={() => {
                setBridgeUrl(url);
                void health.refetch().then((r) =>
                  r.data
                    ? toast.success("Connected to your TradingAgents engine")
                    : toast.error("No response from that address"),
                );
              }}
              className="gap-2"
            >
              <RefreshCw className="size-4" /> Save and test
            </Button>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-md border border-rule bg-muted/40 px-3 py-2.5 text-sm">
            {online ? (
              <CheckCircle2 className="size-4 text-bull" />
            ) : (
              <XCircle className="size-4 text-bear" />
            )}
            <span>
              {online
                ? `Connected${health.data?.engine_version ? ` — engine ${health.data.engine_version}` : ""}`
                : "Not connected. The dashboard will keep showing the saved sample run."}
            </span>
          </div>
        </section>

        <div className="panel mt-6 flex flex-wrap items-center gap-3 p-5">
          <div className="mr-auto">
            <p className="font-medium">Bridge script</p>
            <p className="text-sm text-muted-foreground">
              One Python file — wraps TradingAgentsGraph and streams progress to this dashboard.
            </p>
          </div>
          <Button asChild variant="outline" className="gap-2">
            <a href="/ta_bridge.py" download>
              <Download className="size-4" /> Download ta_bridge.py
            </a>
          </Button>
        </div>

        <h2 className="mt-10 text-xl font-semibold">Setup steps</h2>
        <ol className="mt-4 space-y-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="panel p-5">
              <div className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-xs text-primary-foreground">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{s.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
                  {s.code && <CodeBlock code={s.code} />}
                </div>
              </div>
            </li>
          ))}
        </ol>

        <h2 className="mt-10 text-xl font-semibold">If the browser blocks the connection</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The bridge already allows requests from any origin. If your browser still refuses, open this
          dashboard over the same protocol as the bridge, or run the bridge with{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">--host 0.0.0.0</code> and use your
          machine's local IP address instead of 127.0.0.1.
        </p>
      </div>
    </AppShell>
  );
}
