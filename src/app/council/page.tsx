import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AutoRefresh } from "@/components/auto-refresh";
import { recentCouncilRuns, listInScopeMarkets } from "@/lib/repo";
import { formatPct, formatUsd, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CouncilPage() {
  const [runs, markets] = await Promise.all([
    recentCouncilRuns(100).catch(() => []),
    listInScopeMarkets(40).catch(() => []),
  ]);
  const marketsById = new Map(markets.map((m) => [m.id, m]));

  return (
    <div className="space-y-4">
      <AutoRefresh intervalSeconds={45} />
      <PageHeader
        title="AI Council"
        description="A panel that combines markets, leaderboard behavior, X posts, news, and Hormuz events into structured trade recommendations."
      />

      <Card>
        <CardHeader>
          <CardTitle>Recent runs ({runs.length})</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          {runs.length === 0 ? (
            <div className="text-xs text-[var(--foreground-muted)]">
              No runs yet. Open a market and trigger the council.
            </div>
          ) : (
            runs.map((r) => {
              const m = marketsById.get(r.market_id);
              return (
                <div
                  key={r.id}
                  className="rounded-md border border-[var(--border)] bg-[var(--background-elevated)] p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/markets/${r.market_id}`}
                        className="line-clamp-1 text-sm font-medium hover:text-[var(--accent-strong)]"
                      >
                        {m?.question ?? r.market_id}
                      </Link>
                      <div className="text-[10px] text-[var(--foreground-muted)]">
                        {timeAgo(r.created_at)} · {r.model}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
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
                      {r.suggested_size_usd ? (
                        <span className="text-xs tabular-nums text-[var(--foreground-muted)]">
                          {formatUsd(r.suggested_size_usd)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-2 text-sm">
                    <strong className="text-[var(--accent-strong)]">
                      Thesis.
                    </strong>{" "}
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
              );
            })
          )}
        </CardBody>
      </Card>
    </div>
  );
}
