import { PageHeader } from "@/components/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AutoRefresh } from "@/components/auto-refresh";
import { TriggerIngest } from "@/components/trigger-ingest";
import { recentSignals } from "@/lib/repo";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SignalsPage() {
  const signals = await recentSignals(300).catch(() => []);
  return (
    <div className="space-y-4">
      <AutoRefresh intervalSeconds={15} />
      <PageHeader
        title="Signal firehose"
        description="Live unified feed of X posts, news articles, scraper extracts, trader actions, and market events."
        actions={<TriggerIngest endpoint="/api/ingest/all" label="Run all ingest" variant="primary" />}
      />
      <Card>
        <CardBody className="space-y-2">
          {signals.length === 0 ? (
            <div className="text-xs text-[var(--foreground-muted)]">
              No signals yet.
            </div>
          ) : (
            signals.map((s) => (
              <a
                key={s.id}
                href={s.url ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="block rounded-md border border-[var(--border)] bg-[var(--background-elevated)] p-3 text-sm hover:border-[var(--border-strong)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-wide text-[var(--foreground-muted)]">
                  <span className="flex flex-wrap items-center gap-1">
                    <Badge tone={s.is_hormuz ? "danger" : "outline"}>
                      {s.kind.replace("_", " ")}
                    </Badge>
                    {s.category ? <Badge tone="muted">{s.category}</Badge> : null}
                    {s.is_hormuz ? <Badge tone="danger">hormuz</Badge> : null}
                    <span className="text-[var(--foreground-muted)]">
                      · weight {s.weight.toFixed(1)}
                    </span>
                  </span>
                  <span>{timeAgo(s.ts)}</span>
                </div>
                <div className="mt-1 font-medium">{s.title}</div>
                {s.body ? (
                  <div className="mt-1 line-clamp-3 text-xs text-[var(--foreground-muted)]">
                    {s.body}
                  </div>
                ) : null}
              </a>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}
