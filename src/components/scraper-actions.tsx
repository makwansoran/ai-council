"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ScraperRow } from "@/lib/supabase/types";

export function ScraperActions({ scraper }: { scraper: ScraperRow }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function patch(body: Partial<ScraperRow>) {
    setBusy(true);
    try {
      await fetch(`/api/scrapers/${scraper.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete scraper "${scraper.name}"?`)) return;
    setBusy(true);
    try {
      await fetch(`/api/scrapers/${scraper.id}`, { method: "DELETE" });
      router.push("/scrapers");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function edit() {
    const name = prompt("Scraper name", scraper.name);
    if (name === null) return;
    const source = prompt("Source URL / X handle / feed URL", scraper.source);
    if (source === null) return;
    const instructions = prompt(
      "Instructions / selector / keywords",
      scraper.instructions ?? "",
    );
    if (instructions === null) return;
    const cadenceRaw = prompt("Cadence in seconds", String(scraper.cadence_seconds));
    if (cadenceRaw === null) return;
    await patch({
      name,
      source,
      instructions: instructions || null,
      cadence_seconds: Math.max(60, Number(cadenceRaw) || scraper.cadence_seconds),
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={edit}>
        Edit
      </Button>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={busy}
        onClick={() => patch({ enabled: !scraper.enabled })}
      >
        {scraper.enabled ? "Pause" : "Resume"}
      </Button>
      <Button type="button" size="sm" variant="danger" disabled={busy} onClick={remove}>
        Delete
      </Button>
    </div>
  );
}
