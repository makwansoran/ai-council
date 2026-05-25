import { PageHeader } from "@/components/page-header";
import { AutoRefresh } from "@/components/auto-refresh";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { listPolymarketApiReferences } from "@/lib/repo";
import { supabaseService } from "@/lib/supabase/server";
import type { PolymarketApiRunRow } from "@/lib/supabase/types";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ApiReferencesPage() {
  const refs = await listPolymarketApiReferences().catch(() => []);
  const { data: runs } = await supabaseService()
    .from("polymarket_api_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(100);

  const apiRuns = (runs || []) as PolymarketApiRunRow[];
  const runsByRef = new Map<string, PolymarketApiRunRow>();
  for (const run of apiRuns) {
    if (run.reference_id && !runsByRef.has(run.reference_id)) {
      runsByRef.set(run.reference_id, run);
    }
  }

  return (
    <div className="space-y-4">
      <AutoRefresh intervalSeconds={30} />
      <PageHeader
        title="Polymarket API References"
        description="Tracked public APIs from the official docs. Authenticated trading, bridge, and relayer endpoints are registered as references but disabled for ingestion."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {["gamma", "data", "clob", "websocket"].map((domain) => (
          <Card key={domain}>
            <CardBody>
              <div className="text-[10px] uppercase tracking-wide text-[var(--foreground-muted)]">
                {domain}
              </div>
              <div className="mt-1 text-2xl font-semibold">
                {refs.filter((r) => r.api_domain === domain).length}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reference registry</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-[var(--background-elevated)] text-left text-[10px] uppercase tracking-wide text-[var(--foreground-muted)]">
              <tr>
                <th className="px-3 py-2">API</th>
                <th className="px-3 py-2">Endpoint</th>
                <th className="px-3 py-2">Ingest</th>
                <th className="px-3 py-2">Auth</th>
                <th className="px-3 py-2">Last run</th>
                <th className="px-3 py-2">Docs</th>
              </tr>
            </thead>
            <tbody>
              {refs.map((ref) => {
                const run = runsByRef.get(ref.id);
                return (
                  <tr
                    key={ref.id}
                    className="border-t border-[var(--border)] hover:bg-[var(--background-elevated)]"
                  >
                    <td className="px-3 py-2">
                      <Badge tone="outline">{ref.api_domain}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{ref.name}</div>
                      <div className="font-mono text-[10px] text-[var(--foreground-muted)]">
                        {ref.method ? `${ref.method} ` : ""}
                        {ref.base_url}
                        {ref.path}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={ref.enabled_for_ingest ? "positive" : "muted"}>
                        {ref.enabled_for_ingest ? "on" : "off"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={ref.auth_required ? "warn" : "accent"}>
                        {ref.auth_required ? "auth" : "public"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-xs text-[var(--foreground-muted)]">
                      {run ? (
                        <span>
                          {timeAgo(run.started_at)} · {run.status} ·{" "}
                          {run.rows_written} rows
                        </span>
                      ) : (
                        "never"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <a
                        href={ref.docs_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-[var(--accent-strong)] hover:underline"
                      >
                        open ↗
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
