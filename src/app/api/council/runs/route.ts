import { NextResponse } from "next/server";
import { z } from "zod";
import { runCouncilForMarket } from "@/lib/ai/council";
import { recentCouncilRuns } from "@/lib/repo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET() {
  const data = await recentCouncilRuns(100);
  return NextResponse.json({ data });
}

const postSchema = z.object({ market_id: z.string().min(1) });

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  try {
    const run = await runCouncilForMarket(parsed.data.market_id);
    return NextResponse.json({ data: run });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
