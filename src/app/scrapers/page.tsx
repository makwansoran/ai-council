import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AutoRefresh } from "@/components/auto-refresh";
import { TriggerIngest } from "@/components/trigger-ingest";
import { listScrapers } from "@/lib/repo";
import { timeAgo } from "@/lib/utils";
import { NewScraperForm } from "@/components/new-scraper-form";

export const dynamic = "force-dynamic";

export default async function ScrapersPage() {
  const scrapers = await listScrapers().catch(() => []);

  return (
    <div className="space-y-4">
      <AutoRefresh intervalSeconds={30} />
      <PageHeader
        title="AI Scrapers"
        description="Configurable scrapers for X accounts, RSS feeds, and arbitrary web pages. Persist every run for auditability."
        actions={<TriggerIngest endpoint="/api/ingest/scrapers" label="Run due scrapers" variant="primary" />}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,360px)]">
        <Card>
          <CardHeader>
            <CardTitle>Scrapers ({scrapers.length})</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-[var(--background-elevated)] text-left text-[10px] uppercase tracking-wide text-[var(--foreground-muted)]">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Kind</th>
                  <th className="px-3 py-2">Cadence</th>
                  <th className="px-3 py-2">Last run</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {scrapers.map((s) => (
                  <tr
                    key={s.id}
                    className="border-t border-[var(--border)] hover:bg-[var(--background-elevated)]"
                  >
                    <td className="px-3 py-2">
                      <Link
                        href={`/scrapers/${s.id}`}
                        className="hover:text-[var(--accent-strong)]"
                      >
                        {s.name}
                      </Link>
                      <div className="text-[10px] text-[var(--foreground-muted)]">
                        {s.source.slice(0, 60)}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone="outline">{s.kind}</Badge>
                      {s.is_hormuz ? (
                        <Badge tone="danger" className="ml-1">
                          hormuz
                        </Badge>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-xs text-[var(--foreground-muted)]">
                      {Math.round(s.cadence_seconds / 60)}m
                    </td>
                    <td className="px-3 py-2 text-xs text-[var(--foreground-muted)]">
                      {s.last_run_at ? timeAgo(s.last_run_at) : "never"}
                    </td>
                    <td className="px-3 py-2">
                      {s.enabled ? (
                        <Badge tone={s.last_status === "error" ? "danger" : "positive"}>
                          {s.last_status === "error" ? "error" : "ok"}
                        </Badge>
                      ) : (
                        <Badge tone="muted">paused</Badge>
                      )}
                    </td>
                  </tr>
                ))}
                {scrapers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-8 text-center text-xs text-[var(--foreground-muted)]"
                    >
                      No scrapers yet. Create one on the right.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>New scraper</CardTitle>
          </CardHeader>
          <CardBody>
            <NewScraperForm />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
