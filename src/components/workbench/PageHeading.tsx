import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

/** A consistent page introduction with optional navigation and actions. */
export function PageHeading({
  title,
  description,
  actions,
  backToDashboard = false,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  backToDashboard?: boolean;
}) {
  const t = useT();

  return (
    <header className="mb-5 min-w-0 space-y-3">
      {backToDashboard && (
        <Button asChild size="sm" variant="outline" className="min-h-9 gap-2">
          <Link to="/">
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t("report.back")}
          </Link>
        </Button>
      )}
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
          {description && <p className="mt-2 max-w-4xl text-sm text-muted-foreground sm:text-base">{description}</p>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </header>
  );
}