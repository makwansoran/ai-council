import { NextResponse } from "next/server";
import { checkCronSecret } from "@/lib/cron";
import {
  fetchLeaderboard,
  fetchTraderPositions,
  fetchTraderTrades,
} from "@/lib/polymarket/api";
import {
  insertSignals,
  insertTraderPositions,
  insertTraderSnapshots,
  insertTraderTrades,
  upsertTraders,
} from "@/lib/repo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

async function ingest() {
  const entries = await fetchLeaderboard();
  if (!entries.length) {
    return {
      traders: 0,
      snapshots: 0,
      positions: 0,
      trades: 0,
      note: "leaderboard returned 0 entries",
    };
  }

  // Upsert distinct traders.
  const distinctTraders = new Map<string, (typeof entries)[number]>();
  for (const e of entries) {
    if (!distinctTraders.has(e.proxyWallet)) {
      distinctTraders.set(e.proxyWallet, e);
    }
  }
  await upsertTraders(
    [...distinctTraders.values()].map((e) => ({
      proxy_wallet: e.proxyWallet,
      username: e.username,
      display_name: e.displayName,
      profile_image: e.profileImage,
      last_seen: new Date().toISOString(),
      watched: true,
    })),
  );

  await insertTraderSnapshots(
    entries.map((e) => ({
      proxy_wallet: e.proxyWallet,
      period: e.period,
      rank: e.rank,
      pnl: e.pnl,
      volume: e.volume,
      positions_value: null,
    })),
  );

  // For top-N day traders, also pull positions and recent trades.
  const topDay = entries
    .filter((e) => e.period === "day")
    .sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999))
    .slice(0, 25);

  let positions = 0;
  let trades = 0;
  for (const t of topDay) {
    try {
      const [pos, tr] = await Promise.all([
        fetchTraderPositions(t.proxyWallet),
        fetchTraderTrades(t.proxyWallet, 25),
      ]);
      if (pos.length) {
        await insertTraderPositions(
          pos.map((p) => ({
            proxy_wallet: t.proxyWallet,
            market_id: p.conditionId || (p.asset ?? ""),
            outcome: p.outcome ?? "",
            size: p.size ?? null,
            avg_price: p.avgPrice ?? null,
            current_value: p.currentValue ?? null,
            unrealized_pnl: p.cashPnl ?? null,
          })),
        );
        positions += pos.length;
      }
      if (tr.length) {
        await insertTraderTrades(
          tr.map((tt) => ({
            proxy_wallet: t.proxyWallet,
            market_id: tt.conditionId || (tt.asset ?? ""),
            side: (tt.side === "BUY" ? "buy" : "sell") as "buy" | "sell",
            outcome: tt.outcome ?? "",
            size: tt.size,
            price: tt.price,
            notional: tt.size * tt.price,
            ts: new Date(tt.timestamp * 1000).toISOString(),
            tx_hash: tt.transactionHash,
          })),
        );
        trades += tr.length;

        // Emit trader_action signals for trades > $5k.
        const big = tr.filter((tt) => tt.size * tt.price >= 5000).slice(0, 5);
        if (big.length) {
          await insertSignals(
            big.map((tt) => ({
              kind: "trader_action" as const,
              title: `${t.displayName || t.username || t.proxyWallet.slice(0, 8)} ${tt.side} ${tt.outcome} $${Math.round(tt.size * tt.price).toLocaleString()}`,
              body: tt.title || null,
              url: tt.slug
                ? `https://polymarket.com/market/${tt.slug}`
                : null,
              category: "politics" as const, // refined later by classifier when joined to market
              is_hormuz: false,
              weight: 2,
              market_id: tt.conditionId || null,
              metadata: { trader: t, trade: tt },
            })),
          );
        }
      }
    } catch (err) {
      console.error("[leaderboard] trader pull failed:", t.proxyWallet, err);
    }
  }

  return {
    traders: distinctTraders.size,
    snapshots: entries.length,
    positions,
    trades,
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
