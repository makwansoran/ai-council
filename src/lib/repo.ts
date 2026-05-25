// Thin data-access layer on top of Supabase. Server-side only.

import { supabaseService } from "@/lib/supabase/server";
import type {
  ClobMarketSnapshotRow,
  CouncilRunRow,
  HormuzEventRow,
  MarketRow,
  MarketSnapshotRow,
  NewsArticleRow,
  NewsSourceRow,
  OrderIntentRow,
  PaperTradeRow,
  PolymarketApiReferenceRow,
  PolymarketApiRunRow,
  ScraperRow,
  ScraperRunRow,
  SignalRow,
  TraderPositionRow,
  TraderRow,
  TraderSnapshotRow,
  TraderTradeRow,
  XAccountRow,
  XPostRow,
} from "@/lib/supabase/types";

// ---------- Markets ----------

export async function upsertMarkets(rows: Partial<MarketRow>[]) {
  if (!rows.length) return;
  const sb = supabaseService();
  const { error } = await sb.from("markets").upsert(
    rows.map((r) => ({ ...r, updated_at: new Date().toISOString() })),
    { onConflict: "id" },
  );
  if (error) throw error;
}

export async function insertMarketSnapshots(
  rows: Omit<MarketSnapshotRow, "id" | "captured_at">[],
) {
  if (!rows.length) return;
  const sb = supabaseService();
  const { error } = await sb.from("market_snapshots").insert(rows);
  if (error) throw error;
}

export async function insertClobMarketSnapshots(
  rows: Omit<ClobMarketSnapshotRow, "id" | "captured_at">[],
) {
  if (!rows.length) return;
  const sb = supabaseService();
  const { error } = await sb.from("clob_market_snapshots").insert(rows);
  if (error) throw error;
}

export async function insertPolymarketApiRun(
  row: Omit<PolymarketApiRunRow, "id" | "started_at"> & {
    started_at?: string;
  },
) {
  const sb = supabaseService();
  const { error } = await sb.from("polymarket_api_runs").insert(row);
  if (error) throw error;
}

export async function listPolymarketApiReferences(): Promise<
  PolymarketApiReferenceRow[]
> {
  const sb = supabaseService();
  const { data, error } = await sb
    .from("polymarket_api_references")
    .select("*")
    .order("api_domain")
    .order("name");
  if (error) throw error;
  return (data || []) as PolymarketApiReferenceRow[];
}

export async function listInScopeMarkets(limit = 200): Promise<MarketRow[]> {
  const sb = supabaseService();
  const { data, error } = await sb
    .from("markets")
    .select("*")
    .in("category", ["politics", "war", "geopolitics"])
    .eq("closed", false)
    .order("volume", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as MarketRow[];
}

export async function getMarket(id: string): Promise<MarketRow | null> {
  const sb = supabaseService();
  const { data, error } = await sb
    .from("markets")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as MarketRow) ?? null;
}

