import { Link } from "@tanstack/react-router";
import { Activity, BookOpen, LayoutDashboard, Plug } from "lucide-react";
import type { ReactNode } from "react";
import { BridgeStatusBadge } from "./BridgeStatusBadge";

const NAV = [
  { to: "/", label: "Workbench", icon: LayoutDashboard },
  
  { to: "/setup", label: "Connect engine", icon: Plug },
  { to: "/about", label: "About the project", icon: BookOpen },
] as const;


export function AppShell({ children }: { children: ReactNode }) {
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
                Workplace decision support for multi-agent financial analysis
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
                {label}
              </Link>
            ))}
          </nav>

          <div className="shrink-0 sm:ml-auto">
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
          <p className="mt-1">
            Decision-support prototype for academic use. Not investment advice and not an autonomous trading system.
          </p>
        </div>
      </footer>
    </div>
  );
}
