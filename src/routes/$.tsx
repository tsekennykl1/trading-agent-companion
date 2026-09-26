import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { bridgeAssetUrl } from "@/lib/trading-agents/client";
import { useT } from "@/lib/i18n";

/**
 * Site-wide catch-all.
 *
 * Any address the app does not know about lands here instead of throwing an
 * unmatched-route error that blanks the page. Engine artifact paths (anything
 * that looks like a run file: result.html, chart .png/.html/.json) are
 * forwarded to the configured engine; everything else shows a plain 404 card.
 */
export const Route = createFileRoute("/$")({
  head: () => ({
    meta: [{ title: "Page not found — My Trading Agents" }, { name: "robots", content: "noindex" }],
  }),
  component: CatchAll,
});

const ARTIFACT = /\.(html?|png|jpe?g|svg|json|md|csv|pdf)$/i;

function CatchAll() {
  const { _splat } = Route.useParams();
  const t = useT();
  const path = `/${_splat ?? ""}`;
  const looksLikeArtifact = ARTIFACT.test(path) || path.startsWith("/runs/");
  const [stuck, setStuck] = useState(!looksLikeArtifact);

  useEffect(() => {
    if (!looksLikeArtifact) return;
    const target = bridgeAssetUrl(path);
    let samePlace = true;
    try {
      const resolved = new URL(target, window.location.origin);
      samePlace =
        resolved.origin === window.location.origin && resolved.pathname === window.location.pathname;
    } catch {
      samePlace = true;
    }
    if (samePlace) {
      setStuck(true);
      return;
    }
    window.location.replace(target);
  }, [looksLikeArtifact, path]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center" role="status" aria-live="polite">
        {stuck ? (
          <>
            <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
              {looksLikeArtifact ? t("artifact.missingTitle") : t("notFound.title")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {looksLikeArtifact ? t("artifact.missingBody") : t("notFound.body")}
            </p>
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
            <Loader2
              className="mx-auto size-6 animate-spin text-primary motion-reduce:animate-none"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm text-muted-foreground">{t("artifact.redirecting")}</p>
          </>
        )}
      </div>
    </div>
  );
}
