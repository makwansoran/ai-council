import { NextResponse } from "next/server";
import { checkCronSecret } from "@/lib/cron";
import { listScrapers } from "@/lib/repo";
import { runScraper } from "@/lib/scrapers/runner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const gate = checkCronSecret(req);
  if (!gate.ok) return new Response(gate.body, { status: gate.status });

  const all = await listScrapers();
  const due = all.filter((s) => {
    if (!s.enabled) return false;
    if (!s.last_run_at) return true;
    const last = new Date(s.last_run_at).getTime();
    return Date.now() - last >= s.cadence_seconds * 1000;
  });

  const results: Array<{ id: string; name: string; status: string; items: number; error: string | null }> = [];
  for (const s of due) {
    const r = await runScraper(s);
    results.push({
      id: s.id,
      name: s.name,
      status: r.status,
      items: r.items_count,
      error: r.error ?? null,
    });
  }

  return NextResponse.json({ ok: true, scanned: all.length, ran: results.length, results });
}

export async function GET(req: Request) {
  return POST(req);
}
