import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AutoRefresh } from "@/components/auto-refresh";
import { TriggerIngest } from "@/components/trigger-ingest";
import { listInScopeMarkets } from "@/lib/repo";
import { formatUsd, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MarketsPage() {
  const markets = await listInScopeMarkets(200).catch(() => []);

  return (
    <div className="space-y-4">
      <AutoRefresh intervalSeconds={30} />
      <PageHeader
        title="Markets"
        description="Active Polymarket markets in politics, war, and geopolitics."
        actions={<TriggerIngest endpoint="/api/ingest/markets" label="Refresh markets" />}
      />
      <Card>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-[var(--background-elevated)] text-left text-[10px] uppercase tracking-wide text-[var(--foreground-muted)]">
              <tr>
                <th className="px-3 py-2">Question</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2 text-right">Volume</th>
                <th className="px-3 py-2 text-right">Liquidity</th>
                <th className="px-3 py-2">Closes</th>
                <th className="px-3 py-2">Updated</th>
              </tr>
            </thead>
            <tbody>
              {markets.map((m) => (
                <tr
                  key={m.id}
                  className="border-t border-[var(--border)] hover:bg-[var(--background-elevated)]"
                >
                  <td className="max-w-[480px] px-3 py-2">
                    <Link
                      href={`/markets/${m.id}`}
                      className="hover:text-[var(--accent-strong)]"
                    >
                      {m.question}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <Badge
                        tone={
                          m.category === "war"
                            ? "warn"
                            : m.category === "geopolitics"
                              ? "accent"
                              : "default"
                        }
                      >
                        {m.category}
                      </Badge>
                      {m.is_hormuz ? <Badge tone="danger">hormuz</Badge> : null}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatUsd(m.volume)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatUsd(m.liquidity)}
                  </td>
                  <td className="px-3 py-2 text-xs text-[var(--foreground-muted)]">
                    {m.end_date
                      ? new Date(m.end_date).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-[var(--foreground-muted)]">
                    {timeAgo(m.updated_at)}
                  </td>
                </tr>
              ))}
              {markets.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-8 text-center text-xs text-[var(--foreground-muted)]"
                  >
                    No markets yet. Apply the SQL schema in Supabase and click{" "}
                    <strong>Refresh markets</strong>.
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
