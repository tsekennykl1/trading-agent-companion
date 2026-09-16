// Which AI providers the user wants to see in the New Analysis form.
// Stored in the browser; an empty/absent list means "show every configured one".
const KEY = "ta-enabled-llms";
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

/** True when this provider should appear in the analysis form. */
export function isLlmEnabled(enabled: string[] | null, id: string): boolean {
  return !enabled || enabled.length === 0 || enabled.includes(id);
}
