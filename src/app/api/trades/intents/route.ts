import { NextResponse } from "next/server";
import { z } from "zod";
import {
  insertOrderIntent,
  listOrderIntents,
  updateOrderIntent,
} from "@/lib/repo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const createSchema = z.object({
  market_id: z.string().min(1),
  outcome: z.string().min(1),
  side: z.enum(["buy", "sell"]),
  size: z.number().positive(),
  limit_price: z.number().min(0).max(1),
  council_run_id: z.number().int().nullable().optional(),
  notes: z.string().optional().nullable(),
});

const decideSchema = z.object({
  id: z.number().int(),
  decision: z.enum(["approved", "rejected"]),
  notes: z.string().optional().nullable(),
});

export async function GET() {
  const data = await listOrderIntents(200);
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  const row = await insertOrderIntent({
    ...parsed.data,
    council_run_id: parsed.data.council_run_id ?? null,
    notes: parsed.data.notes ?? null,
  });
  return NextResponse.json({ data: row });
}

export async function PATCH(req: Request) {
  const parsed = decideSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  const row = await updateOrderIntent(parsed.data.id, {
    status: parsed.data.decision,
    notes: parsed.data.notes ?? null,
  });
  // v1 never submits; "approved" only marks human approval for off-platform execution.
  return NextResponse.json({ data: row });
}
