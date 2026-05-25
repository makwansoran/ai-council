import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { AutoRefresh } from "@/components/auto-refresh";
import { supabaseService } from "@/lib/supabase/server";
import { recentTraderTrades } from "@/lib/repo";
import { formatUsd, timeAgo } from "@/lib/utils";
import type {
  TraderPositionRow,
  TraderRow,
  TraderSnapshotRow,
} from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ user: string }>;
}

export default async function TraderDetailPage({ params }: Props) {
  const { user } = await params;
  const wallet = user.toLowerCase();
  const sb = supabaseService();

  const [{ data: trader }, { data: snaps }, { data: positions }, trades] =
    await Promise.all([
      sb.from("traders").select("*").eq("proxy_wallet", wallet).maybeSingle(),
      sb
        .from("trader_snapshots")
        .select("*")
        .eq("proxy_wallet", wallet)
        .order("captured_at", { ascending: false })
        .limit(30),
      sb
        .from("trader_positions")
        .select("*")
        .eq("proxy_wallet", wallet)
        .order("captured_at", { ascending: false })
        .limit(50),
      recentTraderTrades(wallet, 50),
    ]);

  if (!trader) return notFound();
  const t = trader as TraderRow;
  const snapshots = (snaps || []) as TraderSnapshotRow[];
  const pos = (positions || []) as TraderPositionRow[];
  const week = snapshots.find((s) => s.period === "week");
  const day = snapshots.find((s) => s.period === "day");

  return (
    <div className="space-y-4">
      <AutoRefresh intervalSeconds={45} />
      <PageHeader
        title={t.display_name || t.username || wallet.slice(0, 12)}
        description={
          <span className="font-mono text-xs text-[var(--foreground-muted)]">
            {wallet}
          </span>
        }
        actions={
          <a
            href={`https://polymarket.com/profile/${wallet}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-[var(--accent-strong)] hover:underline"
          >
            Open on Polymarket ↗
          </a>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Day PnL"
          value={formatUsd(day?.pnl)}
          tone={day && (day.pnl ?? 0) >= 0 ? "positive" : "danger"}
          hint={`Rank #${day?.rank ?? "?"}`}
        />
        <Stat
          label="Week PnL"
          value={formatUsd(week?.pnl)}
          tone={week && (week.pnl ?? 0) >= 0 ? "positive" : "danger"}
          hint={`Rank #${week?.rank ?? "?"}`}
        />
        <Stat label="Open positions" value={pos.length} />
        <Stat label="Recent trades" value={trades.length} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Open positions (latest snapshot)</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-[var(--background-elevated)] text-left text-[10px] uppercase tracking-wide text-[var(--foreground-muted)]">
              <tr>
                <th className="px-3 py-2">Market</th>
                <th className="px-3 py-2">Outcome</th>
                <th className="px-3 py-2 text-right">Size</th>
                <th className="px-3 py-2 text-right">Avg</th>
                <th className="px-3 py-2 text-right">Value</th>
                <th className="px-3 py-2 text-right">PnL</th>
              </tr>
            </thead>
            <tbody>
              {pos.slice(0, 25).map((p) => (
                <tr key={p.id} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2 font-mono text-xs">
                    {p.market_id?.slice(0, 18)}…
                  </td>
                  <td className="px-3 py-2">
                    <Badge tone="outline">{p.outcome}</Badge>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{p.size}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {p.avg_price?.toFixed(3) ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatUsd(p.current_value)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right tabular-nums ${
                      (p.unrealized_pnl ?? 0) >= 0
                        ? "text-[var(--positive)]"
                        : "text-[var(--danger)]"
                    }`}
                  >
                    {formatUsd(p.unrealized_pnl)}
                  </td>
                </tr>
              ))}
              {pos.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-6 text-center text-xs text-[var(--foreground-muted)]"
                  >
                    No positions captured yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent trades</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-[var(--background-elevated)] text-left text-[10px] uppercase tracking-wide text-[var(--foreground-muted)]">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Side</th>
                <th className="px-3 py-2">Outcome</th>
                <th className="px-3 py-2 text-right">Size</th>
                <th className="px-3 py-2 text-right">Price</th>
                <th className="px-3 py-2 text-right">Notional</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((tr) => (
                <tr key={tr.id} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2 text-xs text-[var(--foreground-muted)]">
                    {timeAgo(tr.ts)}
                  </td>
                  <td className="px-3 py-2">
                    <Badge tone={tr.side === "buy" ? "positive" : "danger"}>
                      {tr.side}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">{tr.outcome}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {tr.size}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {tr.price.toFixed(3)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatUsd(tr.notional)}
                  </td>
                </tr>
              ))}
              {trades.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-6 text-center text-xs text-[var(--foreground-muted)]"
                  >
                    No trades captured yet.
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
