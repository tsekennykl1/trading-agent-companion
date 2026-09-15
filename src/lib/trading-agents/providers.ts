/**
 * Mirror of the engine's initialSetup.py catalogue (PROVIDER_MODELS,
 * PROVIDER_ENV_MAPPING, PROVIDER_DEFAULT_MODELS). Kept in one place so the
 * setup page can build a valid .env without guessing model names.
 */

export interface ProviderSpec {
  id: string;
  label: string;
  /** Environment variable names initialSetup.py writes for this provider. */
  envKeys: string[];
  deep: string[];
  quick: string[];
  /** Default (deep, quick) pair. */
  defaults: [string, string];
  /** Where the user creates the key. */
  keyUrl?: string;
  note?: string;
}

export const PROVIDERS: ProviderSpec[] = [
  {
    id: "deepseek",
    label: "DeepSeek",
    envKeys: ["DEEPSEEK_API_KEY"],
    deep: ["deepseek-v4-pro"],
    quick: ["deepseek-v4-flash"],
    defaults: ["deepseek-v4-pro", "deepseek-v4-flash"],
    keyUrl: "https://platform.deepseek.com/api_keys",
  },
  {
    id: "openai",
    label: "OpenAI",
    envKeys: ["OPENAI_API_KEY"],
    deep: ["gpt-5.6"],
    quick: ["gpt-5.6-luna"],
    defaults: ["gpt-5.6", "gpt-5.6-luna"],
    keyUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "google",
    label: "Google Gemini",
    envKeys: ["GOOGLE_API_KEY"],
    deep: ["gemini-3.1"],
    quick: ["gemini-3.1"],
    defaults: ["gemini-3.1", "gemini-3.1"],
    keyUrl: "https://aistudio.google.com/app/apikey",
  },
  {
    id: "anthropic",
    label: "Anthropic Claude",
    envKeys: ["ANTHROPIC_API_KEY"],
    deep: ["claude-sonnet-5"],
    quick: ["claude-sonnet-5"],
    defaults: ["claude-sonnet-5", "claude-sonnet-5"],
    keyUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    id: "xai",
    label: "xAI Grok",
    envKeys: ["XAI_API_KEY"],
    deep: ["grok-4"],
    quick: ["grok-4"],
    defaults: ["grok-4", "grok-4"],
    keyUrl: "https://console.x.ai/",
  },
  {
    id: "qwen",
    label: "Qwen (DashScope)",
    envKeys: ["DASHSCOPE_API_KEY"],
    deep: ["qwen-max"],
    quick: ["qwen-plus"],
    defaults: ["qwen-max", "qwen-plus"],
    keyUrl: "https://dashscope.console.aliyun.com/apiKey",
  },
  {
    id: "qwen_cn",
    label: "Qwen China",
    envKeys: ["DASHSCOPE_CN_API_KEY"],
    deep: ["qwen-max"],
    quick: ["qwen-plus"],
    defaults: ["qwen-max", "qwen-plus"],
    keyUrl: "https://bailian.console.aliyun.com/",
  },
  {
    id: "glm",
    label: "GLM (Zhipu)",
    envKeys: ["ZHIPU_API_KEY"],
    deep: ["glm-5.3"],
    quick: ["glm-5.3"],
    defaults: ["glm-5.3", "glm-5.3"],
    keyUrl: "https://z.ai/manage-apikey/apikey-list",
  },
  {
    id: "glm_cn",
    label: "GLM China",
    envKeys: ["ZHIPU_CN_API_KEY"],
    deep: ["glm-5.3"],
    quick: ["glm-5.3"],
    defaults: ["glm-5.3", "glm-5.3"],
    keyUrl: "https://open.bigmodel.cn/usercenter/apikeys",
  },
  {
    id: "minimax",
    label: "MiniMax",
    envKeys: ["MINIMAX_API_KEY"],
    deep: ["MiniMax-M1"],
    quick: ["MiniMax-M1"],
    defaults: ["MiniMax-M1", "MiniMax-M1"],
    keyUrl: "https://www.minimax.io/platform/user-center/basic-information",
  },
  {
    id: "minimax_cn",
    label: "MiniMax China",
    envKeys: ["MINIMAX_CN_API_KEY"],
    deep: ["MiniMax-M1"],
    quick: ["MiniMax-M1"],
    defaults: ["MiniMax-M1", "MiniMax-M1"],
    keyUrl: "https://platform.minimaxi.com/user-center/basic-information",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    envKeys: ["OPENROUTER_API_KEY"],
    deep: ["openai/gpt-5.6"],
    quick: ["openai/gpt-5.6-luna"],
    defaults: ["openai/gpt-5.6", "openai/gpt-5.6-luna"],
    keyUrl: "https://openrouter.ai/keys",
  },
  {
    id: "ollama",
    label: "Ollama (local, no key)",
    envKeys: [],
    deep: [],
    quick: [],
    defaults: ["llama3.1", "llama3.1"],
    keyUrl: "https://ollama.com/download",
    note: "Runs on your machine. No API key — just pull the model first (ollama pull llama3.1).",
  },
  {
    id: "openai_compatible",
    label: "OpenAI-compatible endpoint",
    envKeys: ["OPENAI_COMPATIBLE_API_KEY"],
    deep: [],
    quick: [],
    defaults: ["custom-model", "custom-model"],
    note: "Any server that speaks the OpenAI API. Type your own model names.",
  },
  {
    id: "bedrock",
    label: "AWS Bedrock",
    envKeys: [],
    deep: ["us.anthropic.claude-opus-4-8-v1:0"],
    quick: ["us.anthropic.claude-opus-4-8-v1:0"],
    defaults: ["us.anthropic.claude-opus-4-8-v1:0", "us.anthropic.claude-opus-4-8-v1:0"],
    keyUrl: "https://console.aws.amazon.com/bedrock/",
    note: "Uses your normal AWS credentials (IAM role or ~/.aws), not an API key.",
  },
  {
    id: "azure_openai",
    label: "Azure OpenAI",
    envKeys: ["AZURE_OPENAI_API_KEY", "AZURE_OPENAI_ENDPOINT", "AZURE_OPENAI_API_VERSION"],
    deep: ["gpt-5.6"],
    quick: ["gpt-5.6-luna"],
    defaults: ["gpt-5.6", "gpt-5.6-luna"],
    keyUrl: "https://portal.azure.com/",
  },
];

/** Shared defaults the engine ships with, so a first run works out of the box. */
export const DEFAULT_FRED_KEY = "a18ce0f4ff2108251c4a0467c60338e1";
export const DEFAULT_ALPHA_VANTAGE_KEY = "DGJFSPTFUJ6ZRKA1";

export const DEFAULT_PUBLIC_BASE_URL = "http://127.0.0.1:8000";
export const DEFAULT_FRONTEND_ORIGINS =
  "http://localhost:8080,https://trading-agent-companion.lovable.app";

export function providerById(id: string): ProviderSpec {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}