export async function recentSnapshots(
  marketId: string,
  limit = 200,
): Promise<MarketSnapshotRow[]> {
  const sb = supabaseService();
  const { data, error } = await sb
    .from("market_snapshots")
    .select("*")
    .eq("market_id", marketId)
    .order("captured_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as MarketSnapshotRow[];
}

// ---------- Traders ----------

export async function upsertTraders(rows: Partial<TraderRow>[]) {
  if (!rows.length) return;
  const sb = supabaseService();
  const { error } = await sb.from("traders").upsert(rows, {
    onConflict: "proxy_wallet",
  });
  if (error) throw error;
}

export async function insertTraderSnapshots(
  rows: Omit<TraderSnapshotRow, "id" | "captured_at">[],
) {
  if (!rows.length) return;
  const sb = supabaseService();
  const { error } = await sb.from("trader_snapshots").insert(rows);
  if (error) throw error;
}

export async function insertTraderPositions(
  rows: Omit<TraderPositionRow, "id" | "captured_at">[],
) {
  if (!rows.length) return;
  const sb = supabaseService();
  const { error } = await sb.from("trader_positions").insert(rows);
  if (error) throw error;
}

export async function insertTraderTrades(
  rows: Omit<TraderTradeRow, "id">[],
) {
  if (!rows.length) return;
  const sb = supabaseService();
  const { error } = await sb.from("trader_trades").upsert(rows, {
    onConflict: "tx_hash",
    ignoreDuplicates: true,
  });
  if (error) throw error;
}

export async function listTopTraders(
  period: "day" | "week" | "month" | "all" = "week",
  limit = 50,
): Promise<(TraderSnapshotRow & { trader: TraderRow | null })[]> {
  const sb = supabaseService();
  const { data, error } = await sb
    .from("trader_snapshots")
    .select("*, trader:traders!inner(*)")
    .eq("period", period)
    .order("captured_at", { ascending: false })
    .limit(2000);
  if (error) throw error;
  // De-dupe by wallet keeping the most recent snapshot, then order by rank.
  const seen = new Set<string>();
  const out: (TraderSnapshotRow & { trader: TraderRow | null })[] = [];
  for (const row of (data || []) as (TraderSnapshotRow & {
    trader: TraderRow | null;
  })[]) {
    if (seen.has(row.proxy_wallet)) continue;
    seen.add(row.proxy_wallet);
    out.push(row);
  }
  out.sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999));
  return out.slice(0, limit);
}

