import Link from "next/link";
import {
  listInScopeMarkets,
  listTopTraders,
  recentCouncilRuns,
  recentHormuzEvents,
  recentSignals,
  listScrapers,
} from "@/lib/repo";
import { PageHeader } from "@/components/page-header";
import { Stat } from "@/components/ui/stat";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AutoRefresh } from "@/components/auto-refresh";
import { TriggerIngest } from "@/components/trigger-ingest";
import { formatNumber, formatPct, formatUsd, hoursAgoIso, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let markets: Awaited<ReturnType<typeof listInScopeMarkets>> = [];
  let traders: Awaited<ReturnType<typeof listTopTraders>> = [];
  let council: Awaited<ReturnType<typeof recentCouncilRuns>> = [];
  let signals: Awaited<ReturnType<typeof recentSignals>> = [];
  let hormuz: Awaited<ReturnType<typeof recentHormuzEvents>> = [];
  let scrapers: Awaited<ReturnType<typeof listScrapers>> = [];
  let dataError: string | null = null;

  const cutoff24h = hoursAgoIso(24);

  try {
    [markets, traders, council, signals, hormuz, scrapers] = await Promise.all([
      listInScopeMarkets(80),
      listTopTraders("week", 10),
      recentCouncilRuns(8),
      recentSignals(40),
      recentHormuzEvents(8),
      listScrapers(),
    ]);
  } catch (err) {
    dataError = (err as Error).message;
  }

  return (
    <div className="space-y-4">
      <AutoRefresh intervalSeconds={20} />
      <PageHeader
        title="Mission Control"
        description="Polymarket politics + war coverage. All inputs, signals, traders, and council calls in one view."
        actions={
          <>
            <TriggerIngest
              endpoint="/api/ingest/all"
              label="Run all ingest"
              variant="primary"
            />
          </>
        }
      />

      {dataError ? (
        <Card>
          <CardBody>
            <div className="text-sm text-[var(--danger)]">
              Could not load data: {dataError}
            </div>
            <div className="mt-2 text-xs text-[var(--foreground-muted)]">
              Make sure Supabase env vars are set and the schema in{" "}
              <code className="text-[var(--accent-strong)]">
                supabase/migrations/0001_init.sql
              </code>{" "}
              has been applied.
            </div>
          </CardBody>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Tracked markets"
          value={formatNumber(markets.length)}
          hint={`${markets.filter((m) => m.is_hormuz).length} hormuz-tagged`}
          tone="accent"
        />
        <Stat
          label="Live scrapers"
          value={`${scrapers.filter((s) => s.enabled).length} / ${scrapers.length}`}
          hint={
            scrapers.find((s) => s.last_status === "error")
              ? "Some scrapers have errors"
              : "All healthy"
          }
          tone={
            scrapers.some((s) => s.last_status === "error") ? "warn" : "positive"
          }
        />
        <Stat
          label="Council calls (24h)"
          value={formatNumber(
            council.filter((c) => c.created_at > cutoff24h).length,
          )}
          hint={
            council[0]
              ? `${council[0].action.toUpperCase()} @ ${formatPct(council[0].confidence)}`
              : "no runs yet"
          }
        />
        <Stat
          label="Hormuz signals (24h)"
          value={formatNumber(hormuz.length)}
          hint={
            hormuz[0]
              ? `last: ${timeAgo(hormuz[0].ts)} · ${hormuz[0].severity}`
              : "all quiet"
          }
          tone={hormuz.some((h) => h.severity === "critical") ? "danger" : "warn"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top markets · politics + war</CardTitle>
            <Link
              className="text-xs text-[var(--accent-strong)] hover:underline"
              href="/markets"
            >
              See all →
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            <div className="scrollbar-thin max-h-[420px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[var(--background-panel)] text-left text-[10px] uppercase tracking-wide text-[var(--foreground-muted)]">
                  <tr>
                    <th className="px-3 py-2">Question</th>
                    <th className="px-3 py-2">Cat</th>
                    <th className="px-3 py-2 text-right">Volume</th>
                    <th className="px-3 py-2 text-right">Liq</th>
                  </tr>
                </thead>
                <tbody>
                  {markets.slice(0, 25).map((m) => (
                    <tr
                      key={m.id}
                      className="border-t border-[var(--border)] hover:bg-[var(--background-elevated)]"
                    >
                      <td className="px-3 py-2">
                        <Link
                          href={`/markets/${m.id}`}
                          className="line-clamp-2 hover:text-[var(--accent-strong)]"
                        >
                          {m.question}
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <Badge
                          tone={
                            m.is_hormuz
                              ? "danger"
                              : m.category === "war"
                                ? "warn"
                                : m.category === "geopolitics"
                                  ? "accent"
                                  : "default"
                          }
                        >
                          {m.is_hormuz ? "hormuz" : m.category}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatUsd(m.volume)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatUsd(m.liquidity)}
                      </td>
                    </tr>
                  ))}
                  {markets.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-6 text-center text-xs text-[var(--foreground-muted)]"
                      >
                        No markets yet. Click <strong>Run all ingest</strong>{" "}
                        above.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent council calls</CardTitle>
            <Link
              className="text-xs text-[var(--accent-strong)] hover:underline"
              href="/council"
            >
              See all →
            </Link>
          </CardHeader>
          <CardBody className="space-y-2">
            {council.length === 0 ? (
              <div className="text-xs text-[var(--foreground-muted)]">
                No analysis runs yet.
              </div>
            ) : (
              council.map((r) => (
                <div
                  key={r.id}
                  className="rounded-md border border-[var(--border)] bg-[var(--background-elevated)] p-3"
                >
                  <div className="flex items-center justify-between text-xs text-[var(--foreground-muted)]">
                    <span>{timeAgo(r.created_at)}</span>
                    <Badge
                      tone={
                        r.action === "hold"
                          ? "muted"
                          : r.action.includes("yes")
                            ? "positive"
                            : "danger"
                      }
                    >
                      {r.action.replace("_", " ")} · {formatPct(r.confidence)}
                    </Badge>
                  </div>
                  <div className="mt-1 line-clamp-2 text-sm">{r.thesis}</div>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Top traders · this week</CardTitle>
            <Link
              className="text-xs text-[var(--accent-strong)] hover:underline"
              href="/leaderboard"
            >
              See all →
            </Link>
          </CardHeader>
          <CardBody className="space-y-2">
            {traders.length === 0 ? (
              <div className="text-xs text-[var(--foreground-muted)]">
                No leaderboard data yet.
              </div>
            ) : (
              traders.slice(0, 8).map((t) => (
                <Link
                  key={t.proxy_wallet}
                  href={`/leaderboard/${t.proxy_wallet}`}
                  className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--background-elevated)] px-3 py-2 text-sm hover:border-[var(--border-strong)]"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 text-right text-xs text-[var(--foreground-muted)] tabular-nums">
                      #{t.rank ?? "?"}
                    </span>
                    <span className="truncate font-medium">
                      {t.trader?.display_name ||
                        t.trader?.username ||
                        `${t.proxy_wallet.slice(0, 8)}…`}
                    </span>
                  </div>
                  <span className="font-mono text-xs tabular-nums text-[var(--positive)]">
                    {formatUsd(t.pnl)}
                  </span>
                </Link>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hormuz feed</CardTitle>
            <Link
              className="text-xs text-[var(--accent-strong)] hover:underline"
              href="/hormuz"
            >
              Open 24/7 monitor →
            </Link>
          </CardHeader>
          <CardBody className="space-y-2">
            {hormuz.length === 0 ? (
              <div className="text-xs text-[var(--foreground-muted)]">
                No Hormuz events captured yet.
              </div>
            ) : (
              hormuz.slice(0, 6).map((h) => (
                <a
                  key={h.id}
                  href={h.url ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-md border border-[var(--border)] bg-[var(--background-elevated)] px-3 py-2 text-sm hover:border-[var(--border-strong)]"
                >
                  <div className="flex items-center justify-between text-xs text-[var(--foreground-muted)]">
                    <span>{timeAgo(h.ts)}</span>
                    <Badge
                      tone={
                        h.severity === "critical"
                          ? "danger"
                          : h.severity === "high"
                            ? "warn"
                            : h.severity === "med"
                              ? "accent"
                              : "muted"
                      }
                    >
                      {h.severity}
                    </Badge>
                  </div>
                  <div className="mt-1 line-clamp-2">{h.headline}</div>
                </a>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Signal firehose</CardTitle>
            <Link
              className="text-xs text-[var(--accent-strong)] hover:underline"
              href="/signals"
            >
              Open feed →
            </Link>
          </CardHeader>
          <CardBody className="space-y-2">
            {signals.length === 0 ? (
              <div className="text-xs text-[var(--foreground-muted)]">
                No signals yet. Add scrapers and run ingest.
              </div>
            ) : (
              signals.slice(0, 8).map((s) => (
                <div
                  key={s.id}
                  className="rounded-md border border-[var(--border)] bg-[var(--background-elevated)] px-3 py-2 text-xs"
                >
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-[var(--foreground-muted)]">
                    <span>{s.kind.replace("_", " ")}</span>
                    <span>{timeAgo(s.ts)}</span>
                  </div>
                  <div className="mt-1 line-clamp-2 text-sm">{s.title}</div>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
