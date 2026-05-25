import { insertHormuzEvents, insertSignals } from "@/lib/repo";
import { supabaseService } from "@/lib/supabase/server";
import type { NewsArticleRow, XPostRow } from "@/lib/supabase/types";

const HIGH_SEVERITY_KEYWORDS = [
  "strike",
  "attack",
  "missile",
  "drone",
  "explosion",
  "seized",
  "boarded",
  "shut down",
  "shutdown",
  "naval clash",
  "tanker hit",
  "tanker struck",
  "tanker on fire",
  "evacuated",
  "war",
  "closed",
];

const MED_SEVERITY_KEYWORDS = [
  "warned",
  "warns",
  "threat",
  "threaten",
  "incident",
  "intercepted",
  "blockade",
  "harass",
  "tension",
  "deployed",
  "exercise",
];

function severityFor(text: string): "low" | "med" | "high" | "critical" {
  const t = text.toLowerCase();
  if (HIGH_SEVERITY_KEYWORDS.some((k) => t.includes(k))) {
    if (t.includes("war") || t.includes("closed") || t.includes("shut down")) {
      return "critical";
    }
    return "high";
  }
  if (MED_SEVERITY_KEYWORDS.some((k) => t.includes(k))) return "med";
  return "low";
}

export async function refreshHormuzMonitor(): Promise<{
  newEvents: number;
}> {
  const sb = supabaseService();

  // Pull recent hormuz-flagged content from the last 24h that doesn't already
  // have a hormuz_event row pointing at it.
  const sinceIso = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  const { data: posts, error: postsErr } = await sb
    .from("x_posts")
    .select("*")
    .eq("is_hormuz", true)
    .gte("posted_at", sinceIso)
    .order("posted_at", { ascending: false })
    .limit(100);
  if (postsErr) throw postsErr;

  const { data: articles, error: artsErr } = await sb
    .from("news_articles")
    .select("*")
    .eq("is_hormuz", true)
    .gte("published_at", sinceIso)
    .order("published_at", { ascending: false })
    .limit(100);
  if (artsErr) throw artsErr;

  const { data: existing, error: exErr } = await sb
    .from("hormuz_events")
    .select("source_kind, source_id")
    .gte("ts", sinceIso);
  if (exErr) throw exErr;

  const known = new Set<string>(
    (existing || []).map(
      (e: { source_kind: string; source_id: string | null }) =>
        `${e.source_kind}:${e.source_id ?? ""}`,
    ),
  );

  const eventsToInsert: Array<Omit<Parameters<typeof insertHormuzEvents>[0][number], "id" | "ts">> = [];
  const signalsToInsert: Parameters<typeof insertSignals>[0] = [];

  for (const p of (posts || []) as XPostRow[]) {
    const key = `x_post:${p.id}`;
    if (known.has(key)) continue;
    const text = p.text;
    const sev = severityFor(text);
    eventsToInsert.push({
      headline: `@${p.handle} on Hormuz`,
      summary: text.slice(0, 280),
      severity: sev,
      source_kind: "x_post",
      source_id: p.id,
      url: p.url,
      metadata: { handle: p.handle },
    });
    signalsToInsert.push({
      kind: "hormuz_event",
      title: `Hormuz · @${p.handle}`,
      body: text.slice(0, 500),
      url: p.url,
      category: "geopolitics",
      is_hormuz: true,
      weight: sev === "critical" ? 5 : sev === "high" ? 4 : sev === "med" ? 3 : 2,
      market_id: null,
      metadata: { severity: sev, source: "x" },
      ts: p.posted_at,
    });
  }

  for (const a of (articles || []) as NewsArticleRow[]) {
    const key = `news_article:${a.id}`;
    if (known.has(key)) continue;
    const text = `${a.title} ${a.summary ?? ""}`;
    const sev = severityFor(text);
    eventsToInsert.push({
      headline: a.title,
      summary: (a.summary || "").slice(0, 280),
      severity: sev,
      source_kind: "news_article",
      source_id: a.id,
      url: a.link,
      metadata: { source_id: a.source_id },
    });
    signalsToInsert.push({
      kind: "hormuz_event",
      title: `Hormuz · ${a.title.slice(0, 80)}`,
      body: (a.summary || "").slice(0, 500),
      url: a.link,
      category: "geopolitics",
      is_hormuz: true,
      weight: sev === "critical" ? 5 : sev === "high" ? 4 : sev === "med" ? 3 : 2,
      market_id: null,
      metadata: { severity: sev, source: "news" },
      ts: a.published_at,
    });
  }

  if (eventsToInsert.length) {
    await insertHormuzEvents(eventsToInsert);
  }
  if (signalsToInsert.length) {
    await insertSignals(signalsToInsert);
  }

  return { newEvents: eventsToInsert.length };
}
