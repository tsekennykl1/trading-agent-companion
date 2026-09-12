import { Link } from "@tanstack/react-router";
import { Activity, BookOpen, LayoutDashboard, Plug, Rows3 } from "lucide-react";
import type { ReactNode } from "react";
import { BridgeStatusBadge } from "./BridgeStatusBadge";

const NAV = [
  { to: "/", label: "Workbench", icon: LayoutDashboard },
  { to: "/simple", label: "Simple dashboard", icon: Rows3 },
  { to: "/setup", label: "Connect engine", icon: Plug },
  { to: "/about", label: "About the project", icon: BookOpen },
] as const;


export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-rule bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Activity className="size-4" />
            </span>
            <span className="leading-tight">
              <span className="block font-display text-base font-semibold">TradingAgents Workbench</span>
              <span className="block text-[11px] text-muted-foreground">
                Workplace decision support for multi-agent financial analysis
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-1 text-sm">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                activeProps={{ className: "bg-muted text-foreground font-medium" }}
                activeOptions={{ exact: to === "/" }}
              >
                <Icon className="size-3.5" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto">
            <BridgeStatusBadge />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8">{children}</main>

      <footer className="mt-10 border-t border-rule bg-surface">
        <div className="mx-auto max-w-7xl px-5 py-6 text-xs leading-relaxed text-muted-foreground">
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
          <p className="mt-1">
            Decision-support prototype for academic use. Not investment advice and not an autonomous trading system.
          </p>
        </div>
      </footer>
    </div>
  );
}
