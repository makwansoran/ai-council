"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ClosePaperTrade({ id }: { id: number }) {
  const router = useRouter();
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex items-center gap-1"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const res = await fetch("/api/trades/paper", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id, exit_price: parseFloat(price) }),
          });
          if (res.ok) router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      <Input
        className="h-7 w-20 px-2 text-xs"
        type="number"
        min={0}
        max={1}
        step={0.01}
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="0.00"
        required
      />
      <Button size="sm" variant="secondary" type="submit" disabled={busy}>
        Close
      </Button>
    </form>
  );
}
