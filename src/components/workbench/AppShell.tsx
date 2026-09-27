import { Link } from "@tanstack/react-router";
import { Activity, BookOpen, History, LayoutDashboard, Languages } from "lucide-react";
import type { ReactNode } from "react";
import { BridgeStatusBadge } from "./BridgeStatusBadge";
import { FontSizeControls } from "./FontSizeControls";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/", label: "nav.workbench", icon: LayoutDashboard },
  { to: "/history", label: "nav.history", icon: History },
] as const;

function LanguageSwitch() {
  const { lang, setLang, t } = useLanguage();
  return (
    <div
      className="flex shrink-0 items-center gap-1 rounded-md border border-rule bg-surface p-0.5"
      role="group"
      aria-label={t("app.language")}
    >
      <Languages className="ml-1 size-3.5 text-muted-foreground" aria-hidden="true" />
      {(["en", "zh"] as const).map((code) => (
        <Button
          key={code}
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          className={`h-7 rounded px-2 text-xs font-medium transition-colors ${
            lang === code ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {code === "en" ? "EN" : "繁"}
        </Button>
      ))}
    </div>
  );
}

export function AppShell({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-background">

      <header className="sticky top-0 z-30 border-b border-rule bg-surface/90 backdrop-blur">
        <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 px-3 py-3 sm:flex sm:flex-wrap sm:gap-x-5 sm:px-5 lg:flex-nowrap lg:gap-x-3 lg:px-6 xl:gap-x-4 2xl:px-8">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Activity className="size-4" />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-display text-base font-semibold">My Trading Agent</span>
            </span>
          </Link>

          <nav className="order-3 col-span-2 -mx-3 flex snap-x items-center gap-1 overflow-x-auto px-3 pb-0.5 text-sm sm:order-none sm:col-auto sm:mx-0 sm:shrink-0 sm:overflow-visible sm:px-0 sm:pb-0">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex min-h-9 shrink-0 snap-start items-center gap-1.5 rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                activeProps={{ className: "bg-muted text-foreground font-medium" }}
                activeOptions={{ exact: to === "/" }}
              >
                <Icon className="size-3.5" />
                {t(label)}
              </Link>
            ))}
          </nav>

          <div className="order-4 col-span-2 flex min-w-0 shrink flex-wrap items-center gap-2 sm:order-none sm:col-auto sm:ml-auto lg:flex-nowrap">
            {actions}
            <FontSizeControls />
            <LanguageSwitch />
            <BridgeStatusBadge />
          </div>

        </div>
      </header>

      <main className="w-full min-w-0 px-3 py-5 sm:px-5 sm:py-8 lg:px-6 2xl:px-8">{children}</main>

      <footer className="mt-10 border-t border-rule bg-surface">
        <div className="w-full px-3 py-6 text-xs leading-relaxed text-muted-foreground sm:px-5 lg:px-6 2xl:px-8">
          <p>
            Built on TradingAgents — Tauric Research (2024),{" "}
            <a
              className="underline underline-offset-2 hover:text-foreground"
              href="https://github.com/TauricResearch/TradingAgents"
              target="_blank"
              rel="noreferrer"
            >
              GitHub repository
            </a>{" "}
            — and Liu, Z., et al. (2024),{" "}
            <a
              className="underline underline-offset-2 hover:text-foreground"
              href="https://arxiv.org/abs/2412.20138"
              target="_blank"
              rel="noreferrer"
            >
              arXiv:2412.20138
            </a>
            .
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link
              to="/about"
              className="inline-flex items-center gap-1.5 font-medium text-foreground underline underline-offset-2 hover:text-primary"
            >
              <BookOpen className="size-3.5" aria-hidden="true" />
              {t("nav.about")}
            </Link>
            <p>{t("footer.disclaimer")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
