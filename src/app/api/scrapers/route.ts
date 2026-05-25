import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createScraper,
  listScrapers,
} from "@/lib/repo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().min(1),
  kind: z.enum(["web", "rss", "x_user", "custom"]),
  source: z.string().min(1),
  instructions: z.string().optional().nullable(),
  cadence_seconds: z.number().int().min(60).default(900),
  enabled: z.boolean().default(true),
  category: z.enum(["politics", "war", "geopolitics", "other"]).default("politics"),
  is_hormuz: z.boolean().default(false),
});

export async function GET() {
  const rows = await listScrapers();
  return NextResponse.json({ data: rows });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const row = await createScraper(parsed.data);
  return NextResponse.json({ data: row });
}
