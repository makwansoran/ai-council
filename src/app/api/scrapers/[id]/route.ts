import { NextResponse } from "next/server";
import { z } from "zod";
import {
  deleteScraper,
  getScraper,
  recentScraperRuns,
  updateScraper,
} from "@/lib/repo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  kind: z.enum(["web", "rss", "x_user", "custom"]).optional(),
  source: z.string().min(1).optional(),
  instructions: z.string().optional().nullable(),
  cadence_seconds: z.number().int().min(60).optional(),
  enabled: z.boolean().optional(),
  category: z.enum(["politics", "war", "geopolitics", "other"]).optional(),
  is_hormuz: z.boolean().optional(),
});

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const scraper = await getScraper(id);
  if (!scraper)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const runs = await recentScraperRuns(id);
  return NextResponse.json({ data: { scraper, runs } });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  const row = await updateScraper(id, parsed.data);
  return NextResponse.json({ data: row });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  await deleteScraper(id);
  return NextResponse.json({ ok: true });
}
