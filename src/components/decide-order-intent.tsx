"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function DecideOrderIntent({ id }: { id: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function decide(decision: "approved" | "rejected") {
    setBusy(true);
    try {
      const res = await fetch("/api/trades/intents", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, decision }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="primary"
        disabled={busy}
        onClick={() => decide("approved")}
      >
        Approve
      </Button>
      <Button
        size="sm"
        variant="danger"
        disabled={busy}
        onClick={() => decide("rejected")}
      >
        Reject
      </Button>
    </div>
  );
}
