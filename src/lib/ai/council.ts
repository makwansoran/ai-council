import { Output, ToolLoopAgent, stepCountIs, tool } from "ai";
import { z } from "zod";
import { getAiModel } from "@/lib/env";
import {
  getMarket,
  insertCouncilRun,
  recentSignalsForMarket,
  recentSnapshots,
  recentTraderTrades,
  listTopTraders,
} from "@/lib/repo";
import type { CouncilRunRow } from "@/lib/supabase/types";

export const councilSchema = z.object({
  action: z.enum(["buy_yes", "buy_no", "sell_yes", "sell_no", "hold"]),
  confidence: z.number().min(0).max(1),
  suggested_size_usd: z.number().min(0).max(100000).nullable(),
  thesis: z.string().min(20),
  counter_thesis: z.string().min(20),
  risks: z.array(z.string()).min(1),
  drivers: z.array(z.string()).min(1),
  trader_notes: z.string().nullable(),
});

export type CouncilOutput = z.infer<typeof councilSchema>;

function compactToolTrace(
  steps: Array<{ toolCalls?: Array<{ toolName: string }> }>,
) {
  return steps.map((step, index) => ({
    step: index,
    tools: step.toolCalls?.map((call) => call.toolName) ?? [],
  }));
}

function snapshotSeries(snapshots: { captured_at: string; yes_price: number | null }[]) {
  return snapshots
    .slice(0, 30)
    .reverse()
    .map(
      (s) =>
        `${s.captured_at.slice(0, 19)}Z  YES=${s.yes_price === null ? "?" : s.yes_price.toFixed(3)}`,
    )
    .join("\n");
}

function fallbackCouncilOutput({
  market,
  snapshots,
  signals,
  traderBlock,
}: {
  market: { question: string; category: string; is_hormuz: boolean };
  snapshots: { yes_price: number | null }[];
  signals: Array<{ id: number; title: string; weight: number; is_hormuz: boolean; kind: string }>;
  traderBlock: string;
}): CouncilOutput {
  const prices = snapshots
    .map((s) => s.yes_price)
    .filter((price): price is number => typeof price === "number");
  const latest = prices.at(0) ?? null;
  const oldest = prices.at(-1) ?? null;
  const trend = latest !== null && oldest !== null ? latest - oldest : 0;
  const signalWeight = signals.reduce((sum, signal) => sum + Math.max(0, signal.weight), 0);
  const hormuzHeat = market.is_hormuz || signals.some((signal) => signal.is_hormuz);
  const highSignalPressure = signalWeight >= 8 || signals.length >= 12;

  let action: CouncilOutput["action"] = "hold";
  if ((hormuzHeat || market.category === "war") && highSignalPressure && trend >= -0.03) {
    action = "buy_yes";
  } else if (trend > 0.08 && signalWeight < 3) {
    action = "sell_yes";
  } else if (trend < -0.08 && highSignalPressure) {
    action = "buy_no";
  }

  const confidence =
    action === "hold"
      ? Math.min(0.48, 0.24 + signals.length * 0.01)
      : Math.min(0.72, 0.42 + Math.min(0.18, signalWeight / 100) + Math.abs(trend));
  const suggestedSize = action === "hold" ? 0 : Math.round(100000 * Math.min(0.025, confidence * 0.025));
  const topSignal = signals[0]?.title ?? "no dominant fresh signal";

  return {
    action,
    confidence,
    suggested_size_usd: suggestedSize,
    thesis:
      action === "hold"
        ? `Hold for now. The market has ${signals.length} recent signals, but the captured evidence is not strong enough to justify adding capital yet.`
        : `Lean ${action.replace("_", " ")}. Recent signal pressure around "${topSignal}" and price movement create a monitorable edge, but size remains capped until the AI model key is enabled.`,
    counter_thesis:
      "The rule-based fallback may miss nuance in breaking news, market microstructure, or top-trader intent, so a human should confirm before acting.",
    risks: [
      "No AI Gateway key is set, so this is the deterministic fallback council.",
      "Fast-moving political or war news can reverse this market before the next ingest cycle.",
      "Top-trader activity may reflect hedging or market making instead of directional conviction.",
    ],
    drivers: [
      `${signals.length} recent relevant signals with combined weight ${signalWeight.toFixed(1)}.`,
      `Latest captured YES trend is ${trend >= 0 ? "+" : ""}${trend.toFixed(3)}.`,
      hormuzHeat ? "Hormuz or war-risk flag is active." : "Politics/geopolitics scope is active.",
      `Trader context: ${traderBlock === "(no trader activity captured)" ? "none captured yet" : "recent top-trader flow captured"}.`,
    ],
    trader_notes:
      traderBlock === "(no trader activity captured)"
        ? "No usable top-trader activity is attached to this market yet."
        : "Top-trader activity is present and should be reviewed on the market detail page before confirming any order intent.",
  };
}

