export type Category = "politics" | "war" | "geopolitics" | "other";

export type ScraperKind = "web" | "rss" | "x_user" | "custom";

export type SignalKind =
  | "x_post"
  | "news_article"
  | "scraper_extract"
  | "market_event"
  | "trader_action"
  | "hormuz_event";

export type CouncilAction = "buy_yes" | "buy_no" | "sell_yes" | "sell_no" | "hold";

export interface MarketRow {
  id: string;
  slug: string;
  question: string;
  description: string | null;
  category: Category;
  is_hormuz: boolean;
  outcomes: string[];
  closed: boolean;
  end_date: string | null;
  liquidity: number | null;
  volume: number | null;
  url: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MarketSnapshotRow {
  id: number;
  market_id: string;
  captured_at: string;
  yes_price: number | null;
  no_price: number | null;
  best_bid: number | null;
  best_ask: number | null;
  volume_24h: number | null;
  liquidity: number | null;
  outcome_prices: Record<string, number> | null;
  clob_token_ids?: string[] | null;
  clob_midpoints?: Record<string, number | null> | null;
  clob_spreads?: Record<string, number | null> | null;
  clob_last_trades?: Record<string, unknown> | null;
}

export interface ClobMarketSnapshotRow {
  id: number;
  market_id: string | null;
  token_id: string;
  outcome: string | null;
  captured_at: string;
  best_bid: number | null;
  best_ask: number | null;
  midpoint: number | null;
  spread: number | null;
  last_trade_price: number | null;
  last_trade_side: string | null;
  orderbook: unknown;
  metadata: Record<string, unknown>;
}

export interface PolymarketApiReferenceRow {
  id: string;
  api_domain: "gamma" | "data" | "clob" | "bridge" | "relayer" | "websocket" | "docs";
  name: string;
  method: string | null;
  base_url: string | null;
  path: string | null;
  docs_url: string;
  auth_required: boolean;
  enabled_for_ingest: boolean;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PolymarketApiRunRow {
  id: number;
  reference_id: string | null;
  started_at: string;
  finished_at: string | null;
  status: "ok" | "error";
  request_url: string | null;
  rows_written: number;
  error: string | null;
  metadata: Record<string, unknown>;
}

export interface TraderRow {
  proxy_wallet: string;
  username: string | null;
  display_name: string | null;
  profile_image: string | null;
  first_seen: string;
  last_seen: string;
  watched: boolean;
  notes: string | null;
}

export interface TraderSnapshotRow {
  id: number;
  proxy_wallet: string;
  captured_at: string;
  period: "day" | "week" | "month" | "all";
  rank: number | null;
  pnl: number | null;
  volume: number | null;
  positions_value: number | null;
}

export interface TraderPositionRow {
  id: number;
  proxy_wallet: string;
  captured_at: string;
  market_id: string;
  outcome: string;
  size: number | null;
  avg_price: number | null;
  current_value: number | null;
  unrealized_pnl: number | null;
}

export interface TraderTradeRow {
  id: number;
  proxy_wallet: string;
  market_id: string;
  side: "buy" | "sell";
  outcome: string;
  size: number;
  price: number;
  notional: number;
  ts: string;
  tx_hash: string | null;
}

export interface ScraperRow {
  id: string;
  name: string;
  kind: ScraperKind;
  source: string;
  instructions: string | null;
  cadence_seconds: number;
  enabled: boolean;
  category: Category;
  is_hormuz: boolean;
  last_run_at: string | null;
  last_status: "ok" | "error" | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScraperRunRow {
  id: number;
  scraper_id: string;
  started_at: string;
  finished_at: string | null;
  status: "ok" | "error";
  items_count: number;
  error: string | null;
  output: unknown;
}

export interface XAccountRow {
  handle: string;
  display_name: string | null;
  role: string | null;
  importance: number;
  enabled: boolean;
  category: Category;
  notes: string | null;
}

export interface XPostRow {
  id: string;
  handle: string;
  text: string;
  posted_at: string;
  url: string;
  metadata: Record<string, unknown>;
  category: Category | null;
  is_hormuz: boolean;
  collected_at: string;
}

export interface NewsSourceRow {
  id: string;
  name: string;
  rss_url: string;
  homepage: string | null;
  enabled: boolean;
  keywords: string[];
}

export interface NewsArticleRow {
  id: string;
  source_id: string;
  title: string;
  link: string;
  summary: string | null;
  body: string | null;
  published_at: string;
  category: Category | null;
  is_hormuz: boolean;
  collected_at: string;
}

export interface HormuzEventRow {
  id: number;
  ts: string;
  headline: string;
  summary: string;
  severity: "low" | "med" | "high" | "critical";
  source_kind: "x_post" | "news_article" | "manual";
  source_id: string | null;
  url: string | null;
  metadata: Record<string, unknown>;
}

export interface SignalRow {
  id: number;
  ts: string;
  kind: SignalKind;
  title: string;
  body: string | null;
  url: string | null;
  category: Category | null;
  is_hormuz: boolean;
  weight: number;
  market_id: string | null;
  metadata: Record<string, unknown>;
}

export interface CouncilRunRow {
  id: number;
  market_id: string;
  created_at: string;
  model: string;
  action: CouncilAction;
  confidence: number;
  suggested_size_usd: number | null;
  thesis: string;
  counter_thesis: string;
  risks: string[];
  drivers: string[];
  trader_notes: string | null;
  signal_ids: number[];
  raw: unknown;
}

export interface PaperTradeRow {
  id: number;
  market_id: string;
  outcome: string;
  side: "buy" | "sell";
  size: number;
  entry_price: number;
  exit_price: number | null;
  status: "open" | "closed";
  opened_at: string;
  closed_at: string | null;
  pnl: number | null;
  council_run_id: number | null;
  notes: string | null;
}

export interface OrderIntentRow {
  id: number;
  market_id: string;
  outcome: string;
  side: "buy" | "sell";
  size: number;
  limit_price: number;
  council_run_id: number | null;
  status: "draft" | "approved" | "rejected" | "submitted";
  created_at: string;
  decided_at: string | null;
  notes: string | null;
}
