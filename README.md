# AI Market Council

Canonical repository: [github.com/makwansoran/ai-council](https://github.com/makwansoran/ai-council)

Polymarket analytics tool focused on **political and war/geopolitical markets**.
It continuously:

- Pulls **Polymarket** markets (politics + war scope) and snapshots prices.
- Tracks the **Polymarket leaderboard** and records what top traders are doing
  (positions, trades, PnL over time).
- Runs configurable **AI scrapers** against X (Twitter) accounts, news RSS feeds,
  and arbitrary web pages.
- Watches the **Strait of Hormuz 24/7** by aggregating Hormuz-relevant X posts
  and news into an event timeline.
- Feeds everything into an **AI Council** that produces structured trade
  analysis (thesis, counter-thesis, confidence, risks, drivers, suggested size).
- Lets you run **paper trades** and prepare **manual-confirm order intents**.
  Nothing is ever submitted to Polymarket automatically.

All historical data is persisted to **Supabase**
(`ndgelpjogufewgqtddzd.supabase.co`).

## Quick start

```bash
# 1. install
npm install

# 2. set env
cp .env.example .env.local
# fill in Supabase keys + AI gateway key

# 3. apply database schema
# Paste supabase/migrations/0001_init.sql into the Supabase SQL editor.
# Then paste supabase/seed.sql to seed the X watchlist and news sources.

# 4. run
npm run dev
```

Open <http://localhost:3000>. From the dashboard, hit **Run all ingest** to
pull markets, leaderboard, X, news, scrapers, and Hormuz events.

## Environment

See [.env.example](.env.example). At minimum you need:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AI_GATEWAY_API_KEY` (or run on Vercel for OIDC)
- `AI_MODEL` (defaults to `openai/gpt-5`)
- Optional: `X_BEARER_TOKEN` for the official X API (otherwise nitter fallback)
- Optional: `CRON_SECRET` to lock the ingest endpoints

## Ingest endpoints

All accept `POST` or `GET` and respect the `CRON_SECRET` (via
`x-cron-secret` header or `?secret=` query string).

| Path                            | What it does                                            |
| ------------------------------- | ------------------------------------------------------- |
| `/api/ingest/markets`           | Refresh politics/war markets + snapshot prices          |
| `/api/ingest/leaderboard`       | Pull leaderboard + top-25 trader positions/trades        |
| `/api/ingest/news`              | Pull all enabled news sources                            |
| `/api/ingest/x`                 | Pull all enabled X watchlist accounts                    |
| `/api/ingest/scrapers`          | Run all user-defined scrapers whose cadence is due       |
| `/api/ingest/hormuz`            | Derive Hormuz events from recent flagged content         |
| `/api/ingest/all`               | Run everything in sequence                               |

Point a scheduler (Vercel cron, Supabase scheduled function, GitHub Actions,
etc.) at `/api/ingest/all` every 5-15 minutes for hands-off operation.

For local continuous capture while the dev server is running:

```bash
npm run ingest:loop
```

The market ingest records Gamma market snapshots plus CLOB orderbook, midpoint,
spread, and last-trade data into `clob_market_snapshots` and the extra CLOB
columns on `market_snapshots`. Polymarket API references and run history are
stored in `polymarket_api_references` and `polymarket_api_runs`.

## Pages

- `/` — mission control dashboard.
- `/markets` — politics + war market list.
- `/markets/[id]` — market detail with snapshots, signals, council history.
- `/leaderboard` — top traders (day / week / month / all).
- `/leaderboard/[wallet]` — trader detail with positions and trades.
- `/signals` — unified live feed.
- `/scrapers` — add, edit, pause, run, and remove custom scrapers.
- `/scrapers/[id]` — scraper detail with run history.
- `/news` — add, pause, edit, and remove RSS/news sources.
- `/x` — X watchlist + recent posts.
- `/hormuz` — 24/7 Strait of Hormuz monitor.
- `/council` — recent AI council runs.
- `/trades` — paper trades + manual-confirm order intents.
- `/api-references` — registered Polymarket API references + latest ingest runs.

## Guardrails

- Outputs are **analysis, not financial advice**.
- The app never submits orders to Polymarket. Order intents are drafts you
  approve manually and copy into the Polymarket UI yourself.
- The scope filter is hard: only `politics`, `war`, and `geopolitics` markets
  are surfaced.
