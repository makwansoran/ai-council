import Parser from "rss-parser";
import { classifyText, isHormuz, isInScope } from "@/lib/classifier";
import {
  insertSignals,
  listNewsSources,
  upsertNewsArticles,
} from "@/lib/repo";
import type { NewsSourceRow, ScraperRow } from "@/lib/supabase/types";
import type { ScrapeResult } from "@/lib/scrapers/runner";

const parser = new Parser({
  timeout: 15000,
  headers: {
    "user-agent":
      "Mozilla/5.0 (compatible; AIMarketCouncil/1.0; +https://github.com/)",
  },
});

function articleIdFromUrl(url: string): string {
  return Buffer.from(url).toString("base64url").slice(0, 60);
}

export interface RssFetchResult {
  ok: number;
  hormuz: number;
  errored: string[];
}

export async function ingestAllNewsSources(): Promise<RssFetchResult> {
  const sources = (await listNewsSources()).filter((s) => s.enabled);
  let ok = 0;
  let hormuz = 0;
  const errored: string[] = [];
  for (const src of sources) {
    try {
      const res = await ingestNewsSource(src);
      ok += res.items;
      hormuz += res.hormuz;
    } catch (err) {
      console.error("[news]", src.id, err);
      errored.push(src.id);
    }
  }
  return { ok, hormuz, errored };
}

export async function ingestNewsSource(
  src: NewsSourceRow,
): Promise<{ items: number; hormuz: number }> {
  const feed = await parser.parseURL(src.rss_url);
  const items = feed.items || [];
  const keywords = (src.keywords || []).map((k) => k.toLowerCase());

  const rows = items
    .map((it) => {
      const title = (it.title || "").trim();
      const link = it.link || "";
      if (!title || !link) return null;
      const summary = (it.contentSnippet || it.content || "").slice(0, 800);
      const body = (it.content || it["content:encoded"] || "").slice(0, 4000);
      const text = `${title}\n${summary}\n${body}`.toLowerCase();
      const matchesKeyword =
        keywords.length === 0 || keywords.some((k) => text.includes(k));
      const category = classifyText(`${title} ${summary}`);
      if (!matchesKeyword && !isInScope(category)) return null;
      const hormuz = isHormuz(text);
      return {
        id: articleIdFromUrl(link),
        source_id: src.id,
        title,
        link,
        summary,
        body,
        published_at: (it.isoDate ||
          (it.pubDate
            ? new Date(it.pubDate).toISOString()
            : new Date().toISOString())) as string,
        category,
        is_hormuz: hormuz,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  await upsertNewsArticles(rows);

  if (rows.length) {
    await insertSignals(
      rows.map((r) => ({
        kind: "news_article" as const,
        title: r.title,
        body: r.summary,
        url: r.link,
        category: r.category,
        is_hormuz: r.is_hormuz,
        weight: r.is_hormuz ? 3 : 1,
        market_id: null,
        metadata: { source: src.id, source_name: src.name },
        ts: r.published_at,
      })),
    );
  }

  return {
    items: rows.length,
    hormuz: rows.filter((r) => r.is_hormuz).length,
  };
}

export async function runRssIngest(scraper: ScraperRow): Promise<ScrapeResult> {
  // A user-defined RSS scraper: treat `source` as the feed url.
  const src: NewsSourceRow = {
    id: scraper.id,
    name: scraper.name,
    rss_url: scraper.source,
    homepage: null,
    enabled: true,
    keywords: scraper.instructions
      ? scraper.instructions
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
  };
  const res = await ingestNewsSource(src);
  return {
    status: "ok",
    items_count: res.items,
    output: res,
  };
}
