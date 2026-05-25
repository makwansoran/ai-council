import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { AutoRefresh } from "@/components/auto-refresh";
import { TriggerIngest } from "@/components/trigger-ingest";
import { recentHormuzEvents, recentNewsArticles, recentXPosts } from "@/lib/repo";
import { hoursAgoIso, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HormuzPage() {
  const [events, posts, articles] = await Promise.all([
    recentHormuzEvents(200).catch(() => []),
    recentXPosts(200).catch(() => []),
    recentNewsArticles(200).catch(() => []),
  ]);

  const hormuzPosts = posts.filter((p) => p.is_hormuz).slice(0, 30);
  const hormuzArticles = articles.filter((a) => a.is_hormuz).slice(0, 30);

  const cutoff = hoursAgoIso(24);
  const last24h = events.filter((e) => e.ts > cutoff);

  return (
    <div className="space-y-4">
      <AutoRefresh intervalSeconds={15} />
      <PageHeader
        title="Strait of Hormuz · 24/7"
        description="Continuous monitor for incidents, threats, and oil-flow disruption in and around the Strait of Hormuz."
        actions={
          <>
            <TriggerIngest endpoint="/api/ingest/news" label="Pull news" />
            <TriggerIngest endpoint="/api/ingest/x" label="Pull X" />
            <TriggerIngest
              endpoint="/api/ingest/hormuz"
              label="Recompute events"
              variant="primary"
            />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Events 24h"
          value={last24h.length}
          tone={last24h.some((e) => e.severity === "critical") ? "danger" : "warn"}
        />
        <Stat label="Critical" value={last24h.filter((e) => e.severity === "critical").length} tone="danger" />
        <Stat label="High" value={last24h.filter((e) => e.severity === "high").length} tone="warn" />
        <Stat label="Med + Low" value={last24h.filter((e) => e.severity === "med" || e.severity === "low").length} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event timeline</CardTitle>
        </CardHeader>
        <CardBody className="space-y-2">
          {events.length === 0 ? (
            <div className="text-xs text-[var(--foreground-muted)]">
              No events captured yet.
            </div>
          ) : (
            events.map((e) => (
              <a
                key={e.id}
                href={e.url ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="block rounded-md border border-[var(--border)] bg-[var(--background-elevated)] p-3 text-sm hover:border-[var(--border-strong)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-wide text-[var(--foreground-muted)]">
                  <span className="flex items-center gap-1">
                    <Badge
                      tone={
                        e.severity === "critical"
                          ? "danger"
                          : e.severity === "high"
                            ? "warn"
                            : e.severity === "med"
                              ? "accent"
                              : "muted"
                      }
                    >
                      {e.severity}
                    </Badge>
                    <Badge tone="outline">{e.source_kind.replace("_", " ")}</Badge>
                  </span>
                  <span>{timeAgo(e.ts)}</span>
                </div>
                <div className="mt-1 font-medium">{e.headline}</div>
                {e.summary ? (
                  <div className="mt-1 text-xs text-[var(--foreground-muted)]">
                    {e.summary}
                  </div>
                ) : null}
              </a>
            ))
          )}
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Hormuz X posts</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {hormuzPosts.length === 0 ? (
              <div className="text-xs text-[var(--foreground-muted)]">No hormuz X posts captured yet.</div>
            ) : (
              hormuzPosts.map((p) => (
                <a
                  key={p.id}
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-md border border-[var(--border)] bg-[var(--background-elevated)] p-3 text-sm hover:border-[var(--border-strong)]"
                >
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-[var(--foreground-muted)]">
                    <span>@{p.handle}</span>
                    <span>{timeAgo(p.posted_at)}</span>
                  </div>
                  <div className="mt-1 line-clamp-4">{p.text}</div>
                </a>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hormuz news</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {hormuzArticles.length === 0 ? (
              <div className="text-xs text-[var(--foreground-muted)]">No hormuz news yet.</div>
            ) : (
              hormuzArticles.map((a) => (
                <a
                  key={a.id}
                  href={a.link}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-md border border-[var(--border)] bg-[var(--background-elevated)] p-3 text-sm hover:border-[var(--border-strong)]"
                >
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-[var(--foreground-muted)]">
                    <span>{a.source_id}</span>
                    <span>{timeAgo(a.published_at)}</span>
                  </div>
                  <div className="mt-1 font-medium">{a.title}</div>
                  {a.summary ? (
                    <div className="mt-1 line-clamp-3 text-xs text-[var(--foreground-muted)]">
                      {a.summary}
                    </div>
                  ) : null}
                </a>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
