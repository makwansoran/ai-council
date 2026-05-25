-- AI Market Council schema
-- Project: ndgelpjogufewgqtddzd
-- Run this in the Supabase SQL editor.

create extension if not exists pgcrypto;

-- ====== Markets ============================================================
create table if not exists markets (
  id text primary key,
  slug text unique,
  question text not null,
  description text,
  category text not null default 'other'
    check (category in ('politics','war','geopolitics','other')),
  is_hormuz boolean not null default false,
  outcomes jsonb not null default '[]'::jsonb,
  closed boolean not null default false,
  end_date timestamptz,
  liquidity double precision,
  volume double precision,
  url text,
  tags jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists markets_category_idx on markets(category);
create index if not exists markets_closed_idx on markets(closed);
create index if not exists markets_is_hormuz_idx on markets(is_hormuz);

create table if not exists market_snapshots (
  id bigserial primary key,
  market_id text not null references markets(id) on delete cascade,
  captured_at timestamptz not null default now(),
  yes_price double precision,
  no_price double precision,
  best_bid double precision,
  best_ask double precision,
  volume_24h double precision,
  liquidity double precision,
  outcome_prices jsonb
);
create index if not exists market_snapshots_market_ts_idx
  on market_snapshots(market_id, captured_at desc);

-- ====== Traders ============================================================
create table if not exists traders (
  proxy_wallet text primary key,
  username text,
  display_name text,
  profile_image text,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  watched boolean not null default true,
  notes text
);

create table if not exists trader_snapshots (
  id bigserial primary key,
  proxy_wallet text not null references traders(proxy_wallet) on delete cascade,
  captured_at timestamptz not null default now(),
  period text not null check (period in ('day','week','month','all')),
  rank integer,
  pnl double precision,
  volume double precision,
  positions_value double precision
);
create index if not exists trader_snapshots_wallet_ts_idx
  on trader_snapshots(proxy_wallet, captured_at desc);
create index if not exists trader_snapshots_period_rank_idx
  on trader_snapshots(period, rank);

create table if not exists trader_positions (
  id bigserial primary key,
  proxy_wallet text not null references traders(proxy_wallet) on delete cascade,
  captured_at timestamptz not null default now(),
  market_id text,
  outcome text,
  size double precision,
  avg_price double precision,
  current_value double precision,
  unrealized_pnl double precision
);
create index if not exists trader_positions_wallet_ts_idx
  on trader_positions(proxy_wallet, captured_at desc);

create table if not exists trader_trades (
  id bigserial primary key,
  proxy_wallet text not null references traders(proxy_wallet) on delete cascade,
  market_id text,
  side text not null check (side in ('buy','sell')),
  outcome text,
  size double precision not null,
  price double precision not null,
  notional double precision not null,
  ts timestamptz not null,
  tx_hash text unique
);
create index if not exists trader_trades_wallet_ts_idx
  on trader_trades(proxy_wallet, ts desc);

-- ====== Scrapers ===========================================================
create table if not exists scrapers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('web','rss','x_user','custom')),
  source text not null,
  instructions text,
  cadence_seconds integer not null default 900,
  enabled boolean not null default true,
  category text not null default 'politics'
    check (category in ('politics','war','geopolitics','other')),
  is_hormuz boolean not null default false,
  last_run_at timestamptz,
  last_status text check (last_status in ('ok','error')),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists scraper_runs (
  id bigserial primary key,
  scraper_id uuid not null references scrapers(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('ok','error')),
  items_count integer not null default 0,
  error text,
  output jsonb
);
create index if not exists scraper_runs_scraper_ts_idx
  on scraper_runs(scraper_id, started_at desc);

-- ====== X (Twitter) ========================================================
create table if not exists x_accounts (
  handle text primary key,
  display_name text,
  role text,
  importance integer not null default 5,
  enabled boolean not null default true,
  category text not null default 'politics'
    check (category in ('politics','war','geopolitics','other')),
  notes text
);

create table if not exists x_posts (
  id text primary key,
  handle text not null references x_accounts(handle) on delete cascade,
  text text not null,
  posted_at timestamptz not null,
  url text not null,
  metadata jsonb not null default '{}'::jsonb,
  category text check (category in ('politics','war','geopolitics','other')),
  is_hormuz boolean not null default false,
  collected_at timestamptz not null default now()
);
create index if not exists x_posts_handle_ts_idx on x_posts(handle, posted_at desc);
create index if not exists x_posts_ts_idx on x_posts(posted_at desc);
create index if not exists x_posts_hormuz_idx on x_posts(is_hormuz, posted_at desc);

-- ====== News ===============================================================
create table if not exists news_sources (
  id text primary key,
  name text not null,
  rss_url text not null,
  homepage text,
  enabled boolean not null default true,
  keywords jsonb not null default '[]'::jsonb
);

create table if not exists news_articles (
  id text primary key,
  source_id text not null references news_sources(id) on delete cascade,
  title text not null,
  link text not null,
  summary text,
  body text,
  published_at timestamptz not null,
  category text check (category in ('politics','war','geopolitics','other')),
  is_hormuz boolean not null default false,
  collected_at timestamptz not null default now()
);
create index if not exists news_articles_pub_idx on news_articles(published_at desc);
create index if not exists news_articles_source_idx on news_articles(source_id, published_at desc);
create index if not exists news_articles_hormuz_idx on news_articles(is_hormuz, published_at desc);

