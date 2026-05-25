import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteXAccount, upsertXAccount } from "@/lib/repo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const patchSchema = z.object({
  display_name: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
  importance: z.number().int().min(1).max(10).optional(),
  enabled: z.boolean().optional(),
  category: z.enum(["politics", "war", "geopolitics", "other"]).optional(),
  notes: z.string().optional().nullable(),
});

interface Ctx {
  params: Promise<{ handle: string }>;
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { handle } = await ctx.params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  await upsertXAccount({ handle, ...parsed.data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { handle } = await ctx.params;
  await deleteXAccount(handle);
  return NextResponse.json({ ok: true });
}
