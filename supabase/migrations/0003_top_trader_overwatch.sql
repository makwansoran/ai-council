alter table trader_trades
  add column if not exists title text,
  add column if not exists slug text,
  add column if not exists event_slug text,
  add column if not exists icon text;

create index if not exists trader_trades_market_ts_idx
  on trader_trades(market_id, ts desc);
create index if not exists trader_trades_side_ts_idx
  on trader_trades(side, ts desc);
