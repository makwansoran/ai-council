"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface Props {
  endpoint: string;
  label?: string;
  size?: "sm" | "md";
  variant?: "primary" | "secondary" | "ghost";
}

export function TriggerIngest({
  endpoint,
  label = "Ingest now",
  size = "sm",
  variant = "secondary",
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      <Button
        size={size}
        variant={variant}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setErr(null);
          try {
            const res = await fetch(endpoint, { method: "POST" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            router.refresh();
          } catch (e) {
            setErr((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <RefreshCw size={14} className={busy ? "animate-spin" : ""} />
        {busy ? "Running…" : label}
      </Button>
      {err ? <span className="text-xs text-[var(--danger)]">{err}</span> : null}
    </div>
  );
}
