// Wrappers around the public Polymarket APIs.
// Gamma:     market & event metadata
// CLOB:      orderbook / prices
// Data API:  user positions, trades, portfolios

import { classifyText, isHormuz, isInScope } from "@/lib/classifier";
import type { Category } from "@/lib/supabase/types";

export interface GammaMarket {
  id: string;
  slug: string;
  question: string;
  description?: string;
  endDate?: string | null;
  closed?: boolean;
  active?: boolean;
  liquidity?: number | string | null;
  volume?: number | string | null;
  volumeNum?: number | null;
  liquidityNum?: number | null;
  outcomes?: string;
  outcomePrices?: string;
  clobTokenIds?: string;
  tokens?: Array<{ token_id?: string; outcome?: string; price?: number | string }>;
  marketSlug?: string;
  category?: string;
  tags?: Array<{ id?: string; slug?: string; label?: string }> | null;
}

const GAMMA = "https://gamma-api.polymarket.com";
const DATA = "https://data-api.polymarket.com";
const CLOB = "https://clob.polymarket.com";

function asNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

function parseStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string") {
    try {
      const j = JSON.parse(v);
      if (Array.isArray(j)) return j.map(String);
    } catch {
      // ignore
    }
  }
  return [];
}

export interface NormalizedMarket {
  id: string;
  slug: string;
  question: string;
  description: string;
  category: Category;
  is_hormuz: boolean;
  outcomes: string[];
  outcome_prices: number[];
  clob_token_ids: string[];
  closed: boolean;
  end_date: string | null;
  liquidity: number | null;
  volume: number | null;
  url: string;
  tags: string[];
  raw: GammaMarket;
}

export function normalizeMarket(m: GammaMarket): NormalizedMarket {
  const outcomes = parseStringArray(m.outcomes);
  const prices = parseStringArray(m.outcomePrices)
    .map((p) => asNumber(p))
    .filter((p): p is number => p !== null);
  const clobTokenIds =
    parseStringArray(m.clobTokenIds).length > 0
      ? parseStringArray(m.clobTokenIds)
      : (m.tokens || [])
          .map((t) => t.token_id)
          .filter((t): t is string => Boolean(t));
  const slug = m.slug || m.marketSlug || m.id;
  const text = `${m.question || ""} ${m.description || ""} ${(m.tags || [])
    .map((t) => t?.label || t?.slug || "")
    .join(" ")}`;
  const category = classifyText(text);
  const hormuz = isHormuz(text);
  return {
    id: String(m.id),
    slug,
    question: m.question,
    description: m.description || "",
    category,
    is_hormuz: hormuz,
    outcomes,
    outcome_prices: prices,
    clob_token_ids: clobTokenIds,
    closed: Boolean(m.closed),
    end_date: m.endDate || null,
    liquidity: asNumber(m.liquidityNum ?? m.liquidity),
    volume: asNumber(m.volumeNum ?? m.volume),
    url: slug ? `https://polymarket.com/market/${slug}` : "",
    tags: (m.tags || [])
      .map((t) => t?.slug || t?.label || "")
      .filter(Boolean),
    raw: m,
  };
}

interface FetchMarketsOptions {
  limit?: number;
  offset?: number;
  closed?: boolean;
  active?: boolean;
  tagSlug?: string;
  signal?: AbortSignal;
}

