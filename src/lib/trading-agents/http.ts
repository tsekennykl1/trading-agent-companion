// Everything about *talking* to the engine over HTTP lives here:
// which URL to use, how to send a request, and how to report failures.
import { API_BASE_URL, PUBLIC_ASSET_BASE_URL, isAbsoluteUrl, joinUrl } from "./url";

const STORAGE_KEY = "ta-workbench-bridge-url";
export const DEFAULT_BRIDGE_URL = API_BASE_URL || "http://127.0.0.1:8000";

export function getBridgeUrl(): string {
  if (typeof window === "undefined") return DEFAULT_BRIDGE_URL;
  return window.localStorage.getItem(STORAGE_KEY) ?? DEFAULT_BRIDGE_URL;
}

export function setBridgeUrl(url: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, url.replace(/\/$/, ""));
}

export class EngineHttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "EngineHttpError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getBridgeUrl().replace(/\/$/, "");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new EngineHttpError(res.status, `Engine responded ${res.status}${text ? `: ${formatErrorDetail(text)}` : ""}`);
  }
  return (await res.json()) as T;
}

/** Turn a FastAPI/Pydantic error body into a readable one-liner. */
function formatErrorDetail(text: string): string {
  try {
    const parsed = JSON.parse(text) as { detail?: unknown };
    if (Array.isArray(parsed.detail)) {
      return parsed.detail
        .map((d) => {
          const item = d as { loc?: unknown[]; msg?: string };
          const field = Array.isArray(item.loc) ? item.loc.filter((p) => p !== "body").join(".") : "";
          return field ? `${field}: ${item.msg ?? "invalid"}` : (item.msg ?? "invalid");
        })
        .join("; ")
        .slice(0, 300);
    }
    if (typeof parsed.detail === "string") return parsed.detail.slice(0, 300);
  } catch {
    /* not JSON — fall through */
  }
  return text.slice(0, 300);
}

/**
 * Make an engine-relative artifact path absolute. A configured public asset
 * base (VITE_PUBLIC_ASSET_BASE_URL / VITE_API_BASE_URL) wins over the locally
 * stored bridge URL, so HTTPS deployments can serve artifacts over HTTPS.
 */
export function bridgeAssetUrl(path: string): string {
  if (isAbsoluteUrl(path)) return path;
  const base = PUBLIC_ASSET_BASE_URL || getBridgeUrl();
  return joinUrl(base.replace(/\/$/, ""), path);
}

/** GET helper that treats "not ready" (404) and network errors as null. */
async function getJson(path: string): Promise<unknown> {
  try {
    const res = await fetch(bridgeAssetUrl(path), { cache: "no-store" });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text.trim()) return null;
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  } catch {
    return null;
  }
}
