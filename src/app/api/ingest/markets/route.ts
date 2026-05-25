import { NextResponse } from "next/server";
import { checkCronSecret } from "@/lib/cron";
import {
  bestBidAsk,
  fetchLastTradePrice,
  fetchMidpoint,
  fetchOrderbook,
  fetchPoliticsAndWarMarkets,
  fetchSpread,
  type NormalizedMarket,
} from "@/lib/polymarket/api";
import {
  insertClobMarketSnapshots,
  insertMarketSnapshots,
  insertPolymarketApiRun,
  insertSignals,
  upsertMarkets,
} from "@/lib/repo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function priceForOutcome(outcome: string, outcomes: string[], prices: number[]) {
  const idx = outcomes.findIndex(
    (o) => o.toLowerCase() === outcome.toLowerCase(),
  );
  if (idx < 0 || prices[idx] === undefined) return null;
  return prices[idx];
}

async function ingest() {
  const startedAt = new Date().toISOString();
  const markets = await fetchPoliticsAndWarMarkets({ limit: 100 });
  if (!markets.length) return { markets: 0, snapshots: 0 };

  await upsertMarkets(
    markets.map((m) => ({
      id: m.id,
      slug: m.slug,
      question: m.question,
      description: m.description,
      category: m.category,
      is_hormuz: m.is_hormuz,
      outcomes: m.outcomes,
      closed: m.closed,
      end_date: m.end_date,
      liquidity: m.liquidity,
      volume: m.volume,
      url: m.url,
      tags: m.tags,
      metadata: { raw: m.raw, clob_token_ids: m.clob_token_ids },
    })),
  );

  const clobRows: Parameters<typeof insertClobMarketSnapshots>[0] = [];
  const clobByMarket = new Map<
    string,
    {
      token_ids: string[];
      midpoints: Record<string, number | null>;
      spreads: Record<string, number | null>;
      last_trades: Record<string, unknown>;
      best_bid: number | null;
      best_ask: number | null;
    }
  >();

  // CLOB calls are deliberately token-capped per cycle to respect public API
  // limits. Frequent cron runs accumulate a full historical series over time.
  const clobTargets = markets
    .flatMap((m) =>
      m.clob_token_ids.map((tokenId, idx) => ({
        market: m,
        tokenId,
        outcome: m.outcomes[idx] ?? null,
      })),
    )
    .slice(0, 80);

  for (const target of clobTargets) {
    try {
      const [book, midpoint, spread, lastTrade] = await Promise.all([
        fetchOrderbook(target.tokenId),
        fetchMidpoint(target.tokenId),
        fetchSpread(target.tokenId),
        fetchLastTradePrice(target.tokenId),
      ]);
      const bidAsk = bestBidAsk(book);
      clobRows.push({
        market_id: target.market.id,
        token_id: target.tokenId,
        outcome: target.outcome,
        best_bid: bidAsk.best_bid,
        best_ask: bidAsk.best_ask,
        midpoint: midpoint.value,
        spread: spread.value,
        last_trade_price: lastTrade.price,
        last_trade_side: lastTrade.side,
        orderbook: book,
        metadata: {
          midpoint_raw: midpoint.raw,
          spread_raw: spread.raw,
          last_trade_raw: lastTrade.raw,
        },
      });

      const byMarket =
        clobByMarket.get(target.market.id) ??
        {
          token_ids: [],
          midpoints: {},
          spreads: {},
          last_trades: {},
          best_bid: null,
          best_ask: null,
        };
      byMarket.token_ids.push(target.tokenId);
      byMarket.midpoints[target.tokenId] = midpoint.value;
      byMarket.spreads[target.tokenId] = spread.value;
      byMarket.last_trades[target.tokenId] = {
        price: lastTrade.price,
        side: lastTrade.side,
      };
      byMarket.best_bid ??= bidAsk.best_bid;
      byMarket.best_ask ??= bidAsk.best_ask;
      clobByMarket.set(target.market.id, byMarket);
    } catch (err) {
      await insertPolymarketApiRun({
        reference_id: "clob-get-book",
        finished_at: new Date().toISOString(),
        status: "error",
        request_url: `https://clob.polymarket.com/book?token_id=${target.tokenId}`,
        rows_written: 0,
        error: (err as Error).message,
        metadata: { market_id: target.market.id, token_id: target.tokenId },
      });
    }
  }

  if (clobRows.length) {
    await insertClobMarketSnapshots(clobRows);
  }

  const snapshots = markets.map((m: NormalizedMarket) => {
    const yes = priceForOutcome("Yes", m.outcomes, m.outcome_prices);
    const no = priceForOutcome("No", m.outcomes, m.outcome_prices);
    const clob = clobByMarket.get(m.id);
    const outcomePriceMap: Record<string, number> = {};
    m.outcomes.forEach((o, i) => {
      if (typeof m.outcome_prices[i] === "number") {
        outcomePriceMap[o] = m.outcome_prices[i];
      }
    });
    return {
      market_id: m.id,
      yes_price: yes,
      no_price: no,
      best_bid: clob?.best_bid ?? null,
      best_ask: clob?.best_ask ?? null,
      volume_24h: null,
      liquidity: m.liquidity,
      outcome_prices: Object.keys(outcomePriceMap).length
        ? outcomePriceMap
        : null,
      clob_token_ids: m.clob_token_ids,
      clob_midpoints: clob?.midpoints ?? null,
      clob_spreads: clob?.spreads ?? null,
      clob_last_trades: clob?.last_trades ?? null,
    };
  });

  await insertMarketSnapshots(snapshots);

  // Emit a market_event signal for any big single-period swing.
  // Without prior snapshot we can't compute swings here; this is a hook
  // for future cron jobs that compare snapshots in batch.

  await insertSignals(
    markets.slice(0, 25).map((m) => ({
      kind: "market_event" as const,
      title: m.question,
      body: m.description?.slice(0, 280) || null,
      url: m.url || null,
      category: m.category,
      is_hormuz: m.is_hormuz,
      weight: m.is_hormuz ? 3 : 1,
      market_id: m.id,
      metadata: {
        volume: m.volume,
        liquidity: m.liquidity,
        prices: m.outcome_prices,
        outcomes: m.outcomes,
      },
    })),
  );

  await insertPolymarketApiRun({
    reference_id: "gamma-list-markets",
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    status: "ok",
    request_url: "https://gamma-api.polymarket.com/markets",
    rows_written: markets.length,
    error: null,
    metadata: { snapshots: snapshots.length },
  });
  await insertPolymarketApiRun({
    reference_id: "clob-get-book",
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    status: "ok",
    request_url: "https://clob.polymarket.com/book",
    rows_written: clobRows.length,
    error: null,
    metadata: { token_cap: 80 },
  });

  return {
    markets: markets.length,
    snapshots: snapshots.length,
    clob_snapshots: clobRows.length,
  };
}

export async function POST(req: Request) {
  const gate = checkCronSecret(req);
  if (!gate.ok) return new Response(gate.body, { status: gate.status });
  try {
    const result = await ingest();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  return POST(req);
}