export async function fetchGammaMarkets(
  opts: FetchMarketsOptions = {},
): Promise<GammaMarket[]> {
  const params = new URLSearchParams();
  params.set("limit", String(opts.limit ?? 100));
  if (opts.offset) params.set("offset", String(opts.offset));
  if (opts.closed !== undefined) params.set("closed", String(opts.closed));
  if (opts.active !== undefined) params.set("active", String(opts.active));
  if (opts.tagSlug) params.set("tag_slug", opts.tagSlug);

  const res = await fetch(`${GAMMA}/markets?${params.toString()}`, {
    headers: { accept: "application/json" },
    signal: opts.signal,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`gamma markets ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as GammaMarket[];
}

const POLITICS_WAR_TAGS = [
  "politics",
  "elections",
  "us-elections",
  "us-presidential",
  "world-elections",
  "geopolitics",
  "middle-east",
  "russia-ukraine",
  "israel-hamas",
  "iran",
  "war",
  "global-affairs",
  "ukraine",
];

export async function fetchPoliticsAndWarMarkets(opts: { limit?: number } = {}) {
  const seen = new Map<string, NormalizedMarket>();
  const limitPerTag = opts.limit ?? 100;

  for (const tag of POLITICS_WAR_TAGS) {
    try {
      const markets = await fetchGammaMarkets({
        tagSlug: tag,
        limit: limitPerTag,
        closed: false,
        active: true,
      });
      for (const m of markets) {
        const norm = normalizeMarket(m);
        if (isInScope(norm.category)) {
          seen.set(norm.id, norm);
        }
      }
    } catch (err) {
      console.error(`[polymarket] tag ${tag} failed:`, err);
    }
  }

  // Fallback: sweep recent active markets and filter by category text.
  try {
    const markets = await fetchGammaMarkets({
      limit: limitPerTag,
      closed: false,
      active: true,
    });
    for (const m of markets) {
      const norm = normalizeMarket(m);
      if (isInScope(norm.category) && !seen.has(norm.id)) {
        seen.set(norm.id, norm);
      }
    }
  } catch (err) {
    console.error("[polymarket] sweep failed:", err);
  }

  return [...seen.values()];
}

// ---------------- Data API: positions / trades / portfolio ----------------

export interface PolyPosition {
  proxyWallet: string;
  asset?: string;
  conditionId?: string;
  outcome?: string;
  outcomeIndex?: number;
  size?: number;
  avgPrice?: number;
  currentValue?: number;
  cashPnl?: number;
  initialValue?: number;
  title?: string;
  slug?: string;
}

export async function fetchTraderPositions(
  proxyWallet: string,
): Promise<PolyPosition[]> {
  const res = await fetch(
    `${DATA}/positions?user=${proxyWallet}&limit=200&sortBy=CURRENT&sortDirection=DESC`,
    { headers: { accept: "application/json" }, cache: "no-store" },
  );
  if (!res.ok) {
    return [];
  }
  const data = (await res.json()) as PolyPosition[];
  return Array.isArray(data) ? data : [];
}

export interface PolyTrade {
  proxyWallet: string;
  side: "BUY" | "SELL";
  size: number;
  price: number;
  asset?: string;
  conditionId?: string;
  outcome?: string;
  outcomeIndex?: number;
  timestamp: number; // seconds
  transactionHash: string;
  title?: string;
  slug?: string;
}

export async function fetchTraderTrades(
  proxyWallet: string,
  limit = 50,
): Promise<PolyTrade[]> {
  const res = await fetch(
    `${DATA}/trades?user=${proxyWallet}&limit=${limit}&takerOnly=false`,
    { headers: { accept: "application/json" }, cache: "no-store" },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as PolyTrade[];
  return Array.isArray(data) ? data : [];
}

// ---------------- Leaderboard ----------------

export interface LeaderboardEntry {
  proxyWallet: string;
  username: string | null;
  displayName: string | null;
  profileImage: string | null;
  rank: number | null;
  pnl: number | null;
  volume: number | null;
  period: "day" | "week" | "month" | "all";
}

interface RawLeaderboardItem {
  proxyWallet?: string;
  name?: string;
  pseudonym?: string;
  displayUsernamePublic?: boolean;
  amount?: number;
  rank?: number;
  pnl?: number;
  volume?: number;
  profileImage?: string;
  bio?: string;
}

const LEADERBOARD_BASES = [
  "https://lb-api.polymarket.com",
  DATA,
];

async function fetchLeaderboardWindow(
  window: "1d" | "1w" | "1m" | "all",
): Promise<RawLeaderboardItem[]> {
  for (const base of LEADERBOARD_BASES) {
    try {
      const url = `${base}/leaderboard?window=${window}&limit=100`;
      const res = await fetch(url, {
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (Array.isArray(data)) return data as RawLeaderboardItem[];
      if (data && Array.isArray((data as { data?: unknown[] }).data)) {
        return (data as { data: RawLeaderboardItem[] }).data;
      }
    } catch {
      // try next base
    }
  }
  return [];
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const windows: Array<{ key: "1d" | "1w" | "1m" | "all"; period: LeaderboardEntry["period"] }> = [
    { key: "1d", period: "day" },
    { key: "1w", period: "week" },
    { key: "1m", period: "month" },
    { key: "all", period: "all" },
  ];

  const all: LeaderboardEntry[] = [];
  for (const w of windows) {
    const items = await fetchLeaderboardWindow(w.key);
    items.forEach((item, idx) => {
      const proxyWallet = item.proxyWallet?.toLowerCase();
      if (!proxyWallet) return;
      all.push({
        proxyWallet,
        username: item.pseudonym || item.name || null,
        displayName: item.name || item.pseudonym || null,
        profileImage: item.profileImage || null,
        rank: item.rank ?? idx + 1,
        pnl: item.pnl ?? item.amount ?? null,
        volume: item.volume ?? null,
        period: w.period,
      });
    });
  }
  return all;
}

// ---------------- CLOB orderbook ----------------

export interface ClobBook {
  asset_id: string;
  bids: Array<{ price: string; size: string }>;
  asks: Array<{ price: string; size: string }>;
  market?: string;
  min_order_size?: string;
  tick_size?: string;
  last_trade_price?: string;
}

export async function fetchOrderbook(tokenId: string): Promise<ClobBook | null> {
  const res = await fetch(`${CLOB}/book?token_id=${tokenId}`, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as ClobBook;
}

export interface ClobScalar {
  token_id: string;
  value: number | null;
  raw: unknown;
}

async function fetchClobNumber(
  reference: "midpoint" | "spread",
  tokenId: string,
): Promise<ClobScalar> {
  const res = await fetch(`${CLOB}/${reference}?token_id=${tokenId}`, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return { token_id: tokenId, value: null, raw: null };
  const raw = (await res.json()) as Record<string, unknown>;
  const value =
    asNumber(raw[reference]) ??
    asNumber(raw.mid) ??
    asNumber(raw.price) ??
    asNumber(raw.value);
  return { token_id: tokenId, value, raw };
}

export async function fetchMidpoint(tokenId: string): Promise<ClobScalar> {
  return fetchClobNumber("midpoint", tokenId);
}

export async function fetchSpread(tokenId: string): Promise<ClobScalar> {
  return fetchClobNumber("spread", tokenId);
}

export interface LastTradePrice {
  token_id: string;
  price: number | null;
  side: string | null;
  raw: unknown;
}

export async function fetchLastTradePrice(
  tokenId: string,
): Promise<LastTradePrice> {
  const res = await fetch(`${CLOB}/last-trade-price?token_id=${tokenId}`, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    return { token_id: tokenId, price: null, side: null, raw: null };
  }
  const raw = (await res.json()) as Record<string, unknown>;
  return {
    token_id: tokenId,
    price: asNumber(raw.price),
    side: typeof raw.side === "string" ? raw.side : null,
    raw,
  };
}

export function bestBidAsk(book: ClobBook | null) {
  const bid = book?.bids
    ?.map((b) => asNumber(b.price))
    .filter((n): n is number => n !== null)
    .sort((a, b) => b - a)[0];
  const ask = book?.asks
    ?.map((a) => asNumber(a.price))
    .filter((n): n is number => n !== null)
    .sort((a, b) => a - b)[0];
  return { best_bid: bid ?? null, best_ask: ask ?? null };
}
