import { NextResponse } from "next/server";
import { z } from "zod";
import { listXAccounts, upsertXAccount } from "@/lib/repo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const accountSchema = z.object({
  handle: z.string().min(1).transform((v) => v.replace(/^@/, "").trim()),
  display_name: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
  importance: z.number().int().min(1).max(10).default(5),
  enabled: z.boolean().default(true),
  category: z.enum(["politics", "war", "geopolitics", "other"]).default("politics"),
  notes: z.string().optional().nullable(),
});

export async function GET() {
  const data = await listXAccounts();
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const parsed = accountSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  await upsertXAccount(parsed.data);
  return NextResponse.json({ ok: true });
}
