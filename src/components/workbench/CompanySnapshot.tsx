/**
 * Company context strip shown above the price chart.
 *
 * Reads two engine endpoints that wrap Alpha Vantage:
 *   GET /market/company  — profile, valuation, latest quote
 *   GET /market/earnings — last four quarters of EPS vs estimate
 *
 * Both answer `{ available: false, message }` when the key is missing, the
 * free tier is rate limited, or the symbol is not covered (common outside US
 * listings). In that case the whole strip stays hidden — it is extra context,
 * never something the analysis depends on.
 */
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/trading-agents/client";
import { useT } from "@/lib/i18n";

function compactNumber(value: number | null | undefined, currency?: string | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const formatted = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(value);
  return currency ? `${formatted} ${currency}` : formatted;
}

function decimal(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

function percent(value: number | null | undefined, alreadyPercent = false) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const number = alreadyPercent ? value : value * 100;
  return `${number >= 0 ? "+" : ""}${number.toFixed(2)}%`;
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "bull" | "bear" }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[0.7rem] tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd
        className={`mt-0.5 truncate text-sm font-semibold ${
          tone === "bull" ? "text-bull" : tone === "bear" ? "text-bear" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

export function CompanySnapshot({ ticker }: { ticker: string }) {
  const t = useT();
  const symbol = ticker.trim().toUpperCase();

  const profile = useQuery({
    queryKey: ["company-profile", symbol],
    queryFn: () => api.companyProfile(symbol),
    enabled: symbol.length > 0,
    staleTime: 6 * 60 * 60 * 1000,
    retry: false,
  });
  const earnings = useQuery({
    queryKey: ["company-earnings", symbol],
    queryFn: () => api.companyEarnings(symbol),
    enabled: symbol.length > 0,
    staleTime: 6 * 60 * 60 * 1000,
    retry: false,
  });

  const company = profile.data?.available ? profile.data : null;
  const eps = earnings.data?.available ? (earnings.data.quarters ?? []) : [];
  if (!company && eps.length === 0) return null;

  const currency = company?.currency ?? null;
  const change = company?.quote?.change_percent ?? null;

  return (
    <section className="panel mb-4 min-w-0 p-4 sm:p-5">
      <header className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="font-display text-base font-semibold">
          {company?.name ?? symbol} <span className="text-muted-foreground">({company?.symbol ?? symbol})</span>
        </h2>
        {company?.sector && (
          <p className="text-xs text-muted-foreground">
            {company.sector}
            {company.industry ? ` · ${company.industry}` : ""}
            {company.exchange ? ` · ${company.exchange}` : ""}
          </p>
        )}
        <p className="ml-auto text-[0.7rem] text-muted-foreground">{t("snapshot.source")}</p>
      </header>

      {company && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
          <Metric
            label={t("snapshot.price")}
            value={company.quote?.price != null ? `${decimal(company.quote.price)}${currency ? ` ${currency}` : ""}` : "—"}
          />
          <Metric
            label={t("snapshot.change")}
            value={percent(change, true)}
            tone={change == null ? undefined : change >= 0 ? "bull" : "bear"}
          />
          <Metric label={t("snapshot.marketCap")} value={compactNumber(company.market_cap, currency)} />
          <Metric label={t("snapshot.pe")} value={decimal(company.pe_ratio)} />
          <Metric label={t("snapshot.dividend")} value={percent(company.dividend_yield)} />
          <Metric
            label={t("snapshot.range52")}
            value={
              company.week52_low != null && company.week52_high != null
                ? `${decimal(company.week52_low)} – ${decimal(company.week52_high)}`
                : "—"
            }
          />
        </dl>
      )}

      {eps.length > 0 && (
        <div className="mt-4 border-t border-rule pt-3">
          <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {t("snapshot.earnings")}
          </h3>
          <div className="min-w-0 overflow-x-auto">
            <table className="w-full min-w-[26rem] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-1 pr-3 font-medium">{t("snapshot.quarter")}</th>
                  <th className="py-1 pr-3 font-medium">{t("snapshot.reported")}</th>
                  <th className="py-1 pr-3 font-medium">{t("snapshot.estimated")}</th>
                  <th className="py-1 font-medium">{t("snapshot.surprise")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {eps.map((quarter) => (
                  <tr key={quarter.fiscal_date ?? Math.random()}>
                    <td className="py-1.5 pr-3">{quarter.fiscal_date ?? "—"}</td>
                    <td className="py-1.5 pr-3 font-medium">{decimal(quarter.reported_eps)}</td>
                    <td className="py-1.5 pr-3 text-muted-foreground">{decimal(quarter.estimated_eps)}</td>
                    <td
                      className={`py-1.5 font-semibold ${
                        quarter.surprise_percent == null
                          ? ""
                          : quarter.surprise_percent >= 0
                            ? "text-bull"
                            : "text-bear"
                      }`}
                    >
                      {percent(quarter.surprise_percent, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
