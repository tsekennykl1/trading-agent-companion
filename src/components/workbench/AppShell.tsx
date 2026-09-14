import { Link } from "@tanstack/react-router";
import { Activity, BookOpen, History, LayoutDashboard, Languages, Plug } from "lucide-react";
import type { ReactNode } from "react";
import { BridgeStatusBadge } from "./BridgeStatusBadge";
import { useLanguage } from "@/lib/i18n";

const NAV = [
  { to: "/", label: "nav.workbench", icon: LayoutDashboard },
  { to: "/history", label: "nav.history", icon: History },
  { to: "/setup", label: "nav.setup", icon: Plug },
  { to: "/about", label: "nav.about", icon: BookOpen },
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
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
            lang === code ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {code === "en" ? "EN" : "繁中"}
        </button>
      ))}
    </div>
  );
}

export function AppShell({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-background">

      <header className="sticky top-0 z-30 border-b border-rule bg-surface/90 backdrop-blur">
        <div className="mx-auto grid max-w-[95%] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 px-3 py-3 sm:flex sm:flex-wrap sm:gap-x-6 sm:px-5">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Activity className="size-4" />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-display text-base font-semibold">My Trading Agents</span>
              <span className="hidden truncate text-[11px] text-muted-foreground sm:block">
                {t("app.tagline")}
              </span>
            </span>
          </Link>

          <nav className="order-3 col-span-2 -mx-3 flex snap-x items-center gap-1 overflow-x-auto px-3 pb-0.5 text-sm sm:order-none sm:col-auto sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0">
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

          <div className="order-4 col-span-2 flex shrink-0 flex-wrap items-center gap-2 sm:order-none sm:col-auto sm:ml-auto">
            {actions}
            <LanguageSwitch />
            <BridgeStatusBadge />
          </div>

        </div>
      </header>

      <main className="mx-auto max-w-[95%] px-3 py-5 sm:px-5 sm:py-8">{children}</main>

      <footer className="mt-10 border-t border-rule bg-surface">
        <div className="mx-auto max-w-[95%] px-3 py-6 text-xs leading-relaxed text-muted-foreground sm:px-5">
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
          <p className="mt-1">{t("footer.disclaimer")}</p>
        </div>
      </footer>
    </div>
  );
}