export async function runCouncilForMarket(marketId: string): Promise<CouncilRunRow> {
  const market = await getMarket(marketId);
  if (!market) throw new Error(`market ${marketId} not found`);

  const [snapshots, signals, topTraders] = await Promise.all([
    recentSnapshots(marketId, 50),
    recentSignalsForMarket(marketId, 60),
    listTopTraders("week", 10),
  ]);

  // Pull recent trades from the top 5 traders for color.
  const top5 = topTraders.slice(0, 5);
  const traderTradeBlocks: string[] = [];
  for (const t of top5) {
    const trades = await recentTraderTrades(t.proxy_wallet, 8);
    if (!trades.length) continue;
    const label =
      t.trader?.display_name || t.trader?.username || t.proxy_wallet.slice(0, 8);
    traderTradeBlocks.push(
      `${label} (rank ${t.rank ?? "?"}, week PnL $${(t.pnl ?? 0).toFixed(0)}):\n` +
        trades
          .map(
            (tr) =>
              `  ${tr.ts.slice(0, 19)}Z  ${tr.side.toUpperCase()} ${tr.outcome} ${tr.size}@${tr.price.toFixed(3)} ($${(tr.notional ?? 0).toFixed(0)})`,
          )
          .join("\n"),
    );
  }

  const signalBlock =
    signals
      .slice(0, 40)
      .map(
        (s) =>
          `[${s.ts.slice(0, 19)}Z][${s.kind}${s.is_hormuz ? "·hormuz" : ""}] ${s.title}${s.body ? `\n   ${s.body.slice(0, 200)}` : ""}`,
      )
      .join("\n") || "(no recent signals captured yet)";

  const snapshotsBlock = snapshotSeries(snapshots) || "(no snapshots yet)";

  const traderBlock = traderTradeBlocks.join("\n\n") || "(no trader activity captured)";

  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL) {
    const output = fallbackCouncilOutput({ market, snapshots, signals, traderBlock });
    return insertCouncilRun({
      market_id: marketId,
      model: "fallback/no-ai-gateway-key",
      action: output.action,
      confidence: output.confidence,
      suggested_size_usd: output.suggested_size_usd,
      thesis: output.thesis,
      counter_thesis: output.counter_thesis,
      risks: output.risks,
      drivers: output.drivers,
      trader_notes: output.trader_notes,
      signal_ids: signals.map((s) => s.id),
      raw: { output, fallback: true },
    });
  }

  const model = getAiModel();

  const tradingAgent = new ToolLoopAgent({
    model,
    instructions: `You are the AI Market Council trading agent for Polymarket.

Scope:
- Only analyze political, war, and geopolitical markets.
- You support a human trader. You never submit orders.
- Your job is to decide what to do, how much capital to add, and whether top-trader flow supports or contradicts the idea.

Process:
- First inspect every required data tool in sequence.
- Compare market pricing, signal quality, news/X evidence, Hormuz flags, and top-trader buying/selling.
- Prefer HOLD when evidence is thin, stale, contradictory, or mostly noise.
- Suggested size assumes a $100k bankroll. Cap one idea at 5% and use smaller sizing for weak edges.
- Be concrete. Mention the strongest signal, the main invalidation risk, and what top traders are doing.
- Return only the structured object required by the schema.`,
    output: Output.object({ schema: councilSchema }),
    stopWhen: stepCountIs(8),
    tools: {
      getMarketContext: tool({
        description:
          "Get the Polymarket question, category, outcomes, liquidity, volume, URL, and market description.",
        inputSchema: z.object({}),
        execute: async () => ({
          id: market.id,
          question: market.question,
          category: market.category,
          is_hormuz: market.is_hormuz,
          outcomes: market.outcomes,
          end_date: market.end_date,
          volume: market.volume,
          liquidity: market.liquidity,
          url: market.url,
          description: market.description?.slice(0, 1200) ?? null,
        }),
      }),
      getPriceHistory: tool({
        description:
          "Get recent YES price snapshots, including oldest-to-newest compact series and latest captured values.",
        inputSchema: z.object({}),
        execute: async () => ({
          series: snapshotsBlock,
          latest: snapshots[0] ?? null,
          count: snapshots.length,
        }),
      }),
      getSignalFeed: tool({
        description:
          "Get recent X, news, scraper, and Hormuz signals relevant to this market.",
        inputSchema: z.object({}),
        execute: async () => ({
          compact_feed: signalBlock,
          signals: signals.slice(0, 40).map((signal) => ({
            id: signal.id,
            ts: signal.ts,
            kind: signal.kind,
            title: signal.title,
            body: signal.body?.slice(0, 500) ?? null,
            url: signal.url,
            category: signal.category,
            is_hormuz: signal.is_hormuz,
            weight: signal.weight,
          })),
        }),
      }),
      getTopTraderFlow: tool({
        description:
          "Get recent top Polymarket trader trades for context on who is buying or selling and for how much.",
        inputSchema: z.object({}),
        execute: async () => ({
          compact_flow: traderBlock,
          traders: top5.map((trader) => ({
            wallet: trader.proxy_wallet,
            label:
              trader.trader?.display_name ||
              trader.trader?.username ||
              trader.proxy_wallet.slice(0, 8),
            rank: trader.rank,
            pnl: trader.pnl,
          })),
        }),
      }),
    },
    prepareStep: async ({ stepNumber }) => {
      if (stepNumber === 0) {
        return { toolChoice: { type: "tool", toolName: "getMarketContext" } };
      }
      if (stepNumber === 1) {
        return { toolChoice: { type: "tool", toolName: "getPriceHistory" } };
      }
      if (stepNumber === 2) {
        return { toolChoice: { type: "tool", toolName: "getSignalFeed" } };
      }
      if (stepNumber === 3) {
        return { toolChoice: { type: "tool", toolName: "getTopTraderFlow" } };
      }
      return { toolChoice: "none" };
    },
  });

  const result = await tradingAgent.generate({
    prompt: `Run a full trading-agent evaluation for market ${marketId}. Use every tool first, then produce the structured trade recommendation.`,
  });

  const output = result.output as CouncilOutput;

  const row = await insertCouncilRun({
    market_id: marketId,
    model,
    action: output.action,
    confidence: output.confidence,
    suggested_size_usd: output.suggested_size_usd,
    thesis: output.thesis,
    counter_thesis: output.counter_thesis,
    risks: output.risks,
    drivers: output.drivers,
    trader_notes: output.trader_notes,
    signal_ids: signals.map((s) => s.id),
    raw: {
      output,
      agent: true,
      tool_trace: compactToolTrace(result.steps),
      total_usage: result.totalUsage,
    },
  });

  return row;
}
