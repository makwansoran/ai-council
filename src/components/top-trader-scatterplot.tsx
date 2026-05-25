import { formatUsd } from "@/lib/utils";
import type { TopTraderBuyScatterPoint } from "@/lib/repo";

interface Props {
  points: TopTraderBuyScatterPoint[];
}

export function TopTraderScatterplot({ points }: Props) {
  if (!points.length) {
    return (
      <div className="rounded-md border border-[var(--border)] bg-[var(--background-elevated)] p-6 text-center text-xs text-[var(--foreground-muted)]">
        No buy/sell overwatch data yet. Run leaderboard ingest to collect top
        trader trades.
      </div>
    );
  }

  const width = 820;
  const height = 360;
  const pad = 48;
  const maxNotional = Math.max(...points.map((p) => p.total_notional), 1);
  const maxTraders = Math.max(...points.map((p) => p.unique_traders), 1);
  const maxTrades = Math.max(...points.map((p) => p.trade_count), 1);

  const x = (v: number) => pad + (v / maxTraders) * (width - pad * 1.5);
  const y = (v: number) =>
    height - pad - (v / maxNotional) * (height - pad * 1.5);
  const r = (v: number) => 4 + (v / maxTrades) * 18;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Scatterplot of top trader buy concentration"
        className="min-w-[760px] rounded-md border border-[var(--border)] bg-[var(--background-elevated)]"
      >
        <line
          x1={pad}
          y1={height - pad}
          x2={width - pad / 2}
          y2={height - pad}
          stroke="var(--border-strong)"
        />
        <line
          x1={pad}
          y1={pad / 2}
          x2={pad}
          y2={height - pad}
          stroke="var(--border-strong)"
        />
        <text
          x={width / 2}
          y={height - 12}
          textAnchor="middle"
          className="fill-[var(--foreground-muted)] text-[11px]"
        >
          Unique top traders buying
        </text>
        <text
          x={14}
          y={height / 2}
          transform={`rotate(-90 14 ${height / 2})`}
          textAnchor="middle"
          className="fill-[var(--foreground-muted)] text-[11px]"
        >
          Buy notional
        </text>
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
          <g key={tick}>
            <line
              x1={pad}
              y1={y(maxNotional * tick)}
              x2={width - pad / 2}
              y2={y(maxNotional * tick)}
              stroke="var(--border)"
              strokeDasharray="3 5"
            />
            <text
              x={pad - 8}
              y={y(maxNotional * tick) + 4}
              textAnchor="end"
              className="fill-[var(--foreground-muted)] text-[10px]"
            >
              {formatUsd(maxNotional * tick)}
            </text>
          </g>
        ))}
        {points.map((p, index) => (
          <g key={`${p.market_id}:${p.outcome}`}>
            <circle
              cx={x(p.unique_traders)}
              cy={y(p.total_notional)}
              r={r(p.trade_count)}
              fill="var(--accent)"
              opacity={0.12 + Math.max(0.15, 1 - index / points.length) * 0.45}
              stroke="var(--accent-strong)"
            />
            {index < 12 ? (
              <text
                x={x(p.unique_traders) + r(p.trade_count) + 4}
                y={y(p.total_notional) + 4}
                className="fill-[var(--foreground)] text-[10px]"
              >
                {p.outcome} · {p.market_id.slice(0, 10)}…
              </text>
            ) : null}
          </g>
        ))}
      </svg>
      <div className="mt-2 grid gap-2 text-xs md:grid-cols-2">
        {points.slice(0, 12).map((p) => (
          <div
            key={`${p.market_id}:${p.outcome}:row`}
            className="rounded-md border border-[var(--border)] bg-[var(--background-elevated)] px-3 py-2"
          >
            <div className="font-medium">
              {p.outcome} · {p.market_id.slice(0, 18)}…
            </div>
            <div className="text-[var(--foreground-muted)]">
              {formatUsd(p.total_notional)} bought · {p.unique_traders} traders ·{" "}
              {p.trade_count} trades · avg {Math.round(p.avg_price * 100)}c
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
