/**
 * URL helpers for engine-published artifacts.
 *
 * The engine returns relative paths such as `/runs/<id>/price-chart.png`.
 * Those must be resolved against a *browser-reachable* base, which is not
 * always the same as the API base: a local `http://127.0.0.1:8000` engine can
 * be fetched from a local page, but an HTTPS-hosted page will block the same
 * asset as mixed content. Deployments can point assets at a public HTTPS
 * origin with VITE_PUBLIC_ASSET_BASE_URL (falling back to VITE_API_BASE_URL).
 */

const env = import.meta.env as Record<string, string | undefined>;

export const API_BASE_URL = (env["VITE_API_BASE_URL"] ?? "").trim().replace(/\/$/, "");
export const PUBLIC_ASSET_BASE_URL = ((env["VITE_PUBLIC_ASSET_BASE_URL"] ?? "/api").trim() || API_BASE_URL).replace(
  /\/$/,
  "",
);

export function isAbsoluteUrl(value?: string | null): boolean {
  return !!value && /^https?:\/\//i.test(value);
}

export function joinUrl(base: string, path: string): string {
  if (!base) return path;
  const cleanBase = base.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

/**
 * True when the browser can actually load this URL from the current page.
 * An http:// asset on an https:// page is blocked as mixed content.
 */
export function canUseBrowserUrl(url?: string | null): boolean {
  if (!url) return false;
  if (typeof window === "undefined") return true;
  try {
    const parsed = new URL(url, window.location.origin);
    const loopback =
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "[::1]" ||
      parsed.hostname.endsWith(".localhost");
    return loopback || !(window.location.protocol === "https:" && parsed.protocol === "http:");
  } catch {
    return false;
  }
}

/** Resolve an engine path against the public asset base; null if unusable. */
export function resolvePublicUrl(value: string | null | undefined, publicBaseUrl = PUBLIC_ASSET_BASE_URL): string | null {
  if (!value) return null;
  const resolved = isAbsoluteUrl(value) ? value : publicBaseUrl ? joinUrl(publicBaseUrl, value) : value;
  return canUseBrowserUrl(resolved) ? resolved : null;
}
