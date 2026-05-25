-- Polymarket API reference + CLOB capture additions.

create table if not exists polymarket_api_references (
  id text primary key,
  api_domain text not null check (api_domain in ('gamma','data','clob','bridge','relayer','websocket','docs')),
  name text not null,
  method text,
  base_url text,
  path text,
  docs_url text not null,
  auth_required boolean not null default false,
  enabled_for_ingest boolean not null default false,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists polymarket_api_runs (
  id bigserial primary key,
  reference_id text references polymarket_api_references(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('ok','error')),
  request_url text,
  rows_written integer not null default 0,
  error text,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists polymarket_api_runs_reference_ts_idx
  on polymarket_api_runs(reference_id, started_at desc);

create table if not exists clob_market_snapshots (
  id bigserial primary key,
  market_id text references markets(id) on delete cascade,
  token_id text not null,
  outcome text,
  captured_at timestamptz not null default now(),
  best_bid double precision,
  best_ask double precision,
  midpoint double precision,
  spread double precision,
  last_trade_price double precision,
  last_trade_side text,
  orderbook jsonb,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists clob_market_snapshots_market_ts_idx
  on clob_market_snapshots(market_id, captured_at desc);
create index if not exists clob_market_snapshots_token_ts_idx
  on clob_market_snapshots(token_id, captured_at desc);

alter table market_snapshots
  add column if not exists clob_token_ids jsonb,
  add column if not exists clob_midpoints jsonb,
  add column if not exists clob_spreads jsonb,
  add column if not exists clob_last_trades jsonb;

insert into polymarket_api_references
  (id, api_domain, name, method, base_url, path, docs_url, auth_required, enabled_for_ingest, notes, metadata)
values
  ('gamma-list-markets', 'gamma', 'List markets', 'GET', 'https://gamma-api.polymarket.com', '/markets', 'https://docs.polymarket.com/api-reference/markets/list-markets.md', false, true, 'Primary market discovery source.', '{}'::jsonb),
  ('gamma-list-events', 'gamma', 'List events', 'GET', 'https://gamma-api.polymarket.com', '/events', 'https://docs.polymarket.com/api-reference/events/list-events.md', false, true, 'Event discovery source.', '{}'::jsonb),
  ('gamma-search', 'gamma', 'Search markets, events, profiles', 'GET', 'https://gamma-api.polymarket.com', '/search', 'https://docs.polymarket.com/api-reference/search/search-markets-events-and-profiles.md', false, false, 'Search helper for future watchlist expansion.', '{}'::jsonb),
  ('data-current-positions', 'data', 'Get current positions for a user', 'GET', 'https://data-api.polymarket.com', '/positions', 'https://docs.polymarket.com/api-reference/core/get-current-positions-for-a-user.md', false, true, 'Used for top trader position tracking.', '{}'::jsonb),
  ('data-trades', 'data', 'Get trades for a user or markets', 'GET', 'https://data-api.polymarket.com', '/trades', 'https://docs.polymarket.com/api-reference/core/get-trades-for-a-user-or-markets.md', false, true, 'Used for top trader trade tracking.', '{}'::jsonb),
  ('data-leaderboard', 'data', 'Get trader leaderboard rankings', 'GET', 'https://data-api.polymarket.com', '/leaderboard', 'https://docs.polymarket.com/api-reference/core/get-trader-leaderboard-rankings.md', false, true, 'Used to discover good traders.', '{}'::jsonb),
  ('data-user-activity', 'data', 'Get user activity', 'GET', 'https://data-api.polymarket.com', '/activity', 'https://docs.polymarket.com/api-reference/core/get-user-activity.md', false, false, 'Available for future trader behavior expansion.', '{}'::jsonb),
  ('data-top-holders', 'data', 'Get top holders for markets', 'GET', 'https://data-api.polymarket.com', '/holders', 'https://docs.polymarket.com/api-reference/core/get-top-holders-for-markets.md', false, false, 'Available for future holder concentration tracking.', '{}'::jsonb),
  ('clob-get-book', 'clob', 'Get order book', 'GET', 'https://clob.polymarket.com', '/book', 'https://docs.polymarket.com/api-reference/market-data/get-order-book.md', false, true, 'Best bid/ask and depth capture for each tracked token.', '{}'::jsonb),
  ('clob-get-books', 'clob', 'Get order books', 'POST', 'https://clob.polymarket.com', '/books', 'https://docs.polymarket.com/api-reference/market-data/get-order-books-request-body.md', false, false, 'Batch variant; keep registered for future optimization.', '{}'::jsonb),
  ('clob-midpoint', 'clob', 'Get midpoint price', 'GET', 'https://clob.polymarket.com', '/midpoint', 'https://docs.polymarket.com/api-reference/data/get-midpoint-price.md', false, true, 'Midpoint capture for tracked tokens.', '{}'::jsonb),
  ('clob-spread', 'clob', 'Get spread', 'GET', 'https://clob.polymarket.com', '/spread', 'https://docs.polymarket.com/api-reference/market-data/get-spread.md', false, true, 'Spread capture for tracked tokens.', '{}'::jsonb),
  ('clob-last-trade-price', 'clob', 'Get last trade price', 'GET', 'https://clob.polymarket.com', '/last-trade-price', 'https://docs.polymarket.com/api-reference/market-data/get-last-trade-price.md', false, true, 'Last trade capture for tracked tokens.', '{}'::jsonb),
  ('clob-price-history', 'clob', 'Get prices history', 'GET', 'https://clob.polymarket.com', '/prices-history', 'https://docs.polymarket.com/api-reference/markets/get-prices-history.md', false, false, 'Registered for backfills; not called every loop.', '{}'::jsonb),
  ('clob-market-channel', 'websocket', 'Market Channel', 'WSS', 'wss://ws-subscriptions-clob.polymarket.com', '/ws/market', 'https://docs.polymarket.com/api-reference/wss/market.md', false, false, 'Realtime orderbook/price stream reference.', '{}'::jsonb),
  ('clob-user-channel', 'websocket', 'User Channel', 'WSS', 'wss://ws-subscriptions-clob.polymarket.com', '/ws/user', 'https://docs.polymarket.com/api-reference/wss/user.md', true, false, 'Authenticated user/order stream; disabled by guardrail.', '{}'::jsonb),
  ('clob-trade-create-order', 'clob', 'Post a new order', 'POST', 'https://clob.polymarket.com', '/order', 'https://docs.polymarket.com/api-reference/trade/post-a-new-order.md', true, false, 'Registered only as reference. App does not execute live orders.', '{}'::jsonb),
  ('clob-trade-cancel-order', 'clob', 'Cancel single order', 'DELETE', 'https://clob.polymarket.com', '/order', 'https://docs.polymarket.com/api-reference/trade/cancel-single-order.md', true, false, 'Authenticated trading endpoint; disabled.', '{}'::jsonb),
  ('bridge-reference', 'bridge', 'Bridge API', null, 'https://bridge.polymarket.com', null, 'https://docs.polymarket.com/api-reference/introduction.md', true, false, 'Deposits/withdrawals are out of scope for analytics v1.', '{}'::jsonb),
  ('relayer-reference', 'relayer', 'Relayer API', null, null, null, 'https://docs.polymarket.com/api-reference/introduction.md', true, false, 'Relayer actions are out of scope for analytics v1.', '{}'::jsonb),
  ('openapi-clob', 'docs', 'CLOB OpenAPI spec', null, null, null, 'https://docs.polymarket.com/api-spec/clob-openapi.yaml', false, false, 'Reference spec.', '{}'::jsonb),
  ('openapi-data', 'docs', 'Data OpenAPI spec', null, null, null, 'https://docs.polymarket.com/api-spec/data-openapi.yaml', false, false, 'Reference spec.', '{}'::jsonb),
  ('openapi-gamma', 'docs', 'Gamma OpenAPI spec', null, null, null, 'https://docs.polymarket.com/api-spec/gamma-openapi.yaml', false, false, 'Reference spec.', '{}'::jsonb),
  ('asyncapi-market', 'docs', 'Market AsyncAPI spec', null, null, null, 'https://docs.polymarket.com/asyncapi.json', false, false, 'Realtime spec.', '{}'::jsonb)
on conflict (id) do update set
  name = excluded.name,
  method = excluded.method,
  base_url = excluded.base_url,
  path = excluded.path,
  docs_url = excluded.docs_url,
  auth_required = excluded.auth_required,
  enabled_for_ingest = excluded.enabled_for_ingest,
  notes = excluded.notes,
  metadata = excluded.metadata,
  updated_at = now();
