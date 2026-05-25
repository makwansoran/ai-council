import * as React from "react";
import { cn } from "@/lib/utils";

interface StatProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "default" | "positive" | "danger" | "warn" | "accent";
  className?: string;
}

const tones: Record<NonNullable<StatProps["tone"]>, string> = {
  default: "text-[var(--foreground)]",
  positive: "text-[var(--positive)]",
  danger: "text-[var(--danger)]",
  warn: "text-[var(--warn)]",
  accent: "text-[var(--accent-strong)]",
};

export function Stat({ label, value, hint, tone = "default", className }: StatProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border)] bg-[var(--background-panel)] p-4",
        className,
      )}
    >
      <div className="text-[10px] font-medium uppercase tracking-wide text-[var(--foreground-muted)]">
        {label}
      </div>
      <div className={cn("mt-1 text-2xl font-semibold tabular-nums", tones[tone])}>
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-xs text-[var(--foreground-muted)]">{hint}</div>
      ) : null}
    </div>
  );
}