-- ====== Strait of Hormuz ===================================================
create table if not exists hormuz_events (
  id bigserial primary key,
  ts timestamptz not null default now(),
  headline text not null,
  summary text not null,
  severity text not null default 'low' check (severity in ('low','med','high','critical')),
  source_kind text not null check (source_kind in ('x_post','news_article','manual')),
  source_id text,
  url text,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists hormuz_events_ts_idx on hormuz_events(ts desc);

-- ====== Signals (normalized firehose) ======================================
create table if not exists signals (
  id bigserial primary key,
  ts timestamptz not null default now(),
  kind text not null check (kind in (
    'x_post','news_article','scraper_extract','market_event','trader_action','hormuz_event'
  )),
  title text not null,
  body text,
  url text,
  category text check (category in ('politics','war','geopolitics','other')),
  is_hormuz boolean not null default false,
  weight double precision not null default 1,
  market_id text,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists signals_ts_idx on signals(ts desc);
create index if not exists signals_kind_idx on signals(kind, ts desc);
create index if not exists signals_market_idx on signals(market_id, ts desc);

-- ====== AI Council =========================================================
create table if not exists council_runs (
  id bigserial primary key,
  market_id text not null references markets(id) on delete cascade,
  created_at timestamptz not null default now(),
  model text not null,
  action text not null check (action in ('buy_yes','buy_no','sell_yes','sell_no','hold')),
  confidence double precision not null,
  suggested_size_usd double precision,
  thesis text not null,
  counter_thesis text not null,
  risks jsonb not null default '[]'::jsonb,
  drivers jsonb not null default '[]'::jsonb,
  trader_notes text,
  signal_ids jsonb not null default '[]'::jsonb,
  raw jsonb
);
create index if not exists council_runs_market_ts_idx
  on council_runs(market_id, created_at desc);

-- ====== Paper trades & order intents =======================================
create table if not exists paper_trades (
  id bigserial primary key,
  market_id text not null references markets(id) on delete cascade,
  outcome text not null,
  side text not null check (side in ('buy','sell')),
  size double precision not null,
  entry_price double precision not null,
  exit_price double precision,
  status text not null default 'open' check (status in ('open','closed')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  pnl double precision,
  council_run_id bigint references council_runs(id) on delete set null,
  notes text
);

create table if not exists order_intents (
  id bigserial primary key,
  market_id text not null references markets(id) on delete cascade,
  outcome text not null,
  side text not null check (side in ('buy','sell')),
  size double precision not null,
  limit_price double precision not null,
  council_run_id bigint references council_runs(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','approved','rejected','submitted')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  notes text
);

-- ====== Open up reads to the anon role (for the dashboard) ================
-- All writes go through the service role from server routes.
alter table markets enable row level security;
alter table market_snapshots enable row level security;
alter table traders enable row level security;
alter table trader_snapshots enable row level security;
alter table trader_positions enable row level security;
alter table trader_trades enable row level security;
alter table scrapers enable row level security;
alter table scraper_runs enable row level security;
alter table x_accounts enable row level security;
alter table x_posts enable row level security;
alter table news_sources enable row level security;
alter table news_articles enable row level security;
alter table hormuz_events enable row level security;
alter table signals enable row level security;
alter table council_runs enable row level security;
alter table paper_trades enable row level security;
alter table order_intents enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'anon_read_all_markets') then
    create policy anon_read_all_markets on markets for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'anon_read_all_market_snapshots') then
    create policy anon_read_all_market_snapshots on market_snapshots for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'anon_read_all_traders') then
    create policy anon_read_all_traders on traders for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'anon_read_all_trader_snapshots') then
    create policy anon_read_all_trader_snapshots on trader_snapshots for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'anon_read_all_trader_positions') then
    create policy anon_read_all_trader_positions on trader_positions for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'anon_read_all_trader_trades') then
    create policy anon_read_all_trader_trades on trader_trades for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'anon_read_all_scrapers') then
    create policy anon_read_all_scrapers on scrapers for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'anon_read_all_scraper_runs') then
    create policy anon_read_all_scraper_runs on scraper_runs for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'anon_read_all_x_accounts') then
    create policy anon_read_all_x_accounts on x_accounts for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'anon_read_all_x_posts') then
    create policy anon_read_all_x_posts on x_posts for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'anon_read_all_news_sources') then
    create policy anon_read_all_news_sources on news_sources for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'anon_read_all_news_articles') then
    create policy anon_read_all_news_articles on news_articles for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'anon_read_all_hormuz_events') then
    create policy anon_read_all_hormuz_events on hormuz_events for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'anon_read_all_signals') then
    create policy anon_read_all_signals on signals for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'anon_read_all_council_runs') then
    create policy anon_read_all_council_runs on council_runs for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'anon_read_all_paper_trades') then
    create policy anon_read_all_paper_trades on paper_trades for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'anon_read_all_order_intents') then
    create policy anon_read_all_order_intents on order_intents for select using (true);
  end if;
end $$;
