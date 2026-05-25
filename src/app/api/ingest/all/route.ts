import { NextResponse } from "next/server";
import { checkCronSecret } from "@/lib/cron";
import { ingestAllNewsSources } from "@/lib/scrapers/news";
import { ingestAllXAccounts } from "@/lib/scrapers/x";
import { refreshHormuzMonitor } from "@/lib/scrapers/hormuz";
import { listScrapers } from "@/lib/repo";
import { runScraper } from "@/lib/scrapers/runner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

async function safe<T>(label: string, fn: () => Promise<T>) {
  try {
    return { label, ok: true as const, result: await fn() };
  } catch (err) {
    return { label, ok: false as const, error: (err as Error).message };
  }
}

export async function POST(req: Request) {
  const gate = checkCronSecret(req);
  if (!gate.ok) return new Response(gate.body, { status: gate.status });

  const base = new URL(req.url);
  const callMarkets = await safe("markets", async () => {
    const res = await fetch(`${base.origin}/api/ingest/markets`, {
      method: "POST",
      headers: { "x-cron-secret": process.env.CRON_SECRET || "" },
      cache: "no-store",
    });
    return res.json();
  });

  const callLeaderboard = await safe("leaderboard", async () => {
    const res = await fetch(`${base.origin}/api/ingest/leaderboard`, {
      method: "POST",
      headers: { "x-cron-secret": process.env.CRON_SECRET || "" },
      cache: "no-store",
    });
    return res.json();
  });

  const news = await safe("news", () => ingestAllNewsSources());
  const x = await safe("x", () => ingestAllXAccounts());

  const scrapers = await safe("scrapers", async () => {
    const list = await listScrapers();
    const due = list.filter((s) => {
      if (!s.enabled) return false;
      if (!s.last_run_at) return true;
      const last = new Date(s.last_run_at).getTime();
      return Date.now() - last >= s.cadence_seconds * 1000;
    });
    const out: Array<{ name: string; status: string; items: number }> = [];
    for (const s of due) {
      const r = await runScraper(s);
      out.push({ name: s.name, status: r.status, items: r.items_count });
    }
    return { scanned: list.length, ran: out.length, results: out };
  });

  const hormuz = await safe("hormuz", () => refreshHormuzMonitor());

  const council = await safe("council", async () => {
    const res = await fetch(`${base.origin}/api/ingest/council?limit=5&minAgeMinutes=30`, {
      method: "POST",
      headers: { "x-cron-secret": process.env.CRON_SECRET || "" },
      cache: "no-store",
    });
    return res.json();
  });

  return NextResponse.json({
    ok: true,
    steps: [callMarkets, callLeaderboard, news, x, scrapers, hormuz, council],
  });
}

export async function GET(req: Request) {
  return POST(req);
}
