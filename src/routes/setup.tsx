import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Copy, Download, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/workbench/AppShell";
import { EnvBuilder } from "@/components/workbench/EnvBuilder";
import { useBridgeHealth } from "@/components/workbench/BridgeStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_BRIDGE_URL, getBridgeUrl, setBridgeUrl } from "@/lib/trading-agents/client";

const TITLE = "Connect your TradingAgents engine — My Trading Agents setup";
const DESCRIPTION =
  "Run TradingAgents analyses with live progress, market charts, agent reports, confidence views, and an exportable decision memo.";

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
    title: "Get the engine code and create an environment",
    body: "Clone your backend repository, then create and activate a Python virtual environment inside it.",
    code:
      "git clone https://github.com/tsekennykl1/myTradingAgentsBackend.git\ncd myTradingAgentsBackend\npython3 -m venv .venv\nsource .venv/bin/activate",
  },
  {
    title: "Install the dependencies",
    body: "This installs FastAPI, the worker, and the TradingAgents engine requirements.",
    code: "pip install -r requirements.txt",
  },
  {
    title: "Create your settings file",
    body: "Build it with the form further down this page, then save it as .env in the engine folder. Or start from the example file and edit it by hand.",
    code: "cp .env.example .env\nopen .env   # or: nano .env",
  },
  {
    title: "Run the guided configurator",
    body:
      "initialSetup.py is the safest way to create .env. It asks one question at a time — which AI provider you use, its key, which deep-thinking and quick-thinking models to run, how many debate rounds, the temperature, and where to keep the cache and memory log. Press Enter at any prompt to accept the suggested value; it reads your existing .env first, so re-running it only changes what you retype, and keys are shown masked. Model names are checked against the engine's own list and friendly names are converted automatically (\"DeepSeek Pro\" becomes deepseek-v4-pro), so a typo is caught before anything is saved. Data keys for FRED and Alpha Vantage come pre-filled with shared starter keys that work immediately — replace them with your own when you start running analyses regularly, as the shared ones are rate limited. Nothing is written until every value passes validation; then it writes .env, refreshes .env.example, and creates sample_run_payload.json you can use to test the engine with one curl command.",
    code: "python initialSetup.py",
  },
  {
    title: "Or configure it unattended",
    body:
      "For servers and deployments, skip the questions entirely: put the same answers in a JSON file and run with --non-interactive. Point it at the file with --config, or set CONFIG_JSON instead — a local path, an http(s) address, an s3:// object, or the JSON itself all work. Keys named the friendly way (llm_provider, deep_think_llm, research_depth) are translated for you, and anything under \"env\" is written to .env exactly as typed. The same validation runs, so a bad model name or a missing provider key stops the deployment instead of failing mid-analysis.",
    code:
      'cat > config.json <<\'JSON\'\n{\n  "llm_provider": "deepseek",\n  "deep_think_llm": "deepseek-v4-pro",\n  "quick_think_llm": "deepseek-v4-flash",\n  "research_depth": 1,\n  "temperature": 0.0,\n  "env": {\n    "DEEPSEEK_API_KEY": "sk-your-key",\n    "PUBLIC_BASE_URL": "http://127.0.0.1:8000",\n    "FRONTEND_ORIGINS": "http://localhost:8080"\n  }\n}\nJSON\n\npython initialSetup.py --non-interactive --config config.json\n# or: CONFIG_JSON=s3://my-bucket/config/config.json python initialSetup.py --non-interactive',
  },
  {
    title: "Choose where the dashboard may call from",
    body: "PUBLIC_BASE_URL is the address the engine is reached at; FRONTEND_ORIGINS lists the dashboards allowed to talk to it. Without your dashboard address here, the browser blocks every request.",
    code:
      "PUBLIC_BASE_URL=http://127.0.0.1:8000\nFRONTEND_ORIGINS=http://localhost:8080,https://trading-agent-companion.lovable.app",
  },
  {
    title: "Start the engine",
    body: "Keep this terminal open while you use the dashboard.",
    code: "source .venv/bin/activate\nuvicorn app.main:app --host 127.0.0.1 --port 8000",
  },
  {
    title: "Point the dashboard at it",
    body: "Enter the address above (default http://127.0.0.1:8000) in the box at the top of this page and test the connection.",
  },
];

