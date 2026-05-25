import { NextResponse } from "next/server";
import { z } from "zod";
import { listNewsSources, upsertNewsSource } from "@/lib/repo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const sourceSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  rss_url: z.string().url(),
  homepage: z.string().url().optional().nullable(),
  enabled: z.boolean().default(true),
  keywords: z
    .union([z.array(z.string()), z.string()])
    .default([])
    .transform((v) =>
      Array.isArray(v)
        ? v
        : v
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
    ),
});

export async function GET() {
  const data = await listNewsSources();
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const parsed = sourceSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const row = {
    ...parsed.data,
    id: parsed.data.id?.trim() || slugify(parsed.data.name),
    homepage: parsed.data.homepage || null,
  };
  await upsertNewsSource(row);
  return NextResponse.json({ ok: true, data: row });
}
