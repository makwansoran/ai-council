import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border)] bg-[var(--background-panel)] shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-2 border-b border-[var(--border)] px-4 py-3",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <h3
      className={cn(
        "text-sm font-semibold tracking-tight text-[var(--foreground)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardSubtitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <p
      className={cn("text-xs text-[var(--foreground-muted)]", className)}
      {...props}
    />
  );
}

export function CardBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 border-t border-[var(--border)] px-4 py-3 text-xs text-[var(--foreground-muted)]",
        className,
      )}
      {...props}
    />
  );
}