export async function recentTraderTrades(
  proxyWallet: string,
  limit = 50,
): Promise<TraderTradeRow[]> {
  const sb = supabaseService();
  const { data, error } = await sb
    .from("trader_trades")
    .select("*")
    .eq("proxy_wallet", proxyWallet)
    .order("ts", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as TraderTradeRow[];
}

export interface TopTraderBuyScatterPoint {
  market_id: string;
  outcome: string;
  total_notional: number;
  trade_count: number;
  unique_traders: number;
  avg_price: number;
  latest_ts: string;
}

export async function topTraderBuyScatter(
  days = 7,
  limit = 80,
): Promise<TopTraderBuyScatterPoint[]> {
  const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
  const sb = supabaseService();
  const { data, error } = await sb
    .from("trader_trades")
    .select("market_id,outcome,proxy_wallet,notional,price,ts,side")
    .eq("side", "buy")
    .gte("ts", since)
    .order("ts", { ascending: false })
    .limit(20000);
  if (error) throw error;

  const grouped = new Map<
    string,
    {
      market_id: string;
      outcome: string;
      total_notional: number;
      trade_count: number;
      traders: Set<string>;
      price_sum: number;
      latest_ts: string;
    }
  >();

  for (const row of (data || []) as Array<{
    market_id: string | null;
    outcome: string | null;
    proxy_wallet: string;
    notional: number | null;
    price: number | null;
    ts: string;
  }>) {
    const marketId = row.market_id || "unknown";
    const outcome = row.outcome || "unknown";
    const key = `${marketId}:${outcome}`;
    const current =
      grouped.get(key) ??
      {
        market_id: marketId,
        outcome,
        total_notional: 0,
        trade_count: 0,
        traders: new Set<string>(),
        price_sum: 0,
        latest_ts: row.ts,
      };
    current.total_notional += row.notional ?? 0;
    current.trade_count += 1;
    current.traders.add(row.proxy_wallet);
    current.price_sum += row.price ?? 0;
    if (row.ts > current.latest_ts) current.latest_ts = row.ts;
    grouped.set(key, current);
  }

  return [...grouped.values()]
    .map((g) => ({
      market_id: g.market_id,
      outcome: g.outcome,
      total_notional: g.total_notional,
      trade_count: g.trade_count,
      unique_traders: g.traders.size,
      avg_price: g.trade_count ? g.price_sum / g.trade_count : 0,
      latest_ts: g.latest_ts,
    }))
    .sort((a, b) => b.total_notional - a.total_notional)
    .slice(0, limit);
}

// ---------- Scrapers ----------

export async function listScrapers(): Promise<ScraperRow[]> {
  const sb = supabaseService();
  const { data, error } = await sb
    .from("scrapers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as ScraperRow[];
}

export async function getScraper(id: string): Promise<ScraperRow | null> {
  const sb = supabaseService();
  const { data, error } = await sb
    .from("scrapers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as ScraperRow) ?? null;
}

export async function createScraper(input: Partial<ScraperRow>) {
  const sb = supabaseService();
  const { data, error } = await sb
    .from("scrapers")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data as ScraperRow;
}

export async function updateScraper(id: string, patch: Partial<ScraperRow>) {
  const sb = supabaseService();
  const { data, error } = await sb
    .from("scrapers")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as ScraperRow;
}

export async function deleteScraper(id: string) {
  const sb = supabaseService();
  const { error } = await sb.from("scrapers").delete().eq("id", id);
  if (error) throw error;
}

export async function insertScraperRun(
  row: Omit<ScraperRunRow, "id" | "started_at">,
) {
  const sb = supabaseService();
  const { error } = await sb.from("scraper_runs").insert({
    ...row,
    started_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function recentScraperRuns(
  scraperId: string,
  limit = 25,
): Promise<ScraperRunRow[]> {
  const sb = supabaseService();
  const { data, error } = await sb
    .from("scraper_runs")
    .select("*")
    .eq("scraper_id", scraperId)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as ScraperRunRow[];
}

// ---------- X / News / Hormuz ----------

export async function listXAccounts(): Promise<XAccountRow[]> {
  const sb = supabaseService();
  const { data, error } = await sb
    .from("x_accounts")
    .select("*")
    .order("importance", { ascending: false });
  if (error) throw error;
  return (data || []) as XAccountRow[];
}

export async function upsertXAccount(row: Partial<XAccountRow>) {
  const sb = supabaseService();
  const { error } = await sb.from("x_accounts").upsert(row, {
    onConflict: "handle",
  });
  if (error) throw error;
}

export async function deleteXAccount(handle: string) {
  const sb = supabaseService();
  const { error } = await sb.from("x_accounts").delete().eq("handle", handle);
  if (error) throw error;
}

export async function upsertXPosts(rows: Partial<XPostRow>[]) {
  if (!rows.length) return;
  const sb = supabaseService();
  const { error } = await sb.from("x_posts").upsert(rows, {
    onConflict: "id",
    ignoreDuplicates: true,
  });
  if (error) throw error;
}

export async function recentXPosts(limit = 100): Promise<XPostRow[]> {
  const sb = supabaseService();
  const { data, error } = await sb
    .from("x_posts")
    .select("*")
    .order("posted_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as XPostRow[];
}

export async function listNewsSources(): Promise<NewsSourceRow[]> {
  const sb = supabaseService();
  const { data, error } = await sb
    .from("news_sources")
    .select("*")
    .order("name");
  if (error) throw error;
  return (data || []) as NewsSourceRow[];
}

export async function upsertNewsSource(row: Partial<NewsSourceRow>) {
  const sb = supabaseService();
  const { error } = await sb.from("news_sources").upsert(row, {
    onConflict: "id",
  });
  if (error) throw error;
}

export async function deleteNewsSource(id: string) {
  const sb = supabaseService();
  const { error } = await sb.from("news_sources").delete().eq("id", id);
  if (error) throw error;
}

export async function upsertNewsArticles(rows: Partial<NewsArticleRow>[]) {
  if (!rows.length) return;
  const sb = supabaseService();
  const { error } = await sb.from("news_articles").upsert(rows, {
    onConflict: "id",
    ignoreDuplicates: true,
  });
  if (error) throw error;
}

export async function recentNewsArticles(limit = 100): Promise<NewsArticleRow[]> {
  const sb = supabaseService();
  const { data, error } = await sb
    .from("news_articles")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as NewsArticleRow[];
}

export async function insertHormuzEvents(
  rows: Omit<HormuzEventRow, "id" | "ts">[],
) {
  if (!rows.length) return;
  const sb = supabaseService();
  const { error } = await sb.from("hormuz_events").insert(rows);
  if (error) throw error;
}

export async function recentHormuzEvents(limit = 100): Promise<HormuzEventRow[]> {
  const sb = supabaseService();
  const { data, error } = await sb
    .from("hormuz_events")
    .select("*")
    .order("ts", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as HormuzEventRow[];
}

// ---------- Signals ----------

export type SignalInsert = Omit<SignalRow, "id" | "ts"> & { ts?: string };

export async function insertSignals(rows: SignalInsert[]) {
  if (!rows.length) return;
  const sb = supabaseService();
  const { error } = await sb.from("signals").insert(rows);
  if (error) throw error;
}

export async function recentSignals(limit = 200): Promise<SignalRow[]> {
  const sb = supabaseService();
  const { data, error } = await sb
    .from("signals")
    .select("*")
    .order("ts", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as SignalRow[];
}

export async function recentSignalsForMarket(
  marketId: string,
  limit = 50,
): Promise<SignalRow[]> {
  const sb = supabaseService();
  const { data, error } = await sb
    .from("signals")
    .select("*")
    .or(`market_id.eq.${marketId},is_hormuz.eq.true`)
    .order("ts", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as SignalRow[];
}

// ---------- Council / trades ----------

export async function insertCouncilRun(
  row: Omit<CouncilRunRow, "id" | "created_at">,
) {
  const sb = supabaseService();
  const { data, error } = await sb
    .from("council_runs")
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  return data as CouncilRunRow;
}

export async function recentCouncilRuns(limit = 50): Promise<CouncilRunRow[]> {
  const sb = supabaseService();
  const { data, error } = await sb
    .from("council_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as CouncilRunRow[];
}

export async function getCouncilRun(id: number): Promise<CouncilRunRow | null> {
  const sb = supabaseService();
  const { data, error } = await sb
    .from("council_runs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as CouncilRunRow) ?? null;
}

export async function listPaperTrades(limit = 100): Promise<PaperTradeRow[]> {
  const sb = supabaseService();
  const { data, error } = await sb
    .from("paper_trades")
    .select("*")
    .order("opened_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as PaperTradeRow[];
}

export async function insertPaperTrade(
  row: Omit<PaperTradeRow, "id" | "opened_at">,
) {
  const sb = supabaseService();
  const { data, error } = await sb
    .from("paper_trades")
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  return data as PaperTradeRow;
}

export async function updatePaperTrade(id: number, patch: Partial<PaperTradeRow>) {
  const sb = supabaseService();
  const { data, error } = await sb
    .from("paper_trades")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as PaperTradeRow;
}

export async function listOrderIntents(limit = 100): Promise<OrderIntentRow[]> {
  const sb = supabaseService();
  const { data, error } = await sb
    .from("order_intents")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as OrderIntentRow[];
}

export async function insertOrderIntent(
  row: Omit<OrderIntentRow, "id" | "created_at" | "decided_at" | "status"> & {
    status?: OrderIntentRow["status"];
  },
) {
  const sb = supabaseService();
  const { data, error } = await sb
    .from("order_intents")
    .insert({ status: "draft", ...row })
    .select("*")
    .single();
  if (error) throw error;
  return data as OrderIntentRow;
}

export async function updateOrderIntent(
  id: number,
  patch: Partial<OrderIntentRow>,
) {
  const sb = supabaseService();
  const { data, error } = await sb
    .from("order_intents")
    .update({ ...patch, decided_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as OrderIntentRow;
}
