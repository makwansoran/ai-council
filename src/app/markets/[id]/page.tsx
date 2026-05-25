import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { AutoRefresh } from "@/components/auto-refresh";
import { RunCouncilButton } from "@/components/run-council-button";
import {
  getMarket,
  recentSignalsForMarket,
  recentSnapshots,
} from "@/lib/repo";
import { formatPct, formatUsd, timeAgo } from "@/lib/utils";
import { supabaseService } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MarketDetailPage({ params }: Props) {
  const { id } = await params;
  const market = await getMarket(id).catch(() => null);
  if (!market) return notFound();

  const [snapshots, signals, councilRuns] = await Promise.all([
    recentSnapshots(market.id, 60),
    recentSignalsForMarket(market.id, 30),
    (async () => {
      const sb = supabaseService();
      const { data } = await sb
        .from("council_runs")
        .select("*")
        .eq("market_id", market.id)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    })(),
  ]);

  const latest = snapshots[0];
  const yes = latest?.yes_price ?? null;

  return (
    <div className="space-y-4">
      <AutoRefresh intervalSeconds={20} />
      <PageHeader
        title={market.question}
        description={
          <span className="flex flex-wrap gap-2">
            <Badge tone={market.category === "war" ? "warn" : "accent"}>
              {market.category}
            </Badge>
            {market.is_hormuz ? <Badge tone="danger">hormuz</Badge> : null}
            {market.url ? (
              <a
                href={market.url}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent-strong)] hover:underline"
              >
                Open on Polymarket ↗
              </a>
            ) : null}
          </span>
        }
        actions={<RunCouncilButton marketId={market.id} />}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="YES price" value={formatPct(yes)} tone="accent" />
        <Stat label="Volume" value={formatUsd(market.volume)} />
        <Stat label="Liquidity" value={formatUsd(market.liquidity)} />
        <Stat
          label="Closes"
          value={
            market.end_date
              ? new Date(market.end_date).toLocaleDateString()
              : "—"
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent snapshots</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            <div className="scrollbar-thin max-h-[360px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[var(--background-panel)] text-left text-[10px] uppercase tracking-wide text-[var(--foreground-muted)]">
                  <tr>
                    <th className="px-3 py-2">Captured</th>
                    <th className="px-3 py-2 text-right">YES</th>
                    <th className="px-3 py-2 text-right">NO</th>
                    <th className="px-3 py-2 text-right">Vol 24h</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map((s) => (
                    <tr key={s.id} className="border-t border-[var(--border)]">
                      <td className="px-3 py-2 text-xs text-[var(--foreground-muted)]">
                        {timeAgo(s.captured_at)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatPct(s.yes_price)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatPct(s.no_price)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatUsd(s.volume_24h)}
                      </td>
                    </tr>
                  ))}
                  {snapshots.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-6 text-center text-xs text-[var(--foreground-muted)]"
                      >
                        No snapshots yet.
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
            <CardTitle>Recent signals</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {signals.length === 0 ? (
              <div className="text-xs text-[var(--foreground-muted)]">
                No signals attached yet.
              </div>
            ) : (
              signals.map((s) => (
                <a
                  key={s.id}
                  href={s.url ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-md border border-[var(--border)] bg-[var(--background-elevated)] px-3 py-2 text-sm hover:border-[var(--border-strong)]"
                >
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-[var(--foreground-muted)]">
                    <span>
                      {s.kind.replace("_", " ")}
                      {s.is_hormuz ? " · hormuz" : ""}
                    </span>
                    <span>{timeAgo(s.ts)}</span>
                  </div>
                  <div className="mt-1">{s.title}</div>
                  {s.body ? (
                    <div className="mt-0.5 line-clamp-2 text-xs text-[var(--foreground-muted)]">
                      {s.body}
                    </div>
                  ) : null}
                </a>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI Council history</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          {councilRuns.length === 0 ? (
            <div className="text-xs text-[var(--foreground-muted)]">
              No council runs yet. Trigger one above.
            </div>
          ) : (
            councilRuns.map((r) => (
              <div
                key={r.id}
                className="rounded-md border border-[var(--border)] bg-[var(--background-elevated)] p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-[var(--foreground-muted)]">
                    {timeAgo(r.created_at)} · {r.model}
                  </span>
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
                <div className="mt-2 text-sm">
                  <strong className="text-[var(--accent-strong)]">Thesis.</strong>{" "}
                  {r.thesis}
                </div>
                <div className="mt-1 text-sm">
                  <strong className="text-[var(--warn)]">Counter.</strong>{" "}
                  {r.counter_thesis}
                </div>
                {Array.isArray(r.risks) && r.risks.length ? (
                  <div className="mt-1 text-xs text-[var(--foreground-muted)]">
                    <strong>Risks:</strong> {r.risks.join(" · ")}
                  </div>
                ) : null}
                {r.trader_notes ? (
                  <div className="mt-1 text-xs text-[var(--foreground-muted)]">
                    <strong>Traders:</strong> {r.trader_notes}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}
