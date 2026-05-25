import { NextResponse } from "next/server";
import { z } from "zod";
import {
  insertPaperTrade,
  listPaperTrades,
  updatePaperTrade,
} from "@/lib/repo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const createSchema = z.object({
  market_id: z.string().min(1),
  outcome: z.string().min(1),
  side: z.enum(["buy", "sell"]),
  size: z.number().positive(),
  entry_price: z.number().min(0).max(1),
  council_run_id: z.number().int().nullable().optional(),
  notes: z.string().optional().nullable(),
});

const closeSchema = z.object({
  id: z.number().int(),
  exit_price: z.number().min(0).max(1),
});

export async function GET() {
  const data = await listPaperTrades(200);
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  const row = await insertPaperTrade({
    ...parsed.data,
    council_run_id: parsed.data.council_run_id ?? null,
    notes: parsed.data.notes ?? null,
    exit_price: null,
    status: "open",
    closed_at: null,
    pnl: null,
  });
  return NextResponse.json({ data: row });
}

export async function PATCH(req: Request) {
  const parsed = closeSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  // Pull the trade first to compute PnL.
  const trades = await listPaperTrades(500);
  const trade = trades.find((t) => t.id === parsed.data.id);
  if (!trade)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const direction = trade.side === "buy" ? 1 : -1;
  const pnl =
    direction * (parsed.data.exit_price - trade.entry_price) * trade.size;
  const row = await updatePaperTrade(parsed.data.id, {
    exit_price: parsed.data.exit_price,
    closed_at: new Date().toISOString(),
    status: "closed",
    pnl,
  });
  return NextResponse.json({ data: row });
}
