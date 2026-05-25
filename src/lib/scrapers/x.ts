import Parser from "rss-parser";
import { classifyText, isHormuz } from "@/lib/classifier";
import { getNitterInstances, getXBearerToken } from "@/lib/env";
import { insertSignals, listXAccounts, upsertXPosts } from "@/lib/repo";
import type { ScraperRow, XAccountRow } from "@/lib/supabase/types";
import type { ScrapeResult } from "@/lib/scrapers/runner";

const rss = new Parser({
  timeout: 15000,
  headers: {
    "user-agent":
      "Mozilla/5.0 (compatible; AIMarketCouncil/1.0; +https://github.com/)",
  },
});

interface XPostInput {
  id: string;
  handle: string;
  text: string;
  posted_at: string;
  url: string;
  metadata: Record<string, unknown>;
}

async function fetchViaApi(handle: string): Promise<XPostInput[]> {
  const token = getXBearerToken();
  if (!token) return [];
  const userRes = await fetch(
    `https://api.x.com/2/users/by/username/${handle}`,
    { headers: { authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  if (!userRes.ok) return [];
  const userJson = (await userRes.json()) as { data?: { id: string; name: string } };
  const userId = userJson.data?.id;
  if (!userId) return [];

  const tweetsRes = await fetch(
    `https://api.x.com/2/users/${userId}/tweets?max_results=20&tweet.fields=created_at,public_metrics,entities`,
    { headers: { authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  if (!tweetsRes.ok) return [];
  const tweetsJson = (await tweetsRes.json()) as {
    data?: Array<{
      id: string;
      text: string;
      created_at: string;
      public_metrics?: Record<string, number>;
    }>;
  };
  return (tweetsJson.data || []).map((t) => ({
    id: t.id,
    handle,
    text: t.text,
    posted_at: t.created_at,
    url: `https://x.com/${handle}/status/${t.id}`,
    metadata: { source: "api", public_metrics: t.public_metrics },
  }));
}

async function fetchViaNitter(handle: string): Promise<XPostInput[]> {
  const instances = getNitterInstances();
  for (const base of instances) {
    try {
      const feed = await rss.parseURL(`${base}/${handle}/rss`);
      const items = feed.items || [];
      const out: XPostInput[] = [];
      for (const it of items) {
        const link = it.link || "";
        const match = link.match(/status\/(\d+)/);
        if (!match) continue;
        out.push({
          id: match[1],
          handle,
          text: (it.contentSnippet || it.title || "").trim(),
          posted_at: (it.isoDate ||
            (it.pubDate
              ? new Date(it.pubDate).toISOString()
              : new Date().toISOString())) as string,
          url: `https://x.com/${handle}/status/${match[1]}`,
          metadata: { source: "nitter", instance: base },
        });
      }
      if (out.length) return out;
    } catch (err) {
      console.warn(`[x/nitter] ${base} ${handle} failed:`, (err as Error).message);
    }
  }
  return [];
}

export async function ingestXAccount(
  account: XAccountRow,
): Promise<{ count: number; hormuz: number }> {
  const fromApi = await fetchViaApi(account.handle);
  const posts: XPostInput[] = fromApi.length
    ? fromApi
    : await fetchViaNitter(account.handle);
  if (!posts.length) return { count: 0, hormuz: 0 };

  const rows = posts.map((p) => {
    const category = classifyText(p.text) || account.category;
    const hormuz = isHormuz(p.text);
    return {
      id: p.id,
      handle: account.handle,
      text: p.text,
      posted_at: p.posted_at,
      url: p.url,
      metadata: p.metadata,
      category,
      is_hormuz: hormuz,
    };
  });

  await upsertXPosts(rows);

  await insertSignals(
    rows.map((r) => ({
      kind: "x_post" as const,
      title: `@${account.handle}${account.display_name ? ` · ${account.display_name}` : ""}`,
      body: r.text.slice(0, 500),
      url: r.url,
      category: r.category,
      is_hormuz: r.is_hormuz,
      weight: r.is_hormuz ? 3 : Math.max(1, Math.min(3, account.importance / 4)),
      market_id: null,
      metadata: { handle: account.handle, importance: account.importance },
      ts: r.posted_at,
    })),
  );

  return { count: rows.length, hormuz: rows.filter((r) => r.is_hormuz).length };
}

export async function ingestAllXAccounts(): Promise<{
  accounts: number;
  posts: number;
  hormuz: number;
  errored: string[];
}> {
  const accounts = (await listXAccounts()).filter((a) => a.enabled);
  let posts = 0;
  let hormuz = 0;
  const errored: string[] = [];
  for (const acc of accounts) {
    try {
      const res = await ingestXAccount(acc);
      posts += res.count;
      hormuz += res.hormuz;
    } catch (err) {
      console.error("[x]", acc.handle, err);
      errored.push(acc.handle);
    }
  }
  return { accounts: accounts.length, posts, hormuz, errored };
}

export async function runXUserIngest(scraper: ScraperRow): Promise<ScrapeResult> {
  // Treat `source` as a single X handle (without @).
  const handle = scraper.source.replace(/^@/, "").trim();
  const synthetic: XAccountRow = {
    handle,
    display_name: scraper.name,
    role: null,
    importance: 5,
    enabled: true,
    category: scraper.category,
    notes: scraper.instructions ?? null,
  };
  const res = await ingestXAccount(synthetic);
  return {
    status: "ok",
    items_count: res.count,
    output: res,
  };
}
