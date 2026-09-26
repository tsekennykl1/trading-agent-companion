import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { bridgeAssetUrl } from "@/lib/trading-agents/client";
import { useT } from "@/lib/i18n";

/**
 * Catch-all for engine artifact paths such as /runs/<id>/result.html.
 *
 * When the site is deployed behind nginx, only /api/ is proxied to the
 * engine, so a bare /runs/... URL is served the SPA's index.html instead of
 * the artifact. Without a matching route the app crashed to a blank page.
 * This route forwards the browser to the same path on the engine base URL
 * (same-origin /api when configured, otherwise the stored engine address).
 */
export const Route = createFileRoute("/runs/$")({
  head: () => ({
    meta: [
      { title: "Run artifact — My Trading Agents" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RunArtifactRedirect,
});

function RunArtifactRedirect() {
  const { _splat } = Route.useParams();
  const t = useT();
  const [stuck, setStuck] = useState(false);

  const target = bridgeAssetUrl(`/${_splat}`);

  useEffect(() => {
    let samePlace = true;
    try {
      const resolved = new URL(target, window.location.origin);
      samePlace = resolved.origin === window.location.origin && resolved.pathname === window.location.pathname;
    } catch {
      samePlace = true;
    }
    if (samePlace) {
      // The engine base is this very origin/path — redirecting would loop.
      setStuck(true);
      return;
    }
    window.location.replace(target);
  }, [target]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center" role="status" aria-live="polite">
        {stuck ? (
          <>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{t("artifact.missingTitle")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t("artifact.missingBody")}</p>
            <div className="mt-6">
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {t("artifact.goHome")}
              </Link>
            </div>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto size-6 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
            <p className="mt-3 text-sm text-muted-foreground">{t("artifact.redirecting")}</p>
          </>
        )}
      </div>
    </div>
  );
}
