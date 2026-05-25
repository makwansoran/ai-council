import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AutoRefresh } from "@/components/auto-refresh";
import { TriggerIngest } from "@/components/trigger-ingest";
import { NewXAccountForm, XAccountActions } from "@/components/x-account-manager";
import { listXAccounts, recentXPosts } from "@/lib/repo";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function XPage() {
  const [accounts, posts] = await Promise.all([
    listXAccounts().catch(() => []),
    recentXPosts(200).catch(() => []),
  ]);

  return (
    <div className="space-y-4">
      <AutoRefresh intervalSeconds={20} />
      <PageHeader
        title="X watchlist"
        description="Important political and military accounts being tracked continuously. Tweets are stored to Supabase and routed through the council."
        actions={<TriggerIngest endpoint="/api/ingest/x" label="Pull X" variant="primary" />}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Watched accounts ({accounts.length})</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {accounts.map((a) => (
              <div
                key={a.handle}
                className="rounded-md border border-[var(--border)] bg-[var(--background-elevated)] px-3 py-2 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <a
                      href={`https://x.com/${a.handle}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium hover:text-[var(--accent-strong)]"
                    >
                      @{a.handle}
                    </a>
                    <div className="text-[10px] text-[var(--foreground-muted)]">
                      {a.role ?? "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge tone={a.category === "war" ? "warn" : "accent"}>
                      {a.category}
                    </Badge>
                    <Badge tone={a.enabled ? "positive" : "muted"}>
                      {a.enabled ? "on" : "paused"}
                    </Badge>
                    <Badge tone="muted">w{a.importance}</Badge>
                  </div>
                </div>
                <div className="mt-2">
                  <XAccountActions account={a} />
                </div>
              </div>
            ))}
            {accounts.length === 0 ? (
              <div className="text-xs text-[var(--foreground-muted)]">
                No accounts. Run the seed.sql in Supabase to populate the
                default watchlist.
              </div>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent posts</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {posts.length === 0 ? (
              <div className="text-xs text-[var(--foreground-muted)]">
                No tweets captured yet. Click <strong>Pull X</strong> above.
              </div>
            ) : (
              posts.map((p) => (
                <a
                  key={p.id}
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-md border border-[var(--border)] bg-[var(--background-elevated)] p-3 text-sm hover:border-[var(--border-strong)]"
                >
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-[var(--foreground-muted)]">
                    <span className="flex items-center gap-1">
                      @{p.handle}
                      {p.is_hormuz ? <Badge tone="danger">hormuz</Badge> : null}
                      {p.category ? <Badge tone="muted">{p.category}</Badge> : null}
                    </span>
                    <span>{timeAgo(p.posted_at)}</span>
                  </div>
                  <div className="mt-1 line-clamp-4">{p.text}</div>
                </a>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add X account</CardTitle>
        </CardHeader>
        <CardBody>
          <NewXAccountForm />
        </CardBody>
      </Card>
    </div>
  );
}
