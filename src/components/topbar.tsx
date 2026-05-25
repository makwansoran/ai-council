"use client";

import { useEffect, useState } from "react";

export function Topbar() {
  const [now, setNow] = useState<string>("");

  useEffect(() => {
    const update = () =>
      setNow(
        new Date().toLocaleTimeString("en-US", {
          hour12: false,
          timeZoneName: "short",
        }),
      );
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--background-elevated)] px-4">
      <div className="flex items-center gap-3">
        <span className="live-dot" />
        <span className="text-xs uppercase tracking-wide text-[var(--foreground-muted)]">
          Live ingestion
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-[var(--foreground-muted)]">
        <span className="rounded-md border border-[var(--border)] bg-[var(--background-panel)] px-2 py-1 font-mono tabular-nums">
          {now || "--:--:--"}
        </span>
      </div>
    </header>
  );
}
