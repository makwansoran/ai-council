import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AutoRefresh } from "@/components/auto-refresh";
import { TriggerIngest } from "@/components/trigger-ingest";
import { ScraperActions } from "@/components/scraper-actions";
import { getScraper, recentScraperRuns } from "@/lib/repo";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ScraperDetailPage({ params }: Props) {
  const { id } = await params;
  const scraper = await getScraper(id);
  if (!scraper) return notFound();
  const runs = await recentScraperRuns(id, 50);

  return (
    <div className="space-y-4">
      <AutoRefresh intervalSeconds={20} />
      <PageHeader
        title={scraper.name}
        description={
          <span className="text-xs text-[var(--foreground-muted)]">
            {scraper.kind} · {scraper.source}
          </span>
        }
        actions={
          <>
            <ScraperActions scraper={scraper} />
            <TriggerIngest endpoint={`/api/scrapers/${scraper.id}/run`} label="Run now" variant="primary" />
          </>
        }
      />

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--background-panel)] p-3 text-xs">
          <div className="text-[10px] uppercase tracking-wide text-[var(--foreground-muted)]">
            Cadence
          </div>
          <div className="mt-1 text-sm">{Math.round(scraper.cadence_seconds / 60)} min</div>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--background-panel)] p-3 text-xs">
          <div className="text-[10px] uppercase tracking-wide text-[var(--foreground-muted)]">
            Status
          </div>
          <div className="mt-1 text-sm">
            {scraper.enabled ? (
              <Badge tone={scraper.last_status === "error" ? "danger" : "positive"}>
                {scraper.last_status === "error" ? "error" : "ok"}
              </Badge>
            ) : (
              <Badge tone="muted">paused</Badge>
            )}
          </div>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--background-panel)] p-3 text-xs">
          <div className="text-[10px] uppercase tracking-wide text-[var(--foreground-muted)]">
            Category
          </div>
          <div className="mt-1 text-sm">
            <Badge tone={scraper.category === "war" ? "warn" : "accent"}>
              {scraper.category}
            </Badge>
            {scraper.is_hormuz ? (
              <Badge tone="danger" className="ml-1">
                hormuz
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      {scraper.instructions ? (
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardBody>
            <pre className="whitespace-pre-wrap text-xs text-[var(--foreground-muted)]">
              {scraper.instructions}
            </pre>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Recent runs ({runs.length})</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-[var(--background-elevated)] text-left text-[10px] uppercase tracking-wide text-[var(--foreground-muted)]">
              <tr>
                <th className="px-3 py-2">Started</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Items</th>
                <th className="px-3 py-2">Error</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2 text-xs text-[var(--foreground-muted)]">
                    {timeAgo(r.started_at)}
                  </td>
                  <td className="px-3 py-2">
                    <Badge tone={r.status === "error" ? "danger" : "positive"}>
                      {r.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.items_count}
                  </td>
                  <td className="px-3 py-2 text-xs text-[var(--danger)]">
                    {r.error ?? ""}
                  </td>
                </tr>
              ))}
              {runs.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-6 text-center text-xs text-[var(--foreground-muted)]"
                  >
                    No runs yet.
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
