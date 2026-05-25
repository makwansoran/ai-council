import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteNewsSource, upsertNewsSource } from "@/lib/repo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  rss_url: z.string().url().optional(),
  homepage: z.string().url().optional().nullable(),
  enabled: z.boolean().optional(),
  keywords: z
    .union([z.array(z.string()), z.string()])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      if (Array.isArray(v)) return v;
      return v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }),
});

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  await upsertNewsSource({ id, ...parsed.data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  await deleteNewsSource(id);
  return NextResponse.json({ ok: true });
}
