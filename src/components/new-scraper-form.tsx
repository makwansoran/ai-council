"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";

const kindHints: Record<string, string> = {
  web: "URL to scrape. Instructions = CSS selector (e.g. main article).",
  rss: "RSS feed URL. Instructions = comma-separated keyword filter (optional).",
  x_user: "X handle (without @). Instructions = freeform notes.",
  custom: "Any URL. Instructions = freeform.",
};

export function NewScraperForm() {
  const router = useRouter();
  const [kind, setKind] = useState("rss");
  const [name, setName] = useState("");
  const [source, setSource] = useState("");
  const [instructions, setInstructions] = useState("");
  const [category, setCategory] = useState("politics");
  const [isHormuz, setIsHormuz] = useState(false);
  const [cadence, setCadence] = useState(900);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        try {
          const res = await fetch("/api/scrapers", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              name,
              kind,
              source,
              instructions: instructions || null,
              cadence_seconds: cadence,
              category,
              is_hormuz: isHormuz,
              enabled: true,
            }),
          });
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            throw new Error(j.error || `HTTP ${res.status}`);
          }
          setName("");
          setSource("");
          setInstructions("");
          router.refresh();
        } catch (e) {
          setErr((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="space-y-1">
        <Label>Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g. CENTCOM official"
        />
      </div>
      <div className="space-y-1">
        <Label>Kind</Label>
        <Select value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="rss">RSS feed</option>
          <option value="x_user">X user</option>
          <option value="web">Web page</option>
          <option value="custom">Custom URL</option>
        </Select>
        <p className="text-[10px] text-[var(--foreground-muted)]">
          {kindHints[kind]}
        </p>
      </div>
      <div className="space-y-1">
        <Label>Source</Label>
        <Input
          value={source}
          onChange={(e) => setSource(e.target.value)}
          required
          placeholder={
            kind === "x_user" ? "CENTCOM" : "https://example.com/feed.xml"
          }
        />
      </div>
      <div className="space-y-1">
        <Label>Instructions / selector / keywords</Label>
        <Textarea
          rows={2}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder={
            kind === "web"
              ? "main article"
              : kind === "rss"
                ? "iran, hormuz, tanker"
                : ""
          }
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label>Category</Label>
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="politics">politics</option>
            <option value="war">war</option>
            <option value="geopolitics">geopolitics</option>
            <option value="other">other</option>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Cadence (sec)</Label>
          <Input
            type="number"
            min={60}
            step={60}
            value={cadence}
            onChange={(e) => setCadence(parseInt(e.target.value, 10) || 900)}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs text-[var(--foreground-muted)]">
        <input
          type="checkbox"
          checked={isHormuz}
          onChange={(e) => setIsHormuz(e.target.checked)}
        />
        Mark as Hormuz monitor
      </label>
      <Button type="submit" size="sm" disabled={busy}>
        {busy ? "Saving…" : "Create scraper"}
      </Button>
      {err ? <div className="text-xs text-[var(--danger)]">{err}</div> : null}
    </form>
  );
}
