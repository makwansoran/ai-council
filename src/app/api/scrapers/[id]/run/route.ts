import { NextResponse } from "next/server";
import { getScraper } from "@/lib/repo";
import { runScraper } from "@/lib/scrapers/runner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const scraper = await getScraper(id);
  if (!scraper)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const result = await runScraper(scraper);
  return NextResponse.json({ data: result });
}
