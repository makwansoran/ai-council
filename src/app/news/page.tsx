import { PageHeader } from "@/components/page-header";
import { AutoRefresh } from "@/components/auto-refresh";
import { TriggerIngest } from "@/components/trigger-ingest";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import {
  NewNewsSourceForm,
  NewsSourceActions,
} from "@/components/news-source-manager";
import { listNewsSources, recentNewsArticles } from "@/lib/repo";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function NewsSourcesPage() {
  const [sources, articles] = await Promise.all([
    listNewsSources().catch(() => []),
    recentNewsArticles(80).catch(() => []),
  ]);

  return (
    <div className="space-y-4">
      <AutoRefresh intervalSeconds={30} />
      <PageHeader
        title="News sources"
        description="Add, pause, or remove RSS/news feeds. These are scanned for politics, war, geopolitics, and Strait of Hormuz signals."
        actions={<TriggerIngest endpoint="/api/ingest/news" label="Pull news" variant="primary" />}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,380px)]">
        <Card>
          <CardHeader>
            <CardTitle>Tracked sources ({sources.length})</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {sources.map((source) => (
              <div
                key={source.id}
                className="rounded-md border border-[var(--border)] bg-[var(--background-elevated)] p-3 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{source.name}</div>
                    <a
                      href={source.rss_url}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all font-mono text-[10px] text-[var(--foreground-muted)] hover:text-[var(--accent-strong)]"
                    >
                      {source.rss_url}
                    </a>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge tone={source.enabled ? "positive" : "muted"}>
                      {source.enabled ? "on" : "paused"}
                    </Badge>
                    <Badge tone="outline">{source.keywords.length} keywords</Badge>
                  </div>
                </div>
                {source.keywords.length ? (
                  <div className="mt-2 line-clamp-2 text-xs text-[var(--foreground-muted)]">
                    {source.keywords.join(", ")}
                  </div>
                ) : null}
                <div className="mt-2">
                  <NewsSourceActions source={source} />
                </div>
              </div>
            ))}
            {sources.length === 0 ? (
              <div className="text-xs text-[var(--foreground-muted)]">
                No news feeds yet. Add one on the right.
              </div>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add news feed</CardTitle>
          </CardHeader>
          <CardBody>
            <NewNewsSourceForm />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Latest collected articles</CardTitle>
        </CardHeader>
        <CardBody className="space-y-2">
          {articles.map((article) => (
            <a
              key={article.id}
              href={article.link}
              target="_blank"
              rel="noreferrer"
              className="block rounded-md border border-[var(--border)] bg-[var(--background-elevated)] p-3 text-sm hover:border-[var(--border-strong)]"
            >
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-[var(--foreground-muted)]">
                <span>
                  {article.source_id}
                  {article.is_hormuz ? " · hormuz" : ""}
                </span>
                <span>{timeAgo(article.published_at)}</span>
              </div>
              <div className="mt-1 font-medium">{article.title}</div>
              {article.summary ? (
                <div className="mt-1 line-clamp-2 text-xs text-[var(--foreground-muted)]">
                  {article.summary}
                </div>
              ) : null}
            </a>
          ))}
          {articles.length === 0 ? (
            <div className="text-xs text-[var(--foreground-muted)]">
              No articles collected yet.
            </div>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
