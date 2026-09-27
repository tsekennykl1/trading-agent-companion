// Which AI providers the user wants to see in the New Analysis form.
// Stored in the browser; an empty/absent list uses the safe default choices.
const KEY = "ta-enabled-llms-v2";
const EVENT = "ta-enabled-llms-changed";

export function getEnabledLlms(): string[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : null;
  } catch {
    return null;
  }
}

export function setEnabledLlms(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* storage may be unavailable */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function subscribeEnabledLlms(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

/** Providers hidden until the user ticks them on the setup page. */
export const DEFAULT_HIDDEN_LLMS = ["ollama", "openai_compatible", "bedrock"];

/** True when this provider should appear in the analysis form. */
export function isLlmEnabled(enabled: string[] | null, id: string): boolean {
  if (!enabled || enabled.length === 0) return !DEFAULT_HIDDEN_LLMS.includes(id);
  return enabled.includes(id);
}
