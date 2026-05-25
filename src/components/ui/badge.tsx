import * as React from "react";
import { cn } from "@/lib/utils";

type Tone =
  | "default"
  | "accent"
  | "warn"
  | "danger"
  | "positive"
  | "muted"
  | "outline";

const tones: Record<Tone, string> = {
  default:
    "bg-[var(--background-elevated)] text-[var(--foreground)] border border-[var(--border-strong)]",
  accent: "bg-[var(--accent)]/15 text-[var(--accent-strong)]",
  warn: "bg-[var(--warn)]/15 text-[var(--warn)]",
  danger: "bg-[var(--danger)]/15 text-[var(--danger)]",
  positive: "bg-[var(--positive)]/15 text-[var(--positive)]",
  muted:
    "bg-transparent text-[var(--foreground-muted)] border border-[var(--border)]",
  outline:
    "bg-transparent text-[var(--foreground)] border border-[var(--border-strong)]",
};

export function Badge({
  tone = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
