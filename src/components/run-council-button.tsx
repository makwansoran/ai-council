"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  marketId: string;
}

export function RunCouncilButton({ marketId }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setErr(null);
          try {
            const res = await fetch("/api/council/runs", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ market_id: marketId }),
            });
            if (!res.ok) {
              const body = await res.json().catch(() => ({}));
              throw new Error(body.error || `HTTP ${res.status}`);
            }
            router.refresh();
          } catch (e) {
            setErr((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Bot size={14} className={busy ? "animate-pulse" : ""} />
        {busy ? "Council deliberating…" : "Run AI council"}
      </Button>
      {err ? <span className="text-xs text-[var(--danger)]">{err}</span> : null}
    </div>
  );
}