const LLM_KEYS: { name: string; key: string; url: string }[] = [
  { name: "DeepSeek", key: "DEEPSEEK_API_KEY", url: "https://platform.deepseek.com/api_keys" },
  { name: "OpenAI", key: "OPENAI_API_KEY", url: "https://platform.openai.com/api-keys" },
  { name: "Google Gemini", key: "GOOGLE_API_KEY", url: "https://aistudio.google.com/app/apikey" },
  { name: "Anthropic Claude", key: "ANTHROPIC_API_KEY", url: "https://console.anthropic.com/settings/keys" },
  { name: "xAI Grok", key: "XAI_API_KEY", url: "https://console.x.ai/" },
  { name: "OpenRouter", key: "OPENROUTER_API_KEY", url: "https://openrouter.ai/keys" },
  { name: "Qwen (DashScope)", key: "DASHSCOPE_API_KEY", url: "https://dashscope.console.aliyun.com/apiKey" },
  { name: "Qwen China", key: "DASHSCOPE_CN_API_KEY", url: "https://bailian.console.aliyun.com/" },
  { name: "GLM (Zhipu)", key: "ZHIPU_API_KEY", url: "https://z.ai/manage-apikey/apikey-list" },
  { name: "GLM China", key: "ZHIPU_CN_API_KEY", url: "https://open.bigmodel.cn/usercenter/apikeys" },
  { name: "MiniMax", key: "MINIMAX_API_KEY", url: "https://www.minimax.io/platform/user-center/basic-information" },
  { name: "MiniMax China", key: "MINIMAX_CN_API_KEY", url: "https://platform.minimaxi.com/user-center/basic-information" },
  {
    name: "Azure OpenAI",
    key: "AZURE_OPENAI_API_KEY (+ AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_VERSION)",
    url: "https://portal.azure.com/",
  },
  { name: "Ollama (local, no key)", key: "—", url: "https://ollama.com/download" },
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
      <div className="mx-auto max-w-[95%]">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Connect your engine</h1>
        <p className="mt-2 text-muted-foreground">
          TradingAgents is a Python system that runs on your own machine. A small bridge exposes it to this
          dashboard, so nothing about your API keys or data leaves your computer.
        </p>

        <section className="panel mt-6 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="min-w-0 space-y-1.5">
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
               className="min-h-11 w-full gap-2 sm:min-h-9 sm:w-auto"
            >
              <RefreshCw className="size-4" /> Save and test
            </Button>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-md border border-rule bg-muted/40 px-3 py-2.5 text-sm sm:items-center">
            {online ? (
               <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-bull sm:mt-0" />
            ) : (
               <XCircle className="mt-0.5 size-4 shrink-0 text-bear sm:mt-0" />
            )}
            <span>
              {online
                ? `Connected${health.data?.engine_version ? ` — engine ${health.data.engine_version}` : ""}`
                : "Not connected. The dashboard will keep showing the saved sample run."}
            </span>
          </div>
        </section>

        <div className="panel mt-6 grid gap-3 p-4 sm:flex sm:flex-wrap sm:items-center sm:p-5">
          <div className="mr-auto">
            <p className="font-medium">Single-file bridge (alternative)</p>
            <p className="text-sm text-muted-foreground">
              If you do not want the full engine repository, this one Python file wraps TradingAgentsGraph
              and streams progress to this dashboard.
            </p>
          </div>
          <Button asChild variant="outline" className="min-h-11 w-full gap-2 sm:min-h-9 sm:w-auto">
            <a href="/ta_bridge.py" download>
              <Download className="size-4" /> Download ta_bridge.py
            </a>
          </Button>
        </div>

        <h2 className="mt-10 text-xl font-semibold">Setup steps</h2>
        <ol className="mt-4 space-y-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="panel p-4 sm:p-5">
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

        <h2 className="mt-10 text-xl font-semibold">Build your .env</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick your AI provider, paste its key, and copy the finished file. Model names come straight from
          the engine's own list, so they are always valid. Market and economic data keys are pre-filled with
          working starter keys.
        </p>
        <EnvBuilder />

        <h2 className="mt-10 text-xl font-semibold">AI model keys</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          DeepSeek is only one of the supported providers. Add the key for whichever provider you pick to
          your <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">.env</code> file — one is
          enough — then choose that provider in the New Analysis form.
        </p>
        <div className="panel mt-4 divide-y divide-rule overflow-hidden p-0">
          {LLM_KEYS.map((item) => (
            <div key={item.key} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-center sm:gap-3">
              <span className="font-medium">{item.name}</span>
              <code className="truncate font-mono text-xs text-muted-foreground">{item.key}</code>
              <a
                className="text-xs font-medium underline underline-offset-2 hover:text-primary sm:text-right"
                href={item.url}
                target="_blank"
                rel="noreferrer"
              >
                Get key
              </a>
            </div>
          ))}
        </div>
        <CodeBlock code={'DEEPSEEK_API_KEY="sk-…"\n# or OPENAI_API_KEY="sk-…"  /  GOOGLE_API_KEY="…"  /  ANTHROPIC_API_KEY="sk-ant-…"'} />

        <h2 className="mt-10 text-xl font-semibold">Market and economic data keys</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Both are free. Alpha Vantage supplies price and fundamentals data; FRED supplies US economic
          series used by the fundamentals and macro write-ups.
        </p>
        <ol className="mt-4 space-y-4">
          <li className="panel p-4 sm:p-5">
            <p className="font-medium">Alpha Vantage</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Open{" "}
              <a
                className="underline underline-offset-2 hover:text-primary"
                href="https://www.alphavantage.co/support/#api-key"
                target="_blank"
                rel="noreferrer"
              >
                alphavantage.co/support/#api-key
              </a>
              , enter your email, and the key appears on screen immediately. Free tier is rate limited, so
              keep the engine's data cache switched on.
            </p>
            <CodeBlock code={'ALPHA_VANTAGE_API_KEY="your-key"'} />
          </li>
          <li className="panel p-4 sm:p-5">
            <p className="font-medium">FRED (Federal Reserve Economic Data)</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a free account at{" "}
              <a
                className="underline underline-offset-2 hover:text-primary"
                href="https://fredaccount.stlouisfed.org/apikeys"
                target="_blank"
                rel="noreferrer"
              >
                fredaccount.stlouisfed.org/apikeys
              </a>
              , then request an API key. It is issued right away.
            </p>
            <CodeBlock code={'FRED_API_KEY="your-key"'} />
          </li>
        </ol>
        <p className="mt-4 text-sm text-muted-foreground">
          After editing <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">.env</code>, stop
          the engine (Ctrl+C) and start it again so the new keys are picked up.
        </p>

        <h2 className="mt-10 text-xl font-semibold">If the browser blocks the connection</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Add this dashboard's address to{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">FRONTEND_ORIGINS</code> in{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">.env</code> and restart the
          engine. If it still refuses, run the engine with{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">--host 0.0.0.0</code> and use your
          machine's local IP address instead of 127.0.0.1.
        </p>
      </div>
    </AppShell>
  );
}
