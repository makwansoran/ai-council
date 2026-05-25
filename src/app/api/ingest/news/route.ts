import { NextResponse } from "next/server";
import { checkCronSecret } from "@/lib/cron";
import { ingestAllNewsSources } from "@/lib/scrapers/news";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const gate = checkCronSecret(req);
  if (!gate.ok) return new Response(gate.body, { status: gate.status });
  try {
    const res = await ingestAllNewsSources();
    return NextResponse.json({ ok: true, result: res });
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
