"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import type { NewsSourceRow } from "@/lib/supabase/types";

export function NewNewsSourceForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setBusy(true);
        setError(null);
        try {
          const res = await fetch("/api/news-sources", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              name: String(form.get("name") || ""),
              rss_url: String(form.get("rss_url") || ""),
              homepage: String(form.get("homepage") || "") || null,
              keywords: String(form.get("keywords") || ""),
              enabled: true,
            }),
          });
          if (!res.ok) throw new Error((await res.json()).error || "Save failed");
          event.currentTarget.reset();
          router.refresh();
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="space-y-1">
        <Label>Name</Label>
        <Input name="name" placeholder="Reuters Middle East" required />
      </div>
      <div className="space-y-1">
        <Label>RSS URL</Label>
        <Input name="rss_url" type="url" placeholder="https://example.com/feed.xml" required />
      </div>
      <div className="space-y-1">
        <Label>Homepage</Label>
        <Input name="homepage" type="url" placeholder="https://example.com" />
      </div>
      <div className="space-y-1">
        <Label>Keywords</Label>
        <Textarea
          name="keywords"
          rows={2}
          placeholder="iran, israel, hormuz, election, ceasefire"
        />
      </div>
      <Button type="submit" size="sm" disabled={busy}>
        {busy ? "Adding..." : "Add news source"}
      </Button>
      {error ? <div className="text-xs text-[var(--danger)]">{error}</div> : null}
    </form>
  );
}

export function NewsSourceActions({ source }: { source: NewsSourceRow }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function patch(
    body: Partial<Omit<NewsSourceRow, "keywords">> & { keywords?: string[] | string },
  ) {
    setBusy(true);
    try {
      await fetch(`/api/news-sources/${source.id}`, {
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
    if (!confirm(`Remove ${source.name}?`)) return;
    setBusy(true);
    try {
      await fetch(`/api/news-sources/${source.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function edit() {
    const name = prompt("Source name", source.name);
    if (name === null) return;
    const rssUrl = prompt("RSS URL", source.rss_url);
    if (rssUrl === null) return;
    const homepage = prompt("Homepage URL (optional)", source.homepage ?? "");
    if (homepage === null) return;
    const keywords = prompt("Keywords, comma-separated", source.keywords.join(", "));
    if (keywords === null) return;
    await patch({
      name,
      rss_url: rssUrl,
      homepage: homepage || null,
      keywords,
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
        onClick={() => patch({ enabled: !source.enabled })}
      >
        {source.enabled ? "Pause" : "Resume"}
      </Button>
      <Button type="button" size="sm" variant="danger" disabled={busy} onClick={remove}>
        Remove
      </Button>
    </div>
  );
}
