import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { AutoRefresh } from "@/components/auto-refresh";
import {
  listOrderIntents,
  listPaperTrades,
} from "@/lib/repo";
import { formatUsd, timeAgo } from "@/lib/utils";
import { ClosePaperTrade } from "@/components/close-paper-trade";
import { DecideOrderIntent } from "@/components/decide-order-intent";

export const dynamic = "force-dynamic";

export default async function TradesPage() {
  const [paper, intents] = await Promise.all([
    listPaperTrades(200).catch(() => []),
    listOrderIntents(200).catch(() => []),
  ]);

  const open = paper.filter((p) => p.status === "open");
  const closed = paper.filter((p) => p.status === "closed");
  const realized = closed.reduce((sum, t) => sum + (t.pnl ?? 0), 0);

  return (
    <div className="space-y-4">
      <AutoRefresh intervalSeconds={30} />
      <PageHeader
        title="Trades"
        description="Paper trading for tracking the AI council's calls; manual-confirm order intents are drafts that require explicit human approval — nothing is submitted automatically."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Open positions" value={open.length} />
        <Stat label="Closed trades" value={closed.length} />
        <Stat
          label="Realized P/L"
          value={formatUsd(realized)}
          tone={realized >= 0 ? "positive" : "danger"}
        />
        <Stat
          label="Pending order intents"
          value={intents.filter((i) => i.status === "draft").length}
          tone="warn"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Paper trades</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-[var(--background-elevated)] text-left text-[10px] uppercase tracking-wide text-[var(--foreground-muted)]">
              <tr>
                <th className="px-3 py-2">Opened</th>
                <th className="px-3 py-2">Market</th>
                <th className="px-3 py-2">Side</th>
                <th className="px-3 py-2">Outcome</th>
                <th className="px-3 py-2 text-right">Size</th>
                <th className="px-3 py-2 text-right">Entry</th>
                <th className="px-3 py-2 text-right">Exit</th>
                <th className="px-3 py-2 text-right">P/L</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {paper.map((t) => (
                <tr key={t.id} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2 text-xs text-[var(--foreground-muted)]">
                    {timeAgo(t.opened_at)}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {t.market_id.slice(0, 16)}…
                  </td>
                  <td className="px-3 py-2">
                    <Badge tone={t.side === "buy" ? "positive" : "danger"}>
                      {t.side}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">{t.outcome}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{t.size}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {t.entry_price.toFixed(3)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {t.exit_price?.toFixed(3) ?? "—"}
                  </td>
                  <td
                    className={`px-3 py-2 text-right tabular-nums ${
                      (t.pnl ?? 0) >= 0
                        ? "text-[var(--positive)]"
                        : "text-[var(--danger)]"
                    }`}
                  >
                    {t.pnl !== null ? formatUsd(t.pnl) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {t.status === "open" ? <ClosePaperTrade id={t.id} /> : (
                      <Badge tone="muted">closed</Badge>
                    )}
                  </td>
                </tr>
              ))}
              {paper.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-3 py-6 text-center text-xs text-[var(--foreground-muted)]"
                  >
                    No paper trades yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order intents (manual confirm)</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-[var(--background-elevated)] text-left text-[10px] uppercase tracking-wide text-[var(--foreground-muted)]">
              <tr>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Market</th>
                <th className="px-3 py-2">Side</th>
                <th className="px-3 py-2">Outcome</th>
                <th className="px-3 py-2 text-right">Size</th>
                <th className="px-3 py-2 text-right">Limit</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {intents.map((i) => (
                <tr key={i.id} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2 text-xs text-[var(--foreground-muted)]">
                    {timeAgo(i.created_at)}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {i.market_id.slice(0, 16)}…
                  </td>
                  <td className="px-3 py-2">
                    <Badge tone={i.side === "buy" ? "positive" : "danger"}>
                      {i.side}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">{i.outcome}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{i.size}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {i.limit_price.toFixed(3)}
                  </td>
                  <td className="px-3 py-2">
                    <Badge
                      tone={
                        i.status === "approved"
                          ? "positive"
                          : i.status === "rejected"
                            ? "danger"
                            : "muted"
                      }
                    >
                      {i.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    {i.status === "draft" ? (
                      <DecideOrderIntent id={i.id} />
                    ) : null}
                  </td>
                </tr>
              ))}
              {intents.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-6 text-center text-xs text-[var(--foreground-muted)]"
                  >
                    No intents drafted.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <div className="text-xs text-[var(--foreground-muted)]">
        v1 never submits real orders to Polymarket. Approved order intents are
        drafts you can copy to the Polymarket UI yourself.
      </div>
    </div>
  );
}
