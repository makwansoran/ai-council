import { NextResponse } from "next/server";
import { checkCronSecret } from "@/lib/cron";
import { runCouncilForMarket } from "@/lib/ai/council";
import { listInScopeMarkets, recentCouncilRuns } from "@/lib/repo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

async function ingestCouncil(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 5), 12);
  const minAgeMinutes = Number(url.searchParams.get("minAgeMinutes") || 30);

  const [markets, recentRuns] = await Promise.all([
    listInScopeMarkets(80),
    recentCouncilRuns(500),
  ]);
  const cutoff = Date.now() - minAgeMinutes * 60 * 1000;
  const latestByMarket = new Map<string, number>();
  for (const run of recentRuns) {
    const ts = new Date(run.created_at).getTime();
    if (!latestByMarket.has(run.market_id) || ts > latestByMarket.get(run.market_id)!) {
      latestByMarket.set(run.market_id, ts);
    }
  }

  const due = markets
    .filter((m) => (latestByMarket.get(m.id) ?? 0) < cutoff)
    .slice(0, limit);

  const results: Array<{ market_id: string; ok: boolean; action?: string; error?: string }> = [];
  for (const market of due) {
    try {
      const run = await runCouncilForMarket(market.id);
      results.push({ market_id: market.id, ok: true, action: run.action });
    } catch (err) {
      results.push({ market_id: market.id, ok: false, error: (err as Error).message });
    }
  }

  return { skipped: false, scanned: markets.length, due: due.length, ran: results.length, results };
}

export async function POST(req: Request) {
  const gate = checkCronSecret(req);
  if (!gate.ok) return new Response(gate.body, { status: gate.status });
  try {
    const result = await ingestCouncil(req);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  return POST(req);
}
