import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { AutoRefresh } from "@/components/auto-refresh";
import { TriggerIngest } from "@/components/trigger-ingest";
import { TopTraderScatterplot } from "@/components/top-trader-scatterplot";
import { listTopTraders, topTraderBuyScatter } from "@/lib/repo";
import { formatUsd, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ period?: string }>;
}

const periods: Array<"day" | "week" | "month" | "all"> = ["day", "week", "month", "all"];

export default async function LeaderboardPage({ searchParams }: Props) {
  const sp = await searchParams;
  const period = (periods.includes(sp.period as never)
    ? sp.period
    : "week") as "day" | "week" | "month" | "all";
  const [traders, scatter] = await Promise.all([
    listTopTraders(period, 1000).catch(() => []),
    topTraderBuyScatter(7, 80).catch(() => []),
  ]);

  return (
    <div className="space-y-4">
      <AutoRefresh intervalSeconds={45} />
      <PageHeader
        title="Top traders"
        description="Top 1000 Polymarket traders with 24/7 buy/sell overwatch. Recent trades are collected continuously and visualized below."
        actions={<TriggerIngest endpoint="/api/ingest/leaderboard" label="Refresh leaderboard" />}
      />

      <Card>
        <CardHeader>
          <CardTitle>What top traders are buying most · last 7 days</CardTitle>
        </CardHeader>
        <CardBody>
          <TopTraderScatterplot points={scatter} />
        </CardBody>
      </Card>

      <div className="flex gap-2">
        {periods.map((p) => (
          <Link
            key={p}
            href={`/leaderboard?period=${p}`}
            className={`rounded-md border px-3 py-1.5 text-xs uppercase tracking-wide ${
              p === period
                ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent-strong)]"
                : "border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--border-strong)]"
            }`}
          >
            {p}
          </Link>
        ))}
      </div>

      <Card>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-[var(--background-elevated)] text-left text-[10px] uppercase tracking-wide text-[var(--foreground-muted)]">
              <tr>
                <th className="px-3 py-2">Rank</th>
                <th className="px-3 py-2">Trader</th>
                <th className="px-3 py-2 text-right">PnL ({period})</th>
                <th className="px-3 py-2 text-right">Volume</th>
                <th className="px-3 py-2">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {traders.map((t) => (
                <tr
                  key={t.proxy_wallet}
                  className="border-t border-[var(--border)] hover:bg-[var(--background-elevated)]"
                >
                  <td className="px-3 py-2 text-xs tabular-nums text-[var(--foreground-muted)]">
                    #{t.rank ?? "?"}
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/leaderboard/${t.proxy_wallet}`}
                      className="hover:text-[var(--accent-strong)]"
                    >
                      {t.trader?.display_name ||
                        t.trader?.username ||
                        `${t.proxy_wallet.slice(0, 10)}…`}
                    </Link>
                  </td>
                  <td
                    className={`px-3 py-2 text-right tabular-nums ${
                      (t.pnl ?? 0) >= 0
                        ? "text-[var(--positive)]"
                        : "text-[var(--danger)]"
                    }`}
                  >
                    {formatUsd(t.pnl)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatUsd(t.volume)}
                  </td>
                  <td className="px-3 py-2 text-xs text-[var(--foreground-muted)]">
                    {timeAgo(t.captured_at)}
                  </td>
                </tr>
              ))}
              {traders.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-xs text-[var(--foreground-muted)]"
                  >
                    No leaderboard data yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
